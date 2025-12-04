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
    summary: 'Start navigation session',
    description: 'Creates a session for real-time risk monitoring during driving.',
  })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate session ID',
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
    summary: 'Stop navigation session',
    description: 'Terminates the active session and closes SSE connections.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session stopped successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
    schema: {
      example: { error: 'Session not found', sessionId: '...' },
    },
  })
  @ApiResponse({
    status: 410,
    description: 'Session already stopped',
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
    summary: 'SSE real-time risk stream',
    description:
      'Receives risk updates every 30 seconds via text/event-stream format.',
  })
  @ApiProduces('text/event-stream')
  @ApiQuery({
    name: 'sessionId',
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE connected - receives risk-update, session-ended, and heartbeat events',
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
            message: 'Wet road sections ahead in 2km - Drive carefully',
            urgency: 'medium',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiResponse({
    status: 410,
    description: 'Session already stopped',
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

    return new Observable((observer) => {
      // 연결 유지만 수행
      response.on('close', () => {
        observer.complete();
      });
    });
  }
}
