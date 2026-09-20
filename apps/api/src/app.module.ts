import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./modules/database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { NotesModule } from "./modules/notes/notes.module";
import { QueueModule } from "./modules/queue/queue.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { ChatModule } from "./modules/chat/chat.module";
import { TeamNotesModule } from "./modules/team-notes/team-notes.module";
import { TeamDocumentsModule } from "./modules/team-documents/team-documents.module";
import { HealthController } from "./modules/health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    QueueModule,
    AuthModule,
    UsersModule,
    NotesModule,
    TeamsModule,
    ChatModule,
    TeamNotesModule,
    TeamDocumentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
