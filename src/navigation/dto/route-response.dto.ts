import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { RiskPointDto } from "src/ai/dto/risk-point.dto";

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
        example: { hasTolls: false, hasHighways: true },
        description: 'Traffic information',
        required: false, 
    })
    @Expose()
    trafficInfo?: {
        hasTolls: boolean;
        hasHighways: boolean;
    };

    @ApiProperty({
        type: [RiskPointDto],
        description: 'Risk heatmap data points for this route',
        required: false,
        example: [
            { lat: 37.4219999, lon: -122.0840575, tier: 1, severity3Probability: 0.2098, weight: 0.21, pointIndex: 0, distanceFromStartMeters: 0, timestamp: '2025-11-26 16:44:10', source: 'ai' },
            { lat: 37.4220123, lon: -122.0841234, tier: 0, severity3Probability: 0.0488, weight: 0.05, pointIndex: 12, distanceFromStartMeters: 520, timestamp: '2025-11-26 16:44:10', source: 'ai' },
        ],
    })
    @Expose()
    @Type(() => RiskPointDto)
    riskPoints?: RiskPointDto[];
}

// 경로가 복수인 경우
export class RoutesResponseDto {
    @ApiProperty({
        type: [RouteResponseDto],
        description: 'List of available routes',
        example: {
            routes: [
                {
                    distance: '14.8 km',
                    duration: '22 min',
                    summary: 'CA-85 S and W Fremont Ave',
                    polyline: 'encoded_polyline_here',
                    bounds: {
                        northeast: { lat: 37.4233338, lon: -122.0305778 },
                        southwest: { lat: 37.3302298, lon: -122.0837855 }
                    },
                    steps: [
                        { distance: '0.1 km', distanceMeters: 54, duration: '0 min', durationSeconds: 11, maneuver: 'DEPART', instruction: 'Head east', polyline: '...' }
                    ]
                }
            ]
        }
    })
    @Expose()
    @Type(() => RouteResponseDto)
    routes: RouteResponseDto[];
}