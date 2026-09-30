import { describe, it, expect } from "vitest";
import {
  getDetailedTimeOfDay,
  calculateSolarPosition,
  calculateLunarPosition,
  getSeason,
  parseTimeStringToHours,
} from "../solarEngine";
import {
  resolveEnvironment,
  registerCityEnvironment,
  registerEnvironmentPreset,
  ENVIRONMENT_PRESETS,
} from "../environmentCatalog";
import {
  lerpColor,
  computeAtmosphericPalette,
  mapToEnvironmentalCondition,
  extractAtmosphericMetrics,
} from "../atmosphericLighting";
import { getSkyAndCloudsPhoto } from "../skyPhotos";
import { locations } from "../../data";

describe("Background Engine - Solar & Astronomical Engine", () => {
  it("accurately detects all 9 gradual time-of-day phases", () => {
    const sunrise = 6.0;  // 6:00 AM
    const sunset = 18.25; // 6:15 PM

    // 1. Pre-dawn (4:45 AM)
    expect(getDetailedTimeOfDay(4.75, sunrise, sunset).phase).toBe("pre-dawn");
    // 2. Sunrise (6:05 AM)
    expect(getDetailedTimeOfDay(6.08, sunrise, sunset).phase).toBe("sunrise");
    // 3. Morning (9:00 AM)
    expect(getDetailedTimeOfDay(9.0, sunrise, sunset).phase).toBe("morning");
    // 4. Midday (12:30 PM)
    expect(getDetailedTimeOfDay(12.5, sunrise, sunset).phase).toBe("midday");
    // 5. Afternoon (3:45 PM)
    expect(getDetailedTimeOfDay(15.75, sunrise, sunset).phase).toBe("afternoon");
    // 6. Golden Hour (5:30 PM)
    expect(getDetailedTimeOfDay(17.5, sunrise, sunset).phase).toBe("golden-hour");
    // 7. Sunset (6:15 PM)
    expect(getDetailedTimeOfDay(18.25, sunrise, sunset).phase).toBe("sunset");
    // 8. Dusk (7:00 PM)
    expect(getDetailedTimeOfDay(19.0, sunrise, sunset).phase).toBe("dusk");
    // 9. Night (11:00 PM and 2:00 AM)
    expect(getDetailedTimeOfDay(23.0, sunrise, sunset).phase).toBe("night");
    expect(getDetailedTimeOfDay(2.0, sunrise, sunset).phase).toBe("night");
  });

  it("calculates continuous solar position and screen coordinates", () => {
    const noonSun = calculateSolarPosition(12.0, 6.0, 18.0);
    expect(noonSun.isAboveHorizon).toBe(true);
    expect(noonSun.altitude).toBeGreaterThan(60);
    expect(noonSun.screenX).toBeCloseTo(50, 1);
    expect(noonSun.screenY).toBeLessThan(30); // High in sky

    const nightSun = calculateSolarPosition(23.0, 6.0, 18.0);
    expect(nightSun.isAboveHorizon).toBe(false);
    expect(nightSun.screenY).toBeGreaterThan(100); // Below horizon
  });

  it("calculates lunar position and phase illumination", () => {
    const testDate = new Date("2026-09-30T22:00:00Z");
    const lunar = calculateLunarPosition(22.0, testDate);
    expect(lunar.phase).toBeGreaterThanOrEqual(0);
    expect(lunar.phase).toBeLessThanOrEqual(1);
    expect(lunar.illumination).toBeGreaterThanOrEqual(0);
    expect(lunar.illumination).toBeLessThanOrEqual(100);
    expect(lunar.screenX).toBeGreaterThanOrEqual(0);
    expect(lunar.screenX).toBeLessThanOrEqual(100);
  });

  it("parses time strings to decimal hours correctly", () => {
    expect(parseTimeStringToHours("5:30 AM")).toBe(5.5);
    expect(parseTimeStringToHours("12:00 PM")).toBe(12.0);
    expect(parseTimeStringToHours("6:45 PM")).toBe(18.75);
    expect(parseTimeStringToHours("12:15 AM")).toBe(0.25);
  });

  it("computes season appropriately based on month", () => {
    expect(getSeason(new Date("2026-04-15"))).toBe("summer");
    expect(getSeason(new Date("2026-07-20"))).toBe("monsoon");
    expect(getSeason(new Date("2026-10-10"))).toBe("autumn");
    expect(getSeason(new Date("2026-01-05"))).toBe("winter");
  });
});

describe("Background Engine - Location-Aware Environment Catalog", () => {
  it("resolves core Indian cities to correct geographical environments", () => {
    expect(resolveEnvironment("pune").type).toBe("hills");
    expect(resolveEnvironment("mumbai").type).toBe("coastal");
    expect(resolveEnvironment("delhi").type).toBe("plains");
    expect(resolveEnvironment("bengaluru").type).toBe("plateau");
    expect(resolveEnvironment("chennai").type).toBe("coastal");
    expect(resolveEnvironment("kolkata").type).toBe("riverine");
  });

  it("applies intelligent topography heuristics for unmapped cities", () => {
    expect(resolveEnvironment("Manali", "Himachal Pradesh").type).toBe("mountain");
    expect(resolveEnvironment("Puri", "Odisha Coast").type).toBe("coastal");
    expect(resolveEnvironment("Varanasi", "Ganges River").type).toBe("riverine");
  });

  it("supports extensibility via registration APIs", () => {
    registerCityEnvironment("mysuru", "plateau");
    expect(resolveEnvironment("mysuru").type).toBe("plateau");

    registerEnvironmentPreset({
      type: "mountain",
      label: "Custom Alpine",
      dominantFeature: "Custom Peak",
      hasWaterBody: false,
      waterReflectionOpacity: 0,
      elevationMeters: 3000,
      defaultHazeFactor: 0.05,
    });
    expect(ENVIRONMENT_PRESETS.mountain.label).toBe("Custom Alpine");
  });
});

describe("Background Engine - Atmospheric Lighting & Colors", () => {
  it("interpolates colors smoothly without snapping", () => {
    const black = "#000000";
    const white = "#ffffff";
    expect(lerpColor(black, white, 0)).toBe("#000000");
    expect(lerpColor(black, white, 1)).toBe("#ffffff");
    expect(lerpColor(black, white, 0.5)).toBe("#808080");
  });

  it("computes complete atmospheric palette with valid hex colors", () => {
    const palette = computeAtmosphericPalette("golden-hour", 0.5, "clear", 0.1, 10);
    expect(palette.zenith).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.midSky).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.horizon).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.ambient).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.baseLuminance).toBeGreaterThan(0);
    expect(palette.baseLuminance).toBeLessThanOrEqual(1);
  });

  it("maps app weather conditions to environmental weather states", () => {
    expect(mapToEnvironmentalCondition("sunny")).toBe("clear");
    expect(mapToEnvironmentalCondition("cloudy", 20, 60)).toBe("cloudy");
    expect(mapToEnvironmentalCondition("cloudy", 80, 85)).toBe("overcast");
    expect(mapToEnvironmentalCondition("rainy", 85)).toBe("heavy-rain");
    expect(mapToEnvironmentalCondition("storm")).toBe("thunderstorm");
    expect(mapToEnvironmentalCondition("fog")).toBe("fog");
  });

  it("extracts atmospheric metrics from location profiles", () => {
    const puneLoc = locations[0];
    const metrics = extractAtmosphericMetrics(puneLoc, "clear");
    expect(metrics.humidity).toBe(puneLoc.humidity);
    expect(metrics.windSpeed).toBe(puneLoc.wind.speed);
    expect(metrics.visibilityKm).toBeGreaterThan(0);
    expect(metrics.cloudCoverage).toBeLessThan(0.5);
  });
});

describe("Background Engine - Sky and Clouds Photography Matrix", () => {
  it("resolves pure sky & cloud photos for all 9 times of day", () => {
    const phases = [
      "pre-dawn", "sunrise", "morning", "midday",
      "afternoon", "golden-hour", "sunset", "dusk", "night"
    ] as const;

    phases.forEach((phase) => {
      const url = getSkyAndCloudsPhoto(phase, "clear");
      expect(url).toBeDefined();
      expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
    });
  });

  it("resolves storm, rain, and fog sky photos correctly", () => {
    const rainUrl = getSkyAndCloudsPhoto("midday", "rain");
    expect(rainUrl).toBeDefined();
    expect(rainUrl).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);

    const stormUrl = getSkyAndCloudsPhoto("night", "thunderstorm");
    expect(stormUrl).toBeDefined();
    expect(stormUrl).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);

    const fogUrl = getSkyAndCloudsPhoto("sunrise", "fog");
    expect(fogUrl).toBeDefined();
    expect(fogUrl).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
  });
});

