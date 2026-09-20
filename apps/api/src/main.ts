import { ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  // Global CORS
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle("UIUC Research Portal API")
    .setDescription("Backend API for UIUC Research Portal and AI Assistant with OpenAlex Ingestion and MySQL")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 UIUC Research Portal API running on: http://localhost:${port}`);
  logger.log(`📚 Swagger Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
