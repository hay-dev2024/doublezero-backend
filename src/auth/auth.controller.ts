import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService,
    ) {}

    // POST /auth/google - Google Login
    @Post('google')
    @ApiOperation({ summary: 'Login with Google OAuth ID token' })
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        return this.authService.validateGoogleToken(googleLoginDto.idToken);
    }

    /** 
     * JWT Test 
     * GET /auth/test-token?userId={userId}&email={email}
    */
   @Get('test-token')
   @ApiOperation({ summary: 'Generate test JWT token (will be removed)' })
   async getTestToken(
    @Query('userId') userId: string,
    @Query('email') email: string,
   ) {
    
    let validUserId: string;

    if (userId && Types.ObjectId.isValid(userId)) {
        validUserId = userId;
    } else {
        validUserId = new Types.ObjectId().toString();
    }

    // Temp JWT
    const accessToken = this.jwtService.sign({
        sub: validUserId,
        email: email || 'test@mail.com',
    });

    return {
        accessToken,
        message: 'Test Token (Dev Only)',
        userId: validUserId,
    };
   }
}