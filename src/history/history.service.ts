import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History } from './schemas/history.schema';
import { CreateHistoryDto } from './dto/create-history.dto';

@Injectable()
export class HistoryService {
	constructor(@InjectModel(History.name) private historyModel: Model<History>) {}

	async createForUser(userId: string, dto: CreateHistoryDto) {
		const created = new this.historyModel({ ...dto, userId });
		return created.save();
	}

	async findForUser(userId: string, limit = 50) {
		return this.historyModel
			.find({ userId })
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean()
			.exec();
	}

	async findByIdForUser(userId: string, id: string) {
		const rec = await this.historyModel.findOne({ _id: id, userId }).exec();
		if (!rec) throw new NotFoundException('History record not found');
		return rec;
	}
}
