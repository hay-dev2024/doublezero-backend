/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaceAutocompleteSuggestionDto, PlaceResponseDto } from './dto/place-response.dto';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

// Google Places API field mask constants
const PLACE_FIELD_MASKS = {
  BASIC: 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
  AUTOCOMPLETE: 'suggestions.placePrediction',
  DETAILED: 'id,displayName,formattedAddress,location,types',
} as const;

@Injectable()
export class PlacesService {
    private readonly logger = new Logger(PlacesService.name);
    private readonly apiKey: string | undefined;
    private readonly textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
    private readonly autoCompleteUrl = 'https://places.googleapis.com/v1/places:autocomplete';
    private readonly placeDetailsUrl = 'https://places.googleapis.com/v1/places';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        this.apiKey = this.configService.getOrThrow<string>('GOOGLE_PLACES_API_KEY');
        
        if (!this.apiKey) {
            console.warn('GOOGLE_PLACES_API_KEY is not set. Places API will not work.');
        }
    }

    async searchPlaces(query: string): Promise<PlaceResponseDto[]> {
        // cache
        const cacheKey = `places:search:${query}`;

        const cached = await this.cacheManager.get<PlaceResponseDto[]>(cacheKey);
        if (cached) {
            this.logger.log('Returning cached search results');
            return cached;
        }

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

            const result = places.map((place: any) => 
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

            await this.cacheManager.set(cacheKey, result, 300);

            return result;
        } catch(error) {
            this.handleError(error, 'search places');
        }
    }

    async autoCompletePlaces(
        input: string,
        lat?: number,
        lon?: number,
    ): Promise<PlaceAutocompleteSuggestionDto[]> {
        // cache
        const cacheKey = `places:autocomplete:${input}${lat !== undefined && lon !== undefined ? `:${lat},${lon}` : ''}`;

        const cached = await this.cacheManager.get<PlaceAutocompleteSuggestionDto[]>(cacheKey);
        if (cached) {
            this.logger.log('Returning cached autocomplete results');
            return cached;
        }

        try {
            const requestBody: any = {
                input: input,
                languageCode: 'en',
            };
            
            // Bias results to nearby locations
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

            const result = suggestion
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

            await this.cacheManager.set(cacheKey, result, 300);

            return result;
        } catch (error) {
            this.handleError(error, 'autocomplete places');
        }
    }

    async getPlaceDetails(placeId: string): Promise<PlaceResponseDto> {
        // cache
        const cacheKey = `places:details:${placeId}`;

        const cached = await this.cacheManager.get<PlaceResponseDto>(cacheKey);
        if (cached) {
            this.logger.log('Returning cached place details');
            return cached;
        }

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

            const result = plainToInstance(
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

            await this.cacheManager.set(cacheKey, result, 3600);

            return result;
        } catch (error) {
            this.handleError(error, 'get place details');
        }
    }

    private handleError(error: any, operation: string): never {
        this.logger.error(`Failed to ${operation}: ${error?.message || 'Unknown error'}`, error?.stack);

        if (error?.isAxiosError) {
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                const message = errorData?.error?.message || errorData?.message || 'Unknown error';

                this.logger.debug(`HTTP ${status} Response: ${JSON.stringify(errorData)}`);

                switch (status) {
                    case 400:
                        throw new HttpException(
                            `Invalid request: ${message}`,
                            HttpStatus.BAD_REQUEST,
                        );
                    case 401:
                    case 403:
                        throw new HttpException(
                            `Places API access denied (HTTP ${status}). Check your API key. Details: ${message}`,
                            status,
                        );
                    case 404:
                        throw new HttpException(
                            `Place not found. Details: ${message}`,
                            HttpStatus.NOT_FOUND,
                        );
                    case 429:
                        throw new HttpException(
                            'API rate limit exceeded. Please try again later.',
                            HttpStatus.TOO_MANY_REQUESTS,
                        );
                    case 500:
                    case 502:
                    case 503:
                        throw new HttpException(
                            `Google API service temporarily unavailable (HTTP ${status}). Please try again later.`,
                            HttpStatus.SERVICE_UNAVAILABLE,
                        );
                    default:
                        throw new HttpException(
                            `Google Places API error (HTTP ${status}): ${message}`,
                            status,
                        );
                }
            }

            throw new HttpException(
                `Network error during ${operation}: ${error.message}`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        throw new HttpException(
            `Failed to ${operation}: ${error?.message || 'Internal server error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}
