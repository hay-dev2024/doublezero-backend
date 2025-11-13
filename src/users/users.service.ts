import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { UsersRepository } from './repository/users.repository';


@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async findByGoogleIdOrCreate(
        googleId: string,
        email: string,
        displayName: string,
    ): Promise<User> {
        return this.usersRepository.findByGoogleIdOrCreate(
            googleId,
            email,
            displayName,
        );
    }

    async findById(id: string): Promise<User> {
        const user = await this.usersRepository.findById(id);

        if (!user) {
            throw new NotFoundException(`User with id ${id} not found`);
        }
        
        return user;
    }
}
