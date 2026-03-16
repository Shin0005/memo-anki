export class AuthResponse {
  username: string;
  email?: string;
  accessToken: string;

  constructor(username: string, accessToken: string, email?: string | null) {
    this.username = username;
    this.email = email ?? undefined;
    this.accessToken = accessToken;
  }
}
