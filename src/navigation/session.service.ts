import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { Response } from 'express';
import { decode } from '@googlemaps/polyline-codec';
import { NavigationSession } from './interfaces/navigation-session.interface';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { RiskUpdateDto } from './dto/risk-update.dto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessions = new Map<string, NavigationSession>();
  private readonly SESSION_TIMEOUT_MS = 60000; // 60초

  /**
   * 세션 시작
   */
  async startSession(
    dto: StartSessionDto,
    userId: string,
  ): Promise<SessionResponseDto> {
    // 중복 체크
    if (this.sessions.has(dto.sessionId)) {
      throw new ConflictException(
        `Session already active: ${dto.sessionId}`,
      );
    }

    // Polyline 디코딩
    const decodedCoordinates = decode(dto.polyline, 5).map(([lat, lng]) => ({
      lat,
      lng,
    }));

    if (decodedCoordinates.length < 2) {
      throw new ConflictException('Invalid polyline - at least 2 points required');
    }

    // 총 거리 계산 (Haversine)
    const totalDistance = this.calculateTotalDistance(decodedCoordinates);

    // 예상 시간 계산 (초)
    const estimatedDuration = Math.round(
      (totalDistance / 1000 / dto.estimatedSpeedKmh) * 3600,
    );

    const session: NavigationSession = {
      sessionId: dto.sessionId,
      userId,
      polyline: dto.polyline,
      decodedCoordinates,
      startTime: new Date(dto.startTime),
      estimatedSpeedKmh: dto.estimatedSpeedKmh,
      totalDistance,
      estimatedDuration,
      sseClients: [],
      lastEventId: 0,
      lastActivityAt: new Date(),
      status: 'active',
      currentDistanceFromStart: 0,
    };

    this.sessions.set(dto.sessionId, session);
    this.logger.log(
      `Session started: ${dto.sessionId} (distance: ${totalDistance}m, duration: ${estimatedDuration}s)`,
    );

    return {
      sessionId: dto.sessionId,
      status: 'active',
      streamUrl: `/navigation/session/stream?sessionId=${dto.sessionId}`,
      estimatedDuration,
      totalDistance,
    };
  }

  /**
   * 세션 종료
   */
  async stopSession(sessionId: string): Promise<SessionResponseDto> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.status === 'stopped') {
      throw new GoneException(`Session already stopped: ${sessionId}`);
    }

    // SSE 클라이언트 종료
    session.sseClients.forEach((client) => {
      try {
        client.write(
          `event: session-ended\ndata: ${JSON.stringify({ sessionId, reason: 'user-stopped' })}\n\n`,
        );
        client.end();
      } catch (err) {
        this.logger.warn(`Failed to close SSE client: ${err.message}`);
      }
    });

    session.status = 'stopped';
    const duration = Math.round(
      (Date.now() - session.startTime.getTime()) / 1000,
    );

    // 세션 삭제
    this.sessions.delete(sessionId);
    this.logger.log(`Session stopped: ${sessionId} (duration: ${duration}s)`);

    return {
      sessionId,
      status: 'stopped',
      duration,
    };
  }

  /**
   * SSE 클라이언트 추가
   */
  addSseClient(sessionId: string, response: Response, lastEventId?: number): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return; // 컨트롤러에서 이미 체크함
    }

    if (session.status === 'stopped') {
      return; // 컨트롤러에서 이미 체크함
    }

    // 재연결 처리: lastEventId가 있으면 기록
    if (lastEventId) {
      this.logger.log(
        `SSE reconnection: session=${sessionId}, lastEventId=${lastEventId}`,
      );
    }

    session.sseClients.push(response);
    session.lastActivityAt = new Date();
    this.logger.log(
      `SSE client added: session=${sessionId}, total=${session.sseClients.length}`,
    );

    // 연결 종료 이벤트 처리
    response.on('close', () => {
      const index = session.sseClients.indexOf(response);
      if (index > -1) {
        session.sseClients.splice(index, 1);
        this.logger.log(
          `SSE client disconnected: session=${sessionId}, remaining=${session.sseClients.length}`,
        );
      }
    });
  }

  /**
   * 활성 세션 목록 조회
   */
  getActiveSessions(): NavigationSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === 'active',
    );
  }

  /**
   * 세션 조회
   */
  getSession(sessionId: string): NavigationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 현재 위치 추정 (시간 기반)
   */
  estimateCurrentPosition(session: NavigationSession): {
    lat: number;
    lng: number;
    distanceFromStart: number;
    remainingDistance: number;
    currentSegmentIndex: number;
  } {
    const elapsedSeconds =
      (Date.now() - session.startTime.getTime()) / 1000;
    const distanceTraveled =
      (session.estimatedSpeedKmh / 3.6) * elapsedSeconds; // km/h -> m/s

    // 경로 상에서 위치 찾기
    let accumulatedDistance = 0;
    let currentLat = session.decodedCoordinates[0].lat;
    let currentLng = session.decodedCoordinates[0].lng;
    let currentSegmentIndex = 0;

    for (let i = 0; i < session.decodedCoordinates.length - 1; i++) {
      const from = session.decodedCoordinates[i];
      const to = session.decodedCoordinates[i + 1];
      const segmentDistance = this.haversineDistance(from, to);

      if (accumulatedDistance + segmentDistance >= distanceTraveled) {
        // 이 세그먼트 내에 위치
        const ratio =
          (distanceTraveled - accumulatedDistance) / segmentDistance;
        currentLat = from.lat + (to.lat - from.lat) * ratio;
        currentLng = from.lng + (to.lng - from.lng) * ratio;
        currentSegmentIndex = i;
        break;
      }

      accumulatedDistance += segmentDistance;
      currentSegmentIndex = i + 1;
    }

    // 목적지 도달 체크
    const actualDistanceFromStart = Math.min(
      distanceTraveled,
      session.totalDistance,
    );

    // 현재 위치부터 목적지까지 남은 거리를 정확히 계산
    let remainingDistance = 0;
    
    if (currentSegmentIndex < session.decodedCoordinates.length - 1) {
      // 현재 세그먼트의 남은 부분
      const currentPoint = { lat: currentLat, lng: currentLng };
      const nextPoint = session.decodedCoordinates[currentSegmentIndex + 1];
      remainingDistance = this.haversineDistance(currentPoint, nextPoint);

      // 이후 모든 세그먼트
      for (let i = currentSegmentIndex + 1; i < session.decodedCoordinates.length - 1; i++) {
        remainingDistance += this.haversineDistance(
          session.decodedCoordinates[i],
          session.decodedCoordinates[i + 1],
        );
      }
    }

    session.currentDistanceFromStart = actualDistanceFromStart;

    return {
      lat: currentLat,
      lng: currentLng,
      distanceFromStart: actualDistanceFromStart,
      remainingDistance: Math.max(0, remainingDistance),
      currentSegmentIndex,
    };
  }

  /**
   * SSE 이벤트 전송
   */
  sendRiskUpdate(sessionId: string, update: RiskUpdateDto): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }

    session.lastEventId++;
    session.lastActivityAt = new Date();

    const eventId = session.lastEventId;
    const data = JSON.stringify(update);

    // 모든 클라이언트에게 전송
    session.sseClients.forEach((client) => {
      try {
        client.write(`id: ${eventId}\nevent: risk-update\ndata: ${data}\n\n`);
      } catch (err) {
        this.logger.warn(`Failed to send SSE: ${err.message}`);
      }
    });

    this.logger.debug(
      `Risk update sent: session=${sessionId}, clients=${session.sseClients.length}`,
    );
  }

  /**
   * Heartbeat 전송
   */
  sendHeartbeat(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }

    session.sseClients.forEach((client) => {
      try {
        client.write(': heartbeat\n\n');
      } catch (err) {
        this.logger.warn(`Failed to send heartbeat: ${err.message}`);
      }
    });
  }

  /**
   * 타임아웃 세션 정리
   */
  cleanupInactiveSessions(): void {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status !== 'active') continue;

      const inactiveMs = now - session.lastActivityAt.getTime();

      // 클라이언트 없고 60초 이상 비활성
      if (session.sseClients.length === 0 && inactiveMs > this.SESSION_TIMEOUT_MS) {
        this.logger.log(`Session timed out: ${sessionId}`);
        session.status = 'stopped';
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Haversine 거리 계산 (미터)
   */
  private haversineDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
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

  /**
   * 총 거리 계산
   */
  private calculateTotalDistance(
    coordinates: Array<{ lat: number; lng: number }>,
  ): number {
    let total = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      total += this.haversineDistance(coordinates[i], coordinates[i + 1]);
    }
    return Math.round(total);
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
