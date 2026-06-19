export class HttpError extends Error {
  statusCode: number;
  /**
   * バックエンドが付与する識別コード（例: 'NOTION_REAUTH_REQUIRED'）。
   * HTTPステータスだけでは区別できないケースをフロントが判別するために使う。
   */
  code?: string;
  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
