import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "./database/database.module";
import { TrashCleanupService } from "./services/trash-cleanup.service";
import { StatsSyncService } from "./services/stats-sync.service";
import { NoteProcessor } from "./processors/note.processor";
import { CronProcessor } from "./processors/cron.processor";
import { CronSchedulerService } from "./schedulers/cron-scheduler.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST", "localhost"),
          port: Number(configService.get<number>("REDIS_PORT", 6379)),
          lazyConnect: true,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: "cron-queue" },
      { name: "note-events" }
    ),
    DatabaseModule,
  ],
  providers: [
    TrashCleanupService,
    StatsSyncService,
    NoteProcessor,
    CronProcessor,
    CronSchedulerService,
  ],
})
export class AppModule {}
