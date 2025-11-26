import { ApiProperty } from '@nestjs/swagger';

export class PredictResponseDto {
  @ApiProperty({
    example: 0.9512,
    description: 'Probability of Severity 2',
  })
  P_Severity_2: number;

  @ApiProperty({
    example: 0.0488,
    description: 'Probability of Severity 3',
  })
  P_Severity_3: number;

  @ApiProperty({
    example: 1,
    description: 'Predicted risk tier (0: Low Risk, 1: Observation, 2: High Risk)',
  })
  predicted_risk_tier: number;

  @ApiProperty({
    example: 'Tier 1: Observation/Medium Risk (Gray Zone or Low Confidence in Safety - Needs Review)',
    description: 'Human-readable interpretation of the risk tier',
  })
  tier_interpretation: string;
}
