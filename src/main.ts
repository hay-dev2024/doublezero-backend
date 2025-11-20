import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // swagger
  const config = new DocumentBuilder()
  .setTitle('DoubleZero API')
  .setDescription('DoubleZero Backend API Documentation')
  .setVersion('1.0')
  .addBearerAuth() // JWT
  .build()

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // http://localhost:3000/api-docs

  await app.listen(process.env.PORT ?? 3000);
  console.log('Server running on http://localhost:3000');
  console.log('Swagger docs: http://localhost:3000/api-docs');
}
bootstrap();
