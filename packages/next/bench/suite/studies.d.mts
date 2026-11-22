// Types for studies.mjs (the tests, the endpoint and the Studies page).
export type StudyKind = "comparison" | "sweep" | "feasibility" | "calibration";
export type StudyStatus = "open" | "concluded" | "abandoned";
export type StudyOutcome = "supported" | "refuted" | "inconclusive";
/** Front matter as written: strings, and lists of strings. */
export type StudyFields = Record<string, string | string[]>;
export interface ParsedStudy {
  fm: StudyFields;
  sections: Record<string, string>;
  errors: string[];
}
export interface StudyRow {
  id: string;
  title: string;
  kind: StudyKind | null;
  item: string | null;
  status: StudyStatus | null;
  created: string | null;
  instruments: string[];
  question: string;
  outcome: StudyOutcome | null;
  decision: string | null;
  holds_for: string[];
  branch: string;
  path: string;
  uncommitted: boolean;
  valid: boolean;
  readOnly?: boolean;
}
export interface StudyWrite {
  id: string;
  path: string;
  file: string;
  warnings: string[];
  [key: string]: unknown;
}
export const STUDIES_PATH: string;
export const STUDY_ID: RegExp;
export const MAX_ID_LENGTH: number;
export const KINDS: StudyKind[];
export const STATUSES: StudyStatus[];
export const OUTCOMES: StudyOutcome[];
export const STOPPING: string[];
export const ORDERS: string[];
export const SECTIONS: string[];
export const KEYS: Array<[string, string, string?]>;
export const KIND_FIELDS: Record<
  StudyKind,
  { required: string[]; optional: string[] }
>;
export const FIELD_HELP: Record<string, string>;
export function parseStudy(text: string): ParsedStudy;
export function serializeStudy(study: {
  fm: StudyFields;
  sections: Record<string, string>;
}): string;
export function parsePrimary(
  spec: string,
): { metric: string; direction: "lower" | "higher"; effect: number } | string;
export function parseBound(
  spec: string,
  options?: { relative?: boolean },
):
  | { metric: string; op: "<=" | ">="; value: number }
  | { metric: string; direction: "lower" | "higher"; margin: number }
  | string;
export function parseHealth(
  spec: string,
): { key: string; value: string | number } | string;
export function parsePrior(spec: string): { mean: number; sd: number } | string;
export function effectGain(primary: {
  direction: "lower" | "higher";
  effect: number;
}): number;
export function plannedRuns(fm: StudyFields): number | undefined;
export function missingFields(fm: StudyFields): string[];
export function checkStudy(
  study: {
    fm: StudyFields;
    sections: Record<string, string>;
    errors?: string[];
  },
  options?: { file?: string },
): { errors: string[]; warnings: string[] };
export function repoRoot(options?: {
  env?: Record<string, string | undefined>;
  cwd?: string;
}): string;
export function studiesDirectory(root: string): string;
export function studyPath(id: string): string;
export function studyFile(directory: string, id: string): string | undefined;
export function currentBranch(root: string): string;
export function localBranches(root: string): string[];
export function localBranch(root: string, name: unknown): string;
export function branchesWith(root: string, id: string): string[];
export function readStudy(
  root: string,
  id: string,
  options?: { branch?: string },
): ParsedStudy & { text: string; path: string; branch: string };
export function listStudies(
  root: string,
  options?: {
    allBranches?: boolean;
    item?: string;
    status?: string;
    kind?: string;
  },
): StudyRow[];
export function studyRuns(
  root: string,
): Map<string, Array<{ study: string; branch: string }>>;
export function planPrune(
  candidates: string[],
  options?: {
    cited?: Map<string, Array<{ study: string; branch: string }>>;
    pinned?: Set<string>;
  },
): { prune: string[]; kept: Array<{ id: string; reason: string }> };
export function commitReminder(id: string): string;
export function today(date?: Date): string;
export function writeStudy(
  root: string,
  study: { fm: StudyFields; sections: Record<string, string> },
): { file: string; text: string; warnings: string[] };
export function createStudy(
  root: string,
  slug: string,
  options: Record<string, string | string[] | boolean | undefined>,
  config?: { date?: string },
): StudyWrite;
export function noteStudy(
  root: string,
  id: string,
  text: string,
  options?: { date?: string },
): StudyWrite;
export function attachRuns(
  root: string,
  id: string,
  runs: string[],
): StudyWrite;
export function abandonStudy(
  root: string,
  id: string,
  reason: string,
  options?: { date?: string },
): StudyWrite;
export function reopenStudy(
  root: string,
  id: string,
  reason: string,
  options?: { date?: string },
): StudyWrite;
export function concludeStudy(
  root: string,
  id: string,
  verdict: {
    computed: StudyOutcome;
    outcome?: string;
    override?: string;
    reasoning?: string;
    decision?: string;
    cites?: Array<{ run: string; showed: string }>;
    holdsFor?: string[];
    readout?: string[];
  },
): StudyWrite;
export function checkAll(
  root: string,
): Array<{ id: string; path: string; errors: string[]; warnings: string[] }>;
