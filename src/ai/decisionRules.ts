import type { Location } from "../mausam/data";
import type { ParsedIntent } from "./intentParser";

export interface DecisionFacts {
  temp: number;
  feels: number;
  aqi: number;
  aqiLabel: string;
  uv: number;
  uvLabel: string;
  humidity: number;
  precipChance: number;
  condition: string;
  windSpeed: number;
  windGust: number;
  sunrise: string;
  sunset: string;
}

export interface Decision {
  city: string;
  time: string;
  verdict: "yes" | "no" | "caution" | "unknown";
  facts: DecisionFacts;
  reasons: string[];
  source: string;
  horizon: string;
  confidence: "high" | "medium" | "low";
}

function factsFromLocation(loc: Location): DecisionFacts {
  return {
    temp: loc.temp,
    feels: loc.feels,
    aqi: loc.air.aqi,
    aqiLabel: loc.air.aqiLabel,
    uv: loc.air.uv,
    uvLabel: loc.air.uvLabel,
    humidity: loc.humidity,
    precipChance: loc.precip.chance,
    condition: loc.condition,
    windSpeed: loc.wind.speed,
    windGust: loc.wind.gust,
    sunrise: loc.sun.sunrise,
    sunset: loc.sun.sunset,
  };
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 20) return "evening";
  return "night";
}

export function buildDecision(parsed: ParsedIntent, location: Location): Decision {
  const facts = factsFromLocation(location);
  const time = timeOfDay();
  const city = location.city;
  const source = "Open-Meteo";

  switch (parsed.intent) {
    case "activity_timing": {
      const reasons: string[] = [];
      let verdict: Decision["verdict"] = "yes";

      if (location.condition === "storm") {
        verdict = "no";
        reasons.push(`Active thunderstorm — lightning risk with gusts up to ${facts.windGust} km/h`);
      } else if (facts.precipChance > 60) {
        verdict = "no";
        reasons.push(`${facts.precipChance}% rain chance — outdoor activity not recommended`);
      } else if (facts.aqi > 200) {
        verdict = "no";
        reasons.push(`AQI ${facts.aqi} (${facts.aqiLabel}) — hazardous for physical exertion`);
      } else {
        if (facts.feels > 38) {
          verdict = "caution";
          reasons.push(`Feels like ${facts.feels}°C — heat stress risk`);
        }
        if (facts.aqi > 100) {
          verdict = "caution";
          reasons.push(`AQI ${facts.aqi} (${facts.aqiLabel}) — limit outdoor exertion`);
        }
        if (facts.precipChance > 30) {
          if (verdict === "yes") verdict = "caution";
          reasons.push(`${facts.precipChance}% rain chance — carry a jacket`);
        }
        if (facts.uv > 7) {
          if (verdict === "yes") verdict = "caution";
          reasons.push(`UV ${facts.uv} (${facts.uvLabel}) — wear sunscreen`);
        }
      }

      if (verdict === "yes") {
        reasons.push(`${facts.temp}°C with ${facts.aqi} AQI — good conditions for activity`);
        if (time === "morning") reasons.push(`Morning hours have the lowest heat index`);
      }

      return { city, time, verdict, facts, reasons, source, horizon: "current conditions", confidence: "high" };
    }

    case "farming": {
      const reasons: string[] = [];
      let verdict: Decision["verdict"] = "yes";

      if (location.condition === "storm") {
        verdict = "no";
        reasons.push(`Active storm — dangerous for field operations`);
      } else if (facts.precipChance > 50) {
        verdict = "caution";
        reasons.push(`${facts.precipChance}% rain expected — delay irrigation, let rain do the work`);
      } else if (facts.humidity > 80) {
        if (verdict === "yes") verdict = "caution";
        reasons.push(`Humidity ${facts.humidity}% — high fungal risk for standing crops`);
      }

      if (verdict === "yes") {
        if (facts.precipChance < 20) reasons.push(`Only ${facts.precipChance}% rain chance — safe for field work`);
        if (location.condition === "sunny") reasons.push(`Clear skies — good drying and harvesting conditions`);
      }

      return { city, time, verdict, facts, reasons, source, horizon: "next 12 hours", confidence: "medium" };
    }

    case "travel": {
      const reasons: string[] = [];
      let verdict: Decision["verdict"] = "yes";

      if (location.condition === "storm") {
        verdict = "no";
        reasons.push(`Severe storm — travel unsafe`);
        reasons.push(`Wind gusts up to ${facts.windGust} km/h`);
      } else if (location.condition === "fog") {
        verdict = "caution";
        reasons.push(`Low visibility — ${location.travel?.visibility ?? "reduced"}`);
      } else if (facts.precipChance > 60) {
        verdict = "caution";
        reasons.push(`${facts.precipChance}% rain chance — carry rain gear and allow extra time`);
      } else if (facts.windGust > 40) {
        verdict = "caution";
        reasons.push(`Gusts up to ${facts.windGust} km/h — caution on open roads`);
      }

      if (verdict === "yes") {
        reasons.push(`${facts.temp}°C and ${facts.precipChance}% rain chance — conditions are suitable for travel`);
      }

      return { city, time, verdict, facts, reasons, source, horizon: "current conditions", confidence: "high" };
    }

    case "alert_explain": {
      const alert = location.alert;
      if (alert) {
        const seriousTier = alert.tier === "critical" || alert.tier === "warning";
        return {
          city, time,
          verdict: seriousTier ? "no" : "caution",
          facts,
          reasons: [alert.title, alert.body],
          source,
          horizon: "active now",
          confidence: "high",
        };
      }
      return {
        city, time, verdict: "yes", facts,
        reasons: [`No active weather alerts for ${city}`],
        source, horizon: "current", confidence: "high",
      };
    }

    case "general_forecast": {
      const reasons: string[] = [];
      let verdict: Decision["verdict"] = "yes";

      if (location.condition === "storm") {
        verdict = "no";
        reasons.push(`Thunderstorm with gusts up to ${facts.windGust} km/h expected`);
        reasons.push(`${facts.precipChance}% rain chance — stay indoors`);
      } else if (location.condition === "rainy") {
        verdict = "caution";
        reasons.push(`Rainy conditions — ${facts.precipChance}% rain chance, ${facts.temp}°C`);
      } else {
        reasons.push(`${location.condition} skies — ${facts.temp}°C (feels ${facts.feels}°C)`);
        reasons.push(`Rain chance ${facts.precipChance}%, next: ${location.precip.next}`);
      }

      return { city, time, verdict, facts, reasons, source, horizon: "today", confidence: "high" };
    }

    default:
      return {
        city, time, verdict: "unknown", facts,
        reasons: [],
        source, horizon: "now", confidence: "low",
      };
  }
}
