import type { UserProfile } from "./profile";

/** Interface for signal sources that write into the local profile. */
export interface SignalSource {
  name: string;
  apply(profile: UserProfile): UserProfile;
}

/** Coordinates for the 6 supported cities. */
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  pune: { lat: 18.5, lon: 73.9 },
  mumbai: { lat: 19.1, lon: 72.9 },
  delhi: { lat: 28.6, lon: 77.2 },
  bengaluru: { lat: 12.97, lon: 77.6 },
  chennai: { lat: 13.1, lon: 80.0 },
  kolkata: { lat: 22.6, lon: 88.4 },
};

/** Find the nearest city given lat/lon. */
export function nearestCity(lat: number, lon: number): string {
  let best = "pune";
  let bestDist = Infinity;
  for (const [key, c] of Object.entries(CITY_COORDS)) {
    const d = Math.hypot(c.lat - lat, c.lon - lon);
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

/**
 * SimulatedSignalSource: used by the demo panel and scenarios.
 * Applies partial signal overrides into the profile.
 */
export class SimulatedSignalSource implements SignalSource {
  name = "Simulated";

  constructor(
    private signals: Partial<UserProfile["activitySignals"]>,
    private locationContext?: UserProfile["locationContext"],
  ) {}

  apply(profile: UserProfile): UserProfile {
    return {
      ...profile,
      activitySignals: { ...profile.activitySignals, ...this.signals },
      locationContext: this.locationContext ?? profile.locationContext,
    };
  }
}

/**
 * BrowserSignalSource: uses navigator.geolocation to pick the nearest city.
 * Activity stays simulated — comments show where native APIs would plug in.
 *
 * In a native build:
 * - Android: Activity Recognition Transition API
 * - iOS: CoreMotion CMMotionActivityManager
 */
export class BrowserSignalSource implements SignalSource {
  name = "Browser";
  private lastCity: string | null = null;

  /** Request geolocation once and return the nearest city key. */
  async detectCity(): Promise<string | null> {
    if (!navigator.geolocation) return null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 300000,
        });
      });
      this.lastCity = nearestCity(pos.coords.latitude, pos.coords.longitude);
      return this.lastCity;
    } catch {
      return null;
    }
  }

  apply(profile: UserProfile): UserProfile {
    // Only update city if geolocation succeeded
    if (this.lastCity) {
      return { ...profile, city: this.lastCity };
    }
    return profile;
    // Activity recognition would go here in a native build:
    // profile.activitySignals.runningMin += detectedRunningMinutes;
    // profile.activitySignals.walkingMin += detectedWalkingMinutes;
    // etc.
  }
}
