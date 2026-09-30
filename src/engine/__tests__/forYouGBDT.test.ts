import { describe, it, expect } from "vitest";
import { runGBDTInference, extractGBDTFeatures } from "../forYouGBDT";
import { createDefaultProfile } from "../profile";
import { locations } from "../../mausam/data";

describe("LightGBM / GBDT 'For You' Engine", () => {
  const baseProfile = createDefaultProfile();
  const pune = locations.find((l) => l.key === "pune")!;

  it("extracts all required tabular features accurately", () => {
    const features = extractGBDTFeatures(baseProfile, pune, 12);
    expect(features.temp).toBe(pune.temp);
    expect(features.windSpeed).toBe(pune.wind.speed);
    expect(features.aqi).toBe(pune.air.aqi);
    expect(features.wFitness).toBeDefined();
    expect(features.hour).toBe(12);
  });

  it("selects CYCLING_HEADWIND when active cycling meets 25+ km/h wind", () => {
    const windyPune = {
      ...pune,
      wind: { speed: 28, dir: "NW", gust: 35 },
      condition: "sunny" as const,
      precip: { ...pune.precip, chance: 10 },
    };

    const cyclingProfile = {
      ...baseProfile,
      interestWeights: { ...baseProfile.interestWeights, fitness: 0.45 },
      activitySignals: { ...baseProfile.activitySignals, cyclingMin: 60 },
    };

    const result = runGBDTInference(cyclingProfile, windyPune, 16);
    expect(result.intent).toBe("CYCLING_HEADWIND");
    expect(result.confidence).toBeGreaterThan(0.4);
    expect(result.insight.headline).toContain("Headwind alert");
    expect(result.insight.headline).toContain("28 km/h");
    expect(result.topContributions.length).toBeGreaterThan(0);
  });

  it("selects RUNNING_POLLUTION when running meets high AQI", () => {
    const pollutedPune = {
      ...pune,
      air: { ...pune.air, aqi: 165, aqiLabel: "Unhealthy" },
    };

    const runnerProfile = {
      ...baseProfile,
      interestWeights: { ...baseProfile.interestWeights, fitness: 0.4 },
      activitySignals: { ...baseProfile.activitySignals, runningMin: 45 },
    };

    const result = runGBDTInference(runnerProfile, pollutedPune, 7);
    expect(result.intent).toBe("RUNNING_POLLUTION");
    expect(result.insight.headline).toContain("Elevated AQI");
    expect(result.insight.headline).toContain("165");
  });

  it("selects HIGH_UV_ALERT for midday walking under severe UV index", () => {
    const sunnyMidday = {
      ...pune,
      air: { ...pune.air, uv: 9, uvLabel: "Very High" },
      precip: { ...pune.precip, chance: 0 },
      condition: "sunny" as const,
    };

    const outdoorProfile = {
      ...baseProfile,
      interestWeights: { ...baseProfile.interestWeights, health: 0.35 },
      activitySignals: { ...baseProfile.activitySignals, walkingMin: 40 },
    };

    const result = runGBDTInference(outdoorProfile, sunnyMidday, 13); // 1:00 PM
    expect(result.intent).toBe("HIGH_UV_ALERT");
    expect(result.insight.headline).toContain("Peak UV Index");
    expect(result.insight.headline).toContain("SPF 30+");
  });

  it("selects COMMUTE_WATERLOGGING when wet roads hit commuter profile", () => {
    const rainyPune = {
      ...pune,
      condition: "rainy" as const,
      precip: { ...pune.precip, chance: 85 },
    };

    const commuterProfile = {
      ...baseProfile,
      interestWeights: { ...baseProfile.interestWeights, commuter: 0.45 },
      activitySignals: { ...baseProfile.activitySignals, vehicleCommuteMin: 60 },
    };

    const result = runGBDTInference(commuterProfile, rainyPune, 9);
    expect(result.intent).toBe("COMMUTE_WATERLOGGING");
    expect(result.insight.headline).toContain("Rain on commute route");
    expect(result.insight.window).toBe("Commute watch");
  });

  it("switches to agricultural advisory when userType is agri", () => {
    const result = runGBDTInference(baseProfile, pune, 10, [], undefined, "agri");
    expect(result.intent).toBe("AGRI_SPRAY_ADVISORY");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("switches to beach window when userType is beach", () => {
    const result = runGBDTInference(baseProfile, pune, 11, [], undefined, "beach");
    expect(result.intent).toBe("BEACH_COASTAL_WINDOW");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("switches to health & air monitoring when userType is health", () => {
    const result = runGBDTInference(baseProfile, pune, 8, [], undefined, "health");
    expect(result.intent).toBe("HEALTH_AIR_POLLEN");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("switches to farm advisory when profile locationContext is farm", () => {
    const farmProfile = { ...baseProfile, locationContext: "farm" as const };
    const result = runGBDTInference(farmProfile, pune, 10);
    expect(result.intent).toBe("AGRI_SPRAY_ADVISORY");
  });

  it("switches to transit advisory when profile locationContext is other_city", () => {
    const transitProfile = { ...baseProfile, locationContext: "other_city" as const };
    const result = runGBDTInference(transitProfile, pune, 10);
    expect(result.intent).toBe("TRAVELER_TRANSIT_ADVISORY");
  });

  it("executes ultra-fast (< 2ms) on-device", () => {
    const result = runGBDTInference(baseProfile, pune, 14);
    expect(result.inferenceTimeMs).toBeLessThan(2.0);
    expect(result.insight).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });
});
