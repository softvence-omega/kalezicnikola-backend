import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { GlobalExceptionFilter } from './common/interceptors/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Increase body size limit for ElevenLabs webhooks
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
  // Add CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://docline.ai',
      'https://kalezicnikola-frontend.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/api/v1/uploads/',
  });

  // Global success response formatting
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global error response formatting
  app.useGlobalFilters(new GlobalExceptionFilter());

  //here add global pipe line for validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('/api/v1');

  const config = app.get(ConfigService);
  const port = config.get('port') || 3000;
  // const node_env = config.get('node_env') || 'development';

  await app.listen(port);
  console.log(`🚀 Application is running successfully! port number ${port}`);
}
bootstrap().catch((err) => {
  // console.error('❌ Error during bootstrap:', err);
  process.exit(1);
});
