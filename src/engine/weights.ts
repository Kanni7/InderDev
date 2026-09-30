import {
  type Interest,
  type UserProfile,
  ALL_INTERESTS,
  defaultActivitySignals,
} from "./profile";

/* ─── All tuneable constants in one place ─── */
export const CONFIG = {
  /** Blend: old weight factor */
  ALPHA_OLD: 0.6,
  /** Blend: behaviour score factor */
  ALPHA_BEHAVIOUR: 0.3,
  /** Blend: explicit pick bonus factor */
  ALPHA_EXPLICIT: 0.1,
  /** Minimum weight for selected interests */
  FLOOR: 0.15,
  /** Share of total weight assigned to selected interests at init */
  INIT_SELECTED_SHARE: 0.8,
  /** Share of total weight assigned to unselected interests at init */
  INIT_UNSELECTED_SHARE: 0.2,
  /** Signal-to-interest mappings */
  SIGNAL_MAP: {
    runningMin: "fitness" as Interest,
    cyclingMin: "fitness" as Interest,
    walkingMin: "fitness" as Interest,
    vehicleCommuteMin: "commuter" as Interest,
    vehicleLongTripMin: "traveler" as Interest,
    schoolRunWalks: "parent" as Interest,
  },
  /** Location context to interest */
  LOCATION_MAP: {
    farm: "agri" as Interest,
    beach: "beach" as Interest,
    other_city: "traveler" as Interest,
  } as Record<string, Interest>,
  /** Module tap negative weight for scrollPasts */
  SCROLL_PAST_PENALTY: -0.1,
} as const;

/* ─── Primary interest for each module (Block) ─── */
export const MODULE_PRIMARY_INTEREST: Record<string, Interest> = {
  air: "health",
  pollen: "health",
  precip: "agri",
  rainmap: "agri",
  sun: "fitness",
  travel: "commuter",
  packing: "traveler",
  wind: "fitness",
  humidity: "health",
  dewpoint: "health",
  pressure: "health",
  moon: "event",
  metrics: "fitness",
  hourly: "commuter",
  weekly: "event",
};

/** Initialise weights from selected interests. */
export function initWeights(selected: Interest[]): Record<Interest, number> {
  const w = {} as Record<Interest, number>;
  const selectedCount = Math.max(selected.length, 1);
  const unselected = ALL_INTERESTS.filter((i) => !selected.includes(i));
  const unselectedCount = Math.max(unselected.length, 1);

  const perSelected = CONFIG.INIT_SELECTED_SHARE / selectedCount;
  const perUnselected = CONFIG.INIT_UNSELECTED_SHARE / unselectedCount;

  for (const i of ALL_INTERESTS) {
    w[i] = selected.includes(i) ? perSelected : perUnselected;
  }
  return normalise(w);
}

/** Map activity/context/interaction signals to per-interest behaviour scores, normalised to sum 1. */
export function computeBehaviourScores(profile: UserProfile): Record<Interest, number> {
  const raw = {} as Record<Interest, number>;
  for (const i of ALL_INTERESTS) raw[i] = 0;

  // Activity signals
  const sm = CONFIG.SIGNAL_MAP;
  const act = profile.activitySignals;
  raw[sm.runningMin] += act.runningMin;
  raw[sm.cyclingMin] += act.cyclingMin;
  raw[sm.walkingMin] += act.walkingMin;
  raw[sm.vehicleCommuteMin] += act.vehicleCommuteMin;
  raw[sm.vehicleLongTripMin] += act.vehicleLongTripMin;
  raw[sm.schoolRunWalks] += act.schoolRunWalks * 30; // weight each walk as ~30 min equivalent

  // Location context
  const locInterest = CONFIG.LOCATION_MAP[profile.locationContext];
  if (locInterest) {
    raw[locInterest] += 60; // equivalent to 1 hour of signal
  }

  // Module interactions - taps boost the primary interest, scrollPasts penalise
  for (const [modId, inter] of Object.entries(profile.moduleInteractions)) {
    const primary = MODULE_PRIMARY_INTEREST[modId];
    if (primary) {
      raw[primary] += inter.taps * 10;
      raw[primary] += inter.scrollPasts * CONFIG.SCROLL_PAST_PENALTY;
    }
  }

  // Ask-why topics
  for (const [interest, count] of Object.entries(profile.askWhyTopics)) {
    if (interest in raw) {
      raw[interest as Interest] += count * 15;
    }
  }

  // Clamp negatives to 0
  for (const i of ALL_INTERESTS) {
    if (raw[i] < 0) raw[i] = 0;
  }

  return normalise(raw);
}

/** Blend old weights with behaviour and explicit bonus, enforce floor, normalise. */
export function updateWeights(profile: UserProfile): Record<Interest, number> {
  const old = profile.interestWeights;
  const behaviour = computeBehaviourScores(profile);
  const w = {} as Record<Interest, number>;

  for (const i of ALL_INTERESTS) {
    const explicitBonus = profile.selectedInterests.includes(i) ? 1 : 0;
    w[i] =
      CONFIG.ALPHA_OLD * old[i] +
      CONFIG.ALPHA_BEHAVIOUR * behaviour[i] +
      CONFIG.ALPHA_EXPLICIT * explicitBonus;
  }

  // Floor enforcement for selected interests
  for (const i of profile.selectedInterests) {
    if (w[i] < CONFIG.FLOOR) {
      w[i] = CONFIG.FLOOR;
    }
  }

  return normalise(w);
}

/** Run a full day update: compute new weights, reset daily counters, bump dayCount. */
export function runDayUpdate(profile: UserProfile): UserProfile {
  const newWeights = updateWeights(profile);
  return {
    ...profile,
    interestWeights: newWeights,
    activitySignals: defaultActivitySignals(),
    moduleInteractions: {},
    askWhyTopics: {},
    dayCount: profile.dayCount + 1,
    lastUpdated: new Date().toISOString(),
  };
}

/* ─── Helpers ─── */

/** Normalise a weight map so values sum to 1. */
export function normalise(w: Record<Interest, number>): Record<Interest, number> {
  const total = ALL_INTERESTS.reduce((s, i) => s + w[i], 0);
  if (total === 0) {
    // Uniform fallback
    const each = 1 / ALL_INTERESTS.length;
    const result = {} as Record<Interest, number>;
    for (const i of ALL_INTERESTS) result[i] = each;
    return result;
  }
  const result = {} as Record<Interest, number>;
  for (const i of ALL_INTERESTS) result[i] = w[i] / total;
  return result;
}
