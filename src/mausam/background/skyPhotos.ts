/**
 * High-Definition Sky & Cloud Photography Catalog
 *
 * Locally bundled sky photography (stored in /public/sky/) so the home screen
 * background always loads instantly – even offline – with no external fetches.
 *
 * Images are served from the Vite `public/` directory, so they are referenced
 * via absolute paths at runtime (e.g. "/sky/midday.jpg").
 */

import type { TimeOfDayPhase, EnvironmentalWeatherCondition } from "./types";

const S = "/sky/"; // base path – served from Vite public/sky/

/**
 * High-res sky & cloud photography matrix across all 9 time-of-day phases
 * for clear / partly cloudy skies.
 */
export const TIME_OF_DAY_SKY_PHOTOS: Record<TimeOfDayPhase, string> = {
  // 1. Pre-dawn: Deep indigo celestial twilight
  "pre-dawn": `${S}predawn.jpg`,

  // 2. Sunrise: Warm golden-coral dawn
  "sunrise": `${S}sunrise.jpg`,

  // 3. Morning: Crisp vivid blue sky with white cumulus
  "morning": `${S}morning.jpg`,

  // 4. Midday: Brilliant deep azure cerulean sky
  "midday": `${S}midday.jpg`,

  // 5. Afternoon: Deep warm blue sky
  "afternoon": `${S}afternoon.jpg`,

  // 6. Golden Hour: Honey-gold and amber clouds
  "golden-hour": `${S}golden.jpg`,

  // 7. Sunset: Dramatic gold, copper, amber, orange clouds
  "sunset": `${S}sunset.jpg`,

  // 8. Dusk: Nautical twilight, deep navy-blue
  "dusk": `${S}dusk.jpg`,

  // 9. Night: Deep dark sky with stars
  "night": `${S}night.jpg`,
};

/**
 * Weather condition overrides for clouds, rain, storms, fog, haze, and snow.
 */
export const WEATHER_SKY_PHOTOS: Partial<Record<EnvironmentalWeatherCondition, Record<"day" | "night" | "sunset" | "sunrise", string>>> = {
  "cloudy": {
    day:     `${S}cloudy.jpg`,
    night:   `${S}night.jpg`,
    sunset:  `${S}sunset.jpg`,
    sunrise: `${S}sunrise.jpg`,
  },
  "overcast": {
    day:     `${S}cloudy.jpg`,
    night:   `${S}night.jpg`,
    sunset:  `${S}sunset.jpg`,
    sunrise: `${S}cloudy.jpg`,
  },
  "rain": {
    day:     `${S}rain.jpg`,
    night:   `${S}night.jpg`,
    sunset:  `${S}sunset.jpg`,
    sunrise: `${S}sunrise.jpg`,
  },
  "heavy-rain": {
    day:     `${S}rain.jpg`,
    night:   `${S}night.jpg`,
    sunset:  `${S}sunset.jpg`,
    sunrise: `${S}sunrise.jpg`,
  },
  "thunderstorm": {
    day:     `${S}storm.jpg`,
    night:   `${S}storm.jpg`,
    sunset:  `${S}storm.jpg`,
    sunrise: `${S}storm.jpg`,
  },
  "fog": {
    day:     `${S}fog.jpg`,
    night:   `${S}night.jpg`,
    sunset:  `${S}dusk.jpg`,
    sunrise: `${S}sunrise.jpg`,
  },
  "haze": {
    day:     `${S}fog.jpg`,
    night:   `${S}night.jpg`,
    sunset:  `${S}dusk.jpg`,
    sunrise: `${S}fog.jpg`,
  },
  "snow": {
    day:     `${S}cloudy.jpg`,
    night:   `${S}night.jpg`,
    sunset:  `${S}sunset.jpg`,
    sunrise: `${S}sunrise.jpg`,
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
