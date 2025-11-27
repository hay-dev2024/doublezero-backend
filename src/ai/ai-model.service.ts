/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PredictRequestDto } from './dto/predict-request.dto';
import { PredictResponseDto } from './dto/predict-response.dto';

@Injectable()
export class AiModelService {
  private readonly logger = new Logger(AiModelService.name);
  private readonly aiServerUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServerUrl = this.configService.get<string>('AI_MODEL_SERVER_URL', 'http://127.0.0.1:8000');
    this.logger.log(`AI Model Server URL: ${this.aiServerUrl}`);
  }

  async predictRisk(data: PredictRequestDto): Promise<PredictResponseDto> {
    try {
      this.logger.log(`Requesting risk prediction from AI server: ${this.aiServerUrl}/predict`);
      
      const timeoutMs = this.configService.get<number>('AI_TIMEOUT_MS', 10000);
      const response = await firstValueFrom(
        this.httpService.post<PredictResponseDto>(`${this.aiServerUrl}/predict`, data, { timeout: timeoutMs }),
      );

      this.logger.debug(`AI server full response: ${JSON.stringify(response.data)}`);
      this.logger.log(`AI prediction received: tier=${response.data.predicted_risk_tier}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`AI server request failed: ${error?.message}`);
      throw error;
    }
  }
}
