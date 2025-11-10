import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true, unique: true })
    googleId: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop()
    displayName: string;
}

export const UserSchema = SchemaFactory.createForClass(User);