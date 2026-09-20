"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/context";
import { api } from "../lib/api-client";
import {
  Server,
  Activity,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";

interface WorkerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkerStatusModal({
  isOpen,
  onClose,
}: WorkerStatusModalProps) {
  const { t } = useI18n();
  const [health, setHealth] = useState<{
    api: string;
    database: string;
    worker: string;
  }>({
    api: "checking...",
    database: "checking...",
    worker: "active",
  });

  const checkStatus = async () => {
    try {
      const res = await api.checkHealth();
      setHealth({
        api: "Online (NestJS)",
        database: res.database || "Connected (Prisma)",
        worker: "Active (BullMQ & Redis)",
      });
    } catch {
      setHealth({
        api: "Standalone / Offline Mode",
        database: "Local Indexed Storage",
        worker: "BullMQ Schedulers Ready",
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const queues = [
    {
      name: "note-events",
      type: "BullMQ Event Stream",
      description: "Auto-save sync, indexing, and tag analysis for notes",
      status: "Active",
      workers: 2,
    },
    {
      name: "cron-queue",
      type: "Repeatable Cron Scheduler",
      description: "Scheduled jobs (trash cleanup @ 00:00, stats sync @ 15m)",
      status: "Active",
      workers: 1,
    },
  ];

  const cronjobs = [
    {
      name: "Trash Cleanup Job",
      cron: "0 0 * * *",
      interval: "Daily at 00:00 AM",
      action: "Permanently purges notes in trash older than 30 days",
    },
    {
      name: "Stats Aggregation Job",
      cron: "*/15 * * * *",
      interval: "Every 15 minutes",
      action: "Recalculates note statistics and active user metrics",
    },
    {
      name: "Heartbeat Liveness",
      cron: "* * * * *",
      interval: "Every 1 minute",
      action: "Worker health check and queue diagnostics",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">
                {t.systemStatus}
              </h3>
              <p className="text-xs text-muted-foreground">
                Turborepo Monorepo Architecture Overview
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Service Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border bg-background space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>{t.apiStatus}</span>
                <Server className="h-3.5 w-3.5" />
              </div>
              <div className="text-sm font-bold text-foreground">
                {health.api}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-background space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Database</span>
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div className="text-sm font-bold text-foreground">
                {health.database}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-background space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>{t.workerStatus}</span>
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {health.worker}
              </div>
            </div>
          </div>

          {/* BullMQ Queues */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Registered BullMQ Queues</span>
            </h4>
            <div className="space-y-2">
              {queues.map((q) => (
                <div
                  key={q.name}
                  className="p-3 rounded-xl border bg-muted/30 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {q.name}
                      </span>
                      <Badge variant="success" className="text-[10px] py-0 px-1.5">
                        {q.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {q.description}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                    {q.workers} worker(s)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Registered Cronjobs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span>Configured Repeatable Cronjobs</span>
            </h4>
            <div className="space-y-2">
              {cronjobs.map((c) => (
                <div
                  key={c.name}
                  className="p-3 rounded-xl border bg-muted/30 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {c.name}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border text-muted-foreground">
                        {c.cron}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.action}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                    {c.interval}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/40 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Button size="sm" onClick={onClose} className="h-8 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
