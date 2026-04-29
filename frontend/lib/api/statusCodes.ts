/**
 * NestJSのstatusCodeのNext.jsバージョン
 */
export const HttpStatus = {
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
} as const;
