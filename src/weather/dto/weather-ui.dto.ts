import { Expose } from "class-transformer";

export class WeatherUiDto {
    @Expose()
    temperature: number;

    @Expose()
    feelsLike: number;

    @Expose()
    weather: string;

    @Expose()
    description: string;

    @Expose()
    icon: string;

    @Expose()
    humidity: number;

    @Expose()
    windSpeed: number;

    @Expose()
    pressure: number;

    @Expose()
    visibility: number;
}