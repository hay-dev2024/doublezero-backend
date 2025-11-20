import { Expose, Type } from "class-transformer";

export class RouteResponseDto {
    @Expose()
    distance: string;

    @Expose()
    duration: string;

    @Expose()
    summary: string;

    @Expose()
    polyline: string;
}

// 경로가 복수인 경우
export class RoutesResponseDto {
    @Expose()
    @Type(() => RouteResponseDto)
    routes: RouteResponseDto[];
}