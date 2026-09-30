import type { Decision } from "./decisionRules";
import type { Location } from "../mausam/data";

function verdictEmoji(verdict: Decision["verdict"]): string {
  switch (verdict) {
    case "yes": return "✅";
    case "no": return "❌";
    case "caution": return "⚠️";
    default: return "ℹ️";
  }
}

function verdictEn(verdict: Decision["verdict"]): string {
  switch (verdict) {
    case "yes": return "good to go";
    case "no": return "not recommended right now";
    case "caution": return "proceed with caution";
    default: return "conditions unclear";
  }
}

function verdictHi(verdict: Decision["verdict"]): string {
  switch (verdict) {
    case "yes": return "ठीक है";
    case "no": return "अभी उचित नहीं";
    case "caution": return "सावधानी बरतें";
    default: return "स्थिति अनिश्चित";
  }
}

function confidenceHi(c: Decision["confidence"]): string {
  return c === "high" ? "अधिक" : c === "medium" ? "मध्यम" : "कम";
}

/**
 * Build a complete answer from the Decision object — used as fast path for
 * current_value / out_of_scope and as AI fallback when validation fails.
 */
export function buildTemplate(decision: Decision, lang: "en" | "hi"): string {
  const { city, verdict, reasons, facts, source, horizon, confidence } = decision;
  const emoji = verdictEmoji(verdict);

  if (lang === "hi") {
    const lines: string[] = [
      `${emoji} ${city} में अभी ${verdictHi(verdict)}.`,
    ];
    if (reasons.length > 0) {
      lines.push(reasons.slice(0, 2).join(" | "));
    }
    lines.push(
      `तापमान ${facts.temp}°C (महसूस ${facts.feels}°C), बारिश की संभावना ${facts.precipChance}%.`,
    );
    lines.push(`स्रोत: ${source} · भरोसेमंदता: ${confidenceHi(confidence)}`);
    return lines.join(" ");
  }

  const lines: string[] = [`${emoji} ${city} is ${verdictEn(verdict)}.`];
  if (reasons.length > 0) {
    lines.push(reasons.slice(0, 2).join(" "));
  }
  lines.push(`${facts.temp}°C (feels ${facts.feels}°C), ${facts.precipChance}% rain chance.`);
  lines.push(`Source: ${source} · Confidence: ${confidence} · Horizon: ${horizon}`);
  return lines.join(" ");
}

/** Fast-path template for current_value intent — no AI needed. */
export function buildCurrentValueTemplate(location: Location, question: string, lang: "en" | "hi"): string {
  const q = question.toLowerCase();

  if (lang === "hi") {
    if (q.includes("aqi") || q.includes("वायु") || q.includes("प्रदूषण")) {
      return `${location.city} में AQI अभी ${location.air.aqi} (${location.air.aqiLabel}) है।`;
    }
    if (q.includes("uv") || q.includes("पराबैंगनी")) {
      return `${location.city} में UV इंडेक्स ${location.air.uv} (${location.air.uvLabel}) है।`;
    }
    if (q.includes("नमी") || q.includes("आर्द्रता") || q.includes("humid")) {
      return `${location.city} में आर्द्रता ${location.humidity}% है।`;
    }
    if (q.includes("हवा") || q.includes("wind")) {
      return `${location.city} में हवा ${location.wind.speed} km/h (${location.wind.dir}) है, झोंके ${location.wind.gust} km/h।`;
    }
    return `${location.city} में तापमान ${location.temp}°C (महसूस ${location.feels}°C) है, ${location.condition} आसमान।`;
  }

  if (q.includes("aqi") || q.includes("air quality") || q.includes("pollution")) {
    return `AQI in ${location.city} is ${location.air.aqi} (${location.air.aqiLabel}).`;
  }
  if (q.includes("uv")) {
    return `UV index in ${location.city} is ${location.air.uv} (${location.air.uvLabel}).`;
  }
  if (q.includes("humid")) {
    return `Humidity in ${location.city} is ${location.humidity}%.`;
  }
  if (q.includes("wind")) {
    return `Wind in ${location.city} is ${location.wind.speed} km/h from ${location.wind.dir}, gusting to ${location.wind.gust} km/h.`;
  }
  if (q.includes("pressure")) {
    return `Barometric pressure in ${location.city} is ${location.pressure.value} hPa (${location.pressure.trend}).`;
  }
  return `Temperature in ${location.city} is ${location.temp}°C (feels ${location.feels}°C) with ${location.condition} skies.`;
}

/** Fast-path template for out_of_scope intent — no AI needed. */
export function buildOutOfScopeTemplate(lang: "en" | "hi"): string {
  if (lang === "hi") {
    return "मैं केवल मौसम और वायुमंडलीय प्रश्नों का उत्तर दे सकता हूं। कोई मौसम संबंधी प्रश्न पूछें।";
  }
  return "I can only answer weather-related questions. Ask me about conditions, AQI, UV, rain chances, or activity timing.";
}
