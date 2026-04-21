import { DiffBlock, DiffFormat } from "../types";

export interface PartialDiff {
  diffIndex: number;
  state:
    | "awaiting_search"
    | "in_search"
    | "awaiting_replace"
    | "in_replace"
    | "complete";
  searchContent: string;
  replaceContent: string;
  language: "javascript" | "html";
}

const VALID_TRANSITIONS: Record<PartialDiff["state"], PartialDiff["state"][]> =
  {
    awaiting_search: ["in_search"],
    in_search: ["awaiting_replace"],
    awaiting_replace: ["in_replace"],
    in_replace: ["complete"],
    complete: [],
  };

/**
 * Accumulates SEARCH/REPLACE diff blocks across streaming chunks from the model.
 * Drives each block through an awaiting_search -> in_search -> awaiting_replace ->
 * in_replace -> complete state machine; supports multiple concurrent diff indices.
 */
export class StreamingDiffProcessor {
  private activeDiffs: Map<number, PartialDiff> = new Map();
  private completedDiffs: DiffBlock[] = [];

  processDiffStart(diffIndex: number, language: "javascript" | "html"): void {
    this.activeDiffs.set(diffIndex, {
      diffIndex,
      state: "awaiting_search",
      searchContent: "",
      replaceContent: "",
      language,
    });
  }

  /** @throws {Error} If the diff does not exist or is not in in_search after transition. */
  processDiffSearch(diffIndex: number, content: string): void {
    const diff = this.activeDiffs.get(diffIndex);

    if (!diff) {
      throw new Error(
        `Cannot process search content: diff ${diffIndex} does not exist`,
      );
    }

    if (diff.state === "awaiting_search") {
      if (!this.canTransition(diff.state, "in_search")) {
        throw new Error(
          `Invalid state transition from ${diff.state} to in_search`,
        );
      }
      diff.state = "in_search";
    }

    if (diff.state !== "in_search") {
      throw new Error(
        `Cannot process search content: diff ${diffIndex} is in ${diff.state} state`,
      );
    }

    diff.searchContent += content;
  }

  /** @throws {Error} If the diff does not exist or is not in in_replace after transition. */
  processDiffReplace(diffIndex: number, content: string): void {
    const diff = this.activeDiffs.get(diffIndex);

    if (!diff) {
      throw new Error(
        `Cannot process replace content: diff ${diffIndex} does not exist`,
      );
    }

    if (diff.state === "in_search") {
      if (!this.canTransition(diff.state, "awaiting_replace")) {
        throw new Error(
          `Invalid state transition from ${diff.state} to awaiting_replace`,
        );
      }
      diff.state = "awaiting_replace";
    }

    if (diff.state === "awaiting_replace") {
      if (!this.canTransition(diff.state, "in_replace")) {
        throw new Error(
          `Invalid state transition from ${diff.state} to in_replace`,
        );
      }
      diff.state = "in_replace";
    }

    if (diff.state !== "in_replace") {
      throw new Error(
        `Cannot process replace content: diff ${diffIndex} is in ${diff.state} state`,
      );
    }

    diff.replaceContent += content;
  }

  /** Returns the finalized DiffBlock, or null when validation fails (empty search, bad state). */
  processDiffComplete(diffIndex: number): DiffBlock | null {
    const diff = this.activeDiffs.get(diffIndex);

    if (!diff) {
      console.error(`Cannot complete diff: diff ${diffIndex} does not exist`);
      return null;
    }

    if (!diff.searchContent || diff.searchContent.trim().length === 0) {
      console.error(
        `Cannot complete diff ${diffIndex}: search content is empty`,
      );
      return null;
    }

    if (!this.canTransition(diff.state, "complete")) {
      console.error(
        `Cannot complete diff ${diffIndex}: invalid state ${diff.state}`,
      );
      return null;
    }

    const diffBlock: DiffBlock = {
      search: diff.searchContent.trim(),
      replace: diff.replaceContent.trim(),
      format: DiffFormat.SEARCH_REPLACE,
    };

    diff.state = "complete";
    this.completedDiffs.push(diffBlock);

    this.activeDiffs.delete(diffIndex);

    return diffBlock;
  }

  getActiveDiff(diffIndex: number): PartialDiff | undefined {
    return this.activeDiffs.get(diffIndex);
  }

  getAllCompletedDiffs(): DiffBlock[] {
    return [...this.completedDiffs];
  }

  reset(): void {
    this.activeDiffs.clear();
    this.completedDiffs = [];
  }

  private canTransition(
    currentState: PartialDiff["state"],
    nextState: PartialDiff["state"],
  ): boolean {
    const validNextStates = VALID_TRANSITIONS[currentState];
    return validNextStates.includes(nextState);
  }

  getActiveDiffCount(): number {
    return this.activeDiffs.size;
  }

  getCompletedDiffCount(): number {
    return this.completedDiffs.length;
  }

  hasDiff(diffIndex: number): boolean {
    return this.activeDiffs.has(diffIndex);
  }

  getActiveDiffIndices(): number[] {
    return Array.from(this.activeDiffs.keys());
  }
}
