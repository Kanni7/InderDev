import { describe, it, expect } from "vitest";
import {
  meteoDirToDegrees,
  degreesToMeteoCompass,
  meteoToMotionVector,
  motionVectorToMeteo,
  getMotionArrow,
  createWindField,
  getWindVector,
  interpolateWindFields,
  type ObservationPoint,
} from "../windField";

describe("Meteorological Wind Field Engine", () => {
  describe("Direction & Motion Conversions", () => {
    it("converts compass directions to meteorological degrees", () => {
      expect(meteoDirToDegrees("N")).toBe(0);
      expect(meteoDirToDegrees("E")).toBe(90);
      expect(meteoDirToDegrees("S")).toBe(180);
      expect(meteoDirToDegrees("W")).toBe(270);
      expect(meteoDirToDegrees("NE")).toBe(45);
      expect(meteoDirToDegrees("SW")).toBe(225);
    });

    it("converts degrees to compass strings accurately", () => {
      expect(degreesToMeteoCompass(0)).toBe("N");
      expect(degreesToMeteoCompass(90)).toBe("E");
      expect(degreesToMeteoCompass(180)).toBe("S");
      expect(degreesToMeteoCompass(270)).toBe("W");
      expect(degreesToMeteoCompass(45)).toBe("NE");
      expect(degreesToMeteoCompass(225)).toBe("SW");
      expect(degreesToMeteoCompass(355)).toBe("N");
    });

    it("correctly converts meteorological direction to physical air motion vector", () => {
      // 90° (East wind) blows FROM East -> air travels towards West (u < 0, v = 0)
      const eastWind = meteoToMotionVector(10, 90);
      expect(eastWind.u).toBeCloseTo(-10, 2);
      expect(eastWind.v).toBeCloseTo(0, 2);

      // 270° (West wind) blows FROM West -> air travels towards East (u > 0, v = 0)
      const westWind = meteoToMotionVector(14, 270);
      expect(westWind.u).toBeCloseTo(14, 2);
      expect(westWind.v).toBeCloseTo(0, 2);

      // 0° (North wind) blows FROM North -> air travels towards South (u = 0, v < 0)
      const northWind = meteoToMotionVector(12, 0);
      expect(northWind.u).toBeCloseTo(0, 2);
      expect(northWind.v).toBeCloseTo(-12, 2);

      // 180° (South wind) blows FROM South -> air travels towards North (u = 0, v > 0)
      const southWind = meteoToMotionVector(16, 180);
      expect(southWind.u).toBeCloseTo(0, 2);
      expect(southWind.v).toBeCloseTo(16, 2);
    });

    it("round-trips between meteorological parameters and motion vectors", () => {
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      for (const deg of angles) {
        const speed = 15;
        const vec = meteoToMotionVector(speed, deg);
        const res = motionVectorToMeteo(vec.u, vec.v);
        expect(res.speed).toBeCloseTo(speed, 1);
        expect(res.deg).toBe(deg);
      }
    });

    it("maps meteorological direction to motion arrows pointing in the direction of air movement", () => {
      // East wind (air moving West) -> arrow pointing left
      expect(getMotionArrow(90)).toBe("←");
      // West wind (air moving East) -> arrow pointing right
      expect(getMotionArrow(270)).toBe("→");
      // South-West wind (air moving North-East) -> arrow pointing ↗
      expect(getMotionArrow(225)).toBe("↗");
      // North-West wind (air moving South-East) -> arrow pointing ↘
      expect(getMotionArrow(315)).toBe("↘");
    });
  });

  describe("WindField Creation & Spatial Bilinear Sampling", () => {
    const testObs: ObservationPoint[] = [
      { lat: 18.52, lng: 73.86, speed: 12, dirDeg: 270 }, // Pune: 12 km/h West wind (blowing East)
      { lat: 19.08, lng: 72.88, speed: 16, dirDeg: 270 }, // Mumbai: 16 km/h West wind
      { lat: 12.97, lng: 77.59, speed: 10, dirDeg: 250 }, // Bengaluru: 10 km/h WSW wind
      { lat: 13.08, lng: 80.27, speed: 14, dirDeg: 90 },  // Chennai: 14 km/h East wind (blowing West)
      { lat: 28.61, lng: 77.21, speed: 11, dirDeg: 300 }, // Delhi: 11 km/h WNW wind
    ];

    it("creates a continuous gridded wind field from sparse observations", () => {
      const field = createWindField(testObs, { gridWidth: 32, gridHeight: 32 });
      expect(field.u.length).toBe(32 * 32);
      expect(field.v.length).toBe(32 * 32);

      for (let i = 0; i < field.u.length; i++) {
        expect(Number.isFinite(field.u[i])).toBe(true);
        expect(Number.isFinite(field.v[i])).toBe(true);
      }
    });

    it("samples wind vectors with bilinear interpolation smoothly", () => {
      const field = createWindField(testObs, { gridWidth: 32, gridHeight: 32 });
      const samplePune = getWindVector(field, 18.52, 73.86);
      expect(samplePune.speed).toBeGreaterThan(8);
      expect(samplePune.speed).toBeLessThan(18);
      // West wind has positive u (moving East)
      expect(samplePune.u).toBeGreaterThan(0);

      const sampleChennai = getWindVector(field, 13.08, 80.27);
      expect(sampleChennai.speed).toBeGreaterThan(8);
      // East wind in Chennai has negative u (moving West)
      expect(sampleChennai.u).toBeLessThan(0);
    });

    it("interpolates seamlessly between two wind fields over time", () => {
      const fieldA = createWindField(testObs, { gridWidth: 16, gridHeight: 16, timestamp: 1000 });
      const fasterObs = testObs.map((o) => ({ ...o, speed: o.speed * 2 }));
      const fieldB = createWindField(fasterObs, { gridWidth: 16, gridHeight: 16, timestamp: 2000 });

      const midField = interpolateWindFields(fieldA, fieldB, 0.5);
      const vecA = getWindVector(fieldA, 18.52, 73.86);
      const vecB = getWindVector(fieldB, 18.52, 73.86);
      const vecMid = getWindVector(midField, 18.52, 73.86);

      expect(vecMid.speed).toBeGreaterThan(vecA.speed);
      expect(vecMid.speed).toBeLessThan(vecB.speed);
      expect(vecMid.speed).toBeCloseTo((vecA.speed + vecB.speed) / 2, 0.5);
    });
  });
});
