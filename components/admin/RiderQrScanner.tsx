"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2 } from "lucide-react";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorWindow = Window & { BarcodeDetector?: new (options: { formats: string[] }) => Detector };

export function QrScanner({ orderId, onVerified }: { orderId: string; onVerified: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualPayload, setManualPayload] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  async function stop() { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setActive(false); }
  async function verify(value: string) {
    try {
      const payload = JSON.parse(value) as { orderId?: string; verificationToken?: string; timestamp?: string; signature?: string };
      if (payload.orderId !== orderId || !payload.verificationToken || !payload.timestamp || !payload.signature) throw new Error("This QR code is not valid for this delivery.");
      const response = await fetch(`/api/orders/track/${encodeURIComponent(orderId)}/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Verification failed.");
      await stop(); onVerified();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to verify QR code."); }
  }
  async function start() {
    setError("");
    try {
      const DetectorConstructor = (window as DetectorWindow).BarcodeDetector;
      if (!DetectorConstructor) { setManualMode(true); setError("This browser does not support in-page QR scanning. Scan the code with your camera app and paste its contents below."); return; }
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = media;
      if (!videoRef.current) { media.getTracks().forEach((track) => track.stop()); return; }
      videoRef.current.srcObject = media;
      await videoRef.current.play();
      setActive(true);
      const detector = new DetectorConstructor({ formats: ["qr_code"] });
      const scan = async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;
        try { const codes = await detector.detect(video); if (codes[0]?.rawValue) { await verify(codes[0].rawValue); return; } } catch { /* The next camera frame may still decode. */ }
        if (streamRef.current) window.setTimeout(() => { void scan(); }, 220);
      };
      window.setTimeout(() => { void scan(); }, 250);
    } catch (issue) { await stop(); setError(issue instanceof Error ? issue.message : "Unable to access the camera."); }
  }
  return <div><video ref={videoRef} playsInline muted className={`${active ? "block" : "hidden"} aspect-square w-full max-w-sm rounded-xl bg-black object-cover`} />{active && <button type="button" onClick={() => void stop()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm"><CameraOff className="h-4 w-4" />Stop camera</button>}{!active && !manualMode && <button type="button" onClick={() => void start()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-purple-950/15 px-4 text-sm font-bold text-purple-950"><Camera className="h-4 w-4" />Open camera scanner</button>}{manualMode && <form onSubmit={(event) => { event.preventDefault(); void verify(manualPayload); }} className="mt-3 space-y-2"><textarea required value={manualPayload} onChange={(event) => setManualPayload(event.target.value)} rows={4} aria-label="Scanned QR code contents" className="w-full rounded-xl border border-purple-950/15 p-3 font-mono text-xs" placeholder="Paste the scanned QR code contents" /><button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-yellow-400 px-3 text-xs font-extrabold text-purple-950"><CheckCircle2 className="h-4 w-4" />Verify handover</button></form>}{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
