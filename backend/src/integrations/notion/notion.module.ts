import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { EncryptionModule } from '../../common/encryption/encryption.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotionApiClient } from './notion-api.client';
import { NotionIntegrationRepository } from './notion-integration.repository';
import { NotionMapper } from './notion.mapper';
import { NotionOAuthController } from './notion-oauth.controller';
import { NotionOAuthService } from './notion-oauth.service';

@Module({
  imports: [PrismaModule, EncryptionModule, AuthModule],
  controllers: [NotionOAuthController],
  providers: [
    NotionOAuthService,
    NotionIntegrationRepository,
    NotionApiClient,
    NotionMapper,
  ],
  exports: [NotionOAuthService, NotionIntegrationRepository],
})
export class NotionModule {}
