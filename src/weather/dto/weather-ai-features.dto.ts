import { Expose } from "class-transformer";

export class WeatherAiFeaturesDto {
    @Expose()
    temperatureF: number;

    @Expose()
    windChillF: number;
    
    @Expose()
    windSpeedMph: number;

    @Expose()
    visibilityMi: number;

    @Expose()
    pressureIn: number;

    @Expose()
    precipitationIn: number;
    
    @Expose()
    humidity: number;
}