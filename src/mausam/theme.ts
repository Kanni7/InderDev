export type Condition = "sunny" | "cloudy" | "rainy" | "storm" | "fog" | "night";
export type TimeOfDay = "dawn" | "day" | "sunset" | "night";

export interface WeatherTheme {
  key: Condition;
  timeOfDay: TimeOfDay;
  label: string;
  /** Real high-resolution Unsplash photo matching condition & time of day */
  photo: string;
  /** App background tint */
  appBg: string;
  /** Solid base color */
  solid: string;
  /** Accent color */
  accent: string;
  motion?: "rain" | "storm";
}

/** 
 * UNOFFICIAL CODE TIME CHANGER:
 * Change this number (e.g. 6 for Dawn, 12 for Noon/Day, 18 for Sunset, 22 for Night)
 * to test time of day photos directly in code without touching UI!
 * Leave as null to use system clock or top status-bar time toggle.
 */
export const DEV_TIME_OVERRIDE: number | null = null;

export function getTimeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}

const ux = "&w=1080&q=85&auto=format&fit=crop";

/**
 * Apple Weather-style sky photography matrix.
 * Every photo is a pure sky shot - no cityscapes - changing by condition × time of day.
 * All 6 cities share the same sky; only the weather condition and clock drive the image.
 */
export const themeMatrix: Record<Condition, Record<TimeOfDay, WeatherTheme>> = {
  sunny: {
    dawn: {
      key: "sunny", timeOfDay: "dawn", label: "Sunny Dawn",
      // Warm golden-pink sunrise sky
      photo: `https://images.unsplash.com/photo-1500382017468-9049fed747ef?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #4a2c1a 0%, #281a0e 45%, #0e0906 100%)",
      solid: "#0e0906", accent: "#ff9e59",
    },
    day: {
      key: "sunny", timeOfDay: "day", label: "Sunny",
      // Vivid clear blue sky with wispy clouds
      photo: `https://images.unsplash.com/photo-1504608524841-42f84ebe1539?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #1b3a63 0%, #0e2038 45%, #070d18 100%)",
      solid: "#070d18", accent: "#f5a623",
    },
    sunset: {
      key: "sunny", timeOfDay: "sunset", label: "Golden Sunset",
      // Deep orange-pink horizon at golden hour
      photo: `https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #5a2a22 0%, #351620 45%, #100a12 100%)",
      solid: "#100a12", accent: "#ff6b4a",
    },
    night: {
      key: "sunny", timeOfDay: "night", label: "Clear Night",
      // Milky Way starry sky
      photo: `https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #0d1a3a 0%, #070f22 45%, #020408 100%)",
      solid: "#020408", accent: "#7cb9e8",
    },
  },
  cloudy: {
    dawn: {
      key: "cloudy", timeOfDay: "dawn", label: "Cloudy Dawn",
      // Soft pink-grey cloudy sunrise sky
      photo: `https://images.unsplash.com/photo-1499346030926-9a72daac6c63?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #2a2d34 0%, #1a1c22 45%, #0b0c0e 100%)",
      solid: "#0b0c0e", accent: "#b3a6f0",
    },
    day: {
      key: "cloudy", timeOfDay: "day", label: "Cloudy",
      // Layered grey-white cloud deck
      photo: `https://images.unsplash.com/photo-1534088568596-0c29b4d3c63c?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #1f2d3d 0%, #15202d 45%, #0d141e 100%)",
      solid: "#0d141e", accent: "#64b5f6",
    },
    sunset: {
      key: "cloudy", timeOfDay: "sunset", label: "Cloudy Sunset",
      // Dramatic purple-orange cloudy sunset
      photo: `https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #2a2228 0%, #191418 45%, #0a080a 100%)",
      solid: "#0a080a", accent: "#f472b6",
    },
    night: {
      key: "cloudy", timeOfDay: "night", label: "Overcast Night",
      // Dark grey cloud layer at night with faint glow
      photo: `https://images.unsplash.com/photo-1532693322450-2cb5c511067d?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #161c24 0%, #0d1117 45%, #040608 100%)",
      solid: "#040608", accent: "#94a3b8",
    },
  },
  rainy: {
    dawn: {
      key: "rainy", timeOfDay: "dawn", label: "Morning Rain",
      // Dark blue rainy dawn sky
      photo: `https://images.unsplash.com/photo-1518803194621-27188ba362c9?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #27384a 0%, #182433 45%, #090f17 100%)",
      solid: "#090f17", accent: "#64b5f6", motion: "rain",
    },
    day: {
      key: "rainy", timeOfDay: "day", label: "Rainy",
      // Grey rainy sky with rain streaks
      photo: `https://images.unsplash.com/photo-1519692933481-e162a57d6721?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #1e3a55 0%, #142838 45%, #070e16 100%)",
      solid: "#070e16", accent: "#7bc4f2", motion: "rain",
    },
    sunset: {
      key: "rainy", timeOfDay: "sunset", label: "Dusk Rain",
      // Moody purple-grey rainy dusk sky
      photo: `https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #3b2a3d 0%, #241a29 45%, #0b0710 100%)",
      solid: "#0b0710", accent: "#c084fc", motion: "rain",
    },
    night: {
      key: "rainy", timeOfDay: "night", label: "Night Rain",
      // Dark navy night sky in rain
      photo: `https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #122033 0%, #0b1424 45%, #03060d 100%)",
      solid: "#03060d", accent: "#38bdf8", motion: "rain",
    },
  },
  storm: {
    dawn: {
      key: "storm", timeOfDay: "dawn", label: "Dawn Storm",
      // Threatening purple-grey storm clouds at dawn
      photo: `https://images.unsplash.com/photo-1527482797697-8795b05a13fe?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #38253b 0%, #221626 45%, #0a060d 100%)",
      solid: "#0a060d", accent: "#fbbf24", motion: "storm",
    },
    day: {
      key: "storm", timeOfDay: "day", label: "Thunderstorm",
      // Boiling cumulonimbus storm sky
      photo: `https://images.unsplash.com/photo-1429552077091-836152271555?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #2a2740 0%, #1a1826 45%, #08070d 100%)",
      solid: "#08070d", accent: "#f2c53d", motion: "storm",
    },
    sunset: {
      key: "storm", timeOfDay: "sunset", label: "Sunset Storm",
      // Lightning bolt against a dark red-orange stormy sunset
      photo: `https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #4a202c 0%, #2e121b 45%, #0e0508 100%)",
      solid: "#0e0508", accent: "#f43f5e", motion: "storm",
    },
    night: {
      key: "storm", timeOfDay: "night", label: "Night Storm",
      // Lightning strike illuminating night sky
      photo: `https://images.unsplash.com/photo-1511289081-d06d5b374674?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #1d1b36 0%, #111024 45%, #04040d 100%)",
      solid: "#04040d", accent: "#e879f9", motion: "storm",
    },
  },
  fog: {
    dawn: {
      key: "fog", timeOfDay: "dawn", label: "Dawn Fog",
      // Soft misty valley fog at first light
      photo: `https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #323d40 0%, #1e2628 45%, #0b0e0f 100%)",
      solid: "#0b0e0f", accent: "#2dd4bf",
    },
    day: {
      key: "fog", timeOfDay: "day", label: "Foggy",
      // Dense white fog filling the frame
      photo: `https://images.unsplash.com/photo-1485236715568-ddc5fe6c92c3?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #3a4245 0%, #24292b 45%, #0f1213 100%)",
      solid: "#0f1213", accent: "#a0b0c0",
    },
    sunset: {
      key: "fog", timeOfDay: "sunset", label: "Golden Mist",
      // Warm amber mist at sunset
      photo: `https://images.unsplash.com/photo-1496868834840-5f4c98840aaa?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #443229 0%, #2b1e19 45%, #100b08 100%)",
      solid: "#100b08", accent: "#fb923c",
    },
    night: {
      key: "fog", timeOfDay: "night", label: "Night Haze",
      // Blurred city lights through night haze
      photo: `https://images.unsplash.com/photo-1509114397022-ed747cca3f65?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #1d252c 0%, #12181d 45%, #050709 100%)",
      solid: "#050709", accent: "#a5f3fc",
    },
  },
  night: {
    dawn: {
      key: "night", timeOfDay: "night", label: "Night",
      photo: `https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #0d1a3a 0%, #070f22 45%, #020408 100%)",
      solid: "#020408", accent: "#8fb4e8",
    },
    day: {
      key: "night", timeOfDay: "night", label: "Night",
      photo: `https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #0d1a3a 0%, #070f22 45%, #020408 100%)",
      solid: "#020408", accent: "#8fb4e8",
    },
    sunset: {
      key: "night", timeOfDay: "night", label: "Night",
      photo: `https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #0d1a3a 0%, #070f22 45%, #020408 100%)",
      solid: "#020408", accent: "#8fb4e8",
    },
    night: {
      key: "night", timeOfDay: "night", label: "Night",
      photo: `https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?${ux}`,
      appBg: "radial-gradient(120% 80% at 50% 0%, #0d1a3a 0%, #070f22 45%, #020408 100%)",
      solid: "#020408", accent: "#8fb4e8",
    },
  },
};

/** Get weather theme by condition and optional hour/timeOfDay */
export function getWeatherTheme(condition: Condition, hourOrTime?: number | TimeOfDay): WeatherTheme {
  let tod: TimeOfDay;

  if (DEV_TIME_OVERRIDE !== null) {
    tod = getTimeOfDayFromHour(DEV_TIME_OVERRIDE);
  } else if (typeof hourOrTime === "number") {
    tod = getTimeOfDayFromHour(hourOrTime);
  } else if (typeof hourOrTime === "string") {
    tod = hourOrTime;
  } else {
    const currentHour = new Date().getHours();
    tod = getTimeOfDayFromHour(currentHour);
  }

  // Fall back to daytime if condition or tod key is missing
  const condMatrix = themeMatrix[condition] || themeMatrix.sunny;
  return condMatrix[tod] || condMatrix.day;
}

/** Legacy dictionary fallback for direct theme access */
export const themes: Record<Condition, WeatherTheme> = {
  sunny: themeMatrix.sunny.day,
  cloudy: themeMatrix.cloudy.day,
  rainy: themeMatrix.rainy.day,
  storm: themeMatrix.storm.day,
  fog: themeMatrix.fog.day,
  night: themeMatrix.night.night,
};
