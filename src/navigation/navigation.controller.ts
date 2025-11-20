import { Body, ClassSerializerInterceptor, Controller, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutesResponseDto } from './dto/route-response.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Navigation')
@Controller('navigation')
@UseInterceptors(ClassSerializerInterceptor)
export class NavigationController {
    constructor(private readonly navigationService: NavigationService) {}

    @Post('route')
    @ApiOperation({ summary: 'Calculate route between two points' })
    async calculateRoute(@Body() dto: RouteRequestDto): Promise<RoutesResponseDto> {
        return this.navigationService.calculateRoute(dto);
    }
}
