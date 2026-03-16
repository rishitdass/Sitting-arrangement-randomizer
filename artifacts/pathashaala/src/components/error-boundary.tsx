import React from "react";
import { addLog } from "@/lib/logger";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    addLog("error", error.message || "Unexpected render error", {
      detail: info.componentStack ?? undefined,
      source: error.name,
      stack: error.stack,
    });

    // Navigate home after a brief delay so the log is saved first
    setTimeout(() => {
      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      window.location.href = `${window.location.origin}${base}/?error=1`;
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Redirecting to home…</p>
        </div>
      );
    }
    return this.props.children;
  }
}
