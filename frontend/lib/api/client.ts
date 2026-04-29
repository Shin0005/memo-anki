import { HttpError } from './httpError';
import { HttpStatus } from './statusCodes';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// fetchラッパー
export async function apiClient(url: string, method: string, body?: unknown) {
  // のちにメモリ（zustand）から取得？
  const accessToken = '';

  let res;
  try {
    res = await fetch(`${BASE_URL}${url}`, {
      method,
      credentials: 'include', // jwtをrequestに含める
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('NetworkError');
  }
  if (!res.ok) throw new HttpError(res.status, 'Fetch Failed');

  if (res.status === HttpStatus.NO_CONTENT) return null;
  return res.json();
}
