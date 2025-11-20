import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { UsersRepository } from './repository/users.repository';
import { UpdateUserDto } from './dto/update-user.dto';


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

    async update(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
        const updatedUser = await this.usersRepository.update(userId, updateUserDto);
        
        if (!updatedUser) {
            throw new NotFoundException('User not found');
        }

        return updatedUser;
    }
}
