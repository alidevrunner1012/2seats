import { Module } from '@nestjs/common';
import { PlaybackGateway } from './playback.gateway';
import { PlaybackService } from './playback.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({ imports: [PrismaModule, RedisModule], providers: [PlaybackService, PlaybackGateway], exports: [PlaybackService, PlaybackGateway] })
export class PlaybackModule {}
