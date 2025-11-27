import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RiskPointDto {
  @ApiProperty({ example: 37.4219999, description: 'Latitude' })
  @Expose()
  lat: number;

  @ApiProperty({ example: -122.0840575, description: 'Longitude' })
  @Expose()
  lon: number;

  @ApiProperty({
    example: 1,
    description: 'Risk tier (0: Low, 1: Medium, 2: High)',
  })
  @Expose()
  tier: number;

  @ApiProperty({
    example: 0.2098,
    description: 'Probability of Severity 3 (optional)',
    required: false,
  })
  @Expose()
  severity3Probability?: number;

  @ApiProperty({
    example: 0.78,
    description: 'Normalized weight for heatmap (0.0 - 1.0)',
    required: false,
  })
  @Expose()
  weight?: number;

  @ApiProperty({
    example: 0,
    description: 'Index of the point along the decoded polyline (optional)',
    required: false,
  })
  @Expose()
  pointIndex?: number;

  @ApiProperty({
    example: 1234,
    description: 'Distance from route start in meters (optional)',
    required: false,
  })
  @Expose()
  distanceFromStartMeters?: number;

  @ApiProperty({
    example: '2025-11-26 16:44:10',
    description: "Timestamp used for prediction (format 'YYYY-MM-DD HH:MM:SS')",
    required: false,
  })
  @Expose()
  timestamp?: string;

  @ApiProperty({
    example: 'ai',
    description: 'Source of the risk value (ai|mock)',
    required: false,
  })
  @Expose()
  source?: string;
}
