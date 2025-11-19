import { Expose } from "class-transformer";


export class PlaceResponseDto {
    @Expose()
    placeId: string;

    @Expose()
    name: string;

    @Expose()
    formattedAddress: string;

    @Expose()
    lat: number;

    @Expose()
    lon: number;

    @Expose()
    types: string[];
}

export class PlaceAutocompleteSuggestionDto {
    @Expose()
    placeId: string;

    @Expose()
    description: string;

    @Expose()
    mainText: string;

    @Expose()
    secondaryText: string;
}