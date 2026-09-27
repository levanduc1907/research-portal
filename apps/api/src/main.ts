import { ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module";

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === "production";
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const logger = new Logger("Bootstrap");

  const bodyLimit = process.env.REQUEST_BODY_LIMIT || "16kb";
  app.useBodyParser("json", { limit: bodyLimit });
  app.useBodyParser("urlencoded", { limit: bodyLimit, extended: true });

  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) {
    if (isProduction && trustProxy === "true") {
      throw new Error(
        "TRUST_PROXY=true is unsafe in production; configure an exact proxy hop count or trusted subnet",
      );
    }
    const value = /^\d+$/.test(trustProxy)
      ? Number(trustProxy)
      : trustProxy === "true"
        ? true
        : trustProxy;
    app.getHttpAdapter().getInstance().set("trust proxy", value);
  }
  app.getHttpAdapter().getInstance().disable("x-powered-by");

  app.use((req, res, next) => {
    const suppliedRequestId = req.header("x-request-id");
    const requestId =
      suppliedRequestId && /^[a-zA-Z0-9._-]{1,100}$/.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    if (isProduction) {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }
    next();
  });

  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const allowedOrigins = new Set(
    configuredOrigins.length || isProduction
      ? configuredOrigins
      : ["http://localhost:3000", "http://127.0.0.1:3000"],
  );
  if (isProduction && allowedOrigins.size === 0) {
    throw new Error("CORS_ORIGINS must be configured in production");
  }
  if (allowedOrigins.has("*")) {
    throw new Error("CORS_ORIGINS cannot contain a wildcard");
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-AI-Admin-Token",
      "X-Request-Id",
    ],
    exposedHeaders: [
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After",
      "X-Request-Id",
      "X-Cache",
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );

  const swaggerEnabled =
    process.env.ENABLE_SWAGGER === "true" ||
    (!isProduction && process.env.ENABLE_SWAGGER !== "false");
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("UIUC Research Portal API")
      .setDescription(
        "Backend API for UIUC Research Portal and AI Assistant with OpenAlex Ingestion and MySQL",
      )
      .setVersion("1.0")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT || 4000;
  app.enableShutdownHooks();
  await app.listen(port);

  logger.log(`UIUC Research Portal API listening on port ${port}`);
  if (swaggerEnabled) {
    logger.log(`Swagger Docs available at: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
