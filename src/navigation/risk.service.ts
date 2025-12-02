import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import pLimit from 'p-limit';
import type { Cache } from 'cache-manager';
import { AiModelService } from 'src/ai/ai-model.service';
import { WeatherService } from 'src/weather/weather.service';
import { PredictRequestDto } from 'src/ai/dto/predict-request.dto';
import { RiskBatchRequestDto } from './dto/risk-batch-request.dto';
import { RiskBatchResponseDto } from './dto/risk-batch-response.dto';
import { RiskPointDto } from 'src/ai/dto/risk-point.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);
  private readonly maxBatch: number;
  private readonly rateLimitPerMinute: number;
  private readonly idempotencyTtl: number; // seconds

  constructor(
    private readonly aiModelService: AiModelService,
    private readonly weatherService: WeatherService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.maxBatch = this.configService.get<number>('RISK_BATCH_MAX', 12);
    this.rateLimitPerMinute = this.configService.get<number>('RISK_RATE_PER_MIN', 60);
    this.idempotencyTtl = this.configService.get<number>('RISK_IDEMPOTENCY_TTL', 60);
  }

  private async checkRateLimit(userId: string) {
    const key = `rl:${userId}`;
    const current = (await this.cacheManager.get<number>(key)) ?? 0;
    if (current >= this.rateLimitPerMinute) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.cacheManager.set(key, current + 1, 60);
  }

  private async getIdempotent(key: string) {
    return this.cacheManager.get<any>(key);
  }

  private async setIdempotent(key: string, value: any) {
    return this.cacheManager.set(key, value, this.idempotencyTtl);
  }

  /**
   * SessionScheduler에서 사용할 간단한 위험도 예측 메서드
   */
  async predictRiskForPoints(
    points: Array<{ lat: number; lng: number }>,
    weatherData: any[],
  ): Promise<RiskPointDto[]> {
    const predictRequests = weatherData.map((weather) => ({
      Start_Time: weather.Start_Time || new Date().toISOString().slice(0, 19).replace('T', ' '),
      Visibility_mi: weather.visibilityMi,
      Wind_Speed_mph: weather.windSpeedMph,
      Precipitation_in: weather.precipitationIn,
      Temperature_F: weather.temperatureF,
      Wind_Chill_F: weather.windChillF,
      Humidity_percent: weather.humidity,
      Pressure_in: weather.pressureIn,
    }));

    let predictions: any[] = [];
    try {
      predictions = await this.aiModelService.predictBatch(predictRequests);
    } catch (err) {
      this.logger.warn('AI batch failed, using fallback');
      const limit = pLimit(4);
      predictions = await Promise.all(
        predictRequests.map((r) =>
          limit(async () => {
            try {
              return await this.aiModelService.predictRisk(r);
            } catch (e) {
              return { P_Severity_3: 0, predicted_risk_tier: 0 };
            }
          }),
        ),
      );
    }

    return points.map((point, i) => ({
      lat: point.lat,
      lon: point.lng,
      risk: predictions[i]?.P_Severity_3 ?? 0,
      tier: predictions[i]?.predicted_risk_tier ?? 0,
    }));
  }

  async batchPredict(userId: string, dto: RiskBatchRequestDto): Promise<RiskBatchResponseDto> {
    if (!dto.points || !Array.isArray(dto.points) || dto.points.length === 0) {
      throw new HttpException('points must be a non-empty array', HttpStatus.BAD_REQUEST);
    }

    if (dto.points.length > this.maxBatch) {
      throw new HttpException(`batch too large (max ${this.maxBatch})`, HttpStatus.BAD_REQUEST);
    }

    // rate limit check
    await this.checkRateLimit(userId);

    const idemKey = dto.requestId ? `idem:${userId}:${dto.requestId}` : null;
    if (idemKey) {
      const cached = await this.getIdempotent(idemKey);
      if (cached) {
        this.logger.log(`Returning idempotent cached result for ${idemKey}`);
        // Ensure cached response contains a summary and scale — if it was cached by
        // an older server version that didn't include summary, compute and attach it.
        const cachedResp = cached as RiskBatchResponseDto;
        try {
          if (!cachedResp.summary || !cachedResp.scale) {
            const cachedResults = Array.isArray(cachedResp.results) ? cachedResp.results : [];
            const weights = cachedResults.map(r => Number((r as any).weight ?? 0));
            const min = weights.length ? Math.min(...weights) : 0;
            const max = weights.length ? Math.max(...weights) : 0;
            const avg = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
            cachedResp.scale = { min, max };
            cachedResp.summary = {
              level: (max > 0.66 ? 'High' : (max > 0.33 ? 'Medium' : 'Low')) as 'High' | 'Medium' | 'Low',
              avgWeight: Number(avg.toFixed(2)),
              maxWeight: Number(max.toFixed(2)),
              hotspotCount: weights.filter(w => w > 0.66).length,
              hotspotThreshold: 0.66,
              message: undefined,
            };
            // Update cache with augmented response for future requests
            await this.setIdempotent(idemKey, cachedResp);
          }
        } catch (e) {
          this.logger.warn(`Failed to augment cached idempotent response: ${e?.message || e}`);
        }
        return cachedResp;
      }
    }

    // Build per-point PredictRequestDto by fetching weather for each point
    const predictRequests: PredictRequestDto[] = [];
    for (const p of dto.points) {
      try {
        const weather = await this.weatherService.getCurrentWeatherForAI(p.lat, p.lon);
        const now = p.timestamp ?? new Date().toISOString().slice(0, 19).replace('T', ' ');
        predictRequests.push({
          Start_Time: now,
          Visibility_mi: weather.visibilityMi,
          Wind_Speed_mph: weather.windSpeedMph,
          Precipitation_in: weather.precipitationIn,
          Temperature_F: weather.temperatureF,
          Wind_Chill_F: weather.windChillF,
          Humidity_percent: weather.humidity,
          Pressure_in: weather.pressureIn,
        });
      } catch (err) {
        this.logger.warn(`Failed to fetch weather for point ${p.lat},${p.lon}: ${err?.message || err}`);
        // push a conservative default so model can respond
        predictRequests.push({
          Start_Time: new Date().toISOString().slice(0, 19).replace('T', ' '),
          Visibility_mi: 10,
          Wind_Speed_mph: 5,
          Precipitation_in: 0,
          Temperature_F: 70,
          Wind_Chill_F: 70,
          Humidity_percent: 50,
          Pressure_in: 29.92,
        });
      }
    }

    let predictions: any[] = [];
    try {
      // Try batch endpoint first
      predictions = await this.aiModelService.predictBatch(predictRequests);
    } catch (err) {
      this.logger.warn('AI batch endpoint failed, falling back to per-item predictions (parallel)');
      // Fallback: call predictRisk with bounded concurrency using p-limit
      const concurrency = this.configService.get<number>('RISK_FALLBACK_CONCURRENCY', 4);
      const limit = pLimit(concurrency);
      const fallback = await Promise.all(
        predictRequests.map((r) =>
          limit(async () => {
            try {
              return await this.aiModelService.predictRisk(r);
            } catch (e) {
              this.logger.warn(`Single AI call failed: ${e?.message || e}`);
              return { P_Severity_3: 0, predicted_risk_tier: 0 };
            }
          }),
        ),
      );
      predictions = fallback;
    }

    // Map predictions to RiskPointDto array
    const results: RiskPointDto[] = dto.points.map((p, idx) => {
      const pred = predictions[idx] ?? {};
      const severity = Number(pred.P_Severity_3 ?? 0);
      const weight = Math.max(0, Math.min(1, severity));
      return {
        lat: p.lat,
        lon: p.lon,
        tier: Number(pred.predicted_risk_tier ?? 0),
        severity3Probability: severity,
        weight,
        pointIndex: p.pointIndex,
        timestamp: p.timestamp,
        source: 'ai',
      } as RiskPointDto;
    });

    // compute scale (min/max)
    const weights = results.map(r => Number(r.weight ?? 0));
    const min = weights.length ? Math.min(...weights) : 0;
    const max = weights.length ? Math.max(...weights) : 0;

    // generate a lightweight summary using existing heuristics; reuse NavigationService logic is possible but keep simple
    const avg = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
    const summary = {
      level: (max > 0.66 ? 'High' : (max > 0.33 ? 'Medium' : 'Low')) as 'High' | 'Medium' | 'Low',
      avgWeight: Number(avg.toFixed(2)),
      maxWeight: Number(max.toFixed(2)),
      hotspotCount: weights.filter(w => w > 0.66).length,
      hotspotThreshold: 0.66,
      message: undefined,
    };

    const response: RiskBatchResponseDto = {
      requestId: dto.requestId,
      results,
      scale: { min, max },
      summary,
    };

    if (idemKey) {
      await this.setIdempotent(idemKey, response);
    }

    return response;
  }
}
