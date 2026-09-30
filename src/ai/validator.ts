import type { Decision } from "./decisionRules";

const DEVANAGARI_MAP: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

function toAsciiDigits(s: string): string {
  return s.replace(/[०-९]/g, (d) => DEVANAGARI_MAP[d] ?? d);
}

function extractNumbers(text: string): number[] {
  const ascii = toAsciiDigits(text);
  const matches = ascii.match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.map(Number).filter((n) => !isNaN(n));
}

/** Build the set of numbers that legitimately appear in this decision. */
function allowedSet(decision: Decision): Set<number> {
  const f = decision.facts;
  const nums = new Set<number>();

  const raw = [f.temp, f.feels, f.aqi, f.uv, f.humidity, f.precipChance, f.windSpeed, f.windGust];
  for (const n of raw) {
    if (n == null) continue;
    nums.add(Math.round(n));
    // ±10% tolerance for rounding/unit conversion
    nums.add(Math.round(n * 0.9));
    nums.add(Math.round(n * 1.1));
  }

  // Hour values (0-24) and small cardinals are always allowed
  for (let i = 0; i <= 24; i++) nums.add(i);

  return nums;
}

/**
 * Returns true if the AI reply contains no hallucinated numbers.
 * A number is hallucinated if it's > 24 and not within 10% of any decision fact.
 */
export function validateNumbers(aiReply: string, decision: Decision): boolean {
  const replyNums = extractNumbers(aiReply);
  const allowed = allowedSet(decision);

  for (const n of replyNums) {
    if (n <= 24) continue; // hours, small ordinals are fine
    if (allowed.has(n)) continue;

    // Check proximity to any allowed value
    const isClose = [...allowed]
      .filter((a) => a > 24)
      .some((a) => Math.abs(a - n) / Math.max(Math.abs(a), 1) <= 0.1);

    if (!isClose) {
      console.warn(`[Validator] Hallucinated number detected: ${n}`);
      return false;
    }
  }
  return true;
}
