/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type express from 'express';
import { NotionOAuthInvalidRequestException } from '../notion.exceptions';

// controller.ts は import 時に process.env.FRONTEND_URL を読み込んで定数に固定する。
// そのため vi.hoisted を使い、import より前に env を設定しておく必要がある。
vi.hoisted(() => {
  process.env.FRONTEND_URL = 'http://localhost:3000';
});

import { NotionOAuthController } from './notion-oauth.controller';
import {
  NotionOAuthService,
  NotionTokenResponse,
} from './notion-oauth.service';
import {
  COOKIE_OAUTH_DECK_ID,
  COOKIE_OAUTH_STATE,
  COOKIE_OAUTH_USER_ID,
} from './notion-oauth.cookies';

/**
 * NotionOAuthController.callback の単体試験
 *
 * callback のみを対象とする。
 *
 * フィルタ（NotionOAuthExceptionFilter）の挙動は単体では検証しない。
 * 例外が throw されることのみ確認し、redirect 振分けは結合試験で担保する。
 */
describe('NotionOAuthController.callback', () => {
  let controller: NotionOAuthController;
  let serviceMock: DeepMockProxy<NotionOAuthService>;

  // Notionからの正常レスポンス相当
  const tokens: NotionTokenResponse = {
    access_token: 'AT-xxx',
    refresh_token: 'RT-xxx',
    workspace_id: 'ws-1',
    workspace_name: 'My Workspace',
  };

  /**
   * express.Request / Response の最小スタブを作るヘルパ
   * - req.cookies は controller が参照するキーだけ詰める
   * - res は redirect / clearCookie / cookie の3メソッドだけ vi.fn() で持たせる
   */
  const makeReq = (
    cookies: Record<string, string | undefined>,
  ): express.Request =>
    ({
      cookies,
    }) as unknown as express.Request;

  const makeRes = (): express.Response =>
    ({
      redirect: vi.fn(),
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    }) as unknown as express.Response;

  beforeEach(async () => {
    serviceMock = mockDeep<NotionOAuthService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotionOAuthController],
      providers: [
        {
          provide: NotionOAuthService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<NotionOAuthController>(NotionOAuthController);
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 正常系
  // ---------------------------------------------------------------------------
  describe('正常系', () => {
    it('state一致 & 必須揃い → exchange/save が呼ばれ、import画面へredirect、Cookie3つ clear', async () => {
      serviceMock.exchangeCodeForTokens.mockResolvedValue(tokens);
      serviceMock.saveNotionResponse.mockResolvedValue({} as never);

      const state = 'STATE-OK';
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: state,
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        [COOKIE_OAUTH_USER_ID]: 'user-1',
      });
      const res = makeRes();

      await controller.callback(
        'code-xyz',
        state,
        undefined, // error なし
        req,
        res,
      );

      // Service: 認可codeでtoken交換 → 取得tokenでsave
      expect(serviceMock.exchangeCodeForTokens).toHaveBeenCalledWith(
        'code-xyz',
      );
      expect(serviceMock.saveNotionResponse).toHaveBeenCalledWith(
        'user-1',
        tokens,
      );

      // Cookieは3つ全部破棄
      expect(res.clearCookie).toHaveBeenCalledTimes(3);

      // import画面へredirect
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/decks/deck-99?integration=notion_success',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // state検証
  // ---------------------------------------------------------------------------
  describe('state検証', () => {
    it('異常系: queryState と cookieState が不一致 → NotionOAuthInvalidRequestException', async () => {
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: 'cookie-state',
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        [COOKIE_OAUTH_USER_ID]: 'user-1',
      });
      const res = makeRes();

      await expect(
        controller.callback('code', 'query-state', undefined, req, res),
      ).rejects.toBeInstanceOf(NotionOAuthInvalidRequestException);

      // 状態不正なので service は呼ばれない
      expect(serviceMock.exchangeCodeForTokens).not.toHaveBeenCalled();
      expect(serviceMock.saveNotionResponse).not.toHaveBeenCalled();
    });

    it('異常系: cookieState 自体が無い → NotionOAuthInvalidRequestException', async () => {
      // [試験項目: cookie state 欠落]
      // Cookie の有効期限切れ・別オリジン経由など、cookieState が落ちているケース
      const req = makeReq({
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        [COOKIE_OAUTH_USER_ID]: 'user-1',
      });
      const res = makeRes();

      await expect(
        controller.callback('code', 'some-state', undefined, req, res),
      ).rejects.toBeInstanceOf(NotionOAuthInvalidRequestException);
    });

    it('異常系: queryState が無い → NotionOAuthInvalidRequestException', async () => {
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: 'cookie-state',
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        [COOKIE_OAUTH_USER_ID]: 'user-1',
      });
      const res = makeRes();

      await expect(
        controller.callback('code', undefined, undefined, req, res),
      ).rejects.toBeInstanceOf(NotionOAuthInvalidRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // error パラメータ（Notion側で認可拒否）
  // ---------------------------------------------------------------------------
  describe('error パラメータ', () => {
    it('error=access_denied & state一致 → cancelled redirect、Cookie3つclear、service呼ばれない', async () => {
      // 直近のコード修正で error 分岐にも clearOAuthCookies が追加されたため、
      // ここで Cookie 3 つの clear を検証する。
      const state = 'STATE-OK';
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: state,
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        [COOKIE_OAUTH_USER_ID]: 'user-1',
      });
      const res = makeRes();

      await controller.callback(undefined, state, 'access_denied', req, res);

      // service は呼ばれない（exchange/save どちらも）
      expect(serviceMock.exchangeCodeForTokens).not.toHaveBeenCalled();
      expect(serviceMock.saveNotionResponse).not.toHaveBeenCalled();

      // Cookie 3 つを破棄
      expect(res.clearCookie).toHaveBeenCalledTimes(3);

      // フロントの cancelled URL へ redirect
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/decks/deck-99?integration=notion_cancelled',
      );
    });

    it('error あり & state不一致 → state不一致が優先で NotionOAuthInvalidRequestException', async () => {
      // state 検証が最初に走るため、error の有無に関わらず BadRequest が出るのが期待挙動。
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: 'cookie-state',
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        [COOKIE_OAUTH_USER_ID]: 'user-1',
      });
      const res = makeRes();

      await expect(
        controller.callback(
          undefined,
          'query-state',
          'access_denied',
          req,
          res,
        ),
      ).rejects.toBeInstanceOf(NotionOAuthInvalidRequestException);

      // cancelled redirect は走らない
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // code / cookie 欠落（state は揃っている前提）
  // ---------------------------------------------------------------------------
  describe('必須項目チェック（state一致後）', () => {
    const state = 'STATE-OK';

    it('異常系: code が undefined → NotionOAuthInvalidRequestException', async () => {
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: state,
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        [COOKIE_OAUTH_USER_ID]: 'user-1',
      });
      const res = makeRes();

      await expect(
        controller.callback(undefined, state, undefined, req, res),
      ).rejects.toBeInstanceOf(NotionOAuthInvalidRequestException);

      expect(serviceMock.exchangeCodeForTokens).not.toHaveBeenCalled();
    });

    it('異常系: userId Cookie が無い → NotionOAuthInvalidRequestException', async () => {
      // [試験項目: userId Cookie 欠落]
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: state,
        [COOKIE_OAUTH_DECK_ID]: 'deck-99',
        // userId 無し
      });
      const res = makeRes();

      await expect(
        controller.callback('code', state, undefined, req, res),
      ).rejects.toBeInstanceOf(NotionOAuthInvalidRequestException);

      expect(serviceMock.exchangeCodeForTokens).not.toHaveBeenCalled();
    });

    it('異常系: deckId Cookie が無い → NotionOAuthInvalidRequestException', async () => {
      const req = makeReq({
        [COOKIE_OAUTH_STATE]: state,
        [COOKIE_OAUTH_USER_ID]: 'user-1',
        // deckId 無し
      });
      const res = makeRes();

      await expect(
        controller.callback('code', state, undefined, req, res),
      ).rejects.toBeInstanceOf(NotionOAuthInvalidRequestException);

      expect(serviceMock.exchangeCodeForTokens).not.toHaveBeenCalled();
    });
  });
});
