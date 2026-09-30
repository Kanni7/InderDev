import { createContext, useContext } from "react";

/* ─── Interest type aligned with existing UserTypeKey ─── */
export type Interest =
  | "health" | "fitness" | "beach" | "traveler"
  | "parent" | "agri" | "commuter" | "event";

export const ALL_INTERESTS: Interest[] = [
  "health", "fitness", "beach", "traveler", "parent", "agri", "commuter", "event",
];

export type LocationContext = "home_city" | "farm" | "beach" | "other_city";

export type ModuleId = string;

export interface ActivitySignals {
  runningMin: number;
  walkingMin: number;
  cyclingMin: number;
  vehicleCommuteMin: number;
  vehicleLongTripMin: number;
  schoolRunWalks: number;
}

export interface ModuleInteraction {
  taps: number;
  scrollPasts: number;
}

export interface UserProfile {
  language: string;
  city: string;
  locationContext: LocationContext;
  selectedInterests: Interest[];
  interestWeights: Record<Interest, number>;
  activitySignals: ActivitySignals;
  moduleInteractions: Record<ModuleId, ModuleInteraction>;
  askWhyTopics: Record<string, number>;
  dayCount: number;
  lastUpdated: string;
}

const STORAGE_KEY = "mausam_profile";

export function defaultActivitySignals(): ActivitySignals {
  return {
    runningMin: 0,
    walkingMin: 0,
    cyclingMin: 0,
    vehicleCommuteMin: 0,
    vehicleLongTripMin: 0,
    schoolRunWalks: 0,
  };
}

function defaultWeights(): Record<Interest, number> {
  const w = {} as Record<Interest, number>;
  const each = 1 / ALL_INTERESTS.length;
  for (const i of ALL_INTERESTS) w[i] = each;
  return w;
}

export function createDefaultProfile(): UserProfile {
  return {
    language: "en",
    city: "pune",
    locationContext: "home_city",
    selectedInterests: ["fitness"],
    interestWeights: defaultWeights(),
    activitySignals: defaultActivitySignals(),
    moduleInteractions: {},
    askWhyTopics: {},
    dayCount: 0,
    lastUpdated: new Date().toISOString(),
  };
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed.interestWeights || !parsed.selectedInterests) {
      return createDefaultProfile();
    }
    // Ensure all interests exist in weights
    for (const i of ALL_INTERESTS) {
      if (typeof parsed.interestWeights[i] !== "number") {
        parsed.interestWeights[i] = 0;
      }
    }
    if (!parsed.activitySignals) {
      parsed.activitySignals = defaultActivitySignals();
    }
    if (!parsed.moduleInteractions) parsed.moduleInteractions = {};
    if (!parsed.askWhyTopics) parsed.askWhyTopics = {};
    return parsed;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage full or unavailable - silently ignore
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ─── React context ─── */
export interface ProfileContextValue {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  updateProfile: (fn: (prev: UserProfile) => UserProfile) => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
