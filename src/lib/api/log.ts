import 'server-only';
import type { NextRequest } from 'next/server';

// Structured JSON logger for API routes.
//
// Goals:
// - Single line per event so log shippers / Vercel runtime logs / future
//   Datadog / Better Stack pipelines can parse without regex gymnastics.
// - Redact known sensitive keys before serialization.
// - Stay zero-dependency so it can be imported from any server-only module
//   without bloating the edge bundle.
//
// Usage:
//   import { logger } from '@/lib/api/log';
//   logger.info('chat.start', { route: '/api/altar/chat', profileId });
//   logger.error('chat.fail', { error: err, profileId });
//
// Levels follow standard syslog naming: debug < info < warn < error.

type Level = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'set-cookie',
  'apikey',
  'api_key',
  'secret',
  'service_role_key',
  'anon_key',
  'session',
]);

function redactValue(key: string, value: unknown): unknown {
  if (typeof value === 'string' && SENSITIVE_KEYS.has(key.toLowerCase())) {
    return value.length > 0 ? '[redacted]' : '';
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redact(value as Record<string, unknown>);
  }
  return value;
}

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = redactValue(k, v);
  }
  return out;
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  const safeFields = fields ? redact(fields) : undefined;
  const line = {
    level,
    event,
    time: new Date().toISOString(),
    ...(safeFields ?? {}),
  };
  // Convert errors to a serializable shape so console doesn't print "{}".
  if (line.error instanceof Error) {
    line.error = {
      name: line.error.name,
      message: line.error.message,
      // Stack is helpful in dev; trim in prod to keep log volume sane.
      stack: process.env.NODE_ENV === 'production' ? undefined : line.error.stack,
    } as unknown as Error;
  }
  const json = JSON.stringify(line);
  // eslint-disable-next-line no-console
  switch (level) {
    case 'debug': console.debug(json); break;
    case 'info':  console.log(json); break;
    case 'warn':  console.warn(json); break;
    case 'error': console.error(json); break;
  }
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit('debug', event, fields),
  info:  (event: string, fields?: Record<string, unknown>) => emit('info',  event, fields),
  warn:  (event: string, fields?: Record<string, unknown>) => emit('warn',  event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit('error', event, fields),
};

// Pull a stable, low-cardinality request descriptor for log correlation.
export function describeRequest(req: NextRequest, route: string): Record<string, unknown> {
  return {
    route,
    method: req.method,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null,
    userAgent: req.headers.get('user-agent') || null,
    requestId: req.headers.get('x-vercel-id') || req.headers.get('x-request-id') || null,
  };
}
