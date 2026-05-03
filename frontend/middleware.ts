import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/** リクエスト前の割り込み処理 認証の合否によりリダイレクトする */
export function middleware(request: NextRequest) {
  // 現在リクエストされているpath名(例:/decks/1)を取得
  const { pathname } = request.nextUrl;
  // path名がloginで始まるなら通過。
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // RT Cookieがなければ未認証扱いで/login へ。
  // RTのチェックはリクエスト送信時におこなわれる。
  const refreshToken = request.cookies.get('refresh_token');
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

// _next/static・_next/image・favicon.ico 以外の全リクエストを割り込み対象とする。
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
