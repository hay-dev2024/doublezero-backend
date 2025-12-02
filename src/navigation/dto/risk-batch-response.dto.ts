import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RiskPointDto } from 'src/ai/dto/risk-point.dto';
import { RiskSummaryDto } from './risk-summary.dto';

export class RiskBatchResponseDto {
  @ApiProperty({ example: 'req-12345', required: false })
  @Expose()
  requestId?: string;

  @ApiProperty({ example: 'route-1', required: false })
  @Expose()
  routeId?: string;

  @ApiProperty({ description: 'Predicted risk points', type: [Object], example: [{ lat: 37.4219999, lon: -122.0840575, tier: 0, severity3Probability: 0.15, weight: 0.15, source: 'ai' }] })
  @Expose()
  results: RiskPointDto[];

  @ApiProperty({ description: 'Normalized scale used for weights', example: { min: 0, max: 1 } })
  @Expose()
  scale: { min: number; max: number };

  @ApiProperty({ description: 'Aggregated risk summary (optional)', required: false, example: { level: 'Low', avgWeight: 0.15, maxWeight: 0.15, hotspotCount: 0, hotspotThreshold: 0.66 } })
  @Expose()
  summary?: RiskSummaryDto;
}
