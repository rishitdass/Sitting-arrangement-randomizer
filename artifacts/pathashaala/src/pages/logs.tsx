import { useState, useEffect } from "react";
import { getLogs, clearLogs, type LogEntry } from "@/lib/logger";
import { AlertTriangle, Info, Trash2, RefreshCw, ScrollText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

function LevelIcon({ level }: { level: LogEntry["level"] }) {
  if (level === "error") return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
  if (level === "warn") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
}

function LevelBadge({ level }: { level: LogEntry["level"] }) {
  if (level === "error") return <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs font-bold">ERROR</Badge>;
  if (level === "warn") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-bold">WARN</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-bold">INFO</Badge>;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => setLogs(getLogs());

  useEffect(() => {
    refresh();
  }, []);

  const handleClear = () => {
    if (!confirm("Clear all logs?")) return;
    clearLogs();
    refresh();
  };

  const errorCount = logs.filter(l => l.level === "error").length;
  const warnCount = logs.filter(l => l.level === "warn").length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">System Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All errors and warnings recorded by the app are shown here.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={refresh} className="gap-2 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="outline" onClick={handleClear} className="gap-2 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
            <Trash2 className="w-4 h-4" /> Clear Logs
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-muted-foreground text-sm font-medium">Total</p>
          <p className="text-2xl font-bold mt-1">{logs.length}</p>
        </div>
        <div className="bg-card border border-rose-100 rounded-2xl p-4">
          <p className="text-rose-600/80 text-sm font-medium">Errors</p>
          <p className="text-2xl font-bold mt-1 text-rose-700">{errorCount}</p>
        </div>
        <div className="bg-card border border-amber-100 rounded-2xl p-4">
          <p className="text-amber-600/80 text-sm font-medium">Warnings</p>
          <p className="text-2xl font-bold mt-1 text-amber-700">{warnCount}</p>
        </div>
      </div>

      {/* Logs list */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-3xl py-20 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-xl font-display font-bold">All clear</h3>
            <p className="text-muted-foreground mt-1 text-sm">No errors or warnings recorded.</p>
          </div>
        ) : (
          logs.map(entry => (
            <div
              key={entry.id}
              className={`bg-card border rounded-2xl overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${
                entry.level === "error"
                  ? "border-rose-200"
                  : entry.level === "warn"
                  ? "border-amber-200"
                  : "border-border"
              }`}
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
            >
              <div className="p-4 flex items-start gap-3">
                <LevelIcon level={entry.level} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <LevelBadge level={entry.level} />
                    {entry.source && (
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                        {entry.source}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{entry.message}</p>
                  {entry.detail && !expanded && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.detail}</p>
                  )}
                </div>
              </div>

              {expanded === entry.id && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                  {entry.detail && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Detail</p>
                      <pre className="text-xs text-foreground whitespace-pre-wrap font-mono bg-background border border-border rounded-lg p-3 overflow-x-auto">
                        {entry.detail}
                      </pre>
                    </div>
                  )}
                  {entry.stack && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stack Trace</p>
                      <pre className="text-xs text-rose-700 whitespace-pre-wrap font-mono bg-rose-50 border border-rose-100 rounded-lg p-3 overflow-x-auto">
                        {entry.stack}
                      </pre>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Timestamp: {entry.timestamp}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
