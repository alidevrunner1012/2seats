import { DynamicModule, Module } from '@nestjs/common';

export const CronExpression = {
  EVERY_MINUTE: '* * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
} as const;

export function Cron(_expression: string): MethodDecorator {
  void _expression;
  return () => undefined;
}

@Module({})
export class ScheduleModule {
  static forRoot(): DynamicModule {
    return { module: ScheduleModule };
  }
}
