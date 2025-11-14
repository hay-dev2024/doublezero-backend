import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // .env
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
      validate,
     }),
  ],
  controllers: [],
  providers: [],
  exports: [ConfigModule],
})
export class CommonModule {}
