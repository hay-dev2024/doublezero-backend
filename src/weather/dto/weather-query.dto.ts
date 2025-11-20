import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsNotEmpty, IsNumber } from "class-validator";


export class WeatherQueryDto {
    @ApiProperty({
        example: 37.5665,
        description: 'Latitude coordinate',
        minimum: -90,
        maximum: 90,
    })
    @Type(() => Number)
    @IsNumber({}, { message: 'Latitude must be a number' })
    @IsLatitude({ message: 'Latitude must be between -90 and 90' })
    @IsNotEmpty({ message: 'Latitude is required' })
    lat: number;

    @ApiProperty({
        example: 126.9780,
        description: 'Longitude coordinate',
        minimum: -180,
        maximum: 180,
    })
    @Type(() => Number)
    @IsNumber({}, { message: 'Longitude must be a number' })
    @IsLongitude({ message: 'Longitude must be between -180 and 180' })
    @IsNotEmpty({ message: 'Longitude is required' })
    lon: number;
}
