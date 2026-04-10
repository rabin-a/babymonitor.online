#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Baby Monitor AI - local bridge using Whisper + Claude Code CLI.

Audio -> Whisper (local, free) -> transcript -> Claude CLI (classify)

Usage:
    pip install openai-whisper
    python3 baby-monitor-ai.py

Requires:
    - pip install openai-whisper
    - Claude Code CLI (claude command)
    - ffmpeg (brew install ffmpeg) - needed by whisper
    - Same network as the baby monitor sender
"""

import argparse
import json
import base64
import os
import subprocess
import sys
import shutil
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    import whisper
except ImportError:
    print("Error: 'openai-whisper' package not found.")
    print("  pip install openai-whisper")
    sys.exit(1)

DEFAULT_PORT = 9877
WORK_DIR = "/tmp/baby-monitor"


class BridgeHandler(BaseHTTPRequestHandler):
    monitoring_mode = "notify_crying"
    whisper_model = None

    def log_message(self, format, *args):
        print(f"[baby-monitor-ai] {args[0]}")

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _respond(self, code, data):
        try:
            self.send_response(code)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except BrokenPipeError:
            pass

    def do_OPTIONS(self):
        try:
            self.send_response(204)
            self._cors_headers()
            self.end_headers()
        except BrokenPipeError:
            pass

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == "/config" and "mode" in params:
            BridgeHandler.monitoring_mode = params["mode"][0]
            self._respond(200, {"mode": BridgeHandler.monitoring_mode})
            return

        self._respond(200, {
            "alive": True,
            "service": "baby-monitor-ai",
            "mode": BridgeHandler.monitoring_mode,
        })

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
            audio_b64 = data.get("audio", "")
            content_type = data.get("contentType", "audio/webm")

            if not audio_b64:
                self._respond(400, {"error": "No audio data"})
                return

            suffix = ".webm" if "webm" in content_type else ".wav"
            audio_path = os.path.join(WORK_DIR, f"capture{suffix}")
            wav_path = os.path.join(WORK_DIR, "capture.wav")

            os.makedirs(WORK_DIR, exist_ok=True)
            with open(audio_path, "wb") as f:
                f.write(base64.b64decode(audio_b64))

            size = os.path.getsize(audio_path)
            print(f"[baby-monitor-ai] Saved {size} bytes to {audio_path}")

            # Convert to WAV for whisper (it works best with wav)
            if suffix != ".wav":
                print("[baby-monitor-ai] Converting to WAV...")
                conv = subprocess.run(
                    ["ffmpeg", "-y", "-i", audio_path,
                     "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                     wav_path],
                    capture_output=True, text=True, timeout=10,
                )
                if conv.returncode != 0:
                    print(f"[baby-monitor-ai] ffmpeg error: {conv.stderr[-200:]}")
                    self._respond(500, {"error": "Audio conversion failed"})
                    return
                transcribe_path = wav_path
            else:
                transcribe_path = audio_path

            # Get volume stats from ffmpeg
            print("[baby-monitor-ai] Getting volume stats...")
            vol_result = subprocess.run(
                ["ffmpeg", "-i", transcribe_path, "-af", "volumedetect",
                 "-f", "null", "-"],
                capture_output=True, text=True, timeout=10,
            )
            volume_info = ""
            if vol_result.stderr:
                for line in vol_result.stderr.split("\n"):
                    if "mean_volume" in line or "max_volume" in line:
                        volume_info += line.strip() + "\n"

            # Transcribe with Whisper
            print("[baby-monitor-ai] Transcribing with Whisper...")
            result = BridgeHandler.whisper_model.transcribe(
                transcribe_path,
                language="en",
                fp16=False,
            )

            transcript = result.get("text", "").strip()
            segments = result.get("segments", [])

            # Build a description of what whisper heard
            if not transcript or transcript in ["", ".", "...", "you", "You"]:
                audio_description = "Silence or very faint background noise. No speech or distinct sounds detected."
            else:
                audio_description = f'Whisper transcript: "{transcript}"'

            # Check for non-speech audio cues from segment probabilities
            no_speech_probs = [s.get("no_speech_prob", 0) for s in segments]
            avg_no_speech = sum(no_speech_probs) / len(no_speech_probs) if no_speech_probs else 1.0

            if avg_no_speech > 0.8 and (not transcript or len(transcript) < 10):
                audio_description = "Silence detected. Very high no-speech probability from audio analysis."
            elif avg_no_speech > 0.5 and transcript:
                audio_description += f" (Note: audio analysis suggests {int(avg_no_speech*100)}% chance this is non-speech noise, possibly crying or ambient sound)"

            print(f"[baby-monitor-ai] Whisper: {audio_description[:100]}")
            print(f"[baby-monitor-ai] Volume: {volume_info.strip()}")

            # Send to Claude CLI for classification
            prompt = (
                f"You are a baby monitor AI. Mode: {BridgeHandler.monitoring_mode}.\n\n"
                f"Audio analysis from a baby monitor recording:\n"
                f"- {audio_description}\n"
                f"- {volume_info.strip() if volume_info else 'No volume data'}\n"
                f"- Average no-speech probability: {avg_no_speech:.2f}\n\n"
                "Based on this, classify the baby monitor audio.\n"
                "Important: Whisper tries to transcribe everything as speech. "
                "Baby crying often gets transcribed as random words/sounds. "
                "High no-speech probability with faint transcript usually means crying or noise.\n\n"
                'Respond with ONLY a JSON object:\n'
                '{"status": "sleeping"|"crying"|"fussing"|"babbling"|"coughing"|"noise", '
                '"confidence": "high"|"medium"|"low", '
                '"description": "brief one-line description"}'
            )

            print("[baby-monitor-ai] Asking Claude...")
            claude_result = subprocess.run(
                ["claude", "-p", prompt, "--allowedTools", ""],
                capture_output=True, text=True, timeout=30,
            )

            output = claude_result.stdout.strip()
            print(f"[baby-monitor-ai] Claude: {output[:200]}")

            # Clean up
            for f in [audio_path, wav_path]:
                try:
                    os.unlink(f)
                except OSError:
                    pass

            # Parse JSON
            try:
                start = output.index("{")
                end = output.rindex("}") + 1
                analysis = json.loads(output[start:end])
            except (ValueError, json.JSONDecodeError):
                analysis = {
                    "status": "noise",
                    "confidence": "low",
                    "description": output[:200] if output else "No response",
                }

            self._respond(200, analysis)

        except subprocess.TimeoutExpired:
            print("[baby-monitor-ai] Timed out")
            self._respond(500, {"error": "Analysis timed out"})
        except Exception as e:
            print(f"[baby-monitor-ai] Error: {e}")
            self._respond(500, {"error": str(e)})


def main():
    parser = argparse.ArgumentParser(description="Baby Monitor AI Bridge")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--model", default="base",
                        help="Whisper model: tiny, base, small, medium (default: base)")
    args = parser.parse_args()

    if not shutil.which("claude"):
        print("Error: 'claude' CLI not found.")
        print("  npm install -g @anthropic-ai/claude-code")
        sys.exit(1)

    if not shutil.which("ffmpeg"):
        print("Error: 'ffmpeg' not found.")
        print("  brew install ffmpeg")
        sys.exit(1)

    print(f"[baby-monitor-ai] Loading Whisper model '{args.model}'...")
    BridgeHandler.whisper_model = whisper.load_model(args.model)
    print("[baby-monitor-ai] Whisper model loaded")

    os.makedirs(WORK_DIR, exist_ok=True)

    server = HTTPServer(("0.0.0.0", args.port), BridgeHandler)
    print("[baby-monitor-ai] Running on http://0.0.0.0:%d" % args.port)
    print("[baby-monitor-ai] Mode: %s" % BridgeHandler.monitoring_mode)
    print("[baby-monitor-ai] Pipeline: audio -> ffmpeg -> whisper -> claude CLI")
    print("[baby-monitor-ai] Open babymonitor.online/receiver to connect")
    print("[baby-monitor-ai] Press Ctrl+C to stop")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[baby-monitor-ai] Stopped")
        shutil.rmtree(WORK_DIR, ignore_errors=True)
        server.server_close()


if __name__ == "__main__":
    main()
