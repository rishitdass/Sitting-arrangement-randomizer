import { Link, useRoute } from "wouter";
import { Users, Settings, Users2, Calendar, FileSpreadsheet, Menu, Utensils, ScrollText } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getLogs } from "@/lib/logger";

const navItems = [
  { path: "/", label: "People", icon: Users },
  { path: "/groups", label: "Friendship Groups", icon: Users2 },
  { path: "/config", label: "Configuration", icon: Settings },
  { path: "/arrangements", label: "Arrangements", icon: Calendar },
  { path: "/guide", label: "Excel Guide", icon: FileSpreadsheet },
  { path: "/logs", label: "Logs", icon: ScrollText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const errorCount = getLogs().filter(l => l.level === "error").length;

  return (
    <div className="min-h-screen bg-background flex w-full overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight text-white">Pathashaala</h1>
            <p className="text-xs text-sidebar-foreground/60 font-medium">Dining Arrangements</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const [isActive] = useRoute(item.path);
            const Icon = item.icon;
            const isLogs = item.path === "/logs";

            return (
              <Link key={item.path} href={item.path} onClick={() => setSidebarOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-white shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-sidebar-primary" : ""}`} />
                  <span className="flex-1">{item.label}</span>
                  {isLogs && errorCount > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {errorCount > 9 ? "9+" : errorCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="bg-sidebar-accent/30 rounded-2xl p-4 border border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60 leading-relaxed">
              Pathashaala Dining Management System v1.0
            </p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/50 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg">Pathashaala</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white border border-border text-foreground hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
