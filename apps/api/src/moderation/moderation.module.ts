import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { DmcaService } from './dmca.service';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { TosGuard, TosService } from './tos.service';

/** Global so Rooms/Playback can inject ModerationService, DmcaService and TosGuard. */
@Global()
@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [ModerationController],
  providers: [ModerationService, DmcaService, TosService, TosGuard],
  exports: [ModerationService, DmcaService, TosService, TosGuard],
})
export class ModerationModule {}
