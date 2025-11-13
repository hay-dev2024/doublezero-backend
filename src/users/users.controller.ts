import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Request() req: RequestWithUser) {
        const userId = req.user.userId;
        const user = await this.usersService.findById(userId);

        return {
            id: String(user._id),
            email: user.email,
            displayName: user.displayName,
            googleId: user.googleId,
        };
    }
}
