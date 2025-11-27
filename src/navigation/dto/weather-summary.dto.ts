import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class WeatherSummaryDto {
    @ApiProperty({ description: 'Is there any precipitation detected', example: true })
    @Expose()
    precipitationPresent: boolean;

    @ApiProperty({ description: 'Average precipitation in inches (optional)', required: false, example: 0.03 })
    @Expose()
    avgPrecipIn?: number;

    @ApiProperty({ description: 'Precipitation label (none|light|moderate|heavy)', required: false, example: 'light' })
    @Expose()
    precipLabel?: 'none'|'light'|'moderate'|'heavy';

    @ApiProperty({ description: 'Average visibility in miles (optional)', required: false, example: 5.2 })
    @Expose()
    avgVisibilityMi?: number;

    @ApiProperty({ description: 'Average wind speed in mph (optional)', required: false, example: 12.4 })
    @Expose()
    avgWindMph?: number;

    @ApiProperty({ description: 'Wind label (calm|moderate|strong|gale)', required: false, example: 'moderate' })
    @Expose()
    windLabel?: 'calm'|'moderate'|'strong'|'gale';
}
