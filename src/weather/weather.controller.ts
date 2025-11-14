import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherAiFeaturesDto } from './dto/weather-ai-features.dto';

@Controller('weather')
@UseInterceptors(ClassSerializerInterceptor)
export class WeatherController {
    constructor(private readonly weatherService: WeatherService) {}

    // App GET /weather/current?lat=37.5665&lon=126.9780
    @Get('current')
    async getCurrentWeather(
        @Query() query: WeatherQueryDto,
    ): Promise<WeatherUiDto> {
        return this.weatherService.getCurrentWeatherForUI(query.lat, query.lon);
    }

    @Get('ai')
    async getWeatherAiFeatures(
        @Query() query: WeatherQueryDto,
    ): Promise<WeatherAiFeaturesDto> {
        return this.weatherService.getCurrentWeatherForAI(query.lat, query.lon);
    }

}
