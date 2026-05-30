import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { EncryptionModule } from '../../common/encryption/encryption.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotionIntegrationRepository } from './notion-integration.repository';
import { NotionOAuthController } from './notion-oauth.controller';
import { NotionOAuthService } from './notion-oauth.service';

@Module({
  imports: [PrismaModule, EncryptionModule, AuthModule],
  controllers: [NotionOAuthController],
  providers: [NotionOAuthService, NotionIntegrationRepository],
  exports: [NotionOAuthService, NotionIntegrationRepository],
})
export class NotionModule {}
