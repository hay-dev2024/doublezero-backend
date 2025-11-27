import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class RiskSummaryDto {
  @ApiProperty({ example: 'High', description: "Risk level: Low|Medium|High" })
  @Expose()
  level: 'Low' | 'Medium' | 'High';

  @ApiProperty({ example: 0.88, description: 'Average weight (0..1)' })
  @Expose()
  avgWeight: number;

  @ApiProperty({ example: 0.91, description: 'Maximum weight (0..1)' })
  @Expose()
  maxWeight: number;

  @ApiProperty({ example: 2, description: 'Number of hotspots above threshold' })
  @Expose()
  hotspotCount: number;

  @ApiProperty({ example: 0.66, description: 'Hotspot threshold used to count hotspots' })
  @Expose()
  hotspotThreshold: number;

  @ApiProperty({ example: 'High risk — 2 hotspot(s) (max 0.91)', description: 'Human readable summary text', required: false })
  @Expose()
  message?: string;
}
