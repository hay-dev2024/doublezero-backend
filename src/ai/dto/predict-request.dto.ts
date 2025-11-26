import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class PredictRequestDto {
  @ApiProperty({
    example: '2023-11-25 08:30:00',
    description: 'Accident start time (YYYY-MM-DD HH:MM:SS)',
  })
  @IsString()
  Start_Time: string;

  @ApiProperty({ example: 5.0, description: 'Visibility in miles' })
  @IsNumber()
  @Min(0)
  Visibility_mi: number;

  @ApiProperty({ example: 10.0, description: 'Wind speed in mph' })
  @IsNumber()
  @Min(0)
  Wind_Speed_mph: number;

  @ApiProperty({ example: 0.1, description: 'Precipitation in inches' })
  @IsNumber()
  @Min(0)
  Precipitation_in: number;

  @ApiProperty({ example: 35.0, description: 'Temperature in Fahrenheit' })
  @IsNumber()
  Temperature_F: number;

  @ApiProperty({ example: 30.0, description: 'Wind chill in Fahrenheit' })
  @IsNumber()
  Wind_Chill_F: number;

  @ApiProperty({ example: 75.0, description: 'Humidity in percent' })
  @IsNumber()
  @Min(0)
  @Max(100)
  Humidity_percent: number;

  @ApiProperty({ example: 30.0, description: 'Pressure in inches' })
  @IsNumber()
  @Min(0)
  Pressure_in: number;
}
