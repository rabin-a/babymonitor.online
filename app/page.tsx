"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/status-indicator";
import { AudioLevelMeter } from "@/components/audio-level-meter";
import { QRDisplay } from "@/components/qr-display";
import { useWebRTCSender } from "@/hooks/use-webrtc";
import { Baby, Mic, MicOff, Square } from "lucide-react";

export default function HomePage() {
  const { status, sessionId, audioLevel, error, start, stop } =
    useWebRTCSender();
  const [receiverUrl, setReceiverUrl] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string | null>(null);

  // In local dev mode, fetch local network IP for the receiver URL
  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalDev =
      hostname === "localhost" ||
      hostname === "127.0.0.1";

    if (isLocalDev) {
      fetch("/api/network")
        .then((res) => res.json())
        .then((data) => {
          if (data.addresses?.length > 0) {
            setLocalIp(data.addresses[0]);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Build receiver URL
  useEffect(() => {
    if (!sessionId) {
      setReceiverUrl(null);
      return;
    }

    const hostname = window.location.hostname;
    const isLocalDev =
      hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalDev && localIp) {
      const port = window.location.port;
      setReceiverUrl(
        `http://${localIp}${port ? `:${port}` : ""}/receiver?session=${sessionId}`
      );
    } else {
      setReceiverUrl(`${window.location.origin}/receiver?session=${sessionId}`);
    }
  }, [sessionId, localIp]);

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
            Privacy-first audio monitoring. Secure peer-to-peer, no accounts needed.
          </p>
        </div>

        {/* Idle State - Start Button */}
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

        {/* Waiting/Connected State — QR shows immediately */}
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

        {/* Error State */}
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
      </div>
    </main>
  );
}
