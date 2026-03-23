import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * UseGuardがRequestに追加したuserセクションからidを取り出すカスタムデコレータ
 */
export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    // RequestにはapiEndPointからのリクエスト情報が含まれる。@UseGuardを使うことで
    // Userセクションが追加され、ユーザidなどの情報が格納される。
    const request = ctx.switchToHttp().getRequest<Request>();

    // UseGuardは実行時にuserを追加するのでコンパイル時には
    // userは認識されないので強制的に認識させる。
    const user = request.user as { id: string }; //プロパティを認識させる
    return user.id;
  },
);
