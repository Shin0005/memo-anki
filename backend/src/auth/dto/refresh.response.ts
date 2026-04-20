import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
}
