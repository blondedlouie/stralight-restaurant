"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, QrCode, ShieldCheck } from "lucide-react";

export default function RiderVerificationPage() {
  const [qrPayload, setQrPayload] = useState("");
  const [error, setError] = useState("");
  const [verifiedOrder, setVerifiedOrder] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setVerifiedOrder("");

    let payload: { orderId?: string };
    try {
      payload = JSON.parse(qrPayload);
    } catch {
      setError("Paste the QR code contents to verify the handover.");
      return;
    }
    if (!payload.orderId) {
      setError("This QR code does not contain a valid Starlight order ID.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders/track/${encodeURIComponent(payload.orderId)}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: qrPayload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not verify this delivery.");
      setVerifiedOrder(result.orderId);
      setQrPayload("");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify this delivery.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-72px)] items-center justify-center bg-white px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-purple-950/10 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-purple-950"><ShieldCheck className="h-6 w-6" /></span>
          <div><h1 className="text-xl font-extrabold text-purple-950">Rider delivery verification</h1><p className="mt-1 text-xs text-brand-textMuted">Confirm handover with the customer’s PoD QR.</p></div>
        </div>

        {verifiedOrder ? (
          <div className="py-5 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-600" />
            <h2 className="text-xl font-extrabold text-purple-950">Delivery confirmed</h2>
            <p className="mt-2 text-sm text-brand-textMuted">Order {verifiedOrder} is marked delivered.</p>
          </div>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <label htmlFor="pod-payload" className="block text-xs font-bold text-purple-950">Scanned QR content</label>
            <textarea id="pod-payload" required rows={5} value={qrPayload} onChange={(event) => setQrPayload(event.target.value)} placeholder="Paste the scanned QR code content" className="w-full resize-y rounded-xl border border-purple-950/15 bg-white p-3 font-mono text-xs text-purple-950 outline-none focus:border-purple-950 focus:ring-2 focus:ring-purple-950/10" />
            {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
            <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-extrabold text-purple-950 transition hover:bg-yellow-500 disabled:opacity-60">
              <QrCode className="h-4 w-4" /> {loading ? "Verifying" : "Verify handover"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
