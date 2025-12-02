import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from './session.service';
import { RiskService } from './risk.service';
import { WeatherService } from '../weather/weather.service';
import { RiskUpdateDto, EnhancedRiskSummaryDto } from './dto/risk-update.dto';

@Injectable()
export class SessionScheduler {
  private readonly logger = new Logger(SessionScheduler.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly riskService: RiskService,
    private readonly weatherService: WeatherService,
  ) {}

  /**
   * 30초마다 활성 세션의 위험도 재계산
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleRiskUpdate() {
    const activeSessions = this.sessionService.getActiveSessions();

    if (activeSessions.length === 0) {
      return;
    }

    this.logger.log(
      `Processing risk updates for ${activeSessions.length} active sessions`,
    );

    for (const session of activeSessions) {
      try {
        await this.processSessionRiskUpdate(session);
      } catch (error) {
        this.logger.error(
          `Failed to process session ${session.sessionId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * 60초마다 비활성 세션 정리
   */
  @Cron(CronExpression.EVERY_MINUTE)
  handleSessionCleanup() {
    this.sessionService.cleanupInactiveSessions();
  }

  /**
   * 30초마다 heartbeat 전송
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  handleHeartbeat() {
    const activeSessions = this.sessionService.getActiveSessions();
    
    for (const session of activeSessions) {
      this.sessionService.sendHeartbeat(session.sessionId);
    }
  }

  /**
   * 개별 세션 위험도 업데이트 처리
   */
  private async processSessionRiskUpdate(session: any) {
    // 현재 위치 추정
    const currentPosition = this.sessionService.estimateCurrentPosition(session);

    // 목적지 도착 체크
    if (currentPosition.remainingDistance <= 100) {
      this.logger.log(`Session ${session.sessionId} reached destination`);
      await this.sessionService.stopSession(session.sessionId);
      return;
    }

    // 전방 5km 구간의 위험도 계산
    const lookAheadDistance = 5000; // 5km
    const lookAheadPoints = this.extractLookAheadPoints(
      session,
      currentPosition.distanceFromStart,
      lookAheadDistance,
    );

    if (lookAheadPoints.length === 0) {
      this.logger.warn(`No look-ahead points for session ${session.sessionId}`);
      return;
    }

    // 날씨 데이터 수집
    const weatherPromises = lookAheadPoints.map((point) =>
      this.weatherService.getCurrentWeatherForAI(point.lat, point.lng),
    );
    const weatherData = await Promise.all(weatherPromises);

    // AI 모델 위험도 예측
    const riskPredictions = await this.riskService.predictRiskForPoints(
      lookAheadPoints,
      weatherData,
    );

    // 위험도 요약 생성
    const summary = this.generateRiskSummary(riskPredictions, weatherData);

    // SSE 이벤트 전송
    const update: RiskUpdateDto = {
      sessionId: session.sessionId,
      timestamp: new Date().toISOString(),
      currentPosition,
      riskPoints: riskPredictions,
      summary,
    };

    this.sessionService.sendRiskUpdate(session.sessionId, update);
  }

  /**
   * 전방 구간 포인트 추출
   */
  private extractLookAheadPoints(
    session: any,
    currentDistance: number,
    lookAheadDistance: number,
  ): Array<{ lat: number; lng: number }> {
    const points: Array<{ lat: number; lng: number }> = [];
    let accumulatedDistance = 0;
    let startFound = false;

    for (let i = 0; i < session.decodedCoordinates.length - 1; i++) {
      const from = session.decodedCoordinates[i];
      const to = session.decodedCoordinates[i + 1];
      const segmentDistance = this.haversineDistance(from, to);

      if (!startFound) {
        if (accumulatedDistance + segmentDistance >= currentDistance) {
          startFound = true;
          points.push(from);
        }
        accumulatedDistance += segmentDistance;
        continue;
      }

      points.push(to);

      if (points.length * 500 >= lookAheadDistance) {
        // 약 500m 간격으로 샘플링
        break;
      }
    }

    // 최대 10개 포인트로 제한
    if (points.length > 10) {
      const step = Math.ceil(points.length / 10);
      return points.filter((_, idx) => idx % step === 0).slice(0, 10);
    }

    return points;
  }

  /**
   * 위험도 요약 생성
   */
  private generateRiskSummary(
    riskPoints: any[],
    weatherData: any[],
  ): EnhancedRiskSummaryDto {
    if (riskPoints.length === 0) {
      return {
        level: 'Low',
        avgWeight: 0,
        maxWeight: 0,
        hotspotCount: 0,
        hotspotThreshold: 0.66,
        message: 'No data available',
        urgency: 'low',
      };
    }

    const risks = riskPoints.map((p) => p.risk);
    const averageRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
    const maxRisk = Math.max(...risks);
    const highRiskCount = risks.filter((r) => r >= 0.7).length;

    // 날씨 조건 분석
    const hasRain = weatherData.some((w) => w.weather && w.weather.toLowerCase().includes('rain'));
    const hasSnow = weatherData.some((w) => w.weather && w.weather.toLowerCase().includes('snow'));
    const hasFog = weatherData.some((w) => w.visibilityMi && w.visibilityMi < 2);
    const hasStorm = weatherData.some((w) => w.weather && (w.weather.toLowerCase().includes('storm') || w.weather.toLowerCase().includes('thunder')));
    const hasHighWind = weatherData.some((w) => w.windSpeedMph && w.windSpeedMph > 30);

    // Urgency 계산 (위험도 + 날씨 조건 종합)
    let urgency: 'low' | 'medium' | 'high';
    
    if (maxRisk >= 0.8 || (maxRisk >= 0.6 && (hasSnow || hasStorm || hasFog))) {
      // 매우 높은 위험도 또는 고위험 날씨 + 높은 위험도
      urgency = 'high';
    } else if (maxRisk >= 0.7 || (maxRisk >= 0.5 && highRiskCount >= 2) || (maxRisk >= 0.4 && (hasRain || hasHighWind))) {
      // 높은 위험도 또는 다수 고위험 구간 또는 빗길/강풍
      urgency = 'medium';
    } else if (maxRisk >= 0.4 || averageRisk >= 0.3) {
      // 중간 위험도
      urgency = 'medium';
    } else {
      urgency = 'low';
    }

    // 메시지 생성
    const message = this.generateRiskMessage(
      maxRisk,
      highRiskCount,
      weatherData,
    );

    return {
      level: urgency === 'high' ? 'High' : urgency === 'medium' ? 'Medium' : 'Low',
      avgWeight: Math.round(averageRisk * 100) / 100,
      maxWeight: Math.round(maxRisk * 100) / 100,
      hotspotCount: highRiskCount,
      hotspotThreshold: 0.66,
      message,
      urgency,
    };
  }

  /**
   * 위험도 메시지 생성 (날씨 조건 반영)
   */
  private generateRiskMessage(
    maxRisk: number,
    highRiskCount: number,
    weatherData: any[],
  ): string {
    // 날씨 조건 분석
    const hasRain = weatherData.some((w) => w.weather && w.weather.toLowerCase().includes('rain'));
    const hasSnow = weatherData.some((w) => w.weather && w.weather.toLowerCase().includes('snow'));
    const hasFog = weatherData.some((w) => w.visibilityMi && w.visibilityMi < 2);
    const hasStorm = weatherData.some((w) => w.weather && (w.weather.toLowerCase().includes('storm') || w.weather.toLowerCase().includes('thunder')));
    const hasHighWind = weatherData.some((w) => w.windSpeedMph && w.windSpeedMph > 30);
    const lowVisibility = weatherData.some((w) => w.visibilityMi && w.visibilityMi < 5);

    // Very high risk
    if (maxRisk >= 0.8) {
      if (hasStorm) return '⚠️ Storm ahead - Reduce speed immediately';
      if (hasSnow) return '❄️ Heavy snow ahead - Very dangerous';
      if (hasFog) return '🌫️ Dense fog ahead - Low visibility';
      return '🚨 Very high risk ahead - Slow down and drive carefully';
    }

    // High risk
    if (maxRisk >= 0.7) {
      if (hasRain) return `☔ ${highRiskCount} wet road sections ahead - Slow down`;
      if (hasSnow) return `❄️ ${highRiskCount} snowy sections ahead - Keep safe distance`;
      if (lowVisibility) return `🌫️ Low visibility ahead - Use headlights`;
      if (hasHighWind) return `💨 Strong winds ahead - Grip steering firmly`;
      return `⚠️ ${highRiskCount} high-risk sections ahead - Drive carefully`;
    }

    // Medium risk
    if (maxRisk >= 0.5) {
      if (hasRain) return '🌧️ Wet road ahead - Maintain safe speed';
      if (hasHighWind) return '🌬️ Windy conditions ahead - Control vehicle';
      return '⚠️ Medium risk ahead - Drive safely';
    }

    // Low risk
    if (maxRisk >= 0.3) {
      return '✅ Road is relatively safe - Stay alert';
    }

    return '✅ Road is safe';
  }

  /**
   * Haversine 거리 계산
   */
  private haversineDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const R = 6371000;
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.lat)) *
        Math.cos(this.toRad(to.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
