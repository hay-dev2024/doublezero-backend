import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { AiModule } from 'src/ai/ai.module';
import { WeatherModule } from 'src/weather/weather.module';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 3600,
      max: 100, // 최대 100개 캐시
    }),
    AiModule,
    WeatherModule,
  ],
  controllers: [NavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}
