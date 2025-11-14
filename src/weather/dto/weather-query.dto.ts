import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsNotEmpty, IsNumber } from "class-validator";


export class WeatherQueryDto {
    @Type(() => Number)
    @IsNumber({}, { message: 'Latitude must be a number' })
    @IsLatitude({ message: 'Latitude must be between -90 and 90' })
    @IsNotEmpty({ message: 'Latitude is required' })
    lat: number;

    @Type(() => Number)
    @IsNumber({}, { message: 'Longitude must be a number' })
    @IsLongitude({ message: 'Longitude must be between -180 and 180' })
    @IsNotEmpty({ message: 'Longitude is required' })
    lon: number;
}
