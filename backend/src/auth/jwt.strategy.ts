import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string, // .env参照のためundefinedはない
    });
  }

  // Guardが内部で呼び出すメソッド
  validate(payload: { sub: string }) {
    return { id: payload.sub };
  }
}
