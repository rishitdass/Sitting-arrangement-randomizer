export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  detail?: any;
  source?: string;
  stack?: string;
}

const STORAGE_KEY = "pathashaala_logs";
const MAX_LOGS = 250;

// Basic in-memory cache
let logCache: LogEntry[] | null = null;

function load(): LogEntry[] {
  if (logCache) return logCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    logCache = raw ? JSON.parse(raw) : [];
    return logCache!;
  } catch {
    return [];
  }
}

function save(entries: LogEntry[]): void {
  try {
    logCache = entries.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logCache));
  } catch {
    // storage quota — silently ignore
  }
}

export function addLog(level: LogLevel, message: string, opts?: { detail?: any; source?: string; stack?: string }): LogEntry {
  const entries = load();
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    detail: opts?.detail,
    source: opts?.source,
    stack: opts?.stack,
  };
  entries.unshift(entry);
  save(entries);

  // Also log to browser console for developer visibility
  if (import.meta.env.DEV) {
    const styles: Record<LogLevel, string> = {
      error: "color: red; font-weight: bold;",
      warn: "color: orange;",
      info: "color: blue;",
      debug: "color: grey;",
    };
    console.log(`%c[Pathashaala:${level}] %c${message}`, styles[level], "color: inherit;", opts?.detail ?? "");
  }

  return entry;
}

export function getLogs(): LogEntry[] {
  return load();
}

export function clearLogs(): void {
  logCache = [];
  localStorage.removeItem(STORAGE_KEY);
}

export function logApiError(context: string, error: unknown): void {
  const err = error as any;
  addLog("error", `API Error: ${context}`.trim(), {
    detail: err?.message ?? String(error),
    source: err?.url ? `${err?.method ?? "?"} ${err?.url}` : context,
    stack: err?.stack,
  });
}
