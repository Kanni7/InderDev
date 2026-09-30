import { describe, it, expect } from "vitest";
import { parseActivityText } from "../activityParser";
import { runLSTMInference, calculateNonLinearDurationImpact } from "../lstmModel";
import { createDefaultProfile } from "../profile";

describe("LSTM Activity Weight Model", () => {
  it("extracts activity and duration correctly from text", () => {
    const p1 = parseActivityText("30 min cycling");
    expect(p1.activityName).toBe("Cycling");
    expect(p1.primaryInterest).toBe("fitness");
    expect(p1.durationMin).toBe(30);

    const p2 = parseActivityText("1 hour cycling");
    expect(p2.activityName).toBe("Cycling");
    expect(p2.primaryInterest).toBe("fitness");
    expect(p2.durationMin).toBe(60);

    const p3 = parseActivityText("2 hr drive to Mumbai office");
    expect(p3.primaryInterest).toBe("commuter");
    expect(p3.durationMin).toBe(120);

    const p4 = parseActivityText("swimming at the beach for 45 mins");
    expect(p4.primaryInterest).toBe("beach");
    expect(p4.durationMin).toBe(45);
  });

  it("calculates non-linear duration curves for 30m vs 60m", () => {
    const c15 = calculateNonLinearDurationImpact(15, 1.0);
    const c30 = calculateNonLinearDurationImpact(30, 1.0);
    const c60 = calculateNonLinearDurationImpact(60, 1.0);
    const c120 = calculateNonLinearDurationImpact(120, 1.0);

    // Impact must increase monotonically with duration
    expect(c30.impact).toBeGreaterThan(c15.impact);
    expect(c60.impact).toBeGreaterThan(c30.impact);
    expect(c120.impact).toBeGreaterThan(c60.impact);

    // Marginal gain from 60m to 120m is smaller than 0m to 60m due to hyperbolic tangent saturation
    const gainEarly = c60.impact - 0;
    const gainLate = c120.impact - c60.impact;
    expect(gainLate).toBeLessThan(gainEarly);
  });

  it("updates weights differently for 30 min cycling vs 1 hour cycling", () => {
    const baseProfile = createDefaultProfile();
    baseProfile.selectedInterests = ["health"]; // Set non-fitness baseline to clearly observe fitness growth
    baseProfile.interestWeights = {
      health: 0.35,
      fitness: 0.10,
      beach: 0.09,
      traveler: 0.09,
      parent: 0.09,
      agri: 0.09,
      commuter: 0.10,
      event: 0.09,
    };

    const parsed30 = parseActivityText("30 min cycling");
    const res30 = runLSTMInference(baseProfile, parsed30);

    const parsed60 = parseActivityText("1 hour cycling");
    const res60 = runLSTMInference(baseProfile, parsed60);

    // Both should increase fitness weight
    expect(res30.newWeights.fitness).toBeGreaterThan(baseProfile.interestWeights.fitness);
    expect(res60.newWeights.fitness).toBeGreaterThan(baseProfile.interestWeights.fitness);

    // 1 hour cycling MUST produce a larger delta and higher final weight than 30 min cycling
    expect(res60.newWeights.fitness).toBeGreaterThan(res30.newWeights.fitness);
    expect(res60.deltas.fitness).toBeGreaterThan(res30.deltas.fitness);

    // Weights must always sum to 1.0
    const sum30 = Object.values(res30.newWeights).reduce((a, b) => a + b, 0);
    const sum60 = Object.values(res60.newWeights).reduce((a, b) => a + b, 0);
    expect(sum30).toBeCloseTo(1.0, 2);
    expect(sum60).toBeCloseTo(1.0, 2);
  });

  it("handles commute and road trip shifts", () => {
    const profile = createDefaultProfile();
    const drive = parseActivityText("2 hr highway road trip");
    const res = runLSTMInference(profile, drive);

    expect(res.newWeights.traveler).toBeGreaterThan(profile.interestWeights.traveler);
    expect(res.explanation).toContain("traveler");
  });
});
