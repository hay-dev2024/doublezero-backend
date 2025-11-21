import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

export class UserResponseDto {
    @ApiProperty({
        example: '407f8f77baf86cd793339001',
        description: 'User ID',
    })
    @Expose()
    @Transform(({ obj }) => String(obj._id || obj.id))
    id: string;

    @ApiProperty({
        example: 'user@mail.com',
        description: 'User email addresss',
    })
    @Expose()
    email: string;

    @ApiProperty({
        example: 'John Smith',
        description: 'User display name',
    })
    @Expose()
    displayName: string;

    @ApiProperty({
        example: '1234567890',
        description: 'Google account ID',
    })
    @Expose()
    googleId: string;

    @ApiProperty({
        example: '2030-11-11T07:30:00.000Z',
        description: 'Account creation date',
    })
    @Expose()
    createdAt: Date;
}