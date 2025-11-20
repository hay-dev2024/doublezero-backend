import { Body, ClassSerializerInterceptor, Controller, Get, Patch, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        type: UserResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
    })
    async getProfile(@Request() req: RequestWithUser): Promise<UserResponseDto> {
        const userId = req.user.userId;
        const user = await this.usersService.findById(userId);

        return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({
        status: 200,
        description: 'User profile updated successfully',
        type: UserResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid input data',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
    })
    async updateProfile(
        @Request() req: RequestWithUser,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        const userId = req.user.userId;
        const updatedUser = await this.usersService.update(userId, updateUserDto);

        return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
    }
}
