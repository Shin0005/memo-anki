import { HttpError } from './httpError';
import { HttpStatus } from './statusCodes';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// fetchラッパー
export async function apiClient(url: string, method: string, body?: unknown) {
  // のちにメモリ（zustand）から取得？
  const accessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZjVhMDhlMC1kNzJjLTRlZDUtYjQzOC0xYWZlMmUwOTlmZGMiLCJpYXQiOjE3Nzc3MTE0NjUsImV4cCI6MTc3NzcxMjM2NX0.WNMDROwVUszg4_gNec2tdFN5vhXaPImWhQvP5eT_BnQ';

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
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? 'Fetch Failed');
    throw new HttpError(res.status, message);
  }

  if (res.status === HttpStatus.NO_CONTENT) return null;
  return res.json();
}
