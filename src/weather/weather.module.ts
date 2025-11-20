import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 600000,
      max: 100,
    }),
  ],
  controllers: [WeatherController],
  providers: [WeatherService]
})
export class WeatherModule {}
