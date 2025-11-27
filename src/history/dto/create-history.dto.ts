import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class CoordinateDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;
}

export class CreateHistoryDto {
  @ValidateNested()
  @Type(() => CoordinateDto)
  origin: CoordinateDto;

  @ValidateNested()
  @Type(() => CoordinateDto)
  destination: CoordinateDto;

  @IsOptional()
  @IsString()
  polyline?: string;

  @IsOptional()
  @IsNumber()
  distanceMeters?: number;

  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsNumber()
  sampleCount?: number;

  @IsOptional()
  @IsBoolean()
  includeRisk?: boolean;

  @IsOptional()
  @IsObject()
  riskSummary?: any;

  @IsOptional()
  @IsObject()
  weatherSummary?: any;

  @IsOptional()
  @IsArray()
  riskPoints?: any[];

  @IsOptional()
  @Type(() => Date)
  startedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  endedAt?: Date;
}
