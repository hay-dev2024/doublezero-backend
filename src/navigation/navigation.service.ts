/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutesResponseDto, RouteResponseDto } from './dto/route-response.dto';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class NavigationService {
    private readonly logger = new Logger(NavigationService.name);
    private readonly apiKey: string;
    private readonly routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.getOrThrow<string>('GOOGLE_PLACES_API_KEY');
    }

    async calculateRoute(dto: RouteRequestDto): Promise<RoutesResponseDto> {
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
                            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.description',
                        },
                    },
                ),
            );

            this.logger.log(`API Response received, status: ${response.status}`);
            console.log('Google API Raw Response:', JSON.stringify(response.data, null, 2));

            const routes = response.data.routes || [];

            // routes가 빈 배열인 경우
            if (routes.length === 0) {
                this.logger.warn('No routes found');
                return plainToInstance(RoutesResponseDto, { routes: [] });
            }

            const routeDtos = routes.map((route: any) => {
                const distanceKm = (route.distanceMeters / 1000).toFixed(1);
                const durationMin = Math.round(parseFloat(route.duration.replace('s', '')) / 60);

                return plainToInstance(
                    RouteResponseDto,
                    {
                        distance: `${distanceKm} km`,
                        duration: `${durationMin} min`,
                        summary: route.description || 'route',
                        polyline: route.polyline?.encodedPolyline || '',
                    },
                    { excludeExtraneousValues: true },
                );
            });

            this.logger.log(`Successfully calculated ${routeDtos.length} route(s)`);

            return plainToInstance(
                RoutesResponseDto,
                { routes: routeDtos },
                { excludeExtraneousValues: true },
            );
        } catch(error) {
            this.logger.error(`Route calculation failed: ${error.message}`);
            
            if (error.response) {
                this.logger.error(`HTTP Status: ${error.response.status}`);
                this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            
            this.handleError(error, 'calculate route');
        }
    }

    private handleError(error: any, operation: string): never {
        if (error?.isAxiosError) {
            if (error.response) {               
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Unknown error';
                this.logger.error(`Google Routes API Error (${operation}) - status: ${status}, message: ${message}`, error.stack);
                throw new HttpException(`Google Routes API Error (${operation}): ${message}`, status);
            }
            this.logger.error(`Network error during ${operation}: ${error.message}`, error.stack);
            throw new HttpException(`Network error during ${operation}: ${error.message}`, HttpStatus.SERVICE_UNAVAILABLE);
        }
        this.logger.error(`Failed to ${operation}`, error?.stack);
        throw new HttpException(`Failed to ${operation}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}