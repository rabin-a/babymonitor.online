"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/status-indicator";
import { AudioLevelMeter } from "@/components/audio-level-meter";
import { QRDisplay } from "@/components/qr-display";
import { useWebRTCSender } from "@/hooks/use-webrtc";
import type { ListenerInfo } from "@/hooks/use-webrtc";
import {
  Baby,
  Check,
  Mic,
  MicOff,
  Smartphone,
  Square,
  Users,
  X,
} from "lucide-react";

export default function HomePage() {
  const {
    status,
    sessionId,
    audioLevel,
    error,
    listeners,
    senderIp,
    start,
    stop,
    approveListener,
    rejectListener,
  } = useWebRTCSender();
  const [receiverUrl, setReceiverUrl] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      fetch("/api/network")
        .then((res) => res.json())
        .then((data) => {
          if (data.addresses?.length > 0) setLocalIp(data.addresses[0]);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setReceiverUrl(null);
      return;
    }
    const hostname = window.location.hostname;
    if ((hostname === "localhost" || hostname === "127.0.0.1") && localIp) {
      const port = window.location.port;
      setReceiverUrl(
        `http://${localIp}${port ? `:${port}` : ""}/receiver?session=${sessionId}`
      );
    } else {
      setReceiverUrl(`${window.location.origin}/receiver?session=${sessionId}`);
    }
  }, [sessionId, localIp]);

  const pendingListeners = listeners.filter((l) => l.status === "pending");
  const approvedListeners = listeners.filter((l) => l.status === "approved");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Baby className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Baby Monitor
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs text-balance">
            Privacy-first audio monitoring. Secure peer-to-peer, no accounts
            needed.
          </p>
        </div>

        {/* Idle */}
        {status === "idle" && (
          <Button
            size="lg"
            onClick={() => start()}
            className="w-full h-16 text-lg rounded-2xl gap-3 bg-primary hover:bg-primary/90"
          >
            <Mic className="w-6 h-6" />
            Start Monitoring
          </Button>
        )}

        {/* Waiting / Connected */}
        {(status === "waiting" || status === "connected") && (
          <div className="flex flex-col items-center gap-6 w-full">
            <StatusIndicator status={status} />

            {status === "waiting" && receiverUrl && (
              <QRDisplay url={receiverUrl} />
            )}

            {status === "connected" && (
              <div className="w-full p-4 bg-green-500/10 rounded-xl text-center">
                <p className="text-green-700 font-medium">
                  Parent device connected!
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Audio is now streaming
                </p>
              </div>
            )}

            {/* Pending listener requests */}
            {pendingListeners.length > 0 && (
              <div className="w-full flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  Connection requests:
                </p>
                {pendingListeners.map((l) => (
                  <ListenerCard
                    key={l.id}
                    listener={l}
                    sameNetwork={!!senderIp && l.ip === senderIp}
                    onApprove={() => approveListener(l.id)}
                    onReject={() => rejectListener(l.id)}
                  />
                ))}
              </div>
            )}

            {/* Approved / active listeners */}
            {approvedListeners.length > 0 && (
              <div className="w-full p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Listening ({approvedListeners.length})
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {approvedListeners.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3 h-3" />
                        <span>{l.device}</span>
                      </div>
                      <span className="font-mono">{l.ip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Level */}
            <div className="w-full p-6 bg-card rounded-2xl border border-border">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Audio Level
              </p>
              <AudioLevelMeter level={audioLevel} />
            </div>

            <Button
              variant="destructive"
              size="lg"
              onClick={stop}
              className="w-full h-14 rounded-2xl text-lg gap-2"
            >
              <Square className="w-5 h-5" />
              Stop
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full p-4 bg-destructive/10 text-destructive rounded-xl text-sm text-center">
            {error}
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <MicOff className="w-10 h-10 text-destructive" />
            </div>
            <Button
              size="lg"
              onClick={() => start()}
              className="h-14 px-8 rounded-2xl text-lg gap-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Footer */}
        <footer className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <span>|</span>
          <a
            href="https://github.com/rabin-a/baby-monitor-web-app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}

function ListenerCard({
  listener,
  sameNetwork,
  onApprove,
  onReject,
}: {
  listener: ListenerInfo;
  sameNetwork: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-foreground">
            {listener.device}
          </span>
        </div>
        {sameNetwork && (
          <span className="text-xs bg-green-500/20 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Same network
          </span>
        )}
      </div>
      <p className="text-xs font-mono text-muted-foreground mb-3">
        {listener.ip}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onApprove}
          className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
        >
          <Check className="w-4 h-4" />
          Allow
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          className="flex-1 gap-1"
        >
          <X className="w-4 h-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
