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
];
