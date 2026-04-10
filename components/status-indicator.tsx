"use client";

import { cn } from "@/lib/utils";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "connected"
  | "error";

interface StatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  { label: string; subtitle: string; dotClass: string; textClass: string }
> = {
  idle: {
    label: "Ready",
    subtitle: "Tap to get started",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
  connecting: {
    label: "Connecting",
    subtitle: "Requesting access...",
    dotClass: "bg-primary animate-gentle-pulse",
    textClass: "text-primary",
  },
  waiting: {
    label: "Waiting",
    subtitle: "Share the QR code below",
    dotClass: "bg-warm-amber animate-gentle-pulse",
    textClass: "text-warm-amber-foreground",
  },
  connected: {
    label: "Connected",
    subtitle: "Everything is working",
    dotClass: "bg-warm-green animate-gentle-pulse",
    textClass: "text-warm-green-foreground",
  },
  error: {
    label: "Connection failed",
    subtitle: "Check your connection",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
  },
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const isActive = status === "connecting" || status === "waiting" || status === "connected";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex items-center justify-center">
        <span
          className={cn(
            "h-4 w-4 rounded-full transition-colors duration-300",
            config.dotClass
          )}
        />
        {isActive && (
          <span
            className={cn(
              "absolute h-4 w-4 rounded-full border-2 animate-ping opacity-30",
              status === "connecting" && "border-primary",
              status === "waiting" && "border-warm-amber",
              status === "connected" && "border-warm-green"
            )}
          />
        )}
      </div>
      <div>
        <span
          className={cn(
            "text-base font-semibold transition-colors duration-300",
            config.textClass
          )}
        >
          {config.label}
        </span>
        <p className="text-xs text-muted-foreground">{config.subtitle}</p>
      </div>
    </div>
  );
}
