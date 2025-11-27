import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, ValidateNested, IsNumber, Min, Max, IsBoolean, IsInt, IsObject } from "class-validator";

class LocationDto {
    @ApiProperty({ 
        example: 37.7749, 
        description: 'Latitude',
        minimum: -90,
        maximum: 90,
    })
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat: number;

    @ApiProperty({ 
        example: -122.4194, 
        description: 'Longitude',
        minimum: -180,
        maximum: 180,
    })
    @IsNumber()
    @Min(-180)
    @Max(180)
    lon: number;
}

export class RouteRequestDto {
    @ApiProperty({
        description: 'Starting location',
        type: LocationDto,
    })
    @ValidateNested()
    @Type(() => LocationDto)
    origin: LocationDto;

    @ApiProperty({
        description: 'Destination location',
        type: LocationDto,
    })
    @ValidateNested()
    @Type(() => LocationDto)
    destination: LocationDto;

    @ApiProperty({
        example: 'DRIVE',
        enum: ['DRIVE', 'BICYCLE', 'WALK', 'TWO_WHEELER'],
        description: 'Travel mode',
        required: false,
        default: 'DRIVE',
    })
    @IsOptional()
    @IsEnum(['DRIVE', 'BICYCLE', 'WALK', 'TWO_WHEELER'])
    travelMode?: string = 'DRIVE';

    @ApiProperty({
        example: false,
        description: 'Whether to request one alternative route in addition to the primary route',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    alternatives?: boolean = false;

    @ApiProperty({
        example: 3,
        description: 'Number of risk sample points to request for heatmap (client default 3, server max 20)',
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    sampleCount?: number = 3;

    @ApiProperty({
        example: true,
        description: 'Whether to include riskPoints in the route response (default true). If false, route is returned without riskPoints.',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    includeRisk?: boolean = true;

    @ApiPropertyOptional({
        description: 'Test-only: simulate aggregated weather for sampled points. Example: { avgPrecipIn: 0.5, avgVisibilityMi: 1.2, avgWindMph: 25 }',
        required: false,
    })
    @IsOptional()
    @IsObject()
    simulateWeather?: Record<string, any>;
}