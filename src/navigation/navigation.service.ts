/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutesResponseDto, RouteResponseDto } from './dto/route-response.dto';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import type { Cache } from 'cache-manager';
import { decode } from '@googlemaps/polyline-codec';
import { AiModelService } from 'src/ai/ai-model.service';
import { WeatherService } from 'src/weather/weather.service';
import { RiskPointDto } from 'src/ai/dto/risk-point.dto';
import { PredictRequestDto } from 'src/ai/dto/predict-request.dto';

@Injectable()
export class NavigationService {
    private readonly logger = new Logger(NavigationService.name);
    private readonly apiKey: string;
    private readonly routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    private readonly fieldMask = [
        'routes.distanceMeters',
        'routes.duration',
        'routes.polyline.encodedPolyline',
        'routes.description',
        'routes.warnings',
        'routes.viewport',
        'routes.legs.steps.distanceMeters',
        'routes.legs.steps.staticDuration',
        'routes.legs.steps.polyline.encodedPolyline',
        'routes.legs.steps.navigationInstruction',
    ].join(',');

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly aiModelService: AiModelService,
        private readonly weatherService: WeatherService,
    ) {
        this.apiKey = this.configService.getOrThrow<string>('GOOGLE_PLACES_API_KEY');
    }

    async calculateRoute(dto: RouteRequestDto): Promise<RoutesResponseDto> {
        const travelMode = dto.travelMode ?? 'DRIVE';
        // cache (include alternatives flag, sampleCount and includeRisk)
        const cacheKey = `route:${dto.origin.lat},${dto.origin.lon}-${dto.destination.lat},${dto.destination.lon}-${travelMode}:alt=${dto.alternatives ? '1' : '0'}:samples=${dto.sampleCount ?? 3}:risk=${dto.includeRisk ? '1' : '0'}`;

        const cached = await this.cacheManager.get<RoutesResponseDto>(cacheKey);
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
                        travelMode,
                            computeAlternativeRoutes: dto.alternatives ?? false,
                        languageCode: 'en',
                        units: 'METRIC',
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': this.apiKey,
                            'X-Goog-FieldMask': this.fieldMask,
                        },
                    },
                ),
            );

            this.logger.log(`API Response received, status: ${response.status}`);
            this.logger.debug(`Response data: ${JSON.stringify(response.data)}`);

            const routes = response.data.routes || [];

            if (routes.length === 0) {
                this.logger.warn('No routes found in response');
                this.logger.debug(`Full response data: ${JSON.stringify(response.data, null, 2)}`);
                return plainToInstance(
                    RoutesResponseDto,
                    { routes: [] },
                    { excludeExtraneousValues: true },
                );
            }

            const routeDtos = routes.map((route: any) => this.transformRouteToDto(route));

            // Limit results: if alternatives requested, allow primary + one alternative, otherwise only primary
            const maxRoutes = dto.alternatives ? 2 : 1;
            const limited = routeDtos.slice(0, maxRoutes);

            // Generate risk points for the first route (honor includeRisk flag)
            if (limited.length > 0 && limited[0].polyline) {
                if (dto.includeRisk) {
                    try {
                        const sampleCount = dto.sampleCount ?? 3;
                        const riskCacheKey = `risk:${limited[0].polyline}:samples=${sampleCount}`;
                        const cachedRisk = await this.cacheManager.get<RiskPointDto[]>(riskCacheKey);
                        if (cachedRisk) {
                            limited[0].riskPoints = cachedRisk;
                            this.logger.log(`Used cached ${cachedRisk.length} risk points for primary route`);
                        } else {
                            const riskPoints = await this.generateRiskPoints(
                                dto.origin,
                                dto.destination,
                                limited[0].polyline,
                                sampleCount,
                            );
                            limited[0].riskPoints = riskPoints;
                            // cache riskPoints for short TTL (60 seconds)
                            await this.cacheManager.set(riskCacheKey, riskPoints, 60);
                            this.logger.log(`Generated ${riskPoints.length} risk points for primary route`);
                        }
                    } catch (error: any) {
                        this.logger.warn(`Failed to generate risk points: ${error?.message}`);
                        limited[0].riskPoints = []; // fallback
                    }
                } else {
                    // includeRisk is false -> explicitly return empty array
                    limited[0].riskPoints = [];
                }
            }

            this.logger.log(`Successfully calculated ${routeDtos.length} route(s), returning ${limited.length}`);
 
            const result = plainToInstance(
                RoutesResponseDto,
                { routes: limited },
                { excludeExtraneousValues: true },
            );

            await this.cacheManager.set(cacheKey, result, 3600);

            return result;
        } catch (error: any) {
            this.handleError(error, 'calculate route');
        }
    }

    private transformRouteToDto(route: any): RouteResponseDto {
            const distanceKm = (route.distanceMeters / 1000).toFixed(1);
            const durationMin = Math.round(parseFloat(route.duration.replace('s', '')) / 60);

            const warnings = route.warnings || [];

            const bounds = route.viewport ? {
                northeast: {
                    lat: route.viewport.high.latitude,
                    lon: route.viewport.high.longitude,
                },
                southwest: {
                    lat: route.viewport.low.latitude,
                    lon: route.viewport.low.longitude,
                },
            } : undefined;

            const steps = route.legs?.[0]?.steps?.map((step: any) => {
                // numeric distance in meters
                let distanceMeters: number | undefined;
                if (typeof step.distanceMeters === 'number') {
                    distanceMeters = step.distanceMeters;
                } else if (step.distanceMeters) {
                    const parsed = Number(step.distanceMeters);
                    distanceMeters = Number.isFinite(parsed) ? parsed : undefined;
                }

                // numeric duration in seconds
                let durationSeconds: number | undefined;
                if (typeof step.staticDuration === 'number') {
                    durationSeconds = step.staticDuration;
                } else if (typeof step.staticDuration === 'string') {
                    const m = step.staticDuration.match(/(\d+)/);
                    if (m) durationSeconds = Number(m[1]);
                }

                const distanceText = step.localizedValues?.distance?.text || (distanceMeters ? `${(distanceMeters / 1000).toFixed(1)} km` : '');
                const durationText = step.localizedValues?.staticDuration?.text || (durationSeconds ? `${Math.round(durationSeconds / 60)} min` : '');

                const maneuver = step.navigationInstruction?.maneuver || step.maneuver || undefined;

                return {
                    distance: distanceText,
                    duration: durationText,
                    distanceMeters,
                    durationSeconds,
                    maneuver,
                    instruction: step.navigationInstruction?.instructions || '',
                    polyline: step.polyline?.encodedPolyline || '',
                };
            }) || [];

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

    /**
     * Generate risk points along the route by sampling coordinates and calling AI model
     */
    private async generateRiskPoints(
        origin: { lat: number; lon: number },
        destination: { lat: number; lon: number },
        encodedPolyline: string,
        sampleCountRequested = 3,
    ): Promise<RiskPointDto[]> {
        try {
            // Decode polyline to get array of [lat, lon] coordinates
            const coordinates = decode(encodedPolyline, 5); // precision 5 for Google polylines

            // Precompute cumulative distances along the decoded coordinates
            const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const toRad = (v: number) => (v * Math.PI) / 180;
                const R = 6371000; // meters
                const dLat = toRad(lat2 - lat1);
                const dLon = toRad(lon2 - lon1);
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const cumulativeDistances: number[] = [];
            let acc = 0;
            for (let i = 0; i < coordinates.length; i++) {
                const [lat, lon] = coordinates[i];
                if (i === 0) {
                    cumulativeDistances.push(0);
                } else {
                    const [plat, plon] = coordinates[i - 1];
                    acc += haversine(plat, plon, lat, lon);
                    cumulativeDistances.push(Math.round(acc));
                }
            }

            // Sample points along route based on requested sampleCount (server caps to 20)
            const serverMax = 20;
            const sampleCount = Math.max(1, Math.min(serverMax, Math.floor(sampleCountRequested)));
            const sampleSize = Math.min(sampleCount, coordinates.length);
            const step = Math.floor(coordinates.length / sampleSize) || 1;
            const sampledCoordinates = coordinates
                .map((c, idx) => ({ lat: c[0], lon: c[1], index: idx }))
                .filter((_, index) => index % step === 0)
                .slice(0, sampleSize);

            this.logger.log(`Sampling ${sampledCoordinates.length} points from ${coordinates.length} total coordinates`);

            // Generate risk predictions for each sampled point
            const riskPoints: RiskPointDto[] = [];
            const currentTime = new Date();
            // Format time as 'YYYY-MM-DD HH:MM:SS' for FastAPI
            const formattedTime = currentTime.toISOString().slice(0, 19).replace('T', ' ');

            for (const { lat, lon, index: pointIndex } of sampledCoordinates) {
                try {
                    // Fetch weather data for this coordinate
                    const weather = await this.weatherService.getCurrentWeatherForAI(lat, lon);

                    // Prepare AI model request with weather data and current time
                    const predictRequest: PredictRequestDto = {
                        Start_Time: formattedTime,
                        Visibility_mi: weather.visibilityMi,
                        Wind_Speed_mph: weather.windSpeedMph,
                        Precipitation_in: weather.precipitationIn,
                        Temperature_F: weather.temperatureF,
                        Wind_Chill_F: weather.windChillF,
                        Humidity_percent: weather.humidity,
                        Pressure_in: weather.pressureIn,
                    };

                    // Get risk prediction from AI model
                    const prediction = await this.aiModelService.predictRisk(predictRequest);

                    // normalize weight (use severity3Probability as base, clipped 0..1)
                    const severity = Number(prediction.P_Severity_3 ?? 0);
                    const weight = Math.max(0, Math.min(1, severity));

                    const distanceFromStartMeters = cumulativeDistances[pointIndex] ?? 0;

                    // Create risk point with plain object (not class instance)
                    riskPoints.push({
                        lat,
                        lon,
                        tier: prediction.predicted_risk_tier,
                        severity3Probability: severity,
                        weight,
                        pointIndex,
                        distanceFromStartMeters,
                        timestamp: formattedTime,
                        source: 'ai',
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.warn(`Failed to generate risk for point (${lat}, ${lon}): ${message}`);
                    // Continue with other points even if one fails
                }
            }

            this.logger.log(`Successfully generated ${riskPoints.length} risk points`);
            return riskPoints;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error generating risk points: ${message}`, stack);
            return []; // Return empty array on error to not block route response
        }
    }
}