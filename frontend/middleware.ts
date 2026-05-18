import { NextResponse } from 'next/server';

/**
 * 認証ガード middleware（現在は無効化中）
 *
 * 【無効化している理由】
 * 本番では フロント(Vercel)と バックエンド(Railway) が別ドメインのため、
 * バックエンドが Set-Cookie で発行した refresh_token は Railway ドメインに紐付き、
 * Vercel(=この middleware が動く場所) には届かない。
 * 結果、ログイン直後でも request.cookies.get('refresh_token') が必ず undefined になり、
 * すべてのページが /login に無限リダイレクトされてしまうため一時停止している。
 *
 * 認証自体は API 呼び出し時にバックエンドが AT/RT を検証するので、
 * この middleware が無くてもセキュリティ上は問題ない
 *
 * 【復活させるタイミング】
 * 独自ドメインを取得し、フロントとバックエンドを同じ親ドメイン配下に揃えた時。
 * この状態なら Vercel 側の middleware からも refresh_token が見えるので、
 * 下のロジックをそのまま有効化できる。
 */

// const PUBLIC_PATHS = ['/login'];
//
// /** リクエスト前の割り込み処理 認証の合否によりリダイレクトする */
// export function middleware(request: NextRequest) {
//   // 現在リクエストされているpath名(例:/decks/1)を取得
//   const { pathname } = request.nextUrl;
//   // path名がloginで始まるなら通過。
//   if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
//     return NextResponse.next();
//   }
//
//   // RT Cookieがなければ未認証扱いで/login へ。
//   // RTのチェックはリクエスト送信時におこなわれる。
//   const refreshToken = request.cookies.get('refresh_token');
//   if (!refreshToken) {
//     return NextResponse.redirect(new URL('/login', request.url));
//   }
//   return NextResponse.next();
// }

// 無効化中は全リクエストを素通しする。
export function middleware() {
  return NextResponse.next();
}

// _next/static・_next/image・favicon.ico 以外の全リクエストを割り込み対象とする。
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
