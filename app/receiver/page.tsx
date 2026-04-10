"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusIndicator } from "@/components/status-indicator";
import { AudioWaveform } from "@/components/audio-waveform";
import { useWebRTCReceiver } from "@/hooks/use-webrtc";
import {
  ArrowLeft,
  Headphones,
  Link as LinkIcon,
  Volume2,
  VolumeOff,
} from "lucide-react";

function ReceiverContent() {
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");

  const {
    status,
    audioLevel,
    error,
    muted,
    sessionEnded,
    connect,
    disconnect,
    toggleMute,
  } = useWebRTCReceiver();
  const [sessionInput, setSessionInput] = useState("");
  const [lastSession, setLastSession] = useState<string | null>(null);

  const handleConnect = () => {
    const session = sessionFromUrl || lastSession;
    if (session) {
      setLastSession(session);
      connect(session);
    } else {
      let sessionId = sessionInput.trim();
      const urlMatch = sessionId.match(/session=([a-zA-Z0-9]+)/);
      if (urlMatch) sessionId = urlMatch[1];
      if (sessionId) {
        setLastSession(sessionId);
        connect(sessionId);
      }
    }
  };

  const hasSession = sessionFromUrl || lastSession;

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-6 bg-gradient-warm">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-card shadow-sm border border-border/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Parent Side</h1>
          <p className="text-sm text-muted-foreground">Receiver Mode</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-md mx-auto w-full">
        {/* Idle — has session: show connect/reconnect */}
        {status === "idle" && hasSession && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in-up">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/15 to-warm-amber/10 flex items-center justify-center shadow-lg shadow-primary/10 animate-glow-pulse">
              <Headphones className="w-12 h-12 text-primary" />
            </div>
            <p className="text-base text-muted-foreground text-center">
              {lastSession
                ? "Disconnected — tap to reconnect"
                : "Ready to connect to baby device"}
            </p>
            <Button
              size="lg"
              onClick={handleConnect}
              className="group w-full h-16 text-lg rounded-3xl gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200"
            >
              <Headphones className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {lastSession ? "Reconnect" : "Tap to Listen"}
            </Button>
          </div>
        )}

        {/* Idle — no session: show manual input */}
        {status === "idle" && !hasSession && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in-up">
            <div className="w-24 h-24 rounded-full bg-muted/50 border border-border/30 flex items-center justify-center">
              <LinkIcon className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-base text-muted-foreground text-center max-w-xs leading-relaxed">
              Paste the session link or scan the QR code on the baby device
            </p>
            <div className="w-full flex flex-col gap-3">
              <Input
                type="text"
                placeholder="Paste session link here..."
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                className="h-14 rounded-2xl border-border/50 shadow-sm"
              />
              <Button
                size="lg"
                onClick={handleConnect}
                disabled={!sessionInput.trim()}
                className="h-14 rounded-3xl text-lg gap-2 shadow-md active:scale-[0.98] transition-all"
              >
                <Headphones className="w-5 h-5" />
                Connect
              </Button>
            </div>
          </div>
        )}

        {/* Connecting State */}
        {status === "connecting" && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            <StatusIndicator status={status} />
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/15 to-warm-amber/10 flex items-center justify-center animate-gentle-pulse">
              <Headphones className="w-12 h-12 text-primary" />
            </div>
            <p className="text-base text-muted-foreground text-center">
              Waiting for sender to approve...
            </p>
          </div>
        )}

        {/* Connected State */}
        {status === "connected" && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in-up">
            <StatusIndicator status={status} />

            <div className="w-full p-5 bg-warm-green/10 border border-warm-green/20 rounded-2xl text-center">
              <p className="text-warm-green-foreground font-semibold">
                Connected to baby device!
              </p>
              <p className="text-sm text-warm-green-foreground/70 mt-1">
                {muted ? "Audio muted — tap unmute to listen" : "Listening live"}
              </p>
            </div>

            {/* Audio Waveform — always visible */}
            <div className="w-full p-6 bg-card rounded-3xl border border-border/50 shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-4">
                {muted ? (
                  <VolumeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-4 h-4 text-primary" />
                )}
                <p className="text-sm font-medium text-muted-foreground">
                  Incoming Audio
                </p>
              </div>
              <AudioWaveform level={audioLevel} />
            </div>

            {/* Mute/Unmute */}
            <Button
              size="lg"
              onClick={toggleMute}
              className={`w-full h-14 rounded-3xl text-lg gap-2 active:scale-[0.98] transition-all duration-200 ${
                muted
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-card border-2 border-primary/20 text-foreground shadow-sm hover:bg-muted/50"
              }`}
            >
              {muted ? (
                <>
                  <Volume2 className="w-5 h-5" />
                  Unmute
                </>
              ) : (
                <>
                  <VolumeOff className="w-5 h-5" />
                  Mute
                </>
              )}
            </Button>

            {/* Disconnect */}
            <Button
              variant="destructive"
              size="lg"
              onClick={disconnect}
              className="w-full h-14 rounded-3xl text-lg gap-2 shadow-md active:scale-[0.98] transition-all"
            >
              Disconnect
            </Button>
          </div>
        )}

        {/* Session ended by sender */}
        {sessionEnded && status === "error" && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in-up">
            <div className="w-24 h-24 rounded-full bg-muted/50 border border-border/30 flex items-center justify-center">
              <VolumeOff className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="p-5 bg-muted/50 rounded-2xl border border-border/30 shadow-sm text-center w-full">
              <p className="text-foreground font-semibold">Session ended</p>
              <p className="text-sm text-muted-foreground mt-1">
                The monitoring session is no longer available
              </p>
            </div>
          </div>
        )}

        {/* Error State (not session ended) */}
        {error && status === "error" && !sessionEnded && (
          <div className="flex flex-col items-center gap-6 w-full animate-fade-in-up">
            <StatusIndicator status={status} />
            <div className="p-4 bg-destructive/10 text-destructive rounded-2xl text-sm text-center w-full">
              {error}
            </div>
            <Button
              size="lg"
              onClick={handleConnect}
              className="w-full h-14 rounded-3xl text-lg shadow-md active:scale-[0.98] transition-all"
            >
              Try Again
            </Button>
            <Link href="/" className="w-full">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 rounded-3xl text-lg"
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
        <main className="min-h-screen flex items-center justify-center bg-gradient-warm">
          <div className="animate-gentle-pulse text-muted-foreground">
            Loading...
          </div>
        </main>
      }
    >
      <ReceiverContent />
    </Suspense>
  );
}
