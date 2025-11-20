import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class WeatherUiDto {
    @ApiProperty({ example: 22.5, description: 'Temperature in Celsius'})
    @Expose()
    temperature: number;

    @ApiProperty({ example: 20.3, description: 'Feels like temperature in Celsius' })
    @Expose()
    feelsLike: number;

    @ApiProperty({ example: 'Clear', description: 'Weather condition (Clear, Clouds, Rain, etc)' })
    @Expose()
    weather: string;

    @ApiProperty({ example: 'clear sky', description: 'Detailed weather description' })
    @Expose()
    description: string;

    @ApiProperty({ example: '01d', description: 'Weather icon code' })
    @Expose()
    icon: string;

    @ApiProperty({ example: 65, description: 'Humidity percentage' })
    @Expose()
    humidity: number;

    @ApiProperty({ example: 3.5, description: 'Wind speed in m/s' })
    @Expose()
    windSpeed: number;

    @ApiProperty({ example: 1013, description: 'Atmospheric pressure in hPa' })
    @Expose()
    pressure: number;

    @ApiProperty({ example: 10.0, description: 'Visibility in km' })
    @Expose()
    visibility: number;
}