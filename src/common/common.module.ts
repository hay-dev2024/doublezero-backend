import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // .env
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
     }),
  ],
  controllers: [],
  providers: [],
  exports: [ConfigModule],
})
export class CommonModule {}
