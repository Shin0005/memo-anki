import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponse {
  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  constructor(username: string, accessToken: string, email?: string | null) {
    this.username = username;
    this.email = email ?? undefined;
    this.accessToken = accessToken;
  }
}
