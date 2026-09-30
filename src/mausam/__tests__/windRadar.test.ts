import { describe, it, expect } from "vitest";
import {
  WIND_CITIES,
  COASTLINE_WEST,
  COASTLINE_EAST,
  NORTH_WEST_BORDER,
  NORTHERN_HIMALAYAN_BORDER,
  STATE_BORDERS,
  TILE_URL_PRIMARY,
  TILE_URL_FALLBACK,
} from "../WindRadar";
import { makeT } from "../i18n";
import { locations } from "../data";

describe("Wind Radar Configuration & Data", () => {
  it("contains major cities with valid coordinates and base speeds", () => {
    expect(WIND_CITIES.length).toBeGreaterThanOrEqual(25);
    for (const city of WIND_CITIES) {
      expect(city.name).toBeTruthy();
      expect(city.lat).toBeGreaterThanOrEqual(5);
      expect(city.lat).toBeLessThanOrEqual(38);
      expect(city.lng).toBeGreaterThanOrEqual(65);
      expect(city.lng).toBeLessThanOrEqual(100);
      expect(city.baseSpeed).toBeGreaterThan(0);
    }
  });

  it("contains key cities from reference image", () => {
    const cityNames = WIND_CITIES.map((c) => c.name);
    expect(cityNames).toContain("Mumbai");
    expect(cityNames).toContain("Chennai");
    expect(cityNames).toContain("Bengaluru");
    expect(cityNames).toContain("Hyderabad");
    expect(cityNames).toContain("Pune");
    expect(cityNames).toContain("Rameswaram");
    expect(cityNames).toContain("Trincomalee");
  });

  it("has valid geographic coastlines and borders within India bounding box", () => {
    const allLines = [
      COASTLINE_WEST,
      COASTLINE_EAST,
      NORTH_WEST_BORDER,
      NORTHERN_HIMALAYAN_BORDER,
    ];
    for (const line of allLines) {
      expect(line.length).toBeGreaterThanOrEqual(5);
      for (const [lat, lng] of line) {
        expect(lat).toBeGreaterThanOrEqual(5);
        expect(lat).toBeLessThanOrEqual(38);
        expect(lng).toBeGreaterThanOrEqual(65);
        expect(lng).toBeLessThanOrEqual(100);
      }
    }

    expect(STATE_BORDERS.length).toBeGreaterThanOrEqual(10);
    for (const border of STATE_BORDERS) {
      expect(border.length).toBeGreaterThanOrEqual(2);
      for (const [lat, lng] of border) {
        expect(lat).toBeGreaterThanOrEqual(8);
        expect(lat).toBeLessThanOrEqual(36);
        expect(lng).toBeGreaterThanOrEqual(68);
        expect(lng).toBeLessThanOrEqual(92);
      }
    }
  });

  it("uses reliable HTTPS tile mirrors with no API key requirement", () => {
    expect(TILE_URL_PRIMARY).toMatch(/^https:\/\/.+\{z\}\/\{x\}\/\{y\}\.png$/);
    expect(TILE_URL_FALLBACK).toMatch(/^https:\/\/.+\{z\}\/\{x\}\/\{y\}\.png$/);
  });

  it("provides translations for Wind Radar in multiple languages", () => {
    for (const lang of ["hi", "te", "ml", "ta", "pa"] as const) {
      const t = makeT(lang);
      expect(t("Wind Radar")).toBeTruthy();
      expect(t("Open Live Wind Radar Map")).toBeTruthy();
    }
  });

  it("all app locations have wind data", () => {
    for (const loc of locations) {
      expect(loc.wind).toBeDefined();
      expect(typeof loc.wind.speed).toBe("number");
      expect(typeof loc.wind.dir).toBe("string");
      expect(typeof loc.wind.gust).toBe("number");
    }
  });
});

