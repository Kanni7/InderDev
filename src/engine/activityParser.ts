import { type Interest } from "./profile";

export interface ParsedActivity {
  rawText: string;
  activityName: string;
  primaryInterest: Interest;
  secondaryInterest?: Interest;
  durationMin: number;
  intensity: number; // 0.7 (light), 1.0 (moderate), 1.3 (high/vigorous)
  confidence: number;
}

interface ActivityRule {
  keywords: string[];
  name: string;
  primary: Interest;
  secondary?: Interest;
  defaultMin: number;
  intensityFactor?: number;
}

const RULES: ActivityRule[] = [
  // Fitness / Cycling
  { keywords: ["cycling", "cycle", "biking", "bike", "ride", "cyclist"], name: "Cycling", primary: "fitness", secondary: "health", defaultMin: 45 },
  // Fitness / Running
  { keywords: ["running", "run", "jogging", "jog", "sprint", "tempo", "marathon"], name: "Running", primary: "fitness", secondary: "health", defaultMin: 30 },
  // Fitness / Walking
  { keywords: ["walking", "walk", "stroll", "hike", "hiking", "trek", "trekking"], name: "Walking", primary: "fitness", secondary: "health", defaultMin: 30 },
  // Fitness / Gym / Workout
  { keywords: ["gym", "workout", "hiit", "crossfit", "calisthenics", "weights", "strength"], name: "Gym Workout", primary: "fitness", secondary: "health", defaultMin: 45, intensityFactor: 1.2 },
  // Long Travel / Road Trip (checked before general drive)
  { keywords: ["road trip", "highway", "long drive", "flight", "fly", "airport", "intercity", "vacation"], name: "Long Distance Travel", primary: "traveler", secondary: "commuter", defaultMin: 180 },
  // Commute / Driving
  { keywords: ["commute", "drive", "driving", "office", "work commute", "metro", "traffic", "bus"], name: "Work Commute", primary: "commuter", secondary: "traveler", defaultMin: 45 },
  // Family / Parenting
  { keywords: ["school", "kids", "children", "pickup", "drop off", "park with kids"], name: "School / Family Walk", primary: "parent", secondary: "fitness", defaultMin: 25 },
  // Beach / Water
  { keywords: ["beach", "surf", "surfing", "swim", "swimming", "sea", "ocean"], name: "Beach & Surf", primary: "beach", secondary: "fitness", defaultMin: 60 },
  // Agriculture / Farming
  { keywords: ["farm", "farming", "crop", "spraying", "irrigation", "field", "harvest"], name: "Field & Agriculture", primary: "agri", secondary: "health", defaultMin: 90 },
  // Wellbeing / Health
  { keywords: ["yoga", "meditation", "pilates", "air quality check", "allergy", "asthma"], name: "Health & Recovery", primary: "health", secondary: "fitness", defaultMin: 30 },
  // Outdoor Events
  { keywords: ["concert", "event", "match", "game", "stadium", "festival", "party"], name: "Outdoor Event", primary: "event", secondary: "traveler", defaultMin: 120 },
];

/**
 * Extracts duration in minutes from natural language text.
 * Examples:
 * - "30 min" / "30 mins" / "30 minutes" -> 30
 * - "1 hr" / "1 hour" / "1.5 hours" -> 60, 90
 * - "2h" / "45m" -> 120, 45
 */
export function extractDuration(text: string, fallback: number): number {
  const t = text.toLowerCase();

  // Pattern: "1.5 hours", "2 hr", "1 hour"
  const hourMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)/i);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    if (!isNaN(hours) && hours > 0) {
      return Math.round(hours * 60);
    }
  }

  // Pattern: "45 mins", "30 minutes", "20m"
  const minMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m\b)/i);
  if (minMatch) {
    const mins = parseFloat(minMatch[1]);
    if (!isNaN(mins) && mins > 0) {
      return Math.round(mins);
    }
  }

  return fallback;
}

/**
 * Determines intensity multiplier based on descriptive keywords or duration.
 */
export function extractIntensity(text: string, defaultFactor = 1.0): number {
  const t = text.toLowerCase();
  if (/hard|fast|sprint|tempo|interval|intense|vigorous|heavy|steep/i.test(t)) {
    return 1.3;
  }
  if (/easy|light|casual|recovery|slow|gentle/i.test(t)) {
    return 0.75;
  }
  return defaultFactor;
}

/**
 * Parses free natural text into structured activity entities for the LSTM model.
 */
export function parseActivityText(input: string): ParsedActivity {
  const clean = input.trim();
  const lower = clean.toLowerCase();

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        const durationMin = extractDuration(lower, rule.defaultMin);
        const intensity = extractIntensity(lower, rule.intensityFactor ?? 1.0);
        return {
          rawText: clean,
          activityName: rule.name,
          primaryInterest: rule.primary,
          secondaryInterest: rule.secondary,
          durationMin,
          intensity,
          confidence: 0.95,
        };
      }
    }
  }

  // Fallback for general activity if no keyword matched
  const durationMin = extractDuration(lower, 30);
  const intensity = extractIntensity(lower, 1.0);

  return {
    rawText: clean,
    activityName: "General Activity",
    primaryInterest: "fitness",
    durationMin,
    intensity,
    confidence: 0.5,
  };
}
