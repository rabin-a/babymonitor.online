"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusIndicator } from "@/components/status-indicator";
import { AudioLevelMeter } from "@/components/audio-level-meter";
import { useWebRTCReceiver } from "@/hooks/use-webrtc";
import { ArrowLeft, Headphones, Link as LinkIcon, Volume2, VolumeOff } from "lucide-react";

function ReceiverContent() {
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");

  const { status, audioLevel, error, connect, disconnect } = useWebRTCReceiver();
  const [sessionInput, setSessionInput] = useState("");

  const handleConnect = () => {
    if (sessionFromUrl) {
      connect(sessionFromUrl);
    } else {
      let sessionId = sessionInput.trim();
      const urlMatch = sessionId.match(/session=([a-zA-Z0-9]+)/);
      if (urlMatch) sessionId = urlMatch[1];
      if (sessionId) connect(sessionId);
    }
  };

  return (
    <main className="min-h-screen flex flex-col p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Parent Side</h1>
          <p className="text-sm text-muted-foreground">Receiver Mode</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-md mx-auto w-full">

        {/* Idle — session from QR/link: show tap-to-listen */}
        {status === "idle" && sessionFromUrl && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Headphones className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Ready to connect to baby device
            </p>
            <Button
              size="lg"
              onClick={handleConnect}
              className="w-full h-16 text-lg rounded-2xl gap-3 bg-primary hover:bg-primary/90"
            >
              <Headphones className="w-6 h-6" />
              Tap to Listen
            </Button>
          </div>
        )}

        {/* Idle — no session: show manual input */}
        {status === "idle" && !sessionFromUrl && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
              <LinkIcon className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Paste the session link or scan the QR code on the baby device
            </p>
            <div className="w-full flex flex-col gap-3">
              <Input
                type="text"
                placeholder="Paste session link here..."
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                className="h-12 rounded-xl"
              />
              <Button
                size="lg"
                onClick={handleConnect}
                disabled={!sessionInput.trim()}
                className="h-14 rounded-2xl text-lg gap-2"
              >
                <Headphones className="w-5 h-5" />
                Connect
              </Button>
            </div>
          </div>
        )}

        {/* Connecting State */}
        {status === "connecting" && (
          <div className="flex flex-col items-center gap-6">
            <StatusIndicator status={status} />
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Headphones className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Connecting to baby device...
            </p>
          </div>
        )}

        {/* Connected State */}
        {status === "connected" && (
          <div className="flex flex-col items-center gap-8 w-full">
            <StatusIndicator status={status} />

            <div className="p-4 bg-green-500/10 rounded-xl text-center w-full">
              <p className="text-green-700 font-medium">
                Connected to baby device!
              </p>
              <p className="text-sm text-green-600 mt-1">
                Listening for audio
              </p>
            </div>

            <div className="w-full p-6 bg-card rounded-2xl border border-border">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Incoming Audio</p>
              </div>
              <AudioLevelMeter level={audioLevel} />
            </div>

            <Button
              variant="destructive"
              size="lg"
              onClick={disconnect}
              className="w-full h-14 rounded-2xl text-lg gap-2"
            >
              Disconnect
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && status === "error" && (
          <div className="flex flex-col items-center gap-6 w-full">
            <StatusIndicator status={status} />
            <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm text-center w-full">
              {error}
            </div>
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <VolumeOff className="w-12 h-12 text-destructive" />
            </div>
            <Button
              size="lg"
              onClick={handleConnect}
              className="w-full h-14 rounded-2xl text-lg"
            >
              Try Again
            </Button>
            <Link href="/" className="w-full">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 rounded-2xl text-lg"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ReceiverPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </main>
      }
    >
      <ReceiverContent />
    </Suspense>
  );
}
