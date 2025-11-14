import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { plainToInstance } from 'class-transformer';
import { WeatherUiDto } from './dto/weather-ui.dto';
import { WeatherAiFeaturesDto } from './dto/weather-ai-features.dto';

@Injectable()
export class WeatherService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
        if (!apiKey) {
            throw new Error('OPENWEATHER_API_KEY is not defined in environment variables');
        }
        this.apiKey = apiKey;
    }

    async getCurrentWeatherForUI(lat: number, lon: number): Promise<WeatherUiDto> {
        try {
            const data = await this.fetchWeatherData(lat, lon);

            const responseData = {                
                temperature: Math.round(data.main.temp * 10) / 10,
                feelsLike: Math.round(data.main.feels_like * 10) / 10,
                weather: data.weather[0].main,
                description: data.weather[0].description,
                icon: data.weather[0].icon,
                humidity: data.main.humidity,
                windSpeed: Math.round(data.wind.speed * 10) / 10,
                pressure: data.main.pressure,
                visibility: Math.round(data.visibility / 100) / 10, 
            };

            return plainToInstance(WeatherUiDto, responseData, {
                excludeExtraneousValues: true,
            });
        } catch(error) {
            this.handleError(error);
        }
    }

    async getCurrentWeatherForAI(lat: number, lon: number): Promise<WeatherAiFeaturesDto> {
        try {
            const data = await this.fetchWeatherData(lat, lon);

            // imperial 단위로 변환(AI)
            const tempF = this.celsiusToFahrenheit(tempC);
            const feelsLikeF = this.celsiusToFahrenheit(feelsLikeC);
            const windSpeedMph = this.msToMph(windSpeedMs);
            const visibilityMi = this.metersToMiles(visibilityM);
            const pressureIn = this.hPaToInHg(pressureHPa);
            const precipitationIn = this.mmToInches(totalPrecipMm);

            // 강수량
            const rainMm = data.rain?.['1h'] || 0;
            const snowMm = data.snow?.['1h'] || 0;
            const totalPrecipMm = rainMm + snowMm;

            const responseData = {
                temperatureF: Math.round(tempF * 10) / 10,
                windChillF: Math.round(feelsLikeF * 10) / 10,
                windSpeedMph: Math.round(windSpeedMph * 10) / 10,
                visibilityMi: Math.round(visibilityMi * 100) / 100,
                pressureIn: Math.round(pressureIn * 100) / 100,
                precipitationIn: Math.round(precipitationIn * 100) / 100,
                humidity: data.main.humidity,
            };

            return plainToInstance(WeatherAiFeaturesDto, responseData, {
                excludeExtraneousValues: true,
            });
        } catch(error) {
            this.handleError(error);
        }
    }


    // OpenWeather API 호출
    private async fetchWeatherData(lat: number, lon: number): Promise<any> {
        const url = `${this.baseUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`;
        const response = await firstValueFrom(this.httpService.get(url));
        return response.data;
    }

    // error handling
    private handleError(error: any): never {
        if (error instanceof AxiosError) {
            if (error.response) {
                throw new HttpException(
                    `OpenWeather API Error: ${error.response.data?.message || 'Unknown error'}`,
                    error.response.status,
                );
            }
            throw new HttpException(
                `Network error: ${error.message}`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
        throw new HttpException(
            'Failed to fetch weather data',
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    // 단위 변환 함수
    private celsiusToFahrenheit(celsius: number): number {
        return (celsius * 9) / 5 + 32;
    }

    private msToMph(ms: number): number {
        return ms * 2.23694;
    }

    private metersToMiles(meters: number): number {
        return meters * 0.000621371;
    }

    private hPaToInHg(hPa: number): number {
        return hPa * 0.02953;
    }

    private mmToInches(mm: number): number {
        return mm * 0.0393701;
    }
}


