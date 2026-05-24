import { Injectable } from '@nestjs/common';
import { NotionIntegration } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CipherService } from '../../common/encryption/cipher.service';

/**
 * upsert/insert時の入力契約
 * AT/RTは平文で受け取り、Repository層で暗号化してDBへ書き込む
 */
export type UpsertNotionIntegrationInput = {
  userId: string;
  accessToken: string; // 平文（DB書き込み時に暗号化される）
  refreshToken: string; // 平文（DB書き込み時に暗号化される）
  workspaceId: string;
  workspaceName: string;
};

/**
 * NotionIntegrationのDB操作Repository
 *
 * - 暗号化/復号はこの層で透過処理する
 * - 上位レイヤ（Service/Controller）は暗号化を意識しない
 */
@Injectable()
export class NotionIntegrationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: CipherService,
  ) {}

  /**
   * userIdでnotionIntegrationの存在確認。
   * status確認や存在チェックに使う。
   */
  async findByUserId(userId: string): Promise<NotionIntegration | null> {
    return this.prisma.notionIntegration.findUnique({
      where: { userId },
    });
  }

  /**
   * userId に紐づく AT/RT を「平文」で取得する
   *
   * 復号はこの層で行い、上位レイヤから CipherService を意識させない方針。
   * Notion API を叩くときに使う（AT を Authorization に乗せる、RT で refresh する など）。
   * 未連携の場合は null を返す。
   */
  async findDecryptedByUserId(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    workspaceId: string;
    workspaceName: string;
  } | null> {
    const integration = await this.prisma.notionIntegration.findUnique({
      where: { userId },
    });
    if (!integration) return null;

    return {
      accessToken: this.cipher.decrypt(integration.accessTokenEnc),
      refreshToken: this.cipher.decrypt(integration.refreshTokenEnc),
      workspaceId: integration.workspaceId,
      workspaceName: integration.workspaceName,
    };
  }

  /**
   * 同一userIdのレコードをあれば上書き、なければ新規作成する
   *
   * Notion設計上、１ユーザは常に最新の１連携情報のみを持つ。
   */
  async upsert(
    input: UpsertNotionIntegrationInput,
  ): Promise<NotionIntegration> {
    // トークンを暗号化
    const accessTokenEnc = this.cipher.encrypt(input.accessToken);
    const refreshTokenEnc = this.cipher.encrypt(input.refreshToken);

    // create用とupdate用で共通する書き込みカラム
    const data = {
      accessTokenEnc,
      refreshTokenEnc,
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
    };

    return this.prisma.notionIntegration.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * userIdに紐づくNotionIntegrationを削除する
   */
  async delete(userId: string): Promise<void> {
    await this.prisma.notionIntegration.deleteMany({
      where: { userId },
    });
  }
}
