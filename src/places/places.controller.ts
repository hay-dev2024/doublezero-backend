import { Body, ClassSerializerInterceptor, Controller, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { PlacesService } from './places.service';
import { PlaceSearchDto } from './dto/place-search.dto';
import { PlaceAutocompleteSuggestionDto, PlaceResponseDto } from './dto/place-response.dto';
import { PlaceAutocompleteDto } from './dto/place-autocomplete.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Places')
@Controller('places')
@UseInterceptors(ClassSerializerInterceptor)
export class PlacesController {
    constructor(private readonly placesService: PlacesService) {}

    /**
   * POST /places/search
   * Body: { "query": "KingsCross" }
   */
    @Post('search')
    @ApiOperation({ summary: 'Search places by text query' })
    async searchPlaces(
        @Body() dto: PlaceSearchDto,
    ): Promise<PlaceResponseDto[]> {
        return this.placesService.searchPlaces(dto.query);
    }

    @Get('autocomplete')
    @ApiOperation({ summary: 'Autocomplete place search' })
    async autocompletePlaces(
        @Query() dto: PlaceAutocompleteDto,
    ): Promise<PlaceAutocompleteSuggestionDto[]> {
        return this.placesService.autoCompletePlaces(dto.input, dto.lat, dto.lon);
    }

    @Get(':placeId')
    @ApiOperation({ summary: 'Get detailed place information by ID' })
    async getPlaceDetails(
        @Param('placeId') placeId: string,
    ): Promise<PlaceResponseDto> {
        return this.placesService.getPlaceDetails(placeId);
    }

}
