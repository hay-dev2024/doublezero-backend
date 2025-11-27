import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('history')
export class HistoryController {
	constructor(private readonly historyService: HistoryService) {}

	@UseGuards(JwtAuthGuard)
	@Post()
	async create(@Req() req: RequestWithUser, @Body() dto: CreateHistoryDto) {
		const userId = req.user?.userId;
		return this.historyService.createForUser(userId, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Get()
	async list(@Req() req: RequestWithUser, @Query('limit') limit?: string) {
		const userId = req.user?.userId;
		const l = limit ? Math.min(200, parseInt(limit, 10) || 50) : 50;
		return this.historyService.findForUser(userId, l);
	}
}
