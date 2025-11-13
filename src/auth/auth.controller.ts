import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService,
    ) {}

    // POST /auth/google - Google Login
    @Post('google')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        return this.authService.validateGoogleToken(googleLoginDto.idToken);
    }

    /** 
     * JWT Test 
     * GET /auth/test-token?userId={userId}&email={email}
    */
   @Get('test-token')
   async getTestToken(
    @Query('userId') userId: string,
    @Query('email') email: string,
   ) {
    // Temp JWT
    const accessToken = this.jwtService.sign({
        sub: userId || '507f1f77bcf86cd799439011',
        email: email || 'test@mail.com',
    });

    return {
        accessToken,
        message: 'Test Token. Remove this endpoint before diployment.'
    };
   }
}
