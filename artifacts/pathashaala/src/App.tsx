import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/layout";
import People from "./pages/people";
import Configuration from "./pages/configuration";
import Groups from "./pages/groups";
import Arrangements from "./pages/arrangements";
import ExcelGuide from "./pages/excel-guide";
import Logs from "./pages/logs";
import NotFound from "./pages/not-found";
import { ErrorBoundary } from "./components/error-boundary";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getLogs } from "@/lib/logger";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ErrorRedirectToast() {
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "1") {
      const recent = getLogs().find(l => l.level === "error");
      toast({
        title: "An error occurred",
        description: recent
          ? `${recent.message} — check Logs for details.`
          : "An unexpected error occurred. Please check the Logs page.",
        variant: "destructive",
        duration: 8000,
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  return null;
}

function Router() {
  return (
    <Layout>
      <ErrorRedirectToast />
      <Switch>
        <Route path="/" component={People} />
        <Route path="/config" component={Configuration} />
        <Route path="/groups" component={Groups} />
        <Route path="/arrangements" component={Arrangements} />
        <Route path="/guide" component={ExcelGuide} />
        <Route path="/logs" component={Logs} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
