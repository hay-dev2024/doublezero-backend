import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, ValidateNested, IsNumber, Min, Max } from "class-validator";

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
}