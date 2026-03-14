import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  // パスワードはハッシュ化する。サービスの責務。
  async create(username: string, password: string, email?: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userRepository.create({ username, passwordHash, email });
  }

  async findByUsername(username: string) {
    return this.userRepository.findByUsername(username);
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }
}
