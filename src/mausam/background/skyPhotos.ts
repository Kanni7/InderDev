/**
 * High-Definition Sky & Cloud Photography Catalog
 * 
 * Curated Unsplash photography featuring pure sky and cloud formations
 * for every single time-of-day phase and weather state.
 * No cityscapes, no artificial clutter — authentic atmospheric sky and clouds.
 */

import type { TimeOfDayPhase, EnvironmentalWeatherCondition } from "./types";

const ux = "&w=1080&q=85&auto=format&fit=crop";

/**
 * High-res sky & cloud photography matrix across all 9 time-of-day phases
 * for clear / partly cloudy skies.
 */
export const TIME_OF_DAY_SKY_PHOTOS: Record<TimeOfDayPhase, string> = {
  // 1. Pre-dawn: Deep indigo celestial twilight with soft faint violet glow and high wisps
  "pre-dawn": `https://images.unsplash.com/photo-1534447677768-be436bb09401?${ux}`,

  // 2. Sunrise: Early dawn sky, warm golden-coral and peach clouds catching first sun rays
  "sunrise": `https://images.unsplash.com/photo-1500382017468-9049fed747ef?${ux}`,

  // 3. Morning: Crisp vivid blue sky with bright, sunlit white cumulus clouds
  "morning": `https://images.unsplash.com/photo-1534088568596-0c29b4d3c63c?${ux}`,

  // 4. Midday: Brilliant deep azure cerulean sky with bright fluffy white cloud formations
  "midday": `https://images.unsplash.com/photo-1504608524841-42f84ebe1539?${ux}`,

  // 5. Afternoon: Deep warm blue sky with soft drifting stratocumulus clouds
  "afternoon": `https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?${ux}`,

  // 6. Golden Hour: Radiant honey-gold, amber and warm glowing clouds lit by low sun
  "golden-hour": `https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?${ux}`,

  // 7. Sunset: Dramatic sunset sky with layers of purple, magenta, gold, and burning orange clouds
  "sunset": `https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?${ux}`,

  // 8. Dusk: Deep nautical twilight, violet-blue sky with darkening soft cloud silhouettes
  "dusk": `https://images.unsplash.com/photo-1509114397022-ed747cca3f65?${ux}`,

  // 9. Night: Deep natural dark night sky with celestial stars, lunar glow, and nocturnal clouds
  "night": `https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?${ux}`,
};

/**
 * Weather condition overrides for clouds, rain, storms, fog, haze, and snow.
 */
export const WEATHER_SKY_PHOTOS: Partial<Record<EnvironmentalWeatherCondition, Record<"day" | "night" | "sunset" | "sunrise", string>>> = {
  "cloudy": {
    day: `https://images.unsplash.com/photo-1534088568596-0c29b4d3c63c?${ux}`,
    night: `https://images.unsplash.com/photo-1532693322450-2cb5c511067d?${ux}`,
    sunset: `https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1499346030926-9a72daac6c63?${ux}`,
  },
  "overcast": {
    day: `https://images.unsplash.com/photo-1499346030926-9a72daac6c63?${ux}`,
    night: `https://images.unsplash.com/photo-1532693322450-2cb5c511067d?${ux}`,
    sunset: `https://images.unsplash.com/photo-1499346030926-9a72daac6c63?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1499346030926-9a72daac6c63?${ux}`,
  },
  "rain": {
    day: `https://images.unsplash.com/photo-1519692933481-e162a57d6721?${ux}`,
    night: `https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?${ux}`,
    sunset: `https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1518803194621-27188ba362c9?${ux}`,
  },
  "heavy-rain": {
    day: `https://images.unsplash.com/photo-1519692933481-e162a57d6721?${ux}`,
    night: `https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?${ux}`,
    sunset: `https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1518803194621-27188ba362c9?${ux}`,
  },
  "thunderstorm": {
    day: `https://images.unsplash.com/photo-1429552077091-836152271555?${ux}`,
    night: `https://images.unsplash.com/photo-1511289081-d06d5b374674?${ux}`,
    sunset: `https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1527482797697-8795b05a13fe?${ux}`,
  },
  "fog": {
    day: `https://images.unsplash.com/photo-1485236715568-ddc5fe6c92c3?${ux}`,
    night: `https://images.unsplash.com/photo-1509114397022-ed747cca3f65?${ux}`,
    sunset: `https://images.unsplash.com/photo-1496868834840-5f4c98840aaa?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?${ux}`,
  },
  "haze": {
    day: `https://images.unsplash.com/photo-1496868834840-5f4c98840aaa?${ux}`,
    night: `https://images.unsplash.com/photo-1509114397022-ed747cca3f65?${ux}`,
    sunset: `https://images.unsplash.com/photo-1496868834840-5f4c98840aaa?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1496868834840-5f4c98840aaa?${ux}`,
  },
  "snow": {
    day: `https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?${ux}`,
    night: `https://images.unsplash.com/photo-1532693322450-2cb5c511067d?${ux}`,
    sunset: `https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?${ux}`,
    sunrise: `https://images.unsplash.com/photo-1499346030926-9a72daac6c63?${ux}`,
  },
};

/**
 * Resolves the optimal high-res sky and clouds photograph
 * based on the active time-of-day phase and weather condition.
 */
export function getSkyAndCloudsPhoto(
  phase: TimeOfDayPhase,
  condition: EnvironmentalWeatherCondition = "clear"
): string {
  // If weather condition has specific storm/rain/fog sky photo:
  const weatherSet = WEATHER_SKY_PHOTOS[condition];
  if (weatherSet) {
    if (phase === "night" || phase === "pre-dawn" || phase === "dusk") {
      return weatherSet.night;
    }
    if (phase === "sunset" || phase === "golden-hour") {
      return weatherSet.sunset;
    }
    if (phase === "sunrise") {
      return weatherSet.sunrise;
    }
    return weatherSet.day;
  }

  // Baseline time-of-day pure sky and clouds photo:
  return TIME_OF_DAY_SKY_PHOTOS[phase] || TIME_OF_DAY_SKY_PHOTOS["midday"];
}
