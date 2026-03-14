import { Injectable } from '@nestjs/common';
import { PrismaService } from '.././prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private prismaService: PrismaService) {}
  // asuncなしでも動くが、prismaがpromiseを返すので明示しておく。
  async create(data: {
    username: string;
    passwordHash: string;
    email?: string;
  }) {
    return this.prismaService.user.create({ data });
  }

  async findByUsername(username: string) {
    return this.prismaService.user.findUnique({ where: { username } });
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }
}
