import { ApiProperty } from '@nestjs/swagger';
import { RiskPointDto } from '../../ai/dto/risk-point.dto';
import { RiskSummaryDto } from './risk-summary.dto';

export class CurrentPositionDto {
  @ApiProperty({ description: '위도', example: 37.5665 })
  lat: number;

  @ApiProperty({ description: '경도', example: 126.9780 })
  lng: number;

  @ApiProperty({ description: '출발지로부터 이동 거리 (미터)', example: 2500 })
  distanceFromStart: number;

  @ApiProperty({ description: '목적지까지 남은 거리 (미터)', example: 42500 })
  remainingDistance: number;
}

export class EnhancedRiskSummaryDto extends RiskSummaryDto {
  @ApiProperty({
    description: '위험도 긴급성',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  urgency: 'low' | 'medium' | 'high';
}

export class RiskUpdateDto {
  @ApiProperty({
    description: '세션 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: '업데이트 시각',
    example: '2025-12-01T10:35:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '현재 위치 정보',
    type: CurrentPositionDto,
  })
  currentPosition: CurrentPositionDto;

  @ApiProperty({
    description: '위험도 포인트 배열',
    type: [RiskPointDto],
  })
  riskPoints: RiskPointDto[];

  @ApiProperty({
    description: '위험도 요약',
    type: EnhancedRiskSummaryDto,
  })
  summary: EnhancedRiskSummaryDto;
}

export class SessionEndedDto {
  @ApiProperty({
    description: '종료된 세션 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: '종료 사유',
    enum: ['destination-reached', 'user-stopped', 'timeout'],
    example: 'destination-reached',
  })
  reason: 'destination-reached' | 'user-stopped' | 'timeout';
}
