/**
 * Extract Firebase password-reset oobCode from a pasted reset URL or raw code string.
 */
export function extractOobCodeFromResetInput(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const code = u.searchParams.get('oobCode');
    if (code) return code;
  } catch {
    /* not a full URL */
  }
  const m = s.match(/[?&]oobCode=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  // Raw oobCode (Firebase uses long alphanumeric tokens)
  if (/^[A-Za-z0-9_-]{20,}$/.test(s) && !s.includes('://') && !s.includes('/')) {
    return s;
  }
  return null;
}
