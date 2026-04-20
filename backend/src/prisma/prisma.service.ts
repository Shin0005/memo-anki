import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// any型を回避
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // OpenAPI生成スクリプトはAppModule全体を初期化するため onModuleInit が呼ばれる。
    // DBのない環境（CI等）でも生成できるよう、GENERATE_OPENAPI=true のときは接続をスキップする。
    if (process.env.GENERATE_OPENAPI !== 'true') {
      await this.$connect();
    }
  }
}
