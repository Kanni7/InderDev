import type { Interest } from "../engine/profile";
import type { Location } from "../mausam/data";
import { getFallbackAnswer, type WeatherContext } from "./fallbackAnswers";
import { parseIntent, type ParsedIntent } from "./intentParser";
import { buildDecision, type Decision } from "./decisionRules";
import { validateNumbers } from "./validator";
import { buildTemplate, buildCurrentValueTemplate, buildOutOfScopeTemplate } from "./templates";

// ── Groq fallback (used when the FastAPI server is unreachable) ──
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CANDIDATE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
];
const TIMEOUT_MS = 10000;

/** Cache for generateInsight cards (not for chat) */
const insightCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function getGroqKey(): string | null {
  try {
    return import.meta.env.VITE_GROQ_API_KEY || null;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are Mausam AI, an Indian weather assistant. Rules:
- Use ONLY the weather values provided. Never invent numbers.
- State the forecast horizon (e.g., "next 6 hours", "today").
- Answer in the requested language (en or hi).
- 2-3 sentences max. Decision first, then reasoning.
- Never use em dashes or en dashes; use standard punctuation like commas or periods.
- Never mention your model name or that you are an AI.`;

// ── Groq direct call (fallback when server is unavailable) ──
async function callGroqDirect(
  messages: { role: string; content: string }[],
): Promise<{ text: string } | { error: string } | null> {
  const key = getGroqKey();
  if (!key) return { error: "VITE_GROQ_API_KEY not set" };

  for (const model of GROQ_CANDIDATE_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_tokens: 200, temperature: 0.3 }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 404) {
        // Model not available on this key/tier; try next candidate model
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 401) return { error: "Groq key invalid (401)" };
        if (res.status === 429) return { error: "Groq rate limit (429) - retry in a moment" };
        return { error: `Groq error ${res.status}: ${body.slice(0, 120)}` };
      }
      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content ?? "";
      return text ? { text } : null;
    } catch (err) {
      clearTimeout(timer);
      return { error: `Network: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  return { error: "No compatible Groq model found for this key" };
}

// ── FastAPI server call (/api/assistant via Vite proxy → localhost:8000) ──
async function callServer(
  question: string,
  language: string,
  decision: Decision,
): Promise<{ text: string } | { error: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, language, decision }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `Server error ${res.status}: ${body.slice(0, 120)}` };
    }
    const data = await res.json();
    return data.reply ? { text: data.reply as string } : null;
  } catch (err) {
    clearTimeout(timer);
    // Server not running → silently fall back to Groq
    return null;
  }
}

function buildWeatherContext(city: string, weather: Location, lang: string): string {
  return `City: ${city}
Temperature: ${weather.temp}°C (feels ${weather.feels}°C)
Condition: ${weather.condition}
AQI: ${weather.air.aqi} (${weather.air.aqiLabel})
UV: ${weather.air.uv} (${weather.air.uvLabel})
Wind: ${weather.wind.speed} km/h ${weather.wind.dir}, gusts ${weather.wind.gust} km/h
Humidity: ${weather.humidity}%
Rain chance: ${weather.precip.chance}%, next rain: ${weather.precip.next}
Sunrise: ${weather.sun.sunrise}, Sunset: ${weather.sun.sunset}
Language: ${lang === "hi" ? "Hindi" : "English"}`;
}

function toWeatherContext(weather: Location): WeatherContext {
  return {
    temp: weather.temp,
    feels: weather.feels,
    aqi: weather.air.aqi,
    uv: weather.air.uv,
    humidity: weather.humidity,
    precipChance: weather.precip.chance,
    condition: weather.condition,
    sunrise: weather.sun.sunrise,
    sunset: weather.sun.sunset,
  };
}

/** Classify a question's profile Interest (used by generateInsight + profile engine). */
export function classifyInterest(question: string): Interest {
  const q = question.toLowerCase();
  const map: { keywords: string[]; interest: Interest }[] = [
    { keywords: ["run", "jog", "exercise", "workout", "gym", "cycling", "दौड़", "व्यायाम", "साइकिल", "कसरत"], interest: "fitness" },
    { keywords: ["air", "aqi", "pollen", "allergy", "breathe", "mask", "हवा", "प्रदूषण", "एलर्जी", "मास्क"], interest: "health" },
    { keywords: ["beach", "surf", "tide", "wave", "swim", "sea", "समुद्र", "लहर", "तैर"], interest: "beach" },
    { keywords: ["trip", "travel", "pack", "flight", "destination", "यात्रा", "सफर", "पैक", "उड़ान"], interest: "traveler" },
    { keywords: ["school", "child", "kid", "family", "स्कूल", "बच्च", "परिवार"], interest: "parent" },
    { keywords: ["farm", "crop", "soil", "irrigation", "harvest", "sow", "खेत", "फसल", "मिट्टी", "सिंचाई", "बुवाई"], interest: "agri" },
    { keywords: ["commute", "drive", "traffic", "road", "fog", "visibility", "यातायात", "सड़क", "कोहर", "दृश्यता"], interest: "commuter" },
    { keywords: ["event", "outdoor", "party", "wedding", "function", "आयोजन", "शादी", "पार्टी", "कार्यक्रम"], interest: "event" },
  ];
  for (const { keywords, interest } of map) {
    if (keywords.some((kw) => q.includes(kw))) return interest;
  }
  return "health";
}

function intentToInterest(parsed: ParsedIntent): Interest {
  switch (parsed.intent) {
    case "activity_timing": return "fitness";
    case "farming": return "agri";
    case "travel": return "traveler";
    case "alert_explain": return "commuter";
    default: return classifyInterest(parsed.intent);
  }
}

export type AskWhyResult = {
  text: string;
  isOffline: boolean;
  interest: Interest;
  source: string;
  confidence: string;
  errorReason?: string;
};

/**
 * Answer a user question using the full pipeline:
 * 1. Parse intent
 * 2. Build deterministic decision
 * 3. Fast path for current_value / out_of_scope (no AI)
 * 4. Try FastAPI server (xAI)
 * 5. Fall back to Groq direct
 * 6. Validate numbers - use template if hallucination detected
 * 7. Use template as final fallback
 */
export async function askWhy(
  question: string,
  city: string,
  weather: Location,
  lang: string,
): Promise<AskWhyResult> {
  const parsed = parseIntent(question);
  const effectiveLang = (lang === "hi" ? "hi" : "en") as "en" | "hi";
  const interest = intentToInterest(parsed);

  // ── Fast path: no AI needed ──
  if (parsed.intent === "current_value") {
    return {
      text: buildCurrentValueTemplate(weather, question, effectiveLang),
      isOffline: false,
      interest,
      source: "Open-Meteo",
      confidence: "high",
    };
  }
  if (parsed.intent === "out_of_scope") {
    return {
      text: buildOutOfScopeTemplate(effectiveLang),
      isOffline: false,
      interest,
      source: "local",
      confidence: "high",
    };
  }

  // ── Build deterministic decision ──
  const decision = buildDecision(parsed, weather);

  // ── Try FastAPI server first (xAI Grok) ──
  let serverResult = await callServer(question, effectiveLang, decision);

  // ── Fall back to Groq direct ──
  if (!serverResult) {
    const context = buildWeatherContext(city, weather, lang);
    serverResult = await callGroqDirect([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Weather data:\n${context}\n\nUser question: "${question}"\n\n${lang === "hi" ? "Answer in Hindi." : "Answer in English."}`,
      },
    ]);
  }

  if (serverResult && "text" in serverResult) {
    // Validate that AI didn't hallucinate numbers
    if (validateNumbers(serverResult.text, decision)) {
      return {
        text: serverResult.text.replace(/[\u2014\u2013]/g, "-"),
        isOffline: false,
        interest,
        source: decision.source,
        confidence: decision.confidence,
      };
    }
    // Validation failed → use template
    console.warn("[MausamAI] Number validation failed - using template");
    return {
      text: buildTemplate(decision, effectiveLang),
      isOffline: true,
      interest,
      source: decision.source,
      confidence: decision.confidence,
      errorReason: "Answer validated - numbers corrected",
    };
  }

  const errorReason = serverResult && "error" in serverResult ? serverResult.error : undefined;
  return {
    text: buildTemplate(decision, effectiveLang),
    isOffline: true,
    interest,
    source: decision.source,
    confidence: decision.confidence,
    errorReason,
  };
}

/** Generate an insight for the "For you" card (profile engine, uses Groq directly). */
export async function generateInsight(
  city: string,
  weather: Location,
  topInterest: Interest,
  lang: string,
): Promise<{ text: string; isOffline: boolean; errorReason?: string }> {
  const cacheKey = `insight:${city}:${topInterest}:${lang}`;
  const cached = insightCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { text: cached.text, isOffline: false };
  }

  const context = buildWeatherContext(city, weather, lang);
  const result = await callGroqDirect([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Given this weather data:\n${context}\n\nGenerate a brief, actionable weather insight for someone interested in "${topInterest}". Start with a decision (e.g., "Best time to run is 6-8 AM"). ${lang === "hi" ? "Answer in Hindi." : "Answer in English."}`,
    },
  ]);

  if (result && "text" in result) {
    const cleanText = result.text.replace(/[\u2014\u2013]/g, "-");
    insightCache.set(cacheKey, { text: cleanText, ts: Date.now() });
    return { text: cleanText, isOffline: false };
  }

  const errorReason = result && "error" in result ? result.error : undefined;
  return {
    text: getFallbackAnswer(topInterest, lang, toWeatherContext(weather)),
    isOffline: true,
    errorReason,
  };
}
