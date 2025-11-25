import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class RouteResponseDto {
    @ApiProperty({ example: '77.8 km', description: 'Total distance' })
    @Expose()
    distance: string;

    @ApiProperty({ example: '55 min', description: 'Estimated duration' })
    @Expose()
    duration: string;

    @ApiProperty({ example: 'US-101 S', description: 'Route summary' })
    @Expose()
    summary: string;

    @ApiProperty({ example: '', description: 'Encoded polyline for map rendering' })
    @Expose()
    polyline: string;

    @ApiProperty({ example: 'This route includes a highway', description: 'Route warnings', required: false })
    @Expose()
    warning?: string[];

    @ApiProperty({ 
        example: {
            northeast: { lat: 37.7749, lon: -122.4194 },
            southwest: { lat: 37.3382, lon: -121.8863 }
        }, 
        description: 'Route bounding box',
        required: false, 
    })
    @Expose()
    bounds?: {
        northeast: { lat: number; lon: number };
        southwest: { lat: number; lon: number };
    };

    @ApiProperty({ 
        example: [
            {
                distance: '5.2 km',
                duration: '4 min',
                distanceMeters: 5200,
                durationSeconds: 240,
                maneuver: 'turn-right',
                instruction: 'Head south on US-101 S',
                polyline: '...'
            }
        ], 
        description: 'Step-by-step navigation instruction',
        required: false, 
    })
    @Expose()
    steps?: Array<{
        distance: string;
        duration: string;
        distanceMeters?: number;
        durationSeconds?: number;
        maneuver?: string;
        instruction: string;
        polyline: string;
    }>;

    @ApiProperty({ 
        example: { hasTolls: false, hasHighway: true },
        description: 'Traffic information',
        required: false, 
    })
    @Expose()
    trafficInfo?: {
        hasTolls: boolean;
        hasHighways: boolean;
    };
}

// 경로가 복수인 경우
export class RoutesResponseDto {
    @ApiProperty({
        type: [RouteResponseDto],
        description: 'List of available routes',
    })
    @Expose()
    @Type(() => RouteResponseDto)
    routes: RouteResponseDto[];
}