// Types for query.mjs: the tracker's read API, version 2. Adding a field
// keeps the version; removing or retyping one raises it.

export type Status =
  "Proposed" | "Planned" | "In progress" | "Done" | "Dropped";
export type ItemKind = "work" | "decision" | "external";

export interface WorkItem {
  id: string;
  title: string;
  kind: ItemKind;
  status: Status;
  project?: string;
  needs: string[];
  /** Who holds it, while In progress. */
  claimed?: string;
  /** Why it was dropped, or the like. */
  reason?: string;
  /** Decisions: who answers ("owner"). */
  decided_by?: string;
  /** External waits: who we wait on. */
  party?: string;
  created?: string;
  /** The tokens it is expected to take (human-in-the-lead's estimate_tokens). */
  estimate_tokens?: number;
  /** Tokens actually spent on it, from human-in-the-lead's ledger; absent until it records them. */
  tokens_spent?: number;
  /** On a release item only: the version it makes, such as 2.0.0-alpha.1. */
  release?: string;
  /** Repository-relative. */
  path: string;
  /** Planned, with every need Done. */
  ready: boolean;
  /** Proposed or Planned, with a need not Done. */
  blocked: boolean;
  open_needs: string[];
  /** Open items that need this one. */
  needed_by: string[];
  /** Milestones whose constraints name it. */
  milestones: string[];
}

/** A milestone (human-in-the-lead's format): a checkable future state. */
export interface WorkMilestone {
  id: string;
  title: string;
  kind: "capability" | "learning";
  status: Status;
  project?: string;
  /** Its own, or its project's. */
  initiative?: string;
  /** One sentence: the state for users, or the question answered. */
  outcome?: string;
  done_when: Array<{ clause: string; text: string }>;
  /** Items (or milestones) without which a clause can't be true; "c?" until shaped. */
  constraints: Array<{ id: string; clause: string }>;
  serves: Array<{ id: string; value: number; confidence: number }>;
  check?: string;
  check_results: string[];
  /** The most tokens it should take, set at shaping. */
  appetite_tokens?: number;
  path: string;
  /** Its item constraints done, of all. */
  progress: { done: number; total: number };
  /** Every constraint done and the check not yet passed. */
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

export interface WorkContainer {
  id: string;
  title: string;
  status: Status;
  lead?: string;
  plan?: string;
  /** Projects: the initiative they belong to. */
  initiative?: string;
  reason?: string;
  path: string;
  progress: WorkProgress;
}

export interface WorkSnapshot {
  api_version: 2;
  /** Where it was read from. */
  source: string;
  branch?: string;
  commit?: string;
  generated: string;
  items: WorkItem[];
  milestones: WorkMilestone[];
  projects: WorkContainer[];
  initiatives: WorkContainer[];
  /** `from` waits on `to` through `count` open needs. */
  project_deps: Array<{ from: string; to: string; count: number }>;
  /** What `views.mjs check` reports. */
  problems: string[];
  /** Work in flight in other worktrees and on other local branches. */
  elsewhere: WorkElsewhere[];
  /** Every committed status change on this branch, oldest first. */
  history: WorkEvent[];
}

export interface WorkEvent {
  id: string;
  /** The commit's date (ISO 8601). */
  at: string;
  status: Status;
}

export interface WorkElsewhere {
  id: string;
  claimed?: string;
  /** The branch. */
  where: string;
  /** Checked out in a worktree on this machine. */
  worktree: boolean;
}

export interface WorkItemText {
  api_version: 2;
  id: string;
  path: string;
  /** Markdown, without the frontmatter. */
  body: string;
}

export interface WorkFound {
  api_version: 2;
  q: string;
  matches: Array<{
    id: string;
    /** Where every word was found: the ID and title, the metadata, or only the text. */
    where: "title" | "metadata" | "text";
    /** The text around the first word, when it isn't in the title. */
    snippet?: string;
  }>;
}

export const API_VERSION: 2;
export function findItems(root: string, q: string, limit?: number): WorkFound;
export function queryWork(
  root: string,
  options?: { elsewhere?: WorkElsewhere[]; history?: WorkEvent[] },
): WorkSnapshot;
export function statusHistory(root: string): WorkEvent[];
export function claimsElsewhere(root: string): WorkElsewhere[];
export function showItem(root: string, id: string): WorkItemText | undefined;
