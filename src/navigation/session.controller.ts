import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  Sse,
  MessageEvent,
  Logger,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionService } from './session.service';
import { StartSessionDto } from './dto/start-session.dto';
import { StopSessionDto } from './dto/stop-session.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { Response } from 'express';
import { Observable } from 'rxjs';

@ApiTags('Navigation Session')
@Controller('navigation/session')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(private readonly sessionService: SessionService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '운전 세션 시작',
    description: '실시간 위험도 모니터링을 위한 세션을 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '세션 생성 성공',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '중복된 세션 ID',
    schema: {
      example: { error: 'Session already active', sessionId: '...' },
    },
  })
  async startSession(
    @Body() dto: StartSessionDto,
    @Req() req: RequestWithUser,
  ): Promise<SessionResponseDto> {
    const userId = req.user.userId;
    return this.sessionService.startSession(dto, userId);
  }

  @Post('stop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '운전 세션 종료',
    description: '진행 중인 세션을 종료하고 SSE 연결을 닫습니다.',
  })
  @ApiResponse({
    status: 200,
    description: '세션 종료 성공',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '세션을 찾을 수 없음',
    schema: {
      example: { error: 'Session not found', sessionId: '...' },
    },
  })
  @ApiResponse({
    status: 410,
    description: '이미 종료된 세션',
    schema: {
      example: { error: 'Session already stopped', sessionId: '...' },
    },
  })
  async stopSession(@Body() dto: StopSessionDto): Promise<SessionResponseDto> {
    return this.sessionService.stopSession(dto.sessionId);
  }

  @Get('stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'SSE 실시간 위험도 스트림',
    description:
      '30초마다 위험도 업데이트를 수신합니다. text/event-stream 형식입니다.',
  })
  @ApiProduces('text/event-stream')
  @ApiQuery({
    name: 'sessionId',
    description: '세션 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE 연결 성공 - risk-update, session-ended, heartbeat 이벤트 수신',
    schema: {
      example: {
        'risk-update': {
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2025-12-01T10:35:00Z',
          currentPosition: {
            lat: 37.5665,
            lng: 126.978,
            distanceFromStart: 2500,
            remainingDistance: 42500,
          },
          riskPoints: [],
          summary: {
            averageRisk: 0.65,
            maxRisk: 0.85,
            highRiskCount: 3,
            message: '전방 2km 구간 빗길 주의',
            urgency: 'medium',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '세션을 찾을 수 없음',
  })
  @ApiResponse({
    status: 410,
    description: '이미 종료된 세션',
  })
  @Sse()
  sseStream(
    @Query('sessionId') sessionId: string,
    @Headers('last-event-id') lastEventId: string,
    @Req() req: RequestWithUser & { res: Response },
  ): Observable<MessageEvent> {
    const lastId = lastEventId ? parseInt(lastEventId, 10) : undefined;

    // SSE 클라이언트 등록
    const response = req.res;
    
    // SSE 헤더 설정
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // nginx용

    // 세션 존재 여부 확인 (예외 대신 SSE 에러 이벤트 전송)
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      response.write(`event: error\ndata: ${JSON.stringify({ error: 'Session not found', sessionId })}\n\n`);
      response.end();
      return new Observable((observer) => observer.complete());
    }

    if (session.status === 'stopped') {
      response.write(`event: error\ndata: ${JSON.stringify({ error: 'Session already stopped', sessionId })}\n\n`);
      response.end();
      return new Observable((observer) => observer.complete());
    }

    this.sessionService.addSseClient(sessionId, response, lastId);

    this.logger.log(`SSE connected: session=${sessionId}, user=${req.user.userId}`);

    // Observable은 실제로는 사용하지 않음 (직접 response.write 사용)
    // NestJS의 @Sse()가 요구하므로 빈 Observable 반환
    return new Observable((observer) => {
      // 연결 유지만 수행
      response.on('close', () => {
        observer.complete();
      });
    });
  }
}
