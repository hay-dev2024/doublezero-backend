import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    // DB 연결 테스트용 임시 API 엔드 포인트
    @Get('test-db')
    testDb() {
        return this.usersService.testDbConnection();
    }
}
