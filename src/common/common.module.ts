import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { CommonService } from './common.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // .env
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
     }),
  ],
  controllers: [CommonController],
  providers: [CommonService],
  exports: [ConfigModule],
})
export class CommonModule {}
