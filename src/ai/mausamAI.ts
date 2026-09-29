import type { Interest } from "../engine/profile";
import type { Location } from "../mausam/data";
import { getFallbackAnswer } from "./fallbackAnswers";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";
const TIMEOUT_MS = 6000;

/** Cache: key → { text, ts } */
const insightCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function getApiKey(): string | null {
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
- Never mention your model name or that you are an AI.`;

/** Classify a question's interest using keyword matching (EN + HI). */
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
  return "health"; // default
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

async function callGroq(messages: { role: string; content: string }[]): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 200,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/** Generate an insight for the "For you" card. */
export async function generateInsight(
  city: string,
  weather: Location,
  topInterest: Interest,
  lang: string,
): Promise<{ text: string; isOffline: boolean }> {
  const cacheKey = `insight:${city}:${topInterest}:${lang}`;
  const cached = insightCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { text: cached.text, isOffline: false };
  }

  const context = buildWeatherContext(city, weather, lang);
  const result = await callGroq([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Given this weather data:\n${context}\n\nGenerate a brief, actionable weather insight for someone interested in "${topInterest}". Start with a decision (e.g., "Best time to run is 6-8 AM"). ${lang === "hi" ? "Answer in Hindi." : "Answer in English."}`,
    },
  ]);

  if (result) {
    insightCache.set(cacheKey, { text: result, ts: Date.now() });
    return { text: result, isOffline: false };
  }

  return { text: getFallbackAnswer(topInterest, lang), isOffline: true };
}

/** Answer an "Ask why" question. */
export async function askWhy(
  question: string,
  city: string,
  weather: Location,
  lang: string,
): Promise<{ text: string; isOffline: boolean; interest: Interest }> {
  const interest = classifyInterest(question);
  const context = buildWeatherContext(city, weather, lang);

  const result = await callGroq([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Weather data:\n${context}\n\nUser question: "${question}"\n\n${lang === "hi" ? "Answer in Hindi." : "Answer in English."}`,
    },
  ]);

  if (result) {
    return { text: result, isOffline: false, interest };
  }

  return { text: getFallbackAnswer(interest, lang), isOffline: true, interest };
}
