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
    // Reference image East Coast towns
    expect(cityNames).toContain("Visakhapatnam");
    expect(cityNames).toContain("Vijayawada");
    expect(cityNames).toContain("Tuni");
    expect(cityNames).toContain("Bobbili");
    expect(cityNames).toContain("Vizianagaram");
    expect(cityNames).toContain("Rajamahendravaram");
    expect(cityNames).toContain("Eluru");
    expect(cityNames).toContain("Palakollu");
    expect(cityNames).toContain("Machilipatnam");
    expect(cityNames).toContain("Khammam");
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
    expect(TILE_URL_PRIMARY).toMatch(/^https:\/\/.+\/tile\/\{z\}\/\{y\}\/\{x\}$/);
    expect(TILE_URL_FALLBACK).toMatch(/^https:\/\/.+\/tile\/\{z\}\/\{y\}\/\{x\}$/);
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

  it("exports marine observation points for ocean boundary circulation", async () => {
    const { MARINE_WIND_OBS, getWindVector, createWindField, getMotionArrow } = await import("../WindRadar");
    expect(MARINE_WIND_OBS.length).toBeGreaterThanOrEqual(6);
    for (const m of MARINE_WIND_OBS) {
      expect(m.speed).toBeGreaterThan(0);
      expect(m.lat).toBeGreaterThanOrEqual(4);
      expect(m.lng).toBeGreaterThanOrEqual(60);
    }

    // Verify re-exported wind vector utilities
    expect(typeof getWindVector).toBe("function");
    expect(typeof createWindField).toBe("function");
    expect(typeof getMotionArrow).toBe("function");
    // Meteorological East wind (air moving West) gives left arrow
    expect(getMotionArrow(90)).toBe("←");
    // Meteorological North wind (air moving South) gives down arrow
    expect(getMotionArrow(0)).toBe("↓");
    // Meteorological South-West wind (air moving North-East) gives up-right arrow
    expect(getMotionArrow(225)).toBe("↗");
  });

  it("exports fetchRadarCitiesWind function capable of batch fetching", async () => {
    const { fetchRadarCitiesWind } = await import("../../data/openMeteo");
    expect(typeof fetchRadarCitiesWind).toBe("function");
  });
});

