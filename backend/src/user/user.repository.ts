import { Injectable } from '@nestjs/common';
import { PrismaService } from '.././prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prismaService: PrismaService) {}
  // asyncなしでも動くが、prismaがpromiseを返すので明示しておく。
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prismaService.user.create({ data });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }
}
