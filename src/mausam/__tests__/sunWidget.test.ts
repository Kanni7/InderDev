import { describe, it, expect } from "vitest";
import { parseTimeStringToHours, calculateSolarPosition } from "../background/solarEngine";

describe("Sun Widget & Astronomical Calculations", () => {
  it("accurately parses 12-hour AM/PM time strings into decimal hours", () => {
    expect(parseTimeStringToHours("5:58 AM")).toBeCloseTo(5.9667, 3);
    expect(parseTimeStringToHours("6:21 PM")).toBeCloseTo(18.35, 2);
    expect(parseTimeStringToHours("12:00 PM")).toBeCloseTo(12.0, 2);
    expect(parseTimeStringToHours("12:00 AM")).toBeCloseTo(0.0, 2);
    expect(parseTimeStringToHours("6:05 AM")).toBeCloseTo(6.0833, 3);
    expect(parseTimeStringToHours("")).toBeNull();
    expect(parseTimeStringToHours(undefined)).toBeNull();
  });

  it("calculates solar position correctly during daytime", () => {
    const sunriseH = 6.0;
    const sunsetH = 18.0;
    // Midday (solar noon)
    const noonPos = calculateSolarPosition(12.0, sunriseH, sunsetH);
    expect(noonPos.altitude).toBeGreaterThan(65);
    expect(noonPos.screenY).toBeLessThan(30); // high in the sky

    // Morning
    const morningPos = calculateSolarPosition(9.0, sunriseH, sunsetH);
    expect(morningPos.altitude).toBeGreaterThan(0);
    expect(morningPos.screenX).toBeLessThan(50);
  });

  it("calculates solar position correctly below horizon at night", () => {
    const sunriseH = 6.0;
    const sunsetH = 18.0;
    // Night
    const nightPos = calculateSolarPosition(23.0, sunriseH, sunsetH);
    expect(nightPos.altitude).toBeLessThan(0); // below horizon
  });

  it("computes accurate daylight duration", () => {
    const sunriseH = parseTimeStringToHours("5:58 AM")!;
    const sunsetH = parseTimeStringToHours("6:21 PM")!;
    const daylightDuration = sunsetH - sunriseH;
    expect(daylightDuration).toBeCloseTo(12.383, 2); // ~12h 23m
  });
});
