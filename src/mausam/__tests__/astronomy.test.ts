import { describe, it, expect } from "vitest";
import {
  calculateMoonPhase,
  calculateMoonTimes,
  getNextMajorPhase,
  getCompleteMoonData,
  getMoonLitSvgPath,
  getAstronomicalMoonGeometry,
} from "../astronomy";

describe("Astronomical Moon Calculations", () => {
  it("calculates accurate moon phase and illumination for known dates", () => {
    // Known full moon around Jan 21, 2000 04:40 UTC (diff ~ 14.76 days from Jan 6)
    const fullDate = new Date("2000-01-21T04:40:00Z");
    const full = calculateMoonPhase(fullDate);
    expect(full.name).toBe("Full Moon");
    expect(full.illumination).toBeGreaterThanOrEqual(95);

    // Known new moon around Feb 5, 2000 13:03 UTC
    const newDate = new Date("2000-02-05T13:03:00Z");
    const nm = calculateMoonPhase(newDate);
    expect(nm.name).toBe("New Moon");
    expect(nm.illumination).toBeLessThanOrEqual(5);
  });

  it("calculates realistic moonrise and moonset times for given coordinates", () => {
    const times = calculateMoonTimes(new Date(), 18.52, 73.86);
    expect(times.moonrise).toMatch(/^(1[0-2]|[1-9]):[0-5][0-9]\s*(AM|PM|am|pm)$/);
    expect(times.moonset).toMatch(/^(1[0-2]|[1-9]):[0-5][0-9]\s*(AM|PM|am|pm)$/);
  });

  it("calculates upcoming primary lunar phases", () => {
    const next = getNextMajorPhase(0.42); // Waxing gibbous
    expect(next.name).toBe("Full Moon");
    expect(next.daysAway).toBeGreaterThan(0);
    expect(next.daysAway).toBeLessThan(10);
    expect(next.formattedDate).toBeTruthy();
  });

  it("generates correct SVG terminator paths across all quarters", () => {
    // New Moon -> empty
    expect(getMoonLitSvgPath(0.0)).toBe("");
    expect(getMoonLitSvgPath(1.0)).toBe("");

    // Full Moon -> complete circle path
    expect(getMoonLitSvgPath(0.5)).toContain("M 50,0");

    // First Quarter (0.25) -> Waxing semicircle on right
    const fq = getMoonLitSvgPath(0.25);
    expect(fq).toContain("M 50,0 A 50,50 0 0,1 50,100");

    // Last Quarter (0.75) -> Waning semicircle on left
    const lq = getMoonLitSvgPath(0.75);
    expect(lq).toContain("M 50,0 A 50,50 0 0,0 50,100");
  });

  it("produces complete moon data package with fallbacks", () => {
    const data = getCompleteMoonData();
    expect(data.name).toBeTruthy();
    expect(data.illumination).toBeGreaterThanOrEqual(0);
    expect(data.illumination).toBeLessThanOrEqual(100);
    expect(data.moonrise).toBeTruthy();
    expect(data.moonset).toBeTruthy();
    expect(data.nextMajorPhase.name).toBeTruthy();
  });

  it("computes deterministic 3D astronomical orientation and solar vectors", () => {
    const testDate = new Date("2026-09-30T12:00:00Z");
    const geo1 = getAstronomicalMoonGeometry(testDate);
    const geo2 = getAstronomicalMoonGeometry(testDate);

    // 1. Determinism: identical timestamps MUST produce identical results
    expect(geo1.librationLon).toBe(geo2.librationLon);
    expect(geo1.librationLat).toBe(geo2.librationLat);
    expect(geo1.axisTilt).toBe(geo2.axisTilt);
    expect(geo1.sunDirection).toEqual(geo2.sunDirection);

    // 2. Physical libration and tilt bounds
    expect(Math.abs(geo1.librationLon)).toBeLessThanOrEqual(0.16); // <= 9.1°
    expect(Math.abs(geo1.librationLat)).toBeLessThanOrEqual(0.14); // <= 8.0°
    expect(Math.abs(geo1.axisTilt)).toBeLessThanOrEqual(0.5); // <= 28.6°

    // 3. Normalized solar direction vector
    const mag = Math.hypot(...geo1.sunDirection);
    expect(mag).toBeCloseTo(1.0, 4);

    // 4. Test known solar vector at Full Moon (Jan 21, 2000 04:40 UTC)
    const fullDate = new Date("2000-01-21T04:40:00Z");
    const fullGeo = getAstronomicalMoonGeometry(fullDate);
    expect(fullGeo.sunDirection[2]).toBeGreaterThan(0.85); // Sunlight facing front (+Z)

    // 5. Test known solar vector at New Moon (Feb 5, 2000 13:03 UTC)
    const newDate = new Date("2000-02-05T13:03:00Z");
    const newGeo = getAstronomicalMoonGeometry(newDate);
    expect(newGeo.sunDirection[2]).toBeLessThan(-0.85); // Sunlight behind the Moon (-Z)

    // 6. Test continuity: 1 hour step has small smooth delta
    const nextHour = new Date(testDate.getTime() + 3600000);
    const geoNext = getAstronomicalMoonGeometry(nextHour);
    expect(Math.abs(geoNext.librationLon - geo1.librationLon)).toBeLessThan(0.02);
    expect(Math.abs(geoNext.librationLat - geo1.librationLat)).toBeLessThan(0.02);
  });
});
