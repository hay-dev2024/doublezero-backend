import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { AiModule } from 'src/ai/ai.module';
import { WeatherModule } from 'src/weather/weather.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 3600,
      max: 100, // max 100 cache entries
    }),
    AiModule,
    WeatherModule,
  ],
  controllers: [NavigationController, RiskController],
  providers: [NavigationService, RiskService],
  exports: [NavigationService, RiskService],
})
export class NavigationModule {}
