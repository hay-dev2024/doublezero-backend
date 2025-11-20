import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class PlaceAutocompleteDto {
    @ApiProperty({
        example: 'star',
        description: 'Autocomplete input text',
        minLength: 1,
    })
    @IsNotEmpty({ message: 'Input is required' })
    @IsString({ message: 'Input must be a string' })
    @MinLength(1, { message: 'Input must be at least 1 character' })
    input: string;

    @ApiProperty({
        example: 37.7749,
        description: 'Latitude for location bias (optional)',
        required: false,
        minimum: -90,
        maximum: 90,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat?: number;

    @ApiProperty({
        example: -122.4194,
        description: 'Longitude for location bias (optional)',
        required: false,
        minimum: -180,
        maximum: 180,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    lon?: number;
}