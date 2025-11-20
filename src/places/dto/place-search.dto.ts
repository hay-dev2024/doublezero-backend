import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";


export class PlaceSearchDto {
    @ApiProperty({
        example: 'Starbucks',
        description: 'Search query for places',
        minLength: 2,
    })
    @IsNotEmpty({ message: 'Search query is required' })
    @IsString({ message: 'Query must be a string' })
    @MinLength(2, { message: 'Query must be at least 2 characters' })
    query: string;

}