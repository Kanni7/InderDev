import { useEffect, useState } from "react";

/* Pulls a vivid accent color straight out of the weather photo so the whole
 * UI recolors to match whatever sky is on screen. Falls back to the curated
 * per-condition accent until (and if) the image resolves. */

function toHex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { s, l };
}

/** Sample the image on a tiny canvas and return the most vivid representative color. */
function extractAccent(img: HTMLImageElement): string | null {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // tainted canvas (CORS) - keep the fallback
  }

  // Bucket colors coarsely and score each by frequency * vibrancy.
  const buckets = new Map<string, { r: number; g: number; b: number; n: number; score: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const { s, l } = rgbToHsl(r, g, b);
    if (l < 0.14 || l > 0.92) continue; // skip near-black / near-white
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const vibrancy = s * (1 - Math.abs(l - 0.55)); // favor saturated, mid-light
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, score: 0 };
    cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
    cur.score += vibrancy;
    buckets.set(key, cur);
  }

  let best: { r: number; g: number; b: number; n: number; score: number } | null = null;
  for (const bkt of buckets.values()) {
    if (!best || bkt.score > best.score) best = bkt;
  }
  if (!best || best.n === 0) return null;

  let r = best.r / best.n, g = best.g / best.n, b = best.b / best.n;

  // Nudge toward a punchier accent: lift saturation and normalize lightness.
  const { s, l } = rgbToHsl(r, g, b);
  if (s < 0.35 || l < 0.42) {
    const boost = 1.35;
    const mid = (r + g + b) / 3;
    r = mid + (r - mid) * boost;
    g = mid + (g - mid) * boost;
    b = mid + (b - mid) * boost;
    // brighten if it came out dark
    const lift = l < 0.42 ? 1.5 : 1;
    r *= lift; g *= lift; b *= lift;
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function usePhotoAccent(photoUrl: string, fallback: string): string {
  const [accent, setAccent] = useState(fallback);

  useEffect(() => {
    setAccent(fallback); // reset instantly so the app never shows a stale color
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      const c = extractAccent(img);
      if (c) setAccent(c);
    };
    img.src = photoUrl;
    return () => { alive = false; };
  }, [photoUrl, fallback]);

  return accent;
}
