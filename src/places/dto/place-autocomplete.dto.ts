import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";



export class PlaceAutocompleteDto {
    @IsNotEmpty({ message: 'Input is required' })
    @IsString({ message: 'Input must be a string' })
    @MinLength(1, { message: 'Input must be at least 1 character' })
    input: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    lon?: number;

}