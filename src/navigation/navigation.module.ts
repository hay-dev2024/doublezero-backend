import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { AiModule } from 'src/ai/ai.module';
import { WeatherModule } from 'src/weather/weather.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionScheduler } from './session.scheduler';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 3600,
      max: 100, // max 100 cache entries
    }),
    ScheduleModule.forRoot(),
    AiModule,
    WeatherModule,
  ],
  controllers: [NavigationController, RiskController, SessionController],
  providers: [NavigationService, RiskService, SessionService, SessionScheduler],
  exports: [NavigationService, RiskService, SessionService],
})
export class NavigationModule {}
