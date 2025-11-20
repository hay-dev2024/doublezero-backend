/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutesResponseDto, RouteResponseDto } from './dto/route-response.dto';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class NavigationService {
    private readonly logger = new Logger(NavigationService.name);
    private readonly apiKey: string;
    private readonly routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        this.apiKey = this.configService.getOrThrow<string>('GOOGLE_PLACES_API_KEY');
    }

    async calculateRoute(dto: RouteRequestDto): Promise<RoutesResponseDto> {
        // cache
        const cacheKey = `route:${dto.origin.lat},${dto.origin.lon}-${dto.destination.lat},${dto.destination.lon}-${dto.travelMode || 'DRIVE'}`;

        const cached = await this.cacheManager.get<RouteResponseDto>(cacheKey);
        if (cached) {
            this.logger.log('Returning cached route');
            return cached;
        }

        try {
            this.logger.log(`Calculating route from [${dto.origin.lat}, ${dto.origin.lon}] to [${dto.destination.lat}, ${dto.destination.lon}]`);

            const response = await firstValueFrom(
                this.httpService.post(
                    this.routesUrl,
                    {
                        origin: {
                            location: {
                                latLng: {
                                    latitude: dto.origin.lat,
                                    longitude: dto.origin.lon,
                                },
                            },
                        },
                        destination: {
                            location: {
                                latLng: {
                                    latitude: dto.destination.lat,
                                    longitude: dto.destination.lon,
                                },
                            },
                        },
                        travelMode: dto.travelMode || 'DRIVE',
                        //routingPreference: 'TRAFFIC_AWARE',
                        computeAlternativeRoutes: false,
                        languageCode: 'en',
                        units: 'METRIC',
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': this.apiKey,
                            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.description,routes.warnings,routes.viewport,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.polyline.encodedPolyline,routes.legs.steps.navigationInstruction',
                        },
                    },
                ),
            );

            this.logger.log(`API Response received, status: ${response.status}`);
            // console.log('Google API Raw Response:', JSON.stringify(response.data, null, 2));

            const routes = response.data.routes || [];

            // routes가 빈 배열인 경우
            if (routes.length === 0) {
                this.logger.warn('No routes found');
                return plainToInstance(RoutesResponseDto, { routes: [] });
            }

            const routeDtos = routes.map((route: any) => {
                const distanceKm = (route.distanceMeters / 1000).toFixed(1);
                const durationMin = Math.round(parseFloat(route.duration.replace('s', '')) / 60);

                const warnings = route.warnings || [];
                const bounds = route.viewport ? {
                    northeast: {
                        lat: route.viewport.high.latitude,
                        lon: route.viewport.high.longitude
                    },
                    southwest: {
                        lat: route.viewport.low.latitude,
                        lon: route.viewport.low.longitude
                    }
                } : undefined;

                const steps = route.legs?.[0]?.steps?.map((step: any) => ({
                    distance: step.localizedValues?.distance?.text || `${(step.distanceMeters / 1000).toFixed(1)} km`,
                    duration: step.localizedValue?.staticDuration?.text || `${Math.round(parseFloat(step.staticDuration.replace('s', '')) / 60)} min`,
                    instruction: step.navigationInstruction?.instructions || '',
                    polyline: step.polyline?.encodedPolyline || '',
                })) || [];

                return plainToInstance(
                    RouteResponseDto,
                    {
                        distance: `${distanceKm} km`,
                        duration: `${durationMin} min`,
                        summary: route.description || 'route',
                        polyline: route.polyline?.encodedPolyline || '',
                        warnings,
                        bounds,
                        steps,
                    },
                    { excludeExtraneousValues: true },
                );
            });

            this.logger.log(`Successfully calculated ${routeDtos.length} route(s)`);

            const result = plainToInstance(
                RoutesResponseDto,
                { routes: routeDtos },
                { excludeExtraneousValues: true },
            );

            // cache
            await this.cacheManager.set(cacheKey, result, 3600);

            return result;
        } catch(error) {
            this.handleError(error, 'calculate route');
        }
    }

    private handleError(error: any, operation: string): never {
        this.logger.error(`Failed to ${operation}: ${error?.message || 'Unknown error'}`, error?.stack);

        if (isAxiosError(error)) {
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                const message = errorData?.error?.message || errorData?.message || 'Uknown error';

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
                            `Routes API access denied (HTTP ${status}). Check your API key and ensure Routes API is enabled. Details: ${message}`,
                            status,
                        );
                    case 404:
                        throw new HttpException(
                            `Route not found. This region may not be supported by Routes API. Details: ${message}`,
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
                            `Google Routes API error (HTTP ${status}): ${message}`,
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