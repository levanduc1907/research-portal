import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  const app = await NestFactory.createApplicationContext(AppModule);

  logger.log("⚙️  ChaosNote BullMQ & Cron Worker is running and ready to process jobs.");

  process.on("SIGINT", async () => {
    logger.log("Gracefully shutting down worker...");
    await app.close();
    process.exit(0);
  });
}

bootstrap();
