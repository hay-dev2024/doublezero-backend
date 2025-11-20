import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class WeatherAiFeaturesDto {
    @ApiProperty({ example: 72.5, description: 'Temperature in Fahrenheit' })
    @Expose()
    temperatureF: number;

    @ApiProperty({ example: 68.5, description: 'Wind chill temperature in Fahrenheit' })
    @Expose()
    windChillF: number;
    
    @ApiProperty({ example: 7.8, description: 'Wind speed in mph' })
    @Expose()
    windSpeedMph: number;

    @ApiProperty({ example: 6.21, description: 'Visibility in miles' })
    @Expose()
    visibilityMi: number;

    @ApiProperty({ example: 29.92, description: 'Atmospheric pressure in inHg' })
    @Expose()
    pressureIn: number;

    @ApiProperty({ example: 0.04, description: 'Precipitation in inches' })
    @Expose()
    precipitationIn: number;
    
    @ApiProperty({ example: 65, description: 'Humidity percentage' })
    @Expose()
    humidity: number;
}