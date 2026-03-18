import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '.././prisma/prisma.service';

// createの引数契約 外に出すことで代入しやすくる
export type CreateUserInput = {
  username: string;
  password: string;
  email?: string | null;
};

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * ユーザ登録
   * パスワードのハッシュ化と、Prisma用データへの詰め替えを行う
   * @param CreateUserInput
   * @returns Promise<User>
   */
  async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Prisma標準のdtoを利用
    const createInput: Prisma.UserCreateInput = {
      username: input.username,
      passwordHash: passwordHash,
      email: input.email,
    };
    return await this.prismaService.user.create({ data: createInput });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.prismaService.user.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prismaService.user.findUnique({
      where: { email },
    });
  }
}
