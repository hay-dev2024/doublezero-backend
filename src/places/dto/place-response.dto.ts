import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";


export class PlaceResponseDto {
    @ApiProperty({
        example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        description: 'Google Place ID',
    })
    @Expose()
    placeId: string;

    @ApiProperty({
        example: 'Starbucks Reserve Roastery',
        description: 'Place name',
    })
    @Expose()
    name: string;

    @ApiProperty({
        example: '1124 Pike St, Seattle, WA 98101, USA',
        description: "Formatted address",
    })
    @Expose()
    formattedAddress: string;

    @ApiProperty({
        example: 47.6101,
        description: 'Latitude',
    })
    @Expose()
    lat: number;

    @ApiProperty({
        example: -122.3301,
        description: 'Longitude',
    })
    @Expose()
    lon: number;

    @ApiProperty({
        example: ['cafe', 'restaurant', 'food', 'point_of_interest'],
        description: 'Place types',
        type: [String],
    })
    @Expose()
    types: string[];
}

export class PlaceAutocompleteSuggestionDto {
    @ApiProperty({
        example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        description: 'Google Place ID',
    })
    @Expose()
    placeId: string;

    @ApiProperty({
        example: 'Starbucks Reserve Roastery, Pike Street, Seattle, WA, USA',
        description: 'Full description',
    })
    @Expose()
    description: string;

    @ApiProperty({
        example: 'Starbucks Reserve Roastery',
        description: 'Main text (place name)',
    })
    @Expose()
    mainText: string;

    @ApiProperty({
        example: 'Pike Street, Seattle, WA, USA',
        description: 'Secondary text (address)',
    })
    @Expose()
    secondaryText: string;
}