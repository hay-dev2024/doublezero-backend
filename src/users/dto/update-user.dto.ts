import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";


export class UpdateUserDto {
    @ApiProperty({
        example: 'John Smith',
        description: 'User display name',
        required: false,
        minLength: 2,
        maxLength: 50,
    })
    @IsOptional()
    @IsString({ message: 'Display name must be a string' })
    @MinLength(2, { message: 'Display name must be at least 2 characters' })
    @MaxLength(50, { message: 'Display name must be at most 50 characters' })
    displayName?: string;
}