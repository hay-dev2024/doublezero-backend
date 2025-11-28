import { Body, Controller, HttpStatus, Post, UseGuards, Logger, Req } from '@nestjs/common';
import { RiskService } from './risk.service';
import { RiskBatchRequestDto } from './dto/risk-batch-request.dto';
import { RiskBatchResponseDto } from './dto/risk-batch-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@ApiTags('Navigation')
@Controller('navigation')
export class RiskController {
  private readonly logger = new Logger(RiskController.name);
  constructor(private readonly riskService: RiskService) {}

  @Post('risk-batch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Batch risk predictions for an array of coordinates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Batch predictions returned' })
  async batch(@Req() req: RequestWithUser, @Body() dto: RiskBatchRequestDto): Promise<RiskBatchResponseDto> {
    const userId = req.user?.userId ?? 'anonymous';
    this.logger.log(`Received risk-batch request from user=${userId}, points=${dto.points?.length ?? 0}`);
    return this.riskService.batchPredict(userId, dto);
  }
}
