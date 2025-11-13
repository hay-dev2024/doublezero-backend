import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "../schemas/user.schema";
import { Model } from 'mongoose';

@Injectable()
export class UsersRepository {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async findByGoogleId(googleId: string): Promise<User | null> {
        return this.userModel.findOne({ googleId }).exec();
    }

    async findById(id: string): Promise<User | null> {
        return this.userModel.findById(id).exec();
    }

    async findByGoogleIdOrCreate(
        googleId: string,
        email: string,
        displayName: string,
    ): Promise<User> {
        const user = await this.userModel.findOneAndUpdate(
            { googleId },
            {
                $setOnInsert: {
                    googleId,
                    email,
                    displayName,
                    createdAt: new Date(),
                },
                $set: {
                    updatedAt: new Date(),
                },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            },
        ).exec();

        return user;
    }

    async create(userData: Partial<User>): Promise<User> {
        const newUser = new this.userModel(userData);
        return newUser.save();
    }
}