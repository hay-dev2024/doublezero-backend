import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/schemas/user.schema';

@Injectable()
export class AuthService {
    private googleClient: OAuth2Client;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('GOOGLE_CLIENT_ID'),
        );
    }

    async validateGoogleToken(idToken: string) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: idToken,
                audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
            });

            const payload = ticket.getPayload();

            if (!payload) {
                throw new UnauthorizedException('Invalid token payload');
            }

            const { sub: googleId, email, name: displayName = 'Client' } = payload;
            
            if (!googleId || !email) {
                throw new UnauthorizedException('Missing required user information from Google');
            }

            const user: User = await this.usersService.findByGoogleIdOrCreate(
                googleId,
                email,
                displayName,
            );

            // JWT token 생성
            const accessToken = this.jwtService.sign({
                sub: String(user._id),
                email: user.email,
            });

            return {
                accessToken,
                user: {
                    id: String(user._id),
                    email: user.email,
                    displayName: user.displayName,
                },
            };

        } catch (error) {
            console.error('Google token validation failed:', error); 
            throw new UnauthorizedException('Invalid Google token');
        }
    }
}
