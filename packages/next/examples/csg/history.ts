import { cloneTree, leavesOf, isStepLeaf, type CsgTree } from "./tree.ts";

/**
 * Undo and redo for every edit of the CSG sample (plan §13.33): a stack of
 * the tree's states, one per finished edit (a drag is one, however many
 * evaluations it made), each with the selection that went with it. The tree
 * is small plain data, so a state is a copy of it: an undo is exact, and
 * needs no inverse of each operation to get wrong.
 */
export interface Snapshot {
  tree: CsgTree;
  /** Selected node ids, the last the one the properties show. */
  selection: number[];
}

interface Entry {
  label: string;
  state: Snapshot;
}

const copy = (state: Snapshot): Snapshot => ({
  tree: cloneTree(state.tree),
  selection: [...state.selection],
});

export class History {
  private readonly entries: Entry[];
  private at = 0;

  constructor(
    initial: Snapshot,
    private readonly limit = 200,
  ) {
    this.entries = [{ label: "Start", state: copy(initial) }];
  }

  get canUndo(): boolean {
    return this.at > 0;
  }

  get canRedo(): boolean {
    return this.at < this.entries.length - 1;
  }

  /** What an undo would take back, for a tooltip. */
  get undoLabel(): string | undefined {
    return this.canUndo ? this.entries[this.at]!.label : undefined;
  }

  /** What a redo would do again. */
  get redoLabel(): string | undefined {
    return this.canRedo ? this.entries[this.at + 1]!.label : undefined;
  }

  /**
   * Records the state an edit left, as `label`; drops what could have been
   * redone. An edit that changed nothing (a drag back to where it began)
   * isn't recorded; its selection alone updates the current entry. Returns
   * whether a state was added.
   */
  record(label: string, state: Snapshot): boolean {
    const current = this.entries[this.at]!;
    if (JSON.stringify(current.state.tree) === JSON.stringify(state.tree)) {
      current.state.selection = [...state.selection];
      return false;
    }
    this.entries.length = this.at + 1;
    this.entries.push({ label, state: copy(state) });
    if (this.entries.length > this.limit) {
      this.entries.shift();
    }
    this.at = this.entries.length - 1;
    return true;
  }

  /** The state before the last edit (a copy), now current; undefined at the start. */
  undo(): { label: string; state: Snapshot } | undefined {
    if (!this.canUndo) {
      return undefined;
    }
    const label = this.entries[this.at]!.label;
    this.at--;
    return { label, state: copy(this.entries[this.at]!.state) };
  }

  /** The state the last undo left (a copy), now current. */
  redo(): { label: string; state: Snapshot } | undefined {
    if (!this.canRedo) {
      return undefined;
    }
    this.at++;
    const { label, state } = this.entries[this.at]!;
    return { label, state: copy(state) };
  }

  /** Keeps the selection of the current state up to date (a click isn't an edit). */
  select(selection: readonly number[]): void {
    this.entries[this.at]!.state.selection = [...selection];
  }

  /** The STEP parts any state refers to: while an undo could bring a leaf back, its part stays in the worker. */
  stepKeys(): Set<number> {
    const keys = new Set<number>();
    for (const { state } of this.entries) {
      for (const leaf of leavesOf(state.tree.root)) {
        if (isStepLeaf(leaf)) {
          keys.add(leaf.step.key);
        }
      }
    }
    return keys;
  }
}
