import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, ValidateNested } from "class-validator";

class LocationDto {
    @IsNotEmpty()
    @Type(() => Number)
    lat: number;

    @IsNotEmpty()
    @Type(() => Number)
    lon: number;
}

export class RouteRequestDto {
    @ValidateNested()
    @Type(() => LocationDto)
    origin: LocationDto;

    @ValidateNested()
    @Type(() => LocationDto)
    destination: LocationDto;

    @IsOptional()
    @IsEnum(['DRIVE', 'BICYCLE', 'WALK', 'TWO_WHEELER'])
    travelMode?: string = 'DRIVE';
}