import { createHmac, timingSafeEqual } from "node:crypto";

export type PodPayload = {
  orderId: string;
  verificationToken: string;
  timestamp: string;
  signature: string;
};

function getSecret() {
  const secret = process.env.POD_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("POD_SIGNING_SECRET must be configured");
  return secret;
}

function sign(content: string) {
  return createHmac("sha256", getSecret()).update(content).digest("base64url");
}

export function createPodPayload(orderId: string, verificationToken: string, timestamp = new Date().toISOString()): PodPayload {
  const content = JSON.stringify({ orderId, verificationToken, timestamp });
  return { orderId, verificationToken, timestamp, signature: sign(content) };
}

export function verifyPodPayload(payload: PodPayload) {
  const content = JSON.stringify({
    orderId: payload.orderId,
    verificationToken: payload.verificationToken,
    timestamp: payload.timestamp,
  });
  const expected = Buffer.from(sign(content));
  const actual = Buffer.from(payload.signature || "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
