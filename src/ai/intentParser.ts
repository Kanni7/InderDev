/** Keyword/rule-based intent classifier (English + Hindi/Hinglish). */

export type Intent =
  | "activity_timing"
  | "farming"
  | "travel"
  | "alert_explain"
  | "general_forecast"
  | "current_value"
  | "out_of_scope";

export interface ParsedIntent {
  intent: Intent;
  activity?: string;
  time?: string;
  city?: string;
  language: "en" | "hi";
}

function detectLanguage(q: string): "en" | "hi" {
  return /[\u0900-\u097F]/.test(q) ? "hi" : "en";
}

const RULES: { keywords: string[]; intent: Intent; activity?: string }[] = [
  {
    keywords: [
      "run", "jog", "exercise", "workout", "gym", "cycling", "cycle", "swim", "yoga", "walk", "hike",
      "दौड़", "व्यायाम", "साइकिल", "कसरत", "योग", "तैर", "चल", "सैर",
    ],
    intent: "activity_timing",
    activity: "fitness",
  },
  {
    keywords: [
      "irrigat", "sow", "crop", "farm", "field", "harvest", "soil", "pesticide", "fertiliz",
      "सिंचाई", "बुवाई", "फसल", "खेत", "मिट्टी", "कटाई", "खाद", "कीटनाशक",
    ],
    intent: "farming",
  },
  {
    keywords: [
      "trip", "travel", "pack", "packing", "flight", "destination", "journey", "road trip", "drive",
      "यात्रा", "सफर", "पैक", "उड़ान", "जाना",
    ],
    intent: "travel",
  },
  {
    keywords: [
      "alert", "warning", "red alert", "orange alert", "yellow alert", "advisory", "red", "orange", "yellow",
      "अलर्ट", "चेतावनी", "सचेत", "खतरा",
    ],
    intent: "alert_explain",
  },
  {
    keywords: [
      "temperature", "temp", "aqi", "air quality", "humidity", "uv index", "uv", "pressure", "wind speed",
      "feels like", "feels", "dew point", "visibility",
      "तापमान", "आर्द्रता", "हवा की गति", "दबाव", "यूवी", "महसूस",
    ],
    intent: "current_value",
  },
  {
    keywords: [
      "rain", "cloud", "forecast", "tomorrow", "today", "weather", "storm", "sunny", "fog", "snow",
      "will it", "chance of",
      "बारिश", "बादल", "मौसम", "कल", "आज", "तूफान", "धूप", "कोहरा",
    ],
    intent: "general_forecast",
  },
];

const OUT_OF_SCOPE_SIGNALS = [
  "recipe", "food", "cook", "movie", "music", "sport", "game", "news", "politics",
  "खाना", "फिल्म", "संगीत", "खेल", "राजनीति",
];

export function parseIntent(question: string): ParsedIntent {
  const q = question.toLowerCase();
  const language = detectLanguage(question);

  // Quick out-of-scope check
  if (OUT_OF_SCOPE_SIGNALS.some((kw) => q.includes(kw))) {
    return { intent: "out_of_scope", language };
  }

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => q.includes(kw))) {
      return { intent: rule.intent, activity: rule.activity, language };
    }
  }

  // Default: treat unrecognised questions as general forecast
  return { intent: "general_forecast", language };
}
