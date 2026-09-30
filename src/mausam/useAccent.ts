import { useEffect, useState } from "react";

/* Pulls a vivid accent color straight out of the weather photo so the whole
 * UI recolors to match whatever sky is on screen. Falls back to the curated
 * per-condition accent until (and if) the image resolves.
 * Zero-purple policy: purple/violet/magenta/indigo hues are strictly filtered. */

function toHex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h, s, l };
}

/** Check if color falls into purple, violet, indigo, magenta, or pink hue bands */
export function isPurpleHue(r: number, g: number, b: number): boolean {
  const { h, s } = rgbToHsl(r, g, b);
  if (s > 0.12) {
    // 235° is deep royal blue transitioning into indigo; 345° is magenta transitioning to red
    if (h >= 235 && h <= 345) return true;
  }
  // Strong red+blue with depressed green signature of purple
  if (b > 60 && r > 60 && g < Math.min(r, b) * 0.72) return true;
  return false;
}

/** Sanitize any color hex string to ensure it contains zero purple/violet tones */
export function sanitizeAccent(color: string): string {
  if (!color || typeof color !== "string") return "#38bdf8";
  const m = color.trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (m) {
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    if (isPurpleHue(r, g, b)) {
      return "#38bdf8"; // clean crisp oceanic sky blue fallback
    }
  }
  return color;
}

/** Sample the image on a tiny canvas and return the most vivid representative non-purple color. */
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

    // Strictly skip all purple / violet / indigo / magenta / pink tones
    if (isPurpleHue(r, g, b)) continue;

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

  // Final check to guard against boundary colors
  if (isPurpleHue(r, g, b)) {
    return "#38bdf8";
  }

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

  // Re-verify after boosting
  if (isPurpleHue(r, g, b)) {
    return "#38bdf8";
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function usePhotoAccent(photoUrl: string, fallback: string): string {
  const cleanFallback = sanitizeAccent(fallback);
  const [accent, setAccent] = useState(cleanFallback);

  useEffect(() => {
    setAccent(cleanFallback); // reset instantly so the app never shows a stale color
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      const c = extractAccent(img);
      if (c) {
        setAccent(sanitizeAccent(c));
      }
    };
    img.src = photoUrl;
    return () => { alive = false; };
  }, [photoUrl, cleanFallback]);

  return sanitizeAccent(accent);
}
