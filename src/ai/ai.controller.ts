import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiModelService } from './ai-model.service';
import { PredictRequestDto } from './dto/predict-request.dto';
import { PredictResponseDto } from './dto/predict-response.dto';

@ApiTags('AI Model')
@Controller('ai')
export class AiController {
  constructor(private readonly aiModelService: AiModelService) {}

  @Post('predict')
  @ApiOperation({ summary: 'Get risk prediction from AI model server (for testing)' })
  async predict(@Body() dto: PredictRequestDto): Promise<PredictResponseDto> {
    return this.aiModelService.predictRisk(dto);
  }
}
