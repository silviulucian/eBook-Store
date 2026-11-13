/**
 * Returns `target` only if it is a same-site relative path, otherwise `fallback`.
 * Prevents open redirects through the `?next=` parameter ("//evil.com", "/\evil.com", "https://...").
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/"): string {
  if (!target || !target.startsWith("/")) return fallback;
  if (target.startsWith("//") || target.includes("\\")) return fallback;
  // Reject control characters (CR/LF/tab are stripped by browsers and can bypass the checks above).
  if (/[\u0000-\u001f\u007f]/.test(target)) return fallback;
  return target;
}
