import { Body, ClassSerializerInterceptor, Controller, Post, UseInterceptors } from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutesResponseDto } from './dto/route-response.dto';

@Controller('navigation')
@UseInterceptors(ClassSerializerInterceptor)
export class NavigationController {
    constructor(private readonly navigationService: NavigationService) {}

    @Post('route')
    async calculateRoute(@Body() dto: RouteRequestDto): Promise<RoutesResponseDto> {
        return this.navigationService.calculateRoute(dto);
    }
}
