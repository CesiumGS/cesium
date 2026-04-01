import { DiffBlock, DiffFormat } from "./types";

/**
 * Represents a diff block being actively streamed
 */
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

/**
 * Valid state transitions for streaming diff processing
 */
const VALID_TRANSITIONS: Record<PartialDiff["state"], PartialDiff["state"][]> =
  {
    awaiting_search: ["in_search"],
    in_search: ["awaiting_replace"],
    awaiting_replace: ["in_replace"],
    in_replace: ["complete"],
    complete: [],
  };

/**
 * Processes incremental diff content during streaming.
 * Handles the accumulation of search and replace blocks as they arrive
 * in chunks from the AI model. Supports multiple concurrent diffs.
 *
 * @example
 * ```typescript
 * const processor = new StreamingDiffProcessor();
 *
 * // Start a new diff
 * processor.processDiffStart(0, 'javascript');
 *
 * // Accumulate search content as it streams
 * processor.processDiffSearch(0, 'const old');
 * processor.processDiffSearch(0, 'Code = "example";');
 *
 * // Accumulate replace content as it streams
 * processor.processDiffReplace(0, 'const new');
 * processor.processDiffReplace(0, 'Code = "updated";');
 *
 * // Complete the diff and get the final block
 * const diffBlock = processor.processDiffComplete(0);
 * ```
 */
export class StreamingDiffProcessor {
  private activeDiffs: Map<number, PartialDiff> = new Map();
  private completedDiffs: DiffBlock[] = [];

  /**
   * Initialize a new diff block that will be streamed
   *
   * @param diffIndex - Unique identifier for this diff (0-based)
   * @param language - The language of the file being modified
   */
  processDiffStart(diffIndex: number, language: "javascript" | "html"): void {
    // Initialize a new partial diff in the awaiting_search state
    this.activeDiffs.set(diffIndex, {
      diffIndex,
      state: "awaiting_search",
      searchContent: "",
      replaceContent: "",
      language,
    });
  }

  /**
   * Accumulate search content for a streaming diff
   *
   * @param diffIndex - The diff identifier
   * @param content - The incremental search content to append
   * @throws {Error} If the diff doesn't exist or is in an invalid state
   */
  processDiffSearch(diffIndex: number, content: string): void {
    const diff = this.activeDiffs.get(diffIndex);

    if (!diff) {
      throw new Error(
        `Cannot process search content: diff ${diffIndex} does not exist`,
      );
    }

    // Transition to in_search state if we're awaiting_search
    if (diff.state === "awaiting_search") {
      if (!this.canTransition(diff.state, "in_search")) {
        throw new Error(
          `Invalid state transition from ${diff.state} to in_search`,
        );
      }
      diff.state = "in_search";
    }

    // Only accept search content while in_search state
    if (diff.state !== "in_search") {
      throw new Error(
        `Cannot process search content: diff ${diffIndex} is in ${diff.state} state`,
      );
    }

    // Accumulate the search content
    diff.searchContent += content;
  }

  /**
   * Accumulate replace content for a streaming diff
   *
   * @param diffIndex - The diff identifier
   * @param content - The incremental replace content to append
   * @throws {Error} If the diff doesn't exist or is in an invalid state
   */
  processDiffReplace(diffIndex: number, content: string): void {
    const diff = this.activeDiffs.get(diffIndex);

    if (!diff) {
      throw new Error(
        `Cannot process replace content: diff ${diffIndex} does not exist`,
      );
    }

    // Transition to awaiting_replace state if we're in_search
    if (diff.state === "in_search") {
      if (!this.canTransition(diff.state, "awaiting_replace")) {
        throw new Error(
          `Invalid state transition from ${diff.state} to awaiting_replace`,
        );
      }
      diff.state = "awaiting_replace";
    }

    // Transition to in_replace state if we're awaiting_replace
    if (diff.state === "awaiting_replace") {
      if (!this.canTransition(diff.state, "in_replace")) {
        throw new Error(
          `Invalid state transition from ${diff.state} to in_replace`,
        );
      }
      diff.state = "in_replace";
    }

    // Only accept replace content while in_replace state
    if (diff.state !== "in_replace") {
      throw new Error(
        `Cannot process replace content: diff ${diffIndex} is in ${diff.state} state`,
      );
    }

    // Accumulate the replace content
    diff.replaceContent += content;
  }

  /**
   * Finalize a diff block and return the completed DiffBlock
   *
   * @param diffIndex - The diff identifier to complete
   * @returns The finalized DiffBlock, or null if validation fails
   */
  processDiffComplete(diffIndex: number): DiffBlock | null {
    const diff = this.activeDiffs.get(diffIndex);

    if (!diff) {
      console.error(`Cannot complete diff: diff ${diffIndex} does not exist`);
      return null;
    }

    // Validate that we have search content
    if (!diff.searchContent || diff.searchContent.trim().length === 0) {
      console.error(
        `Cannot complete diff ${diffIndex}: search content is empty`,
      );
      return null;
    }

    // Validate state transition to complete
    if (!this.canTransition(diff.state, "complete")) {
      console.error(
        `Cannot complete diff ${diffIndex}: invalid state ${diff.state}`,
      );
      return null;
    }

    // Create the final DiffBlock
    const diffBlock: DiffBlock = {
      search: diff.searchContent.trim(),
      replace: diff.replaceContent.trim(),
      format: DiffFormat.CLINE_FORMAT,
    };

    // Mark as complete and store
    diff.state = "complete";
    this.completedDiffs.push(diffBlock);

    // Remove from active diffs
    this.activeDiffs.delete(diffIndex);

    return diffBlock;
  }

  /**
   * Get the current state of an active diff
   *
   * @param diffIndex - The diff identifier
   * @returns The PartialDiff object, or undefined if not found
   */
  getActiveDiff(diffIndex: number): PartialDiff | undefined {
    return this.activeDiffs.get(diffIndex);
  }

  /**
   * Get all completed diffs
   *
   * @returns Array of all finalized DiffBlocks
   */
  getAllCompletedDiffs(): DiffBlock[] {
    return [...this.completedDiffs];
  }

  /**
   * Reset the processor state, clearing all active and completed diffs
   */
  reset(): void {
    this.activeDiffs.clear();
    this.completedDiffs = [];
  }

  /**
   * Check if a state transition is valid
   *
   * @param currentState - The current state
   * @param nextState - The desired next state
   * @returns True if the transition is valid
   */
  private canTransition(
    currentState: PartialDiff["state"],
    nextState: PartialDiff["state"],
  ): boolean {
    const validNextStates = VALID_TRANSITIONS[currentState];
    return validNextStates.includes(nextState);
  }

  /**
   * Get the count of active diffs currently being streamed
   *
   * @returns Number of active diffs
   */
  getActiveDiffCount(): number {
    return this.activeDiffs.size;
  }

  /**
   * Get the count of completed diffs
   *
   * @returns Number of completed diffs
   */
  getCompletedDiffCount(): number {
    return this.completedDiffs.length;
  }

  /**
   * Check if a specific diff exists and is active
   *
   * @param diffIndex - The diff identifier to check
   * @returns True if the diff exists and is active
   */
  hasDiff(diffIndex: number): boolean {
    return this.activeDiffs.has(diffIndex);
  }

  /**
   * Get all active diff indices
   *
   * @returns Array of active diff indices
   */
  getActiveDiffIndices(): number[] {
    return Array.from(this.activeDiffs.keys());
  }
}
