import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaceAutocompleteSuggestionDto, PlaceResponseDto } from './dto/place-response.dto';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';


// Google Places API FieldMask 상수
const PLACE_FIELD_MASKS = {
  BASIC: 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
  AUTOCOMPLETE: 'suggestions.placePrediction',
  DETAILED: 'id,displayName,formattedAddress,location,types',
} as const;

@Injectable()
export class PlacesService {
    private readonly apiKey: string | undefined;
    private readonly textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
    private readonly autoCompleteUrl = 'https://places.googleapis.com/v1/places:autocomplete';
    private readonly placeDetailsUrl = 'https://places.googleapis.com/v1/places';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
        
        if (!this.apiKey) {
            console.warn('GOOGLE_PLACES_API_KEY is not set. Places API will not work.');
        }
    }

    async searchPlaces(query: string): Promise<PlaceResponseDto[]> {
        this.checkApiKey();

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    this.textSearchUrl,
                    {
                        textQuery: query,
                        languageCode: 'en',
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': this.apiKey!,
                            'X-Goog-FieldMask': PLACE_FIELD_MASKS.BASIC,
                        },
                    },
                ),
            );

            const places = response.data.places || [];

            return places.map((place: any) => 
                plainToInstance(
                    PlaceResponseDto,
                    {
                        placeId: place.id,
                        name: place.displayName?.text || '',
                        formattedAddress: place.formattedAddress || '',
                        lat: place.location?.latitude || 0,
                        lon: place.location?.longitude || 0,
                        types: place.types || [],
                    },
                    { excludeExtraneousValues: true },
                ),
            );
        } catch(error) {
            this.handleError(error, 'search places');
        }
    }

    async autoCompletePlaces(
        input: string,
        lat?: number,
        lon?: number,
    ): Promise<PlaceAutocompleteSuggestionDto[]> {
        this.checkApiKey();

        try {
            const requestBody: any = {
                input: input,
                languageCode: 'en',
            };
            
            if (lat !== undefined && lon !== undefined) {
                requestBody.locationBias = {
                    circle: {
                        center: {
                            latitude: lat,
                            longitude: lon,
                        },
                        radius: 50000.0,
                    },
                };
            }

            const response = await firstValueFrom(
                this.httpService.post(this.autoCompleteUrl, requestBody, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': this.apiKey,
                        'X-Goog-FieldMask': PLACE_FIELD_MASKS.AUTOCOMPLETE,
                    },
                }),
            );

            const suggestion = response.data.suggestions || [];

            return suggestion
            .filter((s: any) => s.placePrediction)
            .map((suggestion: any) => {
                const prediction = suggestion.placePrediction;
                return plainToInstance(
                    PlaceAutocompleteSuggestionDto,
                    {
                        placeId: prediction.placeId,
                        description: prediction.text?.text || '',
                        mainText: prediction.structuredFormat?.mainText?.text || '',
                        secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
                    },
                    { excludeExtraneousValues: true },
                );
            });
        } catch (error) {
            this.handleError(error, 'autocomplete places');
        }
    }

    async getPlaceDetails(placeId: string): Promise<PlaceResponseDto> {
        this.checkApiKey();

        try {
            const url = `${this.placeDetailsUrl}/${placeId}`;
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': this.apiKey!,
                        'X-Goog-FieldMask': PLACE_FIELD_MASKS.DETAILED,
                    },
                }),
            );

            const place = response.data;

            return plainToInstance(
                PlaceResponseDto,
                {
                    placeId: place.id,
                    name: place.displayName?.text || '',
                    formattedAddress: place.formattedAddress || '',
                    lat: place.location?.latitude || 0,
                    lon: place.location?.longitude || 0,
                    types: place.types || [],
                },
                { excludeExtraneousValues: true },
            );
        } catch (error) {
            this.handleError(error, 'get place details');
        }
    }

    private checkApiKey(): void {
        if (!this.apiKey) {
            throw new HttpException(
                'Google Places API key is not configured. Please add GOOGLE_PLACES_API_KEY to your .env file.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    private handleError(error: any, operation: string): never {
        // axios error
        if (error.isAxiosError) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Unknown error';

                throw new HttpException(
                    `Google Places API Error (${operation}): ${message}`,
                    status,
                );
            }

            // network error, timeout, etc
            throw new HttpException(
                `Network error during ${operation}: ${error.message}`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        throw new HttpException(
            `Failed to ${operation}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}
