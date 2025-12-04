import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Session status',
    enum: ['active', 'stopped'],
    example: 'active',
  })
  status: 'active' | 'stopped';

  @ApiProperty({
    description: 'SSE stream URL',
    example: '/navigation/session/stream?sessionId=550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  streamUrl?: string;

  @ApiProperty({
    description: 'Estimated driving duration (seconds)',
    example: 3600,
    required: false,
  })
  estimatedDuration?: number;

  @ApiProperty({
    description: 'Total route distance (meters)',
    example: 45000,
    required: false,
  })
  totalDistance?: number;

  @ApiProperty({
    description: 'Session duration (seconds) - included only in stop response',
    example: 1800,
    required: false,
  })
  duration?: number;
}
