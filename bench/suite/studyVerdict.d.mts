// Types for studyVerdict.mjs (the tests, the endpoint and the Studies page).
import type { StudyFields, StudyOutcome } from "./studies.mjs";
export interface MachineState {
  power?: "ac" | "battery";
  battery?: number;
  loadAverage?: number[];
  thermal?: string;
}
export interface Health {
  ok: boolean;
  reasons: string[];
  unknown: string[];
}
export interface Evidence {
  id: string;
  inStore: boolean;
  machine: string;
  kind: string | null;
  instrument: string | null;
  made: boolean;
  attached: boolean;
  cited: boolean;
  validity: "valid" | "warning" | "invalid" | "unknown";
  state?: MachineState;
  health?: Health;
  record?: unknown;
}
export interface Verdict {
  outcome: StudyOutcome;
  holds_for: string[];
  strata: Array<Record<string, unknown> & { machine: string; state: string }>;
  excluded: Array<{ id: string; machine: string; reasons: string[] }>;
  reasons: string[];
  warnings: string[];
  settle: string | null;
  readout: string[];
}
export function kindOf(
  record: Record<string, unknown>,
  images: boolean,
): string;
export function resultsDirectory(
  env?: Record<string, string | undefined>,
): string;
export function checkHealth(
  state: MachineState | undefined,
  bar: string[],
): Health;
export function loadEvidence(
  fm: StudyFields,
  options?: { results?: string; cites?: string[] },
): Evidence[];
export function pairedGains(
  summary: unknown,
  options: {
    baseline: string;
    candidate: string;
    metric: string;
    direction: string;
  },
): { scenes: Map<string, number[]>; reps: number[] };
export function computeVerdict(fm: StudyFields, evidence: Evidence[]): Verdict;
export function citationWarnings(
  cites: Array<{ run: string; showed?: string }>,
  evidence: Evidence[],
  verdict: Verdict,
): string[];
export function evidenceRows(
  evidence: Evidence[],
): Array<Omit<Evidence, "record" | "state">>;
