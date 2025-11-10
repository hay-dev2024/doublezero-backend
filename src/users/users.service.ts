import { Injectable } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async testDbConnection(): Promise<string | object> {
        try {
            // 테스트 유저 생성
            const testUser = new this.userModel({
                googleId: `test-${Date.now}`,
                email: `test-${Date.now()}@mail.com`,
                displayName: 'Test User',
            });
            await testUser.save();

            const foundUser = await this.userModel.findById(testUser._id);

            if (foundUser) {
                return {
                    status: 'success',
                    message: 'DB 연결 및 테스트 성공!',
                    foundUserEmail: foundUser.email,
                };
            } else {
                throw new Error('유저 생성 후 조회에 실패함');
            }
        } catch (error) {
            console.error(`DB 연결 테스트 실패: ${error}`);
            return { status: 'failed', message: error.message };
        }
    }
}
