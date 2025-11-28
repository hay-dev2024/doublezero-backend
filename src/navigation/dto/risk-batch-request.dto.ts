import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested, ArrayMaxSize, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RiskBatchPointDto {
  @ApiProperty({ example: 37.4219999 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -122.0840575 })
  @IsNumber()
  lon: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  pointIndex?: number;

  @ApiProperty({ example: '2025-11-26 16:44:10', required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class RiskBatchRequestDto {
  @ApiProperty({ example: 'req-12345', required: false, description: 'Optional client request id for idempotency' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiProperty({ description: 'Array of points to predict' })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => RiskBatchPointDto)
  points: RiskBatchPointDto[];

  @ApiProperty({ example: {}, required: false, description: 'Optional metadata the client can provide (routeId, tags, etc.)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
