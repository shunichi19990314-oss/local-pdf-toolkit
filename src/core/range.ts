/** Page range parsing: "1-3, 5, 8-" -> 1-based page numbers against a max. */

export interface RangeResult {
  /** 1-based page numbers in the order given, duplicates removed. */
  pages: number[];
  /** Non-fatal problems (out of range, junk tokens) for toasts. */
  warnings: string[];
}

/**
 * Parse a user-typed range against `max` pages.
 * Rules: comma-separated tokens; "a-b" inclusive; "a-" open to the end;
 * plain "a" selects one page. Empty input selects nothing.
 */
export function parseRange(input: string, max: number): RangeResult {
  const pages: number[] = [];
  const warnings: string[] = [];
  const seen = new Set<number>();
  for (const raw of input.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    const m = /^(\d+)(?:\s*-\s*(\d+)?)?$/.exec(token);
    if (!m) {
      warnings.push(token);
      continue;
    }
    const start = Number(m[1]);
    const end = m[2] === undefined ? (token.includes("-") ? max : start) : Number(m[2]);
    if (start < 1 || end < start || start > max || end > max) {
      warnings.push(token);
      continue;
    }
    for (let p = start; p <= end; p++) {
      if (!seen.has(p)) {
        seen.add(p);
        pages.push(p);
      }
    }
  }
  return { pages, warnings };
}
