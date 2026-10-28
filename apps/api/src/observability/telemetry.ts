/** Import this FIRST in main.ts:  import './observability/telemetry';  */
import * as Sentry from '@sentry/node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.1,
    beforeSend(event) { // never ship credentials to Sentry
      if (event.request) { delete event.request.cookies; if (event.request.headers) { delete event.request.headers.authorization; delete event.request.headers.cookie; } }
      return event;
    },
  });
}
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? '2seats-api',
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } })],
  });
  sdk.start();
  process.on('SIGTERM', () => { void sdk.shutdown(); });
}
