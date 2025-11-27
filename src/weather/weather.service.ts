import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { WeatherUiDto } from './dto/weather-ui.dto';
import { WeatherAiFeaturesDto } from './dto/weather-ai-features.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class WeatherService {
    private readonly logger = new Logger(WeatherService.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        const apiKey = this.configService.getOrThrow<string>('OPENWEATHER_API_KEY');
        if (!apiKey) {
            throw new Error('OPENWEATHER_API_KEY is not defined in environment variables');
        }
        this.apiKey = apiKey;
    }

    async getCurrentWeatherForUI(lat: number, lon: number): Promise<WeatherUiDto> {
        // cache
        const cacheKey = `weather:ui:${lat},${lon}`;

        const cached = await this.cacheManager.get<WeatherUiDto>(cacheKey);
        if (cached) {
            this.logger.log('Returning cached weather UI data');
            return cached;
        }

        try {
            this.logger.log(`Fetching weather UI data for [${lat}, ${lon}]`);

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

            const result =  plainToInstance(WeatherUiDto, responseData, {
                excludeExtraneousValues: true,
            });

            await this.cacheManager.set(cacheKey, result, 600000)

            return result;
        } catch(error) {
            this.handleError(error, 'get weather AI data');
        }
    }

    async getCurrentWeatherForAI(lat: number, lon: number): Promise<WeatherAiFeaturesDto> {
        const cacheKey = `weather:ai:${lat},${lon}`;
        
        const cached = await this.cacheManager.get<WeatherAiFeaturesDto>(cacheKey);
        if (cached) {
            this.logger.log('Returning cached weather AI data');
            return cached;
        }

        try {
            this.logger.log(`Fetching weather AI data for [${lat}, ${lon}]`);

            const data = await this.fetchWeatherData(lat, lon);
            
            const tempC = data.main.temp;
            const feelsLikeC = data.main.feels_like;
            const windSpeedMs = data.wind.speed;
            const visibilityM = data.visibility;
            const pressureHPa = data.main.pressure;
            
            const rainMm = data.rain?.['1h'] || 0;
            const snowMm = data.snow?.['1h'] || 0;
            const totalPrecipMm = rainMm + snowMm;
            
            const tempF = this.celsiusToFahrenheit(tempC);
            const feelsLikeF = this.celsiusToFahrenheit(feelsLikeC);
            const windSpeedMph = this.msToMph(windSpeedMs);
            const visibilityMi = this.metersToMiles(visibilityM);
            const pressureIn = this.hPaToInHg(pressureHPa);
            const precipitationIn = this.mmToInches(totalPrecipMm);
            
            const responseData = {
                temperatureF: Math.round(tempF * 10) / 10,
                windChillF: Math.round(feelsLikeF * 10) / 10,
                windSpeedMph: Math.round(windSpeedMph * 10) / 10,
                visibilityMi: Math.round(visibilityMi * 100) / 100,
                pressureIn: Math.round(pressureIn * 100) / 100,
                precipitationIn: Math.round(precipitationIn * 100) / 100,
                humidity: data.main.humidity,
            };
            
            const result = plainToInstance(WeatherAiFeaturesDto, responseData, {
                excludeExtraneousValues: true,
            });

            await this.cacheManager.set(cacheKey, result, 600000)

            this.logger.log(`Weather AI data retrieved successfully for [${lat}, ${lon}]`);

            return result;
        } catch (error) {
            this.handleError(error, 'get weather AI data');
        }
    }

    // OpenWeather API call
    private async fetchWeatherData(lat: number, lon: number): Promise<any> {
        const url = `${this.baseUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`;
        const response = await firstValueFrom(this.httpService.get(url));
        return response.data;
    }

    // error handling
     private handleError(error: any, operation: string): never {
        this.logger.error(`Failed to ${operation}: ${error?.message || 'Unknown error'}`, error?.stack);

        if (error?.isAxiosError) {
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                const message = errorData?.message || 'Unknown error';

                this.logger.debug(`HTTP ${status} Response: ${JSON.stringify(errorData)}`);

                switch (status) {
                    case 400:
                        throw new HttpException(
                            `Invalid request: ${message}`,
                            HttpStatus.BAD_REQUEST,
                        );
                    case 401:
                        throw new HttpException(
                            `Weather API access denied. Check your API key. Details: ${message}`,
                            HttpStatus.UNAUTHORIZED,
                        );
                    case 404:
                        throw new HttpException(
                            `Weather data not found for this location. Details: ${message}`,
                            HttpStatus.NOT_FOUND,
                        );
                    case 429:
                        throw new HttpException(
                            'API rate limit exceeded. Please try again later.',
                            HttpStatus.TOO_MANY_REQUESTS,
                        );
                    case 500:
                    case 502:
                    case 503:
                        throw new HttpException(
                            `Weather API service temporarily unavailable (HTTP ${status}). Please try again later.`,
                            HttpStatus.SERVICE_UNAVAILABLE,
                        );
                    default:
                        throw new HttpException(
                            `Weather API error (HTTP ${status}): ${message}`,
                            status,
                        );
                }
            }

            throw new HttpException(
                `Network error during ${operation}: ${error.message}`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        throw new HttpException(
            `Failed to ${operation}: ${error?.message || 'Internal server error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    // Unit conversion helpers
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


