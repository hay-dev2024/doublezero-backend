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

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);
  console.log(`Server running on http://${host}:${port}`);
  console.log(`Swagger docs: http://${host}:${port}/api-docs`);
}
void bootstrap();
