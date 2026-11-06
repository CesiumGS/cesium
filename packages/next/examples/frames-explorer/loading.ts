// The frames explorer's data items and their loading states (R9): frame data,
// PROJ, GEOID18 and Orion's OEM, each idle → fetching → ready | missing |
// error, with abort back to idle. The status strip, the overlay toggles and
// the cards render from this model, so an indicator can't stick (Review Focus
// 5): a fetch always ends in a final state or is reset to idle.
//
// The rules that make it safe against the worker's message order:
//  - a final state repeated (a joined load answers twice) changes nothing;
//  - progress after the end is ignored, and progress before `fetching`
//    starts the fetch;
//  - `ready` sticks (a late error can't undo data that arrived);
//  - `missing` and `error` may fetch again (Retry, after `npm run setup`);
//  - `reset` (the example's dispose) returns every item still fetching to
//    idle, since an aborted client sends no final state.
import {
  DATA_ITEMS,
  type DataItem,
  type DataState,
  type ProgressReply,
  type StateReply,
} from "./protocol.ts";

/** One data item as the page shows it (R9). */
export interface ItemStatus {
  item: DataItem;
  state: DataState;
  /** While fetching: bytes so far, and the total once every response stated it. */
  received?: number;
  total?: number;
  /** When ready: bytes fetched and the load's time. */
  bytes?: number;
  ms?: number;
  /** For missing and error: what failed, and for missing the setup hint. */
  detail?: string;
}

export type LoadEvent =
  | { type: "fetching" }
  | { type: "progress"; received: number; total?: number }
  | { type: "ready"; bytes?: number; ms?: number }
  | { type: "missing"; detail?: string }
  | { type: "error"; detail?: string }
  | { type: "abort" };

export const initialStatus = (item: DataItem): ItemStatus => ({
  item,
  state: "idle",
});

const FINAL: ReadonlySet<DataState> = new Set(["ready", "missing", "error"]);

/** `status` after `event`; the same object when nothing changes. */
export function transition(status: ItemStatus, event: LoadEvent): ItemStatus {
  const { item, state } = status;
  switch (event.type) {
    case "fetching":
      return state === "idle" || state === "missing" || state === "error"
        ? { item, state: "fetching" }
        : status;
    case "progress": {
      if (FINAL.has(state)) {
        return status;
      }
      const received = Math.max(event.received, status.received ?? 0);
      const total = event.total ?? status.total;
      if (
        state === "fetching" &&
        received === status.received &&
        total === status.total
      ) {
        return status;
      }
      return {
        item,
        state: "fetching",
        received,
        ...(total !== undefined && { total }),
      };
    }
    case "ready":
      return state === "ready"
        ? status
        : {
            item,
            state: "ready",
            ...(event.bytes !== undefined && { bytes: event.bytes }),
            ...(event.ms !== undefined && { ms: event.ms }),
          };
    case "missing":
    case "error":
      if (state === "ready" || state === event.type) {
        return status;
      }
      return {
        item,
        state: event.type,
        ...(event.detail !== undefined && { detail: event.detail }),
      };
    case "abort":
      return state === "fetching" ? initialStatus(item) : status;
  }
}

/** The event a worker reply stands for. */
function eventOf(reply: ProgressReply | StateReply): LoadEvent {
  if (reply.type === "progress") {
    return {
      type: "progress",
      received: reply.received,
      ...(reply.total !== undefined && { total: reply.total }),
    };
  }
  switch (reply.state) {
    case "idle":
      return { type: "abort" };
    case "fetching":
      return { type: "fetching" };
    case "ready":
      return {
        type: "ready",
        ...(reply.bytes !== undefined && { bytes: reply.bytes }),
        ...(reply.ms !== undefined && { ms: reply.ms }),
      };
    case "missing":
    case "error":
      return {
        type: reply.state,
        ...(reply.detail !== undefined && { detail: reply.detail }),
      };
  }
}

/** Every data item's status, with listeners for the panel. */
export class LoadingModel {
  private state: readonly ItemStatus[] = DATA_ITEMS.map(initialStatus);
  private readonly listeners = new Set<() => void>();

  /** Every item, in `DATA_ITEMS` order; a new array after each change. */
  get items(): readonly ItemStatus[] {
    return this.state;
  }

  get(item: DataItem): ItemStatus {
    return this.state.find((s) => s.item === item)!;
  }

  isFinal(item: DataItem): boolean {
    return FINAL.has(this.get(item).state);
  }

  apply(item: DataItem, event: LoadEvent): void {
    const before = this.get(item);
    const after = transition(before, event);
    if (after !== before) {
      this.state = this.state.map((s) => (s.item === item ? after : s));
      for (const listener of [...this.listeners]) {
        listener();
      }
    }
  }

  /** A worker's progress or state reply. */
  reply(reply: ProgressReply | StateReply): void {
    this.apply(reply.item, eventOf(reply));
  }

  /** Returns every item still fetching to idle (dispose: nothing will finish them). */
  reset(): void {
    for (const s of this.state) {
      this.apply(s.item, { type: "abort" });
    }
  }

  /** Bound, so it can be passed as is (`useSyncExternalStore`). */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
