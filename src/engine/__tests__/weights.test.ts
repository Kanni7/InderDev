import { describe, it, expect } from "vitest";
import { initWeights, updateWeights, computeBehaviourScores, normalise, runDayUpdate, CONFIG } from "../weights";
import { ALL_INTERESTS, createDefaultProfile, type Interest, type UserProfile } from "../profile";
import { rankModules, type AlertOverride } from "../ranking";
import { ALL_BLOCKS } from "../../mausam/data";

function sumWeights(w: Record<Interest, number>): number {
  return ALL_INTERESTS.reduce((s, i) => s + w[i], 0);
}

describe("initWeights", () => {
  it("sums to 1", () => {
    const w = initWeights(["fitness", "health"]);
    expect(sumWeights(w)).toBeCloseTo(1, 6);
  });

  it("gives selected interests more weight", () => {
    const w = initWeights(["fitness"]);
    expect(w.fitness).toBeGreaterThan(w.health);
  });
});

describe("normalise", () => {
  it("produces sum 1", () => {
    const w = {} as Record<Interest, number>;
    for (const i of ALL_INTERESTS) w[i] = Math.random() * 10;
    const n = normalise(w);
    expect(sumWeights(n)).toBeCloseTo(1, 6);
  });
});

describe("updateWeights", () => {
  it("always sums to 1", () => {
    const profile = createDefaultProfile();
    profile.selectedInterests = ["fitness", "health"];
    profile.interestWeights = initWeights(profile.selectedInterests);
    profile.activitySignals.runningMin = 120;
    const w = updateWeights(profile);
    expect(sumWeights(w)).toBeCloseTo(1, 6);
  });

  it("selected interests never drop below floor", () => {
    const profile = createDefaultProfile();
    profile.selectedInterests = ["beach"];
    profile.interestWeights = initWeights(profile.selectedInterests);
    // Massive signals pushing away from beach
    profile.activitySignals.vehicleCommuteMin = 999;
    profile.activitySignals.runningMin = 999;
    const w = updateWeights(profile);
    expect(w.beach).toBeGreaterThanOrEqual(CONFIG.FLOOR - 1e-6);
  });
});

describe("Fitness → Commuter scenario", () => {
  it("commute weight increases and fitness weight decreases", () => {
    let profile = createDefaultProfile();
    profile.selectedInterests = ["fitness"];
    profile.interestWeights = initWeights(["fitness"]);
    const startFitness = profile.interestWeights.fitness;
    const startCommute = profile.interestWeights.commuter;

    // Simulate 10 days of commuting
    for (let d = 0; d < 10; d++) {
      profile.activitySignals.vehicleCommuteMin = 120;
      profile.activitySignals.runningMin = 0;
      profile = runDayUpdate(profile);
    }

    expect(profile.interestWeights.commuter).toBeGreaterThan(startCommute);
    expect(profile.interestWeights.fitness).toBeLessThan(startFitness);
  });
});

describe("Location context boosts", () => {
  it("farm context boosts agriculture", () => {
    const profile = createDefaultProfile();
    profile.locationContext = "farm";
    const scores = computeBehaviourScores(profile);
    expect(scores.agri).toBeGreaterThan(0);
  });

  it("beach context boosts beach", () => {
    const profile = createDefaultProfile();
    profile.locationContext = "beach";
    const scores = computeBehaviourScores(profile);
    expect(scores.beach).toBeGreaterThan(0);
  });

  it("other_city context boosts traveler", () => {
    const profile = createDefaultProfile();
    profile.locationContext = "other_city";
    const scores = computeBehaviourScores(profile);
    expect(scores.traveler).toBeGreaterThan(0);
  });
});

describe("ranking", () => {
  it("always includes all 16 modules", () => {
    const w = initWeights(["fitness"]);
    const location = {
      key: "pune", city: "Pune", region: "Maharashtra", condition: "sunny" as const,
      temp: 29, feels: 32, summary: "",
      air: { aqi: 62, aqiLabel: "Satisfactory", uv: 8, uvLabel: "High", heat: 34, heatLabel: "Caution" },
      sun: { sunrise: "5:58 AM", sunset: "6:21 PM", daylight: "12h 23m", progress: 0.28 },
      precip: { next: "Tomorrow", amount: "6 mm", rate: "0.2 mm/h", chance: 20, note: "Dry", bars: [] },
      pollen: { level: "Moderate", count: 5.4, types: "Grass", trend: "Rising" },
      travel: { traffic: "Moderate" as const, trafficNote: "", visibility: "9 km", flights: [] },
      wind: { speed: 9, dir: "NE", gust: 16 }, humidity: 54, dewPoint: 18,
      pressure: { value: 1010, trend: "Steady" },
      moon: { phase: 0.42, name: "Waxing Gibbous", illum: 78 },
    };
    const ranked = rankModules(w, location, []);
    expect(ranked).toHaveLength(ALL_BLOCKS.length);
    for (const b of ALL_BLOCKS) {
      expect(ranked).toContain(b);
    }
  });

  it("pins alert modules to the top", () => {
    const w = initWeights(["fitness"]);
    const location = {
      key: "pune", city: "Pune", region: "Maharashtra", condition: "sunny" as const,
      temp: 29, feels: 32, summary: "",
      air: { aqi: 62, aqiLabel: "Satisfactory", uv: 8, uvLabel: "High", heat: 34, heatLabel: "Caution" },
      sun: { sunrise: "5:58 AM", sunset: "6:21 PM", daylight: "12h 23m", progress: 0.28 },
      precip: { next: "Tomorrow", amount: "6 mm", rate: "0.2 mm/h", chance: 20, note: "Dry", bars: [] },
      pollen: { level: "Moderate", count: 5.4, types: "Grass", trend: "Rising" },
      travel: { traffic: "Moderate" as const, trafficNote: "", visibility: "9 km", flights: [] },
      wind: { speed: 9, dir: "NE", gust: 16 }, humidity: 54, dewPoint: 18,
      pressure: { value: 1010, trend: "Steady" },
      moon: { phase: 0.42, name: "Waxing Gibbous", illum: 78 },
    };
    const alerts: AlertOverride[] = [
      { moduleId: "precip", tier: "critical" },
      { moduleId: "travel", tier: "warning" },
    ];
    const ranked = rankModules(w, location, alerts);
    expect(ranked[0]).toBe("precip"); // Red first
    expect(ranked[1]).toBe("travel"); // Orange second
    expect(ranked).toHaveLength(ALL_BLOCKS.length);
  });
});
