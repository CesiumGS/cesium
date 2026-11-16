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
export class HitldUnavailable extends Error {}
export function hitldPath(): string;
export function checkVersion<T extends { api_version?: unknown }>(answer: T): T;
export function findItems(
  root: string,
  q: string,
  limit?: number,
): Promise<WorkFound>;
export function queryWork(
  root: string,
  options?: { elsewhere?: WorkElsewhere[]; history?: WorkEvent[] },
): Promise<WorkSnapshot>;
export function stateHistory(root: string): WorkEvent[];
export function claimsElsewhere(root: string): Promise<WorkElsewhere[]>;
export function showItem(
  root: string,
  id: string,
): Promise<WorkItemText | undefined>;
