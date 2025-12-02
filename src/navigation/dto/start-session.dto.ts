import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsISO8601, IsNumber, Min, Max, IsUUID } from 'class-validator';

export class StartSessionDto {
  @ApiProperty({
    description: '세션 고유 ID (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID(4)
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Google Routes API의 인코딩된 polyline',
    example: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  })
  @IsString()
  @IsNotEmpty()
  polyline: string;

  @ApiProperty({
    description: '운전 시작 시각 (ISO 8601)',
    example: '2025-12-01T10:30:00Z',
  })
  @IsISO8601()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: '시뮬레이션 평균 속도 (km/h)',
    example: 60,
    default: 60,
  })
  @IsNumber()
  @Min(1)
  @Max(200)
  estimatedSpeedKmh: number = 60;
}
