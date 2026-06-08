import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { GetUserId } from '../../../common/decorators/get-userid.decorator';
import { NotionAuthStartResponse } from './dto/notion-auth-start.response';
import { NotionStatusResponse } from './dto/notion-status.response';
import {
  NotionOAuthService,
  NotionTokenResponse,
} from './notion-oauth.service';
import { NotionOAuthExceptionFilter } from './notion-oauth.exception.filter';
import { NotionOAuthInvalidRequestException } from '../notion.exceptions';
import {
  COOKIE_MAX_AGE,
  COOKIE_OAUTH_DECK_ID,
  COOKIE_OAUTH_STATE,
  COOKIE_OAUTH_USER_ID,
  clearOAuthCookies,
} from './notion-oauth.cookies';

/** フロントエンドURL */
const frontendUrl = process.env.FRONTEND_URL ?? '';

@Controller('/integrations/notion')
export class NotionOAuthController {
  constructor(private readonly notionOAuthService: NotionOAuthService) {}

  /**
   * Notionに対して認可申請
   */
  @UseGuards(JwtAuthGuard)
  @Get('auth')
  @ApiResponse({ status: 200, type: NotionAuthStartResponse })
  startAuth(
    @GetUserId() userId: string,
    @Query('deckId') deckId: string | undefined,
    @Res({ passthrough: true }) res: express.Response,
  ): NotionAuthStartResponse {
    // deckIdは認可後のフロント遷移先に使うため必須
    if (!deckId) throw new BadRequestException('deckId は必須です。');

    // CSRF対策のランダムstateを生成
    const state = this.notionOAuthService.generateState();

    const cookieOptions: express.CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure: 本番のみ
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE, // 5分
    };
    res.cookie(COOKIE_OAUTH_STATE, state, cookieOptions);
    res.cookie(COOKIE_OAUTH_DECK_ID, deckId, cookieOptions);
    res.cookie(COOKIE_OAUTH_USER_ID, userId, cookieOptions);

    // Notion認可画面URLを返す（フロントがwindow.location.hrefで遷移する）
    // リダイレクトするとATが乗せれずに認証が効かない(401)
    const authorizationUrl =
      this.notionOAuthService.buildAuthorizationUrl(state);
    return new NotionAuthStartResponse(authorizationUrl);
  }

  /**
   * Notion側からのリクエストを受け取るエンドポイント
   *
   * - ATを返さないのでcookieに認証情報を入れる。
   * RTをcookieに含めればいいが、JWT認証に依存するため使わない。
   * - 3つのQueryはNotion側のOAuthの仕様に沿って設定。
   * - 発生した例外は独自filterで吸収しフラグを立ててリダイレクトする。
   */
  @UseFilters(NotionOAuthExceptionFilter)
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') queryState: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    // 型を絞ってCookieを参照
    const cookies = req.cookies as Record<string, string | undefined>;
    const cookieState = cookies[COOKIE_OAUTH_STATE];
    const deckId = cookies[COOKIE_OAUTH_DECK_ID];
    const userId = cookies[COOKIE_OAUTH_USER_ID];

    /** バリデーション */
    // state検証（CSRF対策）クエリが偽造されている可能性有
    if (!queryState || !cookieState || queryState !== cookieState) {
      throw new NotionOAuthInvalidRequestException(
        'state_mismatch',
        'state が不正、または期限切れです。',
      );
    } else {
      // ユーザがNotion側で認可拒否した場合
      if (error) {
        clearOAuthCookies(res);
        // フロントへredirectしてcancelを伝える
        return res.redirect(
          `${frontendUrl}/decks/${deckId}?integration=notion_cancelled`,
        );
      }
      // 認可codeが無ければ中止
      if (!code) {
        throw new NotionOAuthInvalidRequestException(
          'missing_code',
          'code が含まれていません。',
        );
      }
      // userId Cookie, deckId Cookieが無ければ中止
      if (!userId) {
        throw new NotionOAuthInvalidRequestException(
          'missing_user_cookie',
          'userId Cookieが見つかりません。',
        );
      }
      if (!deckId) {
        throw new NotionOAuthInvalidRequestException(
          'missing_deck_cookie',
          'deckId Cookieが見つかりません。',
        );
      }
    }

    // Notion APIへcodeをPOSTしてAT/RTを取得
    const tokens: NotionTokenResponse =
      await this.notionOAuthService.exchangeCodeForTokens(code);

    // 暗号化してupsert保存
    await this.notionOAuthService.saveNotionResponse(userId, tokens);

    // OAuth用Cookieを破棄する（再利用防止）
    // 失敗時はfilter内でCookie破棄する
    clearOAuthCookies(res);

    // フロントのimport画面へredirect
    return res.redirect(
      // urlは適当に決めた、フロント作成時に変更
      `${frontendUrl}/decks/${deckId}?integration=notion_success`,
    );
  }

  /**
   * フロントが連携ボタンの表示出し分けに使用する。
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiResponse({ status: 200, type: NotionStatusResponse })
  async getStatus(@GetUserId() userId: string): Promise<NotionStatusResponse> {
    const status = await this.notionOAuthService.getStatus(userId);
    return new NotionStatusResponse(status.connected, status.workspaceName);
  }

  /**
   * userIdのNotionIntegrationを削除
   */
  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(@GetUserId() userId: string): Promise<void> {
    await this.notionOAuthService.deleteIntegration(userId);
  }
}
