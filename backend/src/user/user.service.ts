import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '.././prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * ユーザ登録
   * パスワードのハッシュ化と、Prisma用データへの詰め替えを行う
   * @returns Promise<User>
   */
  // パスワードはハッシュ化する。サービスの責務。
  async create(dto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Prisma標準のdtoを利用
    const createInput: Prisma.UserCreateInput = {
      username: dto.username,
      passwordHash: passwordHash,
      email: dto.email,
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
