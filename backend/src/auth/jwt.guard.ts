import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// endpointにTokenを要求するための宣言。UseGuardでvalidate()が呼ばれる。
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
