import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageModule } from '../storage/storage.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  imports: [JwtModule.register({}), StorageModule],
  providers: [UsersService, JwtAuthGuard],
})
export class UsersModule {}
