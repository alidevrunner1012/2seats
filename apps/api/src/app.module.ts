import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnvironment } from './config/environment';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { RoomsModule } from './rooms/rooms.module';
import { ChatModule } from './chat/chat.module';
import { PlaybackModule } from './playback/playback.module';
import { LiveKitModule } from './livekit/livekit.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BrowserModule } from './browser/browser.module';
import { ModerationModule } from './moderation/moderation.module';
import { ObservabilityModule } from './observability/observability.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    ChatModule,
    PlaybackModule,
    LiveKitModule,
    BrowserModule,
    ModerationModule,
    ObservabilityModule,
    UploadsModule,
    HealthModule,
  ],
  providers: [HttpExceptionFilter],
})
export class AppModule {}
