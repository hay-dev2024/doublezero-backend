import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

interface GoogleUserData {
    googleId: string;
    email: string;
    displayName: string;
}

@Injectable()
export class AuthService {
    constructor(private readonly userService: UsersService) {}

    async validateGoogleUser(user: GoogleUserData) {
        if (!user) {
            return 'No user from Google';
        }

        const dbUser = await this.userService.findByGoogleIdOrCreate(
            user.googleId,
            user.email,
            user.displayName,
        );
    
        return dbUser;  
    }
}
