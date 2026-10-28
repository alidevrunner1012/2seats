import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NoopScanner, VIRUS_SCANNER } from './scan';
import { StorageService } from './storage.service';
import { UploadsCleanup } from './uploads.cleanup';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, StorageService, UploadsCleanup, { provide: VIRUS_SCANNER, useClass: NoopScanner }],
  exports: [UploadsService],
})
export class UploadsModule {}
