import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RiskPointDto {
  @ApiProperty({ example: 37.4219999, description: 'Latitude' })
  @Expose()
  lat: number;

  @ApiProperty({ example: -122.0840575, description: 'Longitude' })
  @Expose()
  lng: number;

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
}
