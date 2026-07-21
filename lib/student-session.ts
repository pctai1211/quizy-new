// Signed-cookie session for passwordless student login. Students never get
// a Supabase Auth user, so this is a small standalone session mechanism
// used by lib/actions/student-auth.ts, middleware.ts, and the student
// layout. It's plain Web Crypto (not node:crypto) so the exact same code
// runs in the Edge middleware runtime and in Node server actions.

export const STUDENT_SESSION_COOKIE = "quizy_student";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.STUDENT_SESSION_SECRET;
  if (!secret) {
    throw new Error("STUDENT_SESSION_SECRET is not set");
  }
  return secret;
}

// Avoids node:buffer so this module works unchanged in the Edge runtime
// (middleware) as well as Node (server actions).
function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(signature);
}

export async function createStudentSessionCookieValue(studentId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${studentId}.${issuedAt}`;
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function verifyStudentSessionCookieValue(
  value: string | undefined | null
): Promise<string | null> {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [studentId, issuedAtRaw, signature] = parts;

  const issuedAt = Number(issuedAtRaw);
  if (!studentId || !Number.isFinite(issuedAt)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > MAX_AGE_SECONDS) return null;

  const expectedSignature = await hmac(`${studentId}.${issuedAtRaw}`);
  if (expectedSignature !== signature) return null;

  return studentId;
}

export const STUDENT_SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
