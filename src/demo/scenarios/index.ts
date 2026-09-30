import type { LocationContext, Interest } from "../../engine/profile";

export interface ScenarioDay {
  runningMin?: number;
  walkingMin?: number;
  cyclingMin?: number;
  vehicleCommuteMin?: number;
  vehicleLongTripMin?: number;
  schoolRunWalks?: number;
  locationContext?: LocationContext;
  alert?: { moduleId: string; tier: "warning" | "critical" };
  /** Simulated card taps per module (boosts that module's primary interest) */
  taps?: Record<string, number>;
  /** Simulated "Ask why" questions per interest */
  askWhy?: Partial<Record<Interest, number>>;
}

export interface Scenario {
  id: string;
  name: string;
  nameHi: string;
  startInterests: Interest[];
  days: ScenarioDay[];
}

export const scenarios: Scenario[] = [
  {
    id: "fitness-to-commuter",
    name: "Fitness to Commuter",
    nameHi: "फ़िटनेस से यात्री",
    startInterests: ["fitness"],
    days: [
      { runningMin: 60 },
      { runningMin: 45, vehicleCommuteMin: 30 },
      { runningMin: 20, vehicleCommuteMin: 60 },
      { vehicleCommuteMin: 90 },
      { vehicleCommuteMin: 120 },
      { vehicleCommuteMin: 120 },
      { vehicleCommuteMin: 90, walkingMin: 15 },
      { vehicleCommuteMin: 120 },
      { vehicleCommuteMin: 100 },
      { vehicleCommuteMin: 120 },
    ],
  },
  {
    id: "farmer-monsoon",
    name: "Farmer in monsoon",
    nameHi: "मानसून में किसान",
    startInterests: ["agri"],
    days: [
      { locationContext: "farm", walkingMin: 30 },
      { locationContext: "farm", walkingMin: 45 },
      { locationContext: "farm", alert: { moduleId: "precip", tier: "warning" } },
      { locationContext: "farm" },
      { locationContext: "farm", walkingMin: 60 },
      { locationContext: "farm", alert: { moduleId: "precip", tier: "critical" } },
      { locationContext: "farm" },
      { locationContext: "home_city", vehicleCommuteMin: 30 },
    ],
  },
  {
    id: "traveller-mumbai",
    name: "Traveller to Mumbai",
    nameHi: "मुंबई का यात्री",
    startInterests: ["traveler"],
    days: [
      { vehicleLongTripMin: 180 },
      { locationContext: "other_city", walkingMin: 60 },
      { locationContext: "other_city", walkingMin: 90 },
      { locationContext: "other_city", vehicleCommuteMin: 30 },
      { locationContext: "other_city", alert: { moduleId: "travel", tier: "warning" } },
      { locationContext: "other_city", walkingMin: 45 },
      { vehicleLongTripMin: 180, locationContext: "home_city" },
    ],
  },
  {
    id: "parent-delhi-smog",
    name: "Parent in Delhi smog",
    nameHi: "दिल्ली स्मॉग में अभिभावक",
    startInterests: ["parent"],
    days: [
      { schoolRunWalks: 2 },
      { schoolRunWalks: 2, taps: { air: 1 } },
      { schoolRunWalks: 2, alert: { moduleId: "air", tier: "warning" }, taps: { air: 3 }, askWhy: { health: 1 } },
      { schoolRunWalks: 1, taps: { air: 4, pollen: 2 }, askWhy: { health: 2 } },
      { alert: { moduleId: "air", tier: "critical" }, taps: { air: 6, humidity: 2 }, askWhy: { health: 3 } },
      { schoolRunWalks: 1, taps: { air: 5, pollen: 3 }, askWhy: { health: 2 } },
      { schoolRunWalks: 2, taps: { air: 4, dewpoint: 2 } },
      { schoolRunWalks: 2, taps: { air: 3, pollen: 2 } },
    ],
  },
  {
    id: "goa-beach-weekend",
    name: "Commuter to Goa beach",
    nameHi: "यात्री से गोवा बीच",
    startInterests: ["commuter"],
    days: [
      { vehicleCommuteMin: 90 },
      { vehicleCommuteMin: 90 },
      { vehicleLongTripMin: 240, locationContext: "beach" },
      { locationContext: "beach", walkingMin: 90, taps: { sun: 3 } },
      { locationContext: "beach", alert: { moduleId: "wind", tier: "warning" }, taps: { wind: 4 } },
      { locationContext: "beach", walkingMin: 60, taps: { sun: 2, humidity: 2 } },
      { locationContext: "beach", walkingMin: 60 },
      { vehicleLongTripMin: 240, locationContext: "home_city" },
    ],
  },
  {
    id: "commuter-new-parent",
    name: "Commuter to new parent",
    nameHi: "यात्री से नए अभिभावक",
    startInterests: ["commuter"],
    days: [
      { vehicleCommuteMin: 120 },
      { vehicleCommuteMin: 120 },
      { vehicleCommuteMin: 60, schoolRunWalks: 1 },
      { vehicleCommuteMin: 30, schoolRunWalks: 2, askWhy: { parent: 1 } },
      { schoolRunWalks: 2, walkingMin: 20, taps: { hourly: 2 } },
      { schoolRunWalks: 3, askWhy: { parent: 2 } },
      { schoolRunWalks: 3, walkingMin: 30 },
      { schoolRunWalks: 3, alert: { moduleId: "precip", tier: "warning" } },
      { schoolRunWalks: 3, walkingMin: 20 },
    ],
  },
  {
    id: "runner-to-stargazer",
    name: "Runner to stargazer",
    nameHi: "धावक से तारा-प्रेमी",
    startInterests: ["fitness"],
    days: [
      { runningMin: 60 },
      { runningMin: 45, taps: { moon: 2 } },
      { runningMin: 30, taps: { moon: 4, weekly: 2 }, askWhy: { event: 1 } },
      { runningMin: 15, taps: { moon: 6, weekly: 3 }, askWhy: { event: 2 } },
      { taps: { moon: 8, weekly: 4 }, askWhy: { event: 3 } },
      { vehicleLongTripMin: 90, taps: { moon: 6, weekly: 4 } },
      { taps: { moon: 8, weekly: 5 }, askWhy: { event: 2 } },
    ],
  },
  {
    id: "runner-asthma",
    name: "Runner with asthma",
    nameHi: "अस्थमा वाला धावक",
    startInterests: ["fitness"],
    days: [
      { runningMin: 60, cyclingMin: 30 },
      { runningMin: 60 },
      { runningMin: 30, alert: { moduleId: "pollen", tier: "warning" }, taps: { pollen: 4 }, askWhy: { health: 1 } },
      { walkingMin: 20, taps: { pollen: 5, air: 4 }, askWhy: { health: 2 } },
      { alert: { moduleId: "air", tier: "critical" }, taps: { air: 6, humidity: 3 }, askWhy: { health: 3 } },
      { walkingMin: 15, taps: { air: 5, pollen: 4, pressure: 2 } },
      { taps: { air: 4, pollen: 4, dewpoint: 3 }, askWhy: { health: 2 } },
      { walkingMin: 20, taps: { air: 4, pollen: 3 } },
    ],
  },
];
