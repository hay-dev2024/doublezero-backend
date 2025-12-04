import { ApiProperty } from '@nestjs/swagger';
import { RiskPointDto } from '../../ai/dto/risk-point.dto';
import { RiskSummaryDto } from './risk-summary.dto';

export class CurrentPositionDto {
  @ApiProperty({ description: 'Latitude', example: 37.5665 })
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 126.9780 })
  lng: number;

  @ApiProperty({ description: 'Distance traveled from origin (meters)', example: 2500 })
  distanceFromStart: number;

  @ApiProperty({ description: 'Remaining distance to destination (meters)', example: 42500 })
  remainingDistance: number;
}

export class EnhancedRiskSummaryDto extends RiskSummaryDto {
  @ApiProperty({
    description: 'Risk urgency level',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  urgency: 'low' | 'medium' | 'high';
}

export class RiskUpdateDto {
  @ApiProperty({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Update timestamp',
    example: '2025-12-01T10:35:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Current position information',
    type: CurrentPositionDto,
  })
  currentPosition: CurrentPositionDto;

  @ApiProperty({
    description: 'Array of risk points',
    type: [RiskPointDto],
  })
  riskPoints: RiskPointDto[];

  @ApiProperty({
    description: 'Risk summary',
    type: EnhancedRiskSummaryDto,
  })
  summary: EnhancedRiskSummaryDto;
}

export class SessionEndedDto {
  @ApiProperty({
    description: 'Terminated session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Termination reason',
    enum: ['destination-reached', 'user-stopped', 'timeout'],
    example: 'destination-reached',
  })
  reason: 'destination-reached' | 'user-stopped' | 'timeout';
}
