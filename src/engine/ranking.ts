import type { Interest } from "./profile";
import type { Block, Location } from "../mausam/data";
import { ALL_BLOCKS } from "../mausam/data";

/** Each module declares which interests it serves and how strongly. */
export const MODULE_AFFINITIES: Record<Block, Partial<Record<Interest, number>>> = {
  air: { health: 0.7, fitness: 0.3 },
  pollen: { health: 0.8, agri: 0.2 },
  precip: { agri: 0.5, commuter: 0.3, event: 0.2 },
  rainmap: { agri: 0.5, commuter: 0.3, traveler: 0.2 },
  sun: { fitness: 0.5, beach: 0.3, event: 0.2 },
  travel: { commuter: 0.5, traveler: 0.4, parent: 0.1 },
  packing: { traveler: 0.5, commuter: 0.3, event: 0.2 },
  wind: { fitness: 0.3, beach: 0.3, agri: 0.2, event: 0.2 },
  humidity: { health: 0.5, agri: 0.3, fitness: 0.2 },
  dewpoint: { health: 0.6, agri: 0.4 },
  pressure: { health: 0.5, fitness: 0.3, traveler: 0.2 },
  moon: { event: 0.4, beach: 0.3, agri: 0.3 },
  metrics: { fitness: 0.5, health: 0.3, event: 0.2 },
  hourly: { commuter: 0.4, fitness: 0.3, event: 0.3 },
  weekly: { event: 0.4, traveler: 0.3, agri: 0.3 },
};

/** Compute live relevance multipliers from current weather (0 to 1). */
export function computeLiveRelevance(location: Location): Record<Block, number> {
  const rel = {} as Record<Block, number>;
  for (const b of ALL_BLOCKS) rel[b] = 0.5; // baseline

  // High UV boosts sun, air
  if (location.air.uv >= 7) {
    rel.sun = 0.9;
    rel.air = 0.85;
  }

  // Rain probability boosts precip, rainmap, packing, travel
  const rainChance = location.precip.chance;
  if (rainChance >= 50) {
    rel.precip = 0.9;
    rel.rainmap = 0.85;
    rel.packing = 0.8;
    rel.travel = 0.8;
  } else if (rainChance >= 25) {
    rel.precip = 0.7;
    rel.rainmap = 0.65;
  }

  // Poor AQI boosts air, health-related
  if (location.air.aqi > 100) {
    rel.air = Math.max(rel.air, 0.9);
    rel.pollen = 0.8;
    rel.humidity = 0.7;
  }

  // High wind boosts wind module
  if (location.wind.speed >= 15) {
    rel.wind = 0.85;
  }

  // Fog boosts travel
  if (location.condition === "fog") {
    rel.travel = 0.9;
    rel.hourly = 0.8;
  }

  // High heat
  if (location.air.heat >= 35) {
    rel.humidity = Math.max(rel.humidity, 0.8);
    rel.sun = Math.max(rel.sun, 0.8);
  }

  return rel;
}

export interface AlertOverride {
  moduleId: Block;
  tier: "warning" | "critical";
}

/** Score and rank all 16 modules. Alert-pinned modules come first. */
export function rankModules(
  weights: Record<Interest, number>,
  location: Location,
  alertOverrides: AlertOverride[],
): Block[] {
  const relevance = computeLiveRelevance(location);

  const scores = new Map<Block, number>();
  for (const block of ALL_BLOCKS) {
    const affinities = MODULE_AFFINITIES[block];
    let score = 0;
    for (const [interest, affinity] of Object.entries(affinities)) {
      const w = weights[interest as Interest] ?? 0;
      score += w * affinity * relevance[block];
    }
    scores.set(block, score);
  }

  // Separate alert-pinned modules
  const criticalPinned: Block[] = [];
  const orangePinned: Block[] = [];
  const pinnedSet = new Set<Block>();

  for (const ao of alertOverrides) {
    pinnedSet.add(ao.moduleId);
    if (ao.tier === "critical") {
      criticalPinned.push(ao.moduleId);
    } else {
      orangePinned.push(ao.moduleId);
    }
  }

  const rest = ALL_BLOCKS
    .filter((b) => !pinnedSet.has(b))
    .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));

  return [...criticalPinned, ...orangePinned, ...rest];
}

/** Get the score breakdown for display in the demo panel. */
export function getModuleScores(
  weights: Record<Interest, number>,
  location: Location,
): { block: Block; score: number }[] {
  const relevance = computeLiveRelevance(location);
  return ALL_BLOCKS.map((block) => {
    const affinities = MODULE_AFFINITIES[block];
    let score = 0;
    for (const [interest, affinity] of Object.entries(affinities)) {
      score += (weights[interest as Interest] ?? 0) * affinity * relevance[block];
    }
    return { block, score };
  }).sort((a, b) => b.score - a.score);
}
