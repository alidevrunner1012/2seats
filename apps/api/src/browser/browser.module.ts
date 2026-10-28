import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrowserControlGateway } from './browser-control.gateway';
import { BrowserControlService } from './browser-control.service';
import { BrowserSessionController } from './browser-session.controller';
import { BrowserSessionService } from './browser-session.service';
import { BrowserReaper } from './browser.reaper';
import { BROWSER_RUNTIME } from './browser.runtime';
import { DockerRuntime } from './docker.runtime';
import { KubernetesRuntime } from './kubernetes.runtime';

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [BrowserSessionController],
  providers: [
    BrowserSessionService, BrowserControlService, BrowserControlGateway, BrowserReaper,
    { provide: BROWSER_RUNTIME, useFactory: () => (process.env.BROWSER_RUNTIME === 'k8s' ? new KubernetesRuntime() : new DockerRuntime()) },
  ],
  exports: [BrowserSessionService],
})
export class BrowserModule {}
