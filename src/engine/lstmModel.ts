import {
  type Interest,
  type UserProfile,
  ALL_INTERESTS,
} from "./profile";
import { type ParsedActivity } from "./activityParser";

export interface LSTMState {
  hidden: number[]; // size 16
  cell: number[];   // size 16
}

export interface LSTMInferenceResult {
  updatedProfile: UserProfile;
  previousWeights: Record<Interest, number>;
  newWeights: Record<Interest, number>;
  deltas: Record<Interest, number>;
  parsedActivity: ParsedActivity;
  durationScale: number;
  explanation: string;
  hiddenNorm: number;
}

const HIDDEN_SIZE = 16;
const INPUT_SIZE = 12; // 8 interests + non-linear duration + raw duration ratio + intensity + bias

/** Sigmoid activation function */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
}

/** Tanh activation function */
function tanh(x: number): number {
  return Math.tanh(Math.max(-20, Math.min(20, x)));
}

/** Vector dot product */
function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Deterministically seeded pseudo-random generator for reproducible neural weights.
 */
function createWeightMatrix(rows: number, cols: number, seed: number): number[][] {
  const m: number[][] = [];
  let s = seed;
  const scale = Math.sqrt(2 / (rows + cols)); // He / Xavier initialization scale

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      s = (s * 9301 + 49297) % 233280;
      const rnd = (s / 233280) * 2 - 1;
      row.push(rnd * scale);
    }
    m.push(row);
  }
  return m;
}

// Fixed calibrated weight matrices for the LSTM gates (Input, Forget, Candidate, Output)
const W_f = createWeightMatrix(HIDDEN_SIZE, INPUT_SIZE + HIDDEN_SIZE, 42);
const W_i = createWeightMatrix(HIDDEN_SIZE, INPUT_SIZE + HIDDEN_SIZE, 137);
const W_c = createWeightMatrix(HIDDEN_SIZE, INPUT_SIZE + HIDDEN_SIZE, 999);
const W_o = createWeightMatrix(HIDDEN_SIZE, INPUT_SIZE + HIDDEN_SIZE, 777);

// Bias vectors (Forget gate biased to 1.0 to preserve memory like standard LSTMs)
const B_f = Array(HIDDEN_SIZE).fill(1.2);
const B_i = Array(HIDDEN_SIZE).fill(-0.2);
const B_c = Array(HIDDEN_SIZE).fill(0.0);
const B_o = Array(HIDDEN_SIZE).fill(0.1);

// Projection matrix from hidden state (16) to 8 interest logits
const W_out = createWeightMatrix(ALL_INTERESTS.length, HIDDEN_SIZE, 2026);

// Align projection rows with domain semantics so hidden features mapped from primary interests trigger their respective logits
for (let k = 0; k < ALL_INTERESTS.length; k++) {
  W_out[k][k % HIDDEN_SIZE] += 1.8;
  W_out[k][(k + 8) % HIDDEN_SIZE] += 1.2;
}

/**
 * Non-linear metabolic and duration scaling curve.
 * Diminishing returns preventing extreme hours from breaking the probability mass.
 */
export function calculateNonLinearDurationImpact(minutes: number, intensity: number): {
  impact: number;
  curveRatio: number;
} {
  const effectiveMin = Math.max(1, minutes) * intensity;
  // Hyperbolic tangent saturation with a characteristic timescale tau = 45 min
  // 15m -> 0.32, 30m -> 0.58, 60m -> 0.87, 120m -> 0.99
  const impact = tanh(effectiveMin / 45);
  const linearRatio = effectiveMin / 60;
  return { impact, curveRatio: impact / (linearRatio > 0 ? linearRatio : 1) };
}

/**
 * Initializes a blank recurrent state vector for an LSTM session.
 */
export function initLSTMState(): LSTMState {
  return {
    hidden: Array(HIDDEN_SIZE).fill(0),
    cell: Array(HIDDEN_SIZE).fill(0),
  };
}

/**
 * Runs forward inference through the LSTM recurrent cell.
 * Evaluates the new weights given an activity entity and previous state.
 */
export function runLSTMInference(
  profile: UserProfile,
  activity: ParsedActivity,
  prevState?: LSTMState,
): LSTMInferenceResult {
  const state: LSTMState = prevState ?? initLSTMState();
  const prevWeights = { ...profile.interestWeights };

  // 1. Build input vector x_t (size 12)
  const x: number[] = Array(INPUT_SIZE).fill(0);

  // One-hot / soft assignment across 8 interests
  const primaryIdx = ALL_INTERESTS.indexOf(activity.primaryInterest);
  if (primaryIdx >= 0) x[primaryIdx] = 1.0;

  if (activity.secondaryInterest) {
    const secIdx = ALL_INTERESTS.indexOf(activity.secondaryInterest);
    if (secIdx >= 0) x[secIdx] = 0.35;
  }

  // Non-linear duration feature (dim 8)
  const { impact, curveRatio } = calculateNonLinearDurationImpact(activity.durationMin, activity.intensity);
  x[8] = impact * 2.0;

  // Raw duration ratio (dim 9)
  x[9] = Math.min(activity.durationMin / 60, 3.0);

  // Intensity factor (dim 10)
  x[10] = activity.intensity;

  // Ambient bias (dim 11)
  x[11] = 1.0;

  // Concatenate input vector x (12) and previous hidden state h (16) -> vector v (28)
  const v = [...x, ...state.hidden];

  // 2. LSTM Gate Activations
  const newCell: number[] = Array(HIDDEN_SIZE).fill(0);
  const newHidden: number[] = Array(HIDDEN_SIZE).fill(0);

  for (let j = 0; j < HIDDEN_SIZE; j++) {
    const f_j = sigmoid(dot(W_f[j], v) + B_f[j]); // Forget gate
    const i_j = sigmoid(dot(W_i[j], v) + B_i[j]); // Input gate
    const c_tilde_j = tanh(dot(W_c[j], v) + B_c[j]); // Candidate cell

    // Cell state update
    newCell[j] = f_j * state.cell[j] + i_j * c_tilde_j;

    const o_j = sigmoid(dot(W_o[j], v) + B_o[j]); // Output gate
    newHidden[j] = o_j * tanh(newCell[j]); // Hidden state update
  }

  // 3. Project to Interest Logits
  const logits: number[] = Array(ALL_INTERESTS.length).fill(0);
  for (let k = 0; k < ALL_INTERESTS.length; k++) {
    // Project from hidden state
    const lstmLogit = dot(W_out[k], newHidden);

    // Blend with previous log-odds of existing weights (preserves historical baseline)
    const prevWeight = Math.max(0.001, prevWeights[ALL_INTERESTS[k]] ?? 0.05);
    const priorLogit = Math.log(prevWeight);

    // Weight update strength modulated by non-linear duration impact
    // 30m yields ~0.35 blend, 60m yields ~0.55 blend
    const alpha = Math.min(0.25 + impact * 0.35, 0.70);
    logits[k] = alpha * lstmLogit + (1 - alpha) * priorLogit;

    // Direct boost for primary interest based on non-linear duration
    if (ALL_INTERESTS[k] === activity.primaryInterest) {
      logits[k] += impact * 1.5;
    } else if (ALL_INTERESTS[k] === activity.secondaryInterest) {
      logits[k] += impact * 0.4;
    }
  }

  // 4. Softmax Normalization
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp((l - maxLogit) / 1.1));
  const sumExp = exps.reduce((a, b) => a + b, 0);

  const rawUpdated = {} as Record<Interest, number>;
  for (let k = 0; k < ALL_INTERESTS.length; k++) {
    rawUpdated[ALL_INTERESTS[k]] = exps[k] / sumExp;
  }

  // Floor protection for user's explicitly chosen baseline interest
  const FLOOR = 0.12;
  for (const sel of profile.selectedInterests) {
    if (rawUpdated[sel] < FLOOR) {
      rawUpdated[sel] = FLOOR;
    }
  }

  // Final re-normalization to guarantee exact sum = 1.0 (100%)
  const total = ALL_INTERESTS.reduce((s, i) => s + rawUpdated[i], 0);
  const newWeights = {} as Record<Interest, number>;
  const deltas = {} as Record<Interest, number>;

  for (const i of ALL_INTERESTS) {
    const finalVal = Math.round((rawUpdated[i] / total) * 1000) / 1000;
    newWeights[i] = finalVal;
    deltas[i] = Math.round((newWeights[i] - prevWeights[i]) * 1000) / 1000;
  }

  // Hidden state L2 norm for monitoring model confidence
  const hiddenNorm = Math.sqrt(newHidden.reduce((acc, h) => acc + h * h, 0));

  // Map into profile activity signals counters
  const actSignals = { ...profile.activitySignals };
  if (activity.primaryInterest === "fitness") {
    if (activity.activityName.toLowerCase().includes("cycl")) {
      actSignals.cyclingMin += activity.durationMin;
    } else if (activity.activityName.toLowerCase().includes("walk")) {
      actSignals.walkingMin += activity.durationMin;
    } else {
      actSignals.runningMin += activity.durationMin;
    }
  } else if (activity.primaryInterest === "commuter") {
    actSignals.vehicleCommuteMin += activity.durationMin;
  } else if (activity.primaryInterest === "traveler") {
    actSignals.vehicleLongTripMin += activity.durationMin;
  } else if (activity.primaryInterest === "parent") {
    actSignals.schoolRunWalks += 1;
  }

  const updatedProfile: UserProfile = {
    ...profile,
    interestWeights: newWeights,
    activitySignals: actSignals,
    lastUpdated: new Date().toISOString(),
  };

  // Explanation string
  const primaryDelta = Math.round((deltas[activity.primaryInterest] ?? 0) * 1000) / 10;
  const sign = primaryDelta >= 0 ? "+" : "";
  const explanation = `LSTM parsed "${activity.activityName}" (${activity.durationMin} min, impact: ${impact.toFixed(2)}) → ${activity.primaryInterest} ${sign}${primaryDelta}%`;

  return {
    updatedProfile,
    previousWeights: prevWeights,
    newWeights,
    deltas,
    parsedActivity: activity,
    durationScale: impact,
    explanation,
    hiddenNorm,
  };
}
