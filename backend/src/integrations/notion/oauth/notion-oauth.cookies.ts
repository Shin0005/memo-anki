import express from 'express';

/** CSRF対策用のランダムstate */
export const COOKIE_OAUTH_STATE = 'oauth_state';
/** 認可後の戻り先となるデッキID */
export const COOKIE_OAUTH_DECK_ID = 'oauth_deck_id';
/** callback時にuserIdを識別するためのID */
export const COOKIE_OAUTH_USER_ID = 'oauth_user_id';

/** state Cookieの有効期間（5分） */
export const COOKIE_MAX_AGE = 5 * 60 * 1000;

/**
 * OAuth用Cookieをまとめて破棄する
 *
 * callback成功・失敗のいずれでも実行する（再利用防止のため）
 */
export function clearOAuthCookies(res: express.Response) {
  // 発行時(startAuth)と同じ属性でないとブラウザはCookieを削除できない。
  const isProd = process.env.NODE_ENV === 'production';
  const clearOptions: express.CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
  res.clearCookie(COOKIE_OAUTH_STATE, clearOptions);
  res.clearCookie(COOKIE_OAUTH_DECK_ID, clearOptions);
  res.clearCookie(COOKIE_OAUTH_USER_ID, clearOptions);
}
