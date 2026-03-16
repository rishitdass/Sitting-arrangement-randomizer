export type LogLevel = "error" | "warn" | "info";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  detail?: string;
  source?: string;
  stack?: string;
}

const STORAGE_KEY = "pathashaala_logs";
const MAX_LOGS = 200;

function load(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_LOGS)));
  } catch {
    // storage quota — silently ignore
  }
}

export function addLog(level: LogLevel, message: string, opts?: { detail?: string; source?: string; stack?: string }): void {
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
  if (level === "error") console.error(`[Pathashaala] ${message}`, opts?.detail ?? "");
  else if (level === "warn") console.warn(`[Pathashaala] ${message}`, opts?.detail ?? "");
  else console.info(`[Pathashaala] ${message}`, opts?.detail ?? "");
}

export function getLogs(): LogEntry[] {
  return load();
}

export function clearLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function logApiError(context: string, error: unknown): void {
  const err = error as any;
  addLog("error", `API error: ${context}`, {
    detail: err?.message ?? String(error),
    source: err?.url ? `${err?.method ?? "?"} ${err?.url}` : context,
    stack: err?.stack,
  });
}
