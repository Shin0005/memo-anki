import { HttpError } from './httpError';
import { HttpStatus } from './statusCodes';
import { useAuthStore } from '@/lib/store/useAuthStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/** api接続処理の流れ */
export async function apiClient(url: string, method: string, body?: unknown) {
  // 通常fetch
  let res = await fetchOnce(
    url,
    method,
    body,
    useAuthStore.getState().accessToken,
  );

  // 401(ATが無効or存在しない)の場合に、リフレッシュして再試行
  if (res.status === HttpStatus.UNAUTHORIZED) {
    const newToken = await refreshAccessToken();
    res = await fetchOnce(url, method, body, newToken);
  }

  if (!res.ok) throw await toHttpError(res);

  if (res.status === HttpStatus.NO_CONTENT) return null;
  return res.json();
}

/** fetchラッパー */
async function fetchOnce(
  url: string,
  method: string,
  body: unknown,
  token: string | null,
): Promise<Response> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    return await fetch(`${BASE_URL}${url}`, {
      method,
      credentials: 'include', // cookieにRT保存
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('NetworkError');
  }
}

/** レスポンスのエラーメッセージを整形してHttpErrorを生成する */
async function toHttpError(res: Response): Promise<HttpError> {
  const body = await res.json().catch(() => null);
  // レスポンスメッセージは配列(validation)もしくは文字列で来る
  const message = Array.isArray(body?.message)
    ? body.message.join(', ') // 配列なら結合
    : (body?.message ?? 'Fetch Failed');
  return new HttpError(res.status, message, body?.code);
}

/**
 * 進行中のリフレッシュを共有するためのPromise。
 * 複数リクエストが同時に401になっても/auth/refreshを1回に集約する。
 * RTは単回使用（呼ぶたびにローテーション）のため、並列に投げると
 * 後発リクエストが古いRTで401になる。それを防ぐ。
 */
let refreshPromise: Promise<string> | null = null;

/** リフレッシュ処理 RTを用いてATを取得する */
export async function refreshAccessToken(): Promise<string> {
  // 既に進行中ならそれを待つ（重複リフレッシュ＝RT競合の防止）
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetchOnce('/auth/refresh', 'POST', undefined, null);

    if (!res.ok) throw await toHttpError(res);

    const data = (await res.json()) as { accessToken: string };
    useAuthStore.getState().setAccessToken(data.accessToken);
    return data.accessToken;
  })().finally(() => {
    // 成否に関わらず次回のために解放する
    refreshPromise = null;
  });

  return refreshPromise;
}
