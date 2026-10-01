import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triggerMoonHaptic } from "../LunarTimeline";

describe("LunarTimeline Haptics & Mobile Physics", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  it("triggers subtle vibration pulse for regular ticks when navigator.vibrate is available", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(global, "navigator", {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    triggerMoonHaptic(false);
    expect(vibrateMock).toHaveBeenCalledWith(6);
  });

  it("triggers distinct multi-pulse vibration for midnight / day change", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(global, "navigator", {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    triggerMoonHaptic(true);
    expect(vibrateMock).toHaveBeenCalledWith([16, 28, 12]);
  });

  it("gracefully executes without crashing when navigator.vibrate is undefined (e.g. iOS Safari)", () => {
    Object.defineProperty(global, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });

    expect(() => triggerMoonHaptic(false)).not.toThrow();
    expect(() => triggerMoonHaptic(true)).not.toThrow();
  });

  it("gracefully handles vibrating errors (e.g. iframe permission security violations)", () => {
    const errorVibrate = vi.fn(() => {
      throw new Error("SecurityError: vibrate not permitted");
    });
    Object.defineProperty(global, "navigator", {
      value: { vibrate: errorVibrate },
      configurable: true,
      writable: true,
    });

    expect(() => triggerMoonHaptic(false)).not.toThrow();
  });
});
