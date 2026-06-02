import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CardModule } from '../../card/card.module';
import { EncryptionModule } from '../../common/encryption/encryption.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotionApiClient } from './notion-api.client';
import { NotionDataController } from './notion-data.controller';
import { NotionDataService } from './notion-data.service';
import { NotionIntegrationRepository } from './notion-integration.repository';
import { NotionMapper } from './notion.mapper';
import { NotionOAuthController } from './notion-oauth.controller';
import { NotionOAuthService } from './notion-oauth.service';

@Module({
  imports: [PrismaModule, EncryptionModule, AuthModule, CardModule],
  controllers: [NotionOAuthController, NotionDataController],
  providers: [
    NotionOAuthService,
    NotionIntegrationRepository,
    // Notion データ取得層
    NotionApiClient,
    NotionMapper,
    NotionDataService,
  ],
  exports: [NotionOAuthService, NotionIntegrationRepository],
})
export class NotionModule {}
