// Types for workBoard.mjs: the board's snapshot, built from
// human-in-the-lead's read API at version 3, in its names.

/** Human-in-the-lead's lifecycle: only a work item is ever in progress. */
export type State = "proposed" | "planned" | "in-progress" | "done" | "dropped";
export type ItemKind = "work" | "decision" | "external";

export interface WorkItem {
  id: string;
  title: string;
  kind: ItemKind;
  state: State;
  /** Its project (the read API's `parent`). */
  project?: string;
  needs: string[];
  /** Who holds it, while in progress. */
  claimed_by?: string;
  /** Why it was dropped, or the like. */
  reason?: string;
  /** Decisions: who answers ("owner"). */
  decider?: string;
  /** External items: who we wait on. */
  waiting_on?: string;
  created?: string;
  /** The tokens it is expected to take (human-in-the-lead's estimate_tokens). */
  estimate_tokens?: number;
  /** Tokens actually spent on it, from human-in-the-lead's ledger; absent until it records them. */
  tokens_spent?: number;
  /** On a release item only: the version it makes, such as 2.0.0-alpha.1. */
  release?: string;
  /** Repository-relative. */
  path: string;
  /** hitld's ready: planned, with every need done. */
  ready: boolean;
  /** Planned or proposed, with a need not done. */
  blocked: boolean;
  open_needs: string[];
  /** Open items that need this one. */
  needed_by: string[];
  /** Milestones whose constraints name it. */
  milestones: string[];
  /** Proposals only: its text (body), which holds its header (CS-686). */
  text?: string;
}

/** A milestone under a project: a checkable future state. */
export interface WorkMilestone {
  id: string;
  title: string;
  kind: "milestone";
  /** A learning milestone: its check is a study. */
  learning: boolean;
  state: State;
  project?: string;
  /** The long outcome whose constraints name it. */
  long_outcome?: string;
  /** One sentence: the state for users, or the question answered. */
  outcome?: string;
  done_when: Array<{ clause: string; text: string }>;
  /** Items (or milestones) without which a clause can't be true; "c?" until shaped. */
  constraints: Array<{ id: string; clause: string }>;
  contributions: Array<{ id: string; value: number; confidence: number }>;
  check?: string;
  check_results: string[];
  /** The most tokens it should take, set at shaping. */
  appetite_tokens?: number;
  path: string;
  /** Its item constraints done, of all. */
  progress: { done: number; total: number };
  /** Every item constraint done and the check not yet passed. */
  check_due: boolean;
  /** Proposals only: its text (body), which holds its header (CS-686). */
  text?: string;
  /** What shaping still owes it: "outcome", "clauses", "check", "links". */
  to_shape: string[];
}

export interface WorkProgress {
  total: number;
  done: number;
  dropped: number;
  in_progress: number;
  ready: number;
  blocked: number;
  proposed: number;
}

/** A project, or a long outcome (a milestone with no parent). */
export interface WorkContainer {
  id: string;
  title: string;
  state: State;
  owner?: string;
  plan?: string;
  /** Projects: the long outcome their milestones serve, if any. */
  long_outcome?: string;
  reason?: string;
  path: string;
  progress: WorkProgress;
}

export interface WorkSnapshot {
  /** Human-in-the-lead's read API version it was built from. */
  api_version: 3;
  /** Where it was read from. */
  source: string;
  hitld_version?: string;
  branch?: string;
  commit?: string;
  generated: string;
  items: WorkItem[];
  milestones: WorkMilestone[];
  projects: WorkContainer[];
  long_outcomes: WorkContainer[];
  /** `from` waits on `to` through `count` open needs. */
  project_deps: Array<{ from: string; to: string; count: number }>;
  /** What `hitld work check` reports. */
  problems: string[];
  /** Work in flight on other branches and in fetched bundles. */
  elsewhere: WorkElsewhere[];
  /** Every committed state change on this branch, oldest first. */
  history: WorkEvent[];
  /** The live run, from hitld's records and git; absent when not read. */
  live?: WorkLive;
  /**
   * The sources this answer goes without because they are still being
   * read (the dev server's first request); the dev server says
   * `work:changed` when they are in. Absent when every source was read.
   */
  pending?: string[];
}

/** The rail's count and the palette's list (`/work-api/count.json`). */
export interface WorkCount {
  api_version: 3;
  /** Open owner decisions whose needs are all done: the rail's count. */
  owner_decisions: number;
  /** Every item, by number. */
  items: Array<{ id: string; title: string; kind: ItemKind }>;
}

/**
 * Where one live figure was read from and when, or why it couldn't be.
 * `read_at` is when it was read, or when the dev server last found what it
 * reads unchanged (boardReader keeps a read while its key holds).
 */
export type WorkSource<T> = { source: string; read_at: string } & (
  ({ ok: true } & T) | ({ ok: false; why: string } & Partial<T>)
);

export interface WorkLease {
  /** The orchestrator session holding the lease. */
  session: string;
  renewed_at: string;
  expired: boolean;
  /** Expired or released: a successor may take the run. */
  free: boolean;
  released_at?: string;
}

/** A dispatch with no terminal event in hitld's ledger. */
export interface WorkDispatch {
  dispatch: string;
  item: string;
  role?: string;
  tier?: number;
  mode?: "headless" | "interactive";
  branch?: string;
  /** When it was dispatched (ISO 8601). */
  started_at: string;
}

export interface WorkClaim {
  id: string;
  /** The claim's `claimed_by`; absent when the branch's copy names none. */
  claimed_by?: string;
  /** The branch. */
  where: string;
  worktree: boolean;
  /** On the branch the board reads. */
  here: boolean;
  /** The claim commit's date (ISO 8601), when hitld finds it. */
  at?: string;
  source?: "local" | "remote" | "bundle";
}

/** Where the merge queue has a finished branch's item. */
export type WorkQueueState =
  "held" | "checking" | "queued" | "rejected" | "none";

/** An item done on an hitld/* branch and not on the main branch. */
export interface WorkUnmerged {
  id: string;
  /** The close commit's date (ISO 8601), the newest when several. */
  closed_at: string;
  /** The branches that close it, merge-check branches apart. */
  branches: string[];
  queue: WorkQueueState;
  /** The merge-check branch it is checked on, if any. */
  check_branch?: string;
}

export interface WorkLive {
  read_at: string;
  main_branch: string;
  run: WorkSource<{
    /** Absent when hitld has no run state. */
    run?: { id: string; started_at: string };
    lease?: WorkLease;
    in_flight: number;
    waiting_to_merge: number;
  }>;
  ledger: WorkSource<{
    /** How many events the ledger holds. */
    events: number;
    /** Lines hitld couldn't read. */
    problems: number;
    dispatches: WorkDispatch[];
  }>;
  claims: WorkSource<{
    list: WorkClaim[];
    /** On branches main has moved past: not work in progress. */
    stale: WorkClaim[];
  }>;
  unmerged: WorkSource<{ list: WorkUnmerged[] }>;
}

export interface WorkEvent {
  id: string;
  /** The commit's date (ISO 8601). */
  at: string;
  state: State;
}

export interface WorkElsewhere {
  id: string;
  claimed_by?: string;
  /** The branch. */
  where: string;
  /** Checked out in a worktree on this machine. */
  worktree: boolean;
  /** The claim commit's date (ISO 8601), when hitld finds it. */
  at?: string;
}

export interface WorkItemText {
  api_version: 3;
  id: string;
  path: string;
  /** Markdown, without the front matter. */
  body: string;
}

export interface WorkFound {
  api_version: 3;
  q: string;
  matches: Array<{
    id: string;
    /** Where every word was found: the ID and title, the metadata, or only the text. */
    where: "title" | "metadata" | "text";
    /** The text around the first word, when it isn't in the title. */
    snippet?: string;
  }>;
}

export const API_VERSION: 3;
export type UnavailableReason = "missing" | "version" | "failed";
export class HitldUnavailable extends Error {
  constructor(reason: UnavailableReason, message: string);
  reason: UnavailableReason;
}
export const UNAVAILABLE_TEXT: Record<UnavailableReason, string>;
export function hitldPath(): string;
export function checkVersion<T extends { api_version?: unknown }>(answer: T): T;
export function findItems(
  root: string,
  q: string,
  limit?: number,
): Promise<WorkFound>;
export function queryWork(
  root: string,
  options?: {
    elsewhere?: WorkElsewhere[];
    history?: WorkEvent[];
    live?: WorkLive;
  },
): Promise<WorkSnapshot>;
export function stateHistory(root: string): WorkEvent[];
export function claimsElsewhere(root: string): Promise<WorkElsewhere[]>;
export function readClaims(
  root: string,
): Promise<{ list: WorkClaim[]; stale: WorkClaim[] }>;
export function elsewhereOf(claims: { list: WorkClaim[] }): WorkElsewhere[];
export function mainBranchOf(root: string): string;
export function queueOf(
  events: ReadonlyArray<Record<string, unknown>>,
): Map<string, { state: "queued" | "rejected"; at: string }>;
export function readyOf(
  all: { entities: ReadonlyArray<Record<string, unknown>> },
  claimed: ReadonlySet<string>,
): Set<string>;
export function claimedOf(claims: {
  list: WorkClaim[];
  stale: WorkClaim[];
}): Set<string>;
export function readEntities(root: string): Promise<{
  api_version: number;
  entities: Array<Record<string, unknown>>;
}>;
export function unmergedOf(
  root: string,
  main: string,
  queue?: Map<string, { state: "queued" | "rejected"; at: string }>,
): WorkUnmerged[];
export const LIVE_UNREAD: Record<
  "run" | "ledger" | "empty" | "claims" | "git" | "reading",
  string
>;
type Queue = Map<string, { state: "queued" | "rejected"; at: string }>;
export function foldQueue(
  queue: Queue,
  events: ReadonlyArray<Record<string, unknown>>,
): Queue;
export const LEDGER_RECENT: number;
export const FIRST_WAIT_MS: number;
/** A ledger fold to fold the next read onto. */
export interface LedgerFold {
  total: number;
  lastId?: string;
  queue: Queue;
  /** How many events this read folded in. */
  read: number;
}
export function liveLedger(
  root: string,
  store?: string,
  prev?: LedgerFold,
): Promise<{ source: WorkLive["ledger"]; fold?: LedgerFold }>;
export function countOf(all: {
  entities: ReadonlyArray<Record<string, unknown>>;
}): WorkCount;
export function keptRead<T>(options: {
  key: () => string;
  read: (kept?: T) => Promise<T>;
  maxAgeMs?: number;
  wait?: boolean;
  same?: (a: T, b: T) => boolean;
  onChange?: () => void;
}): {
  get(): { value: T; fresh: boolean } | { promise: Promise<T> };
};
export interface BoardReader {
  query(options?: { waitMs?: number }): Promise<WorkSnapshot>;
  count(): Promise<WorkCount>;
  changed(file: string): void;
}
export function boardReader(
  root: string,
  options?: { store?: string; onChange?: () => void },
): BoardReader;
export function readLive(
  root: string,
  options?: { store?: string },
): Promise<WorkLive>;
export function showItem(
  root: string,
  id: string,
): Promise<WorkItemText | undefined>;

// What changed since a point (CS-747; `/work-api/changes.json`).

/** The front matter keys the Since-you-last-looked view reads, and its text's lead. */
export interface ChangeFields {
  id: string;
  title?: string;
  kind?: string;
  state?: string;
  project?: string;
  needs?: string[];
  /** A milestone's constraints, as written: "CS-744 c?". */
  constraints?: string[];
  decider?: string;
  waiting_on?: string;
  answer?: string;
  answered_at?: string;
  answered_by?: string;
  rationale?: string;
  reason?: string;
  release?: string;
  /** The first paragraph of its text, at most 400 characters. */
  lead?: string;
  /** A decision answered with one letter: that option's line. */
  answer_option?: string;
  /** A decision's Answer section, when it says more than its placeholder. */
  answer_note?: string;
}
export interface ChangeEntity {
  id: string;
  path: string;
  /** Absent when the file didn't exist at the point. */
  before?: ChangeFields;
  /** Absent when the file is gone at HEAD. */
  after?: ChangeFields;
}
export interface ChangeCommitRef {
  sha: string;
  short: string;
  /** Its committer date, ISO 8601. */
  at: string;
  subject: string;
}
export interface ChangeCommit extends ChangeCommitRef {
  /** 2 or more for a merge, read against its first parent. */
  parents: number;
  /** Its message after the subject, without the trailers. */
  body: string;
  /** Its Work-Item trailer. */
  work_item?: string;
  /** Per tracker file, the front-matter keys its diff sets. */
  files: Array<{ id: string; keys: string[] }>;
}
export interface ChangesAnswer {
  api_version: number;
  point: { commit: string } | { date: string };
  base: ChangeCommitRef;
  head: ChangeCommitRef;
  /** Tracker files at the point: 0 when the tracker began after it. */
  base_files: number;
  /** Files whose fields differ, and every release item, both sides. */
  entities: ChangeEntity[];
  /** Mainline commits that change the tracker, newest first. */
  commits: ChangeCommit[];
  /** Commits carrying each Work-Item trailer, merged branches' included. */
  work_items: Record<string, number>;
  /** More commits than CHANGES_MAX_COMMITS: the oldest weren't read. */
  truncated: boolean;
}
export type ChangesPoint = { commit: string } | { date: string };
export type GitRun = (
  root: string,
  args: string[],
  input?: string,
) => Promise<{ code: number | null; stdout: string }>;
export const COMMIT_FORM: RegExp;
export const DATE_FORM: RegExp;
export const CHANGES_MAX_COMMITS: number;
export const CHANGES_REFUSED: Record<
  "form" | "commit" | "ancestor" | "date",
  string
>;
export class ChangesRefused extends Error {
  reason: "form" | "commit" | "ancestor" | "date";
}
export const gitRun: GitRun;
export function frontMatterOf(text: string): ChangeFields | undefined;
export function readChanges(
  root: string,
  point: ChangesPoint,
  options?: { run?: GitRun },
): Promise<ChangesAnswer>;
export function changesReader(
  root: string,
  options?: { run?: GitRun },
): { read(point: ChangesPoint): Promise<ChangesAnswer> };

// ------------- How well the system and the owner work together (CS-752)

/** One ledger event, cut to the fields the Flow view reads. */
export interface FlowEvent {
  event: string;
  at: string;
  run?: string;
  item?: string;
  decision?: string;
  dispatch?: string;
  tier?: number;
  model?: string;
  estimate_tokens?: number;
  tokens?: number;
  duration_ms?: number;
  result?: string;
  commit?: string;
  /** sent: "now" or "digest". */
  delivery?: string;
  /** answered: "default" when no one answered. */
  via?: string;
  /** lease-released: "handover", "expired" and the like. */
  reason?: string;
  step?: string;
  /** run-started: its scope's executor cap. */
  max_executors?: number;
}

/** An item's fields for the Flow view (flowFieldsOf). */
export interface FlowEntity {
  id: string;
  title: string;
  kind: ItemKind;
  state: State;
  project?: string;
  created?: string;
  decider?: string;
  answer?: string;
  answered_at?: string;
  answered_by?: string;
  answered_via?: string;
  claimed_by?: string;
  estimate_tokens?: number;
  release?: string;
  /** Decisions: each option's letter and label. */
  options?: Array<{ letter: string; label: string }>;
  /** Decisions: the text after "Recommended:". */
  recommended?: string;
  /** Decisions: the door, from the text's "Reversibility:" line. */
  door?: "one-way" | "two-way" | "mixed";
  /** Proposals: the items its "Source:" line names (a report, a review). */
  follows?: string[];
}

/** A commit that changes an item file, with both of its dates. */
export interface FlowCommit {
  short: string;
  /** When it was written (the author date). */
  authored: string;
  /** When it landed on this branch (the committer date). */
  committed: string;
  subject: string;
  work_item?: string;
  files: Array<{ id: string; added: boolean; state?: State }>;
}

export interface FlowBandSetting {
  value: number;
  source: "policy" | "hitld default";
}

export interface FlowAnswer {
  api_version: 3;
  read_at: string;
  head: ChangeCommitRef;
  entities: FlowEntity[];
  /** The tracker's history on HEAD, oldest first. */
  history: {
    ok: boolean;
    why?: string;
    commits: FlowCommit[];
    truncated: boolean;
  };
  reverts: Array<{
    short: string;
    at: string;
    subject: string;
    work_item?: string;
  }>;
  ledger: { ok: true; events: FlowEvent[] } | { ok: false; why: string };
  policy: Record<
    | "decisions_per_digest_max"
    | "interrupts_per_day_max"
    | "silence_max_hours"
    | "lease_expiry_seconds"
    | "rubber_stamp_seconds",
    FlowBandSetting
  >;
}
export type FlowLedgerRead = (root: string) => Promise<FlowAnswer["ledger"]>;
export const FLOW_MAX_COMMITS: number;
export const FLOW_UNREAD: Record<"ledger" | "empty" | "git", string>;
export const FLOW_POLICY: Record<string, [string, number]>;
export function flowEventOf(e: unknown): FlowEvent | undefined;
export function flowFieldsOf(text: string): FlowEntity | undefined;
export function flowPolicyOf(policy: unknown): FlowAnswer["policy"];
export function flowLedger(
  root: string,
  store?: string,
): Promise<FlowAnswer["ledger"]>;
export function readFlow(
  root: string,
  options?: { run?: GitRun; ledger?: FlowLedgerRead },
): Promise<FlowAnswer>;
export function flowReader(
  root: string,
  options?: { run?: GitRun; ledger?: FlowLedgerRead; ledgerKey?: () => string },
): { read(): Promise<FlowAnswer> };
