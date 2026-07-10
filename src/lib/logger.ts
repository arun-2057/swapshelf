export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: string;
  level?: LogLevel;
  msg: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  err?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV !== "production";

export function log(entry: LogEntry) {
  const payload = {
    ...entry,
    ts: new Date().toISOString(),
  };

  if (isDev || entry.level === "error" || entry.level === "warn") {
    console.log(JSON.stringify(payload));
  }
}

export function buildRequestLogger(entry: Omit<LogEntry, "ts" | "level">) {
  const start = Date.now();

  return {
    complete(status: number) {
      log({
        ...entry,
        ts: new Date().toISOString(),
        level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        status,
        durationMs: Date.now() - start,
      });
    },
  };
}
