import { IsNotEmpty, IsString, MinLength } from "class-validator";


export class PlaceSearchDto {
    @IsNotEmpty({ message: 'Search query is required' })
    @IsString({ message: 'Query must be a string' })
    @MinLength(2, { message: 'Query must be at leat 2 characters' })
    query: string;

}