/* ─── Mausam Translation Service ───
 * Modular translation engine.  Default back-end: MyMemory (free, no key).
 * Swap to Google / DeepL / LibreTranslate by changing the fetch in translateText().
 * Env vars (optional):
 *   VITE_TRANSLATE_API_URL  – custom endpoint
 *   VITE_TRANSLATE_API_KEY  – key for higher quotas
 */

/* ────────── Language catalogue ────────── */

export interface Language {
  code: string;
  name: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ar", name: "Arabic", native: "العربية" },
];

export const LANG_MAP = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));

export const MAX_CHARS = 500; // MyMemory free-tier per-request cap

/* ────────── Types ────────── */

export interface TranslateResult {
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  detectedLanguage?: string;
}

export interface ConvoMessage {
  id: number;
  sender: "a" | "b";
  original: string;
  translated: string;
  srcLang: string;
  tgtLang: string;
}

/* ────────── Core translate function ────────── */

const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
const BASE = env.VITE_TRANSLATE_API_URL || "https://api.mymemory.translated.net/get";
const KEY = env.VITE_TRANSLATE_API_KEY || "";

export async function translateText(params: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<TranslateResult> {
  const { text, sourceLanguage, targetLanguage } = params;
  if (!text.trim()) throw new Error("Enter text to translate.");
  if (sourceLanguage === targetLanguage) {
    return {
      sourceLanguage,
      targetLanguage,
      originalText: text,
      translatedText: text,
    };
  }

  const url = new URL(BASE);
  url.searchParams.set("q", text.slice(0, MAX_CHARS));
  url.searchParams.set("langpair", `${sourceLanguage}|${targetLanguage}`);
  if (KEY) url.searchParams.set("key", KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Translation failed (HTTP ${res.status}).`);

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) throw new Error("Unexpected response from API.");

  const data = await res.json();
  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || "Translation service error.");
  }

  return {
    sourceLanguage,
    targetLanguage,
    originalText: text,
    translatedText: data.responseData.translatedText,
  };
}

/* ────────── Language auto-detection (Unicode script ranges) ────────── */

const SCRIPTS: [RegExp, string][] = [
  [/[\u0900-\u097F]/, "hi"],
  [/[\u0B80-\u0BFF]/, "ta"],
  [/[\u0C00-\u0C7F]/, "te"],
  [/[\u0980-\u09FF]/, "bn"],
  [/[\u0C80-\u0CFF]/, "kn"],
  [/[\u0D00-\u0D7F]/, "ml"],
  [/[\u0A80-\u0AFF]/, "gu"],
  [/[\u0A00-\u0A7F]/, "pa"],
  [/[\u0600-\u06FF]/, "ar"],
  [/[\u4E00-\u9FFF]/, "zh"],
  [/[\uAC00-\uD7AF]/, "ko"],
  [/[\u3040-\u309F\u30A0-\u30FF]/, "ja"],
];

export function detectLanguage(text: string): string {
  if (!text.trim()) return "en";
  for (const [re, code] of SCRIPTS) {
    if (re.test(text)) return code;
  }
  return "en";
}

/* ────────── Helpers ────────── */

export function langName(code: string): string {
  return LANG_MAP[code]?.name ?? code;
}

export function langNative(code: string): string {
  return LANG_MAP[code]?.native ?? code;
}

/* ────────── Text-to-speech (browser-native) ────────── */

export function speak(text: string, lang: string): void {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export const HAS_SPEECH_RECOGNITION =
  typeof window !== "undefined" &&
  ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

export const HAS_TTS =
  typeof window !== "undefined" && "speechSynthesis" in window;

/* ────────── Speech recognition helper ────────── */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function listenSpeech(lang: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return reject(new Error("Speech recognition not supported."));

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      resolve(e.results[0][0].transcript);
    };
    rec.onerror = (e: any) => reject(new Error(e.error));
    rec.onend = () => {};
    rec.start();
  });
}

/* ────────── OCR from image ──────────
 * Pluggable: set VITE_OCR_API_KEY for OCR.space, or install tesseract.js
 * and replace this function body.  The UI captures the image either way. */

export async function extractTextFromImage(file: File): Promise<string> {
  const ocrKey = env.VITE_OCR_API_KEY;
  if (!ocrKey) {
    throw new Error(
      "Image OCR not configured.\nSet VITE_OCR_API_KEY (ocr.space free key)\nor install tesseract.js."
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("apikey", ocrKey);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("OCR request failed.");
  const data = await res.json();
  const text = data?.ParsedResults?.[0]?.ParsedText;
  if (!text) throw new Error("No text found in image.");
  return text;
}
