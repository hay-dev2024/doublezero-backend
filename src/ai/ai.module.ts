import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiModelService } from './ai-model.service';
import { AiController } from './ai.controller';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [AiModelService],
  exports: [AiModelService],
})
export class AiModule {}
