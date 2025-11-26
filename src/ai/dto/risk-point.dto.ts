import { ApiProperty } from '@nestjs/swagger';

export class RiskPointDto {
  @ApiProperty({ example: 37.4219999, description: 'Latitude' })
  lat: number;

  @ApiProperty({ example: -122.0840575, description: 'Longitude' })
  lng: number;

  @ApiProperty({
    example: 1,
    description: 'Risk tier (0: Low, 1: Medium, 2: High)',
  })
  tier: number;

  @ApiProperty({
    example: 0.2098,
    description: 'Probability of Severity 3 (optional)',
    required: false,
  })
  severity3Probability?: number;
}
