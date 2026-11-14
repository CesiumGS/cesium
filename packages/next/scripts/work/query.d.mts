// Types for query.mjs: the tracker's read API, version 1. Adding a field
// keeps the version; removing or retyping one raises it.

export type Status =
  "Proposed" | "Planned" | "In progress" | "Done" | "Dropped";
export type ItemKind = "work" | "decision" | "external";

export interface WorkItem {
  id: string;
  title: string;
  kind: ItemKind;
  status: Status;
  priority?: "urgent" | "high" | "medium" | "low";
  project?: string;
  milestone?: string;
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
  /** Repository-relative. */
  path: string;
  /** Planned, with every need Done. */
  ready: boolean;
  /** Proposed or Planned, with a need not Done. */
  blocked: boolean;
  open_needs: string[];
  /** Open items that need this one. */
  needed_by: string[];
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
  api_version: 1;
  /** Where it was read from. */
  source: string;
  branch?: string;
  commit?: string;
  generated: string;
  items: WorkItem[];
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
  api_version: 1;
  id: string;
  path: string;
  /** Markdown, without the frontmatter. */
  body: string;
}

export const API_VERSION: 1;
export function queryWork(
  root: string,
  options?: { elsewhere?: WorkElsewhere[]; history?: WorkEvent[] },
): WorkSnapshot;
export function statusHistory(root: string): WorkEvent[];
export function claimsElsewhere(root: string): WorkElsewhere[];
export function showItem(root: string, id: string): WorkItemText | undefined;
