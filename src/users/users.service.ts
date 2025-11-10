import { Injectable } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async findByGoogleIdOrCreate(
        googleId: string,
        email: string,
        displayName: string,
    ): Promise<User> {
        
        const existingUser = await this.userModel.findOne({ googleId: googleId }).exec();

        if(existingUser) {
            return existingUser;
        }

        const newUser = new this.userModel({
            googleId: googleId,
            email: email,
            displayName: displayName,
        });

        return newUser.save();
    }

    async findById(id: string): Promise<User> {
        return this.userModel.findById(id).exec();
    }

}
