import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomMemberGuard } from './room-member.guard';
import { RoomHostGuard } from './room-host.guard';
import { LiveKitModule } from '../livekit/livekit.module';

@Module({
  imports: [JwtModule.register({}), AuthModule, MailModule, forwardRef(() => LiveKitModule)],
  controllers: [RoomsController],
  providers: [RoomsService, RoomMemberGuard, RoomHostGuard],
  exports: [RoomsService, RoomMemberGuard, RoomHostGuard],
})
export class RoomsModule {}
