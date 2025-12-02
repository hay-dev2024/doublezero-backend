import { Body, Controller, HttpStatus, Post, UseGuards, Logger, Req } from '@nestjs/common';
import { RiskService } from './risk.service';
import { RiskBatchRequestDto } from './dto/risk-batch-request.dto';
import { RiskBatchResponseDto } from './dto/risk-batch-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import { createHash } from 'crypto';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@ApiTags('Navigation')
@Controller('navigation')
export class RiskController {
  private readonly logger = new Logger(RiskController.name);
  constructor(private readonly riskService: RiskService) {}

  @Post('risk-batch')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      example: {
        requestId: 'smoke-1',
        points: [
          { lat: 37.4219999, lon: -122.0840575, pointIndex: 0, timestamp: '2025-11-28 08:00:00' }
        ],
        metadata: { note: 'smoke' }
      }
    }
  })
  @ApiOperation({ summary: 'Batch risk predictions for an array of coordinates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Batch predictions returned', type: RiskBatchResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request (empty/oversized batch)' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async batch(@Req() req: RequestWithUser, @Body() dto: RiskBatchRequestDto): Promise<RiskBatchResponseDto> {
    // If authenticated, use user's id. Otherwise use an IP-scoped anon id
    const authUserId = req.user?.userId;
    // Build an IP + UA-hash based anonymous identifier to reduce NAT bucket sharing
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    const ua = (req.headers['user-agent'] as string) || '';
    const uaHash = createHash('sha256').update(ua).digest('hex').slice(0, 8);
    const anonIdentifier = `${ip}-${uaHash}`;
    const userId = authUserId ?? `anon:${anonIdentifier}`;
    this.logger.log(`Received risk-batch request from user=${userId}, points=${dto.points?.length ?? 0}`);
    return this.riskService.batchPredict(userId, dto);
  }
}
