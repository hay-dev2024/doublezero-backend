import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    description: '세션 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: '세션 상태',
    enum: ['active', 'stopped'],
    example: 'active',
  })
  status: 'active' | 'stopped';

  @ApiProperty({
    description: 'SSE 스트림 URL',
    example: '/navigation/session/stream?sessionId=550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  streamUrl?: string;

  @ApiProperty({
    description: '예상 운전 시간 (초)',
    example: 3600,
    required: false,
  })
  estimatedDuration?: number;

  @ApiProperty({
    description: '전체 경로 거리 (미터)',
    example: 45000,
    required: false,
  })
  totalDistance?: number;

  @ApiProperty({
    description: '세션 지속 시간 (초) - stop 응답에만 포함',
    example: 1800,
    required: false,
  })
  duration?: number;
}
