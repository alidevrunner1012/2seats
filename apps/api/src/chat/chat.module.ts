import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { LINK_UNFURL_QUEUE } from './link-unfurl.types';
import { LinkUnfurlService } from './link-unfurl.service';
import { LinkUnfurlProcessor } from './link-unfurl.processor';
import { PlaybackModule } from '../playback/playback.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => RoomsModule),
    RedisModule,
    AuthModule,
    JwtModule.register({}),
    BullModule.registerQueue({ name: LINK_UNFURL_QUEUE }),
    PlaybackModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, LinkUnfurlService, LinkUnfurlProcessor],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
