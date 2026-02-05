import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get config
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger setup (only in non-production or always for this MVP)
  const config = new DocumentBuilder()
    .setTitle('Arriendo Facil API')
    .setDescription(
      'Backend API for Arriendo Facil rental marketplace. ' +
        'Provides property listings, tenant applications, risk scoring with AI document analysis.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .addTag('properties', 'Property management')
    .addTag('applications', 'Rental applications')
    .addTag('users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // CORS for frontend
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? ['https://arriendofacil.com', 'https://www.arriendofacil.com']
        : true,
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api`);
  logger.log(`Health check at http://localhost:${port}/health`);
}
bootstrap();
