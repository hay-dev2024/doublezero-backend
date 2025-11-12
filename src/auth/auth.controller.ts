import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // POST /auth/google - Google Login
    @Post('goolge')
    async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
        return this.authService.validateGoogleToken(googleLoginDto.idToken);
    }
}
