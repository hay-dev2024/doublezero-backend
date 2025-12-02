import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class StopSessionDto {
  @ApiProperty({
    description: '중지할 세션 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID(4)
  @IsNotEmpty()
  sessionId: string;
}
