/** Parse YYYY-MM-DD as local calendar date (no UTC shift). */
export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive day count between two calendar dates. */
export function inclusiveDaysBetween(startYmd: string, endYmd: string): number {
  const a = parseYMD(startYmd);
  const b = parseYMD(endYmd);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const s = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const e = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  if (e < s) return 0;
  return Math.floor((e - s) / 86400000) + 1;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

/**
 * Overlap of member [join, leave] with jamaat [start, end], inclusive.
 * Returns null if no overlap.
 */
export function memberEffectiveRange(
  jamaatStartYmd: string,
  jamaatEndYmd: string,
  joinYmd: string,
  leaveYmd: string | null
): { startYmd: string; endYmd: string } | null {
  const S = parseYMD(jamaatStartYmd);
  const E = parseYMD(jamaatEndYmd);
  const J = parseYMD(joinYmd);
  const L = leaveYmd ? parseYMD(leaveYmd) : E;
  if ([S, E, J, L].some((d) => isNaN(d.getTime()))) return null;
  const effStart = maxDate(S, J);
  const effEnd = minDate(E, L);
  if (effStart > effEnd) return null;
  return { startYmd: toYMD(effStart), endYmd: toYMD(effEnd) };
}

export function memberPersonDays(
  jamaatStartYmd: string,
  jamaatEndYmd: string,
  joinYmd: string,
  leaveYmd: string | null
): number {
  const range = memberEffectiveRange(jamaatStartYmd, jamaatEndYmd, joinYmd, leaveYmd);
  if (!range) return 0;
  return inclusiveDaysBetween(range.startYmd, range.endYmd);
}
