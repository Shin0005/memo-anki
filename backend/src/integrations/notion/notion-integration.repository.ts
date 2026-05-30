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
