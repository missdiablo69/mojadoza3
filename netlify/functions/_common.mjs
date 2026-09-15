import { getStore } from "@netlify/blobs";

export const commentsStore = getStore("mojadoza-comments");
export const visitsStore = getStore("mojadoza-visits");

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export function getClientIp(request) {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function normalisePostKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 150);
}

export function isSpam(text) {
  const value = String(text || "").toLowerCase();

  const blocked = [
    "viagra",
    "casino",
    "crypto investment",
    "buy followers",
    "free money",
    "click here",
    "porn",
    "xxx"
  ];

  return blocked.some(word => value.includes(word));
}

export function isSameText(a, b) {
  return String(a || "").trim().toLowerCase() ===
         String(b || "").trim().toLowerCase();
}

export function makeId() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}
