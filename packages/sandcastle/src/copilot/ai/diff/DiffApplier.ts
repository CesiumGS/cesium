import { DiffMatcher } from "./DiffMatcher";
import {
  DiffBlock,
  MatchResult,
  ApplyOptions,
  ApplyResult,
  ValidationResult,
  Conflict,
  ConflictType,
  UnmatchedDiff,
  DiffError,
  DiffErrorType,
  AppliedDiff,
} from "../types";

/**
 * Applies multiple search/replace diffs order-invariantly: matches each, sorts by
 * position, detects conflicts, and replaces bottom-up so earlier positions stay valid.
 */
export class DiffApplier {
  private readonly matcher: DiffMatcher;

  constructor(matcher?: DiffMatcher) {
    this.matcher = matcher || new DiffMatcher();
  }

  public applyDiffs(
    sourceCode: string,
    diffs: DiffBlock[],
    options?: ApplyOptions,
  ): ApplyResult {
    const opts: Required<ApplyOptions> = {
      dryRun: false,
      strict: true,
      allowOverlaps: false,
      matchOptions: {},
      ...options,
    };

    const matchResults = this.matchAllDiffs(sourceCode, diffs, opts);
    return this.processMatchResults(
      matchResults,
      sourceCode,
      diffs.length,
      opts,
    );
  }

  /** Equivalent to applyDiffs with dryRun: true. */
  public validateDiffs(
    sourceCode: string,
    diffs: DiffBlock[],
    options?: ApplyOptions,
  ): ValidationResult {
    const result = this.applyDiffs(sourceCode, diffs, {
      ...options,
      dryRun: true,
    });
    return result.validation!;
  }

  /** Async variant that yields to the event loop every few diffs to keep the UI responsive. */
  public async applyDiffsWithProgress(
    sourceCode: string,
    diffs: DiffBlock[],
    onProgress?: (current: number, total: number, message: string) => void,
    options?: ApplyOptions,
  ): Promise<ApplyResult> {
    const opts: Required<ApplyOptions> = {
      dryRun: false,
      strict: true,
      allowOverlaps: false,
      matchOptions: {},
      ...options,
    };

    onProgress?.(0, diffs.length, "Starting diff matching...");

    const matchResults: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult | null;
      error?: DiffError;
    }> = [];

    for (let i = 0; i < diffs.length; i++) {
      onProgress?.(
        i + 1,
        diffs.length,
        `Matching diff ${i + 1} of ${diffs.length}...`,
      );

      // Yield every 3 diffs so the UI thread can repaint.
      if (i > 0 && i % 3 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const diff = diffs[i];
      try {
        const match = this.matcher.findMatch(
          diff.search,
          sourceCode,
          opts.matchOptions,
        );

        if (!match) {
          const bestSimilarity = this.findBestSimilarity(
            diff.search,
            sourceCode,
          );
          const searchPreview = this.truncateForContext(diff.search);

          let errorMessage = `Could not find match for diff at index ${i}.\n`;
          errorMessage += `Searched for: ${searchPreview}\n`;

          if (bestSimilarity !== null) {
            errorMessage += `Best similarity found: ${(bestSimilarity.score * 100).toFixed(1)}% `;
            errorMessage += `(threshold: ${((opts.matchOptions?.minConfidence ?? 0.9) * 100).toFixed(0)}%)\n`;

            if (
              bestSimilarity.score > 0.7 &&
              bestSimilarity.score < (opts.matchOptions?.minConfidence ?? 0.9)
            ) {
              errorMessage += `\nTip: The code has similar sections but doesn't match exactly. `;
              errorMessage += `Check for differences in whitespace, quotes, or indentation.`;
            }
          }

          matchResults.push({
            diff,
            inputIndex: i,
            match: null,
            error: {
              type: DiffErrorType.NO_MATCH,
              message: errorMessage,
              diff,
              inputIndex: i,
              context: searchPreview,
            },
          });
        } else {
          matchResults.push({
            diff,
            inputIndex: i,
            match,
          });
        }
      } catch (error) {
        matchResults.push({
          diff,
          inputIndex: i,
          match: null,
          error: {
            type: DiffErrorType.INTERNAL_ERROR,
            message: `Error matching diff at index ${i}: ${error instanceof Error ? error.message : String(error)}`,
            diff,
            inputIndex: i,
          },
        });
      }
    }

    onProgress?.(diffs.length, diffs.length, "Applying changes...");

    return this.processMatchResults(
      matchResults,
      sourceCode,
      diffs.length,
      opts,
    );
  }

  private processMatchResults(
    matchResults: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult | null;
      error?: DiffError;
    }>,
    sourceCode: string,
    totalDiffs: number,
    opts: Required<ApplyOptions>,
  ): ApplyResult {
    const successful: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult;
    }> = [];
    const errors: DiffError[] = [];
    const unmatchedDiffs: UnmatchedDiff[] = [];

    matchResults.forEach(({ diff, inputIndex, match, error }) => {
      if (match) {
        successful.push({ diff, inputIndex, match });
      } else if (error) {
        errors.push(error);
        unmatchedDiffs.push({ diff, inputIndex, reason: error.message });
      }
    });

    const sorted = this.sortDiffsByPosition(successful);
    const conflicts = this.detectConflicts(sorted);
    const deduplicated = this.deduplicateMatches(
      successful,
      errors,
      unmatchedDiffs,
    );
    const sortedDeduplicated = this.sortDiffsByPosition(deduplicated);

    if (opts.strict && errors.length > 0) {
      return {
        success: false,
        appliedDiffs: [],
        errors,
        validation: {
          valid: false,
          conflicts,
          unmatchedDiffs,
          totalDiffs,
          matchedDiffs: deduplicated.length,
        },
      };
    }

    if (conflicts.length > 0 && !opts.allowOverlaps) {
      conflicts.forEach((conflict) => {
        errors.push({
          type: DiffErrorType.CONFLICT,
          message: conflict.description,
          context: `Conflict type: ${conflict.type}`,
        });
      });

      if (opts.strict) {
        return {
          success: false,
          appliedDiffs: [],
          errors,
          validation: {
            valid: false,
            conflicts,
            unmatchedDiffs,
            totalDiffs,
            matchedDiffs: successful.length,
          },
        };
      }
    }

    const validation: ValidationResult = {
      valid: errors.length === 0 && conflicts.length === 0,
      conflicts,
      unmatchedDiffs,
      totalDiffs,
      matchedDiffs: deduplicated.length,
    };

    if (opts.dryRun) {
      return {
        success: validation.valid,
        appliedDiffs: [],
        errors,
        validation,
      };
    }

    const result = this.applyDiffsInOrder(sourceCode, sortedDeduplicated, opts);
    const allErrors = [...errors, ...result.errors];

    return {
      success: allErrors.length === 0,
      modifiedCode: result.modifiedCode,
      appliedDiffs: result.appliedDiffs,
      errors: allErrors,
      validation,
    };
  }

  private matchAllDiffs(
    sourceCode: string,
    diffs: DiffBlock[],
    options: Required<ApplyOptions>,
  ): Array<{
    diff: DiffBlock;
    inputIndex: number;
    match: MatchResult | null;
    error?: DiffError;
  }> {
    return diffs.map((diff, inputIndex) => {
      try {
        const match = this.matcher.findMatch(
          diff.search,
          sourceCode,
          options.matchOptions,
        );

        if (!match) {
          const bestSimilarity = this.findBestSimilarity(
            diff.search,
            sourceCode,
          );
          const searchPreview = this.truncateForContext(diff.search);

          let errorMessage = `Could not find match for diff at index ${inputIndex}.\n`;
          errorMessage += `Searched for: ${searchPreview}\n`;

          if (bestSimilarity !== null) {
            errorMessage += `Best similarity found: ${(bestSimilarity.score * 100).toFixed(1)}% `;
            errorMessage += `(threshold: ${((options.matchOptions?.minConfidence ?? 0.9) * 100).toFixed(0)}%)\n`;

            if (
              bestSimilarity.score > 0.7 &&
              bestSimilarity.score <
                (options.matchOptions?.minConfidence ?? 0.9)
            ) {
              errorMessage += `\nTip: The code has similar sections but doesn't match exactly. `;
              errorMessage += `Check for differences in whitespace, quotes, or indentation.`;
            }
          }

          return {
            diff,
            inputIndex,
            match: null,
            error: {
              type: DiffErrorType.NO_MATCH,
              message: errorMessage,
              diff,
              inputIndex,
              context: searchPreview,
            },
          };
        }

        return {
          diff,
          inputIndex,
          match,
        };
      } catch (error) {
        return {
          diff,
          inputIndex,
          match: null,
          error: {
            type: DiffErrorType.INTERNAL_ERROR,
            message: `Error matching diff at index ${inputIndex}: ${error instanceof Error ? error.message : String(error)}`,
            diff,
            inputIndex,
          },
        };
      }
    });
  }

  /** Scan for the closest similarity to `searchText`, used to build debug messages on miss. */
  private findBestSimilarity(
    searchText: string,
    sourceCode: string,
  ): { score: number; location: string } | null {
    const searchLen = searchText.length;
    if (searchLen === 0 || sourceCode.length < searchLen) {
      return null;
    }

    const startTime = Date.now();
    const TIMEOUT_MS = 2000;
    let bestScore = 0;
    let bestLocation = "";
    const stepSize = Math.max(1, Math.floor(searchLen / 20));

    for (let i = 0; i <= sourceCode.length - searchLen; i += stepSize) {
      if (i % 100 === 0 && Date.now() - startTime > TIMEOUT_MS) {
        break;
      }

      const candidate = sourceCode.slice(i, i + searchLen);
      const similarity = this.matcher.calculateSimilarity(
        searchText,
        candidate,
      );

      if (similarity > bestScore) {
        bestScore = similarity;
        const lines = sourceCode.slice(0, i).split("\n");
        const lineNum = lines.length;
        const lineContent = candidate.split("\n")[0].slice(0, 50);
        bestLocation = `line ${lineNum}: ${lineContent}...`;
      }

      if (bestScore >= 0.95) {
        break;
      }
    }

    return bestScore > 0 ? { score: bestScore, location: bestLocation } : null;
  }

  /** Sort ascending by startPos; ties break by endPos then input index. */
  private sortDiffsByPosition(
    matches: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult;
    }>,
  ): Array<{
    diff: DiffBlock;
    inputIndex: number;
    match: MatchResult;
  }> {
    return [...matches].sort((a, b) => {
      if (a.match.startPos !== b.match.startPos) {
        return a.match.startPos - b.match.startPos;
      }
      if (a.match.endPos !== b.match.endPos) {
        return a.match.endPos - b.match.endPos;
      }
      return a.inputIndex - b.inputIndex;
    });
  }

  /**
   * Drop diffs whose search pattern or matched region already appeared - AI models
   * sometimes emit duplicates that would otherwise produce repeated replacements.
   */
  private deduplicateMatches(
    matches: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult;
    }>,
    errors: DiffError[],
    unmatchedDiffs: UnmatchedDiff[],
  ): Array<{
    diff: DiffBlock;
    inputIndex: number;
    match: MatchResult;
  }> {
    const seenPatterns = new Map<string, number>();
    const seenPositions = new Map<string, number>();
    const deduplicated: typeof matches = [];

    for (const match of matches) {
      const normalizedPattern = match.diff.search
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      const positionKey = `${match.match.startPos}-${match.match.endPos}`;

      const previousPatternIndex = seenPatterns.get(normalizedPattern);
      const previousPositionIndex = seenPositions.get(positionKey);

      if (previousPatternIndex !== undefined) {
        errors.push({
          type: DiffErrorType.CONFLICT,
          message: `Duplicate search pattern detected - already matched by diff ${previousPatternIndex}. Skipping to prevent duplicate replacements.`,
          diff: match.diff,
          inputIndex: match.inputIndex,
          context: `Pattern: ${match.diff.search.slice(0, 50)}...`,
        });

        unmatchedDiffs.push({
          diff: match.diff,
          inputIndex: match.inputIndex,
          reason: `Duplicate of diff ${previousPatternIndex}`,
        });

        continue;
      }

      if (previousPositionIndex !== undefined) {
        errors.push({
          type: DiffErrorType.CONFLICT,
          message: `Diff matches same position range as diff ${previousPositionIndex}. Skipping to prevent overlap.`,
          diff: match.diff,
          inputIndex: match.inputIndex,
          context: `Position: ${match.match.startPos}-${match.match.endPos}`,
        });

        unmatchedDiffs.push({
          diff: match.diff,
          inputIndex: match.inputIndex,
          reason: `Overlaps with diff ${previousPositionIndex}`,
        });

        continue;
      }

      seenPatterns.set(normalizedPattern, match.inputIndex);
      seenPositions.set(positionKey, match.inputIndex);
      deduplicated.push(match);
    }

    return deduplicated;
  }

  public detectConflicts(
    sorted: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult;
    }>,
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Sorted by startPos, so only adjacent pairs can overlap.
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];

      if (
        a.match.startPos === b.match.startPos &&
        a.match.endPos === b.match.endPos
      ) {
        conflicts.push({
          type: ConflictType.DUPLICATE_MATCH,
          diffs: [
            {
              diff: a.diff,
              inputIndex: a.inputIndex,
              matchResult: a.match,
            },
            {
              diff: b.diff,
              inputIndex: b.inputIndex,
              matchResult: b.match,
            },
          ],
          description: `Diffs at input indices ${a.inputIndex} and ${b.inputIndex} match the same region (lines ${a.match.startLine}-${a.match.endLine})`,
        });
      } else if (this.regionsOverlap(a.match, b.match)) {
        conflicts.push({
          type: ConflictType.OVERLAPPING_REGIONS,
          diffs: [
            {
              diff: a.diff,
              inputIndex: a.inputIndex,
              matchResult: a.match,
            },
            {
              diff: b.diff,
              inputIndex: b.inputIndex,
              matchResult: b.match,
            },
          ],
          description: `Diffs at input indices ${a.inputIndex} and ${b.inputIndex} have overlapping regions (lines ${a.match.startLine}-${a.match.endLine} and ${b.match.startLine}-${b.match.endLine})`,
        });
      }
    }

    return conflicts;
  }

  private regionsOverlap(a: MatchResult, b: MatchResult): boolean {
    return (
      (a.startPos < b.endPos && a.endPos > b.startPos) ||
      (b.startPos < a.endPos && b.endPos > a.startPos)
    );
  }

  /** Apply in reverse so earlier startPos values stay valid as we splice. */
  private applyDiffsInOrder(
    sourceCode: string,
    sorted: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult;
    }>,
    options: Required<ApplyOptions>,
  ): {
    success: boolean;
    modifiedCode: string;
    appliedDiffs: AppliedDiff[];
    errors: DiffError[];
  } {
    let modifiedCode = sourceCode;
    const appliedDiffs: AppliedDiff[] = [];
    const errors: DiffError[] = [];

    for (let i = sorted.length - 1; i >= 0; i--) {
      const { diff, inputIndex, match } = sorted[i];

      try {
        const before = modifiedCode.slice(0, match.startPos);
        const after = modifiedCode.slice(match.endPos);

        const originalLength = match.endPos - match.startPos;
        const newLength = diff.replace.length;
        const offsetAdjustment = newLength - originalLength;

        modifiedCode = before + diff.replace + after;

        appliedDiffs.unshift({
          originalDiff: diff,
          matchResult: match,
          offsetAdjustment,
          inputIndex,
        });
      } catch (error) {
        const err: DiffError = {
          type: DiffErrorType.INTERNAL_ERROR,
          message: `Error applying diff at input index ${inputIndex}: ${error instanceof Error ? error.message : String(error)}`,
          diff,
          inputIndex,
        };
        errors.push(err);

        if (options.strict) {
          return {
            success: false,
            modifiedCode: sourceCode,
            appliedDiffs: [],
            errors,
          };
        }
      }
    }

    return {
      success: errors.length === 0,
      modifiedCode,
      appliedDiffs,
      errors,
    };
  }

  private truncateForContext(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}...`;
  }

  /** Human-readable multi-line summary of an ApplyResult, for debug logging. */
  public static getSummary(result: ApplyResult): string {
    const lines: string[] = [];

    lines.push(`Success: ${result.success}`);
    lines.push(`Applied: ${result.appliedDiffs.length} diffs`);
    lines.push(`Errors: ${result.errors.length}`);

    if (result.validation) {
      lines.push(`\nValidation:`);
      lines.push(`  Valid: ${result.validation.valid}`);
      lines.push(`  Conflicts: ${result.validation.conflicts.length}`);
      lines.push(`  Unmatched: ${result.validation.unmatchedDiffs.length}`);
      lines.push(
        `  Matched: ${result.validation.matchedDiffs}/${result.validation.totalDiffs}`,
      );
    }

    if (result.appliedDiffs.length > 0) {
      lines.push(`\nApplied diffs (in application order):`);
      result.appliedDiffs.forEach((applied, idx) => {
        lines.push(
          `  ${idx + 1}. Input index ${applied.inputIndex}: lines ${applied.matchResult.startLine}-${applied.matchResult.endLine} (${applied.matchResult.strategy}, confidence: ${applied.matchResult.confidence.toFixed(2)})`,
        );
      });
    }

    if (result.errors.length > 0) {
      lines.push(`\nErrors:`);
      result.errors.forEach((error, idx) => {
        lines.push(`  ${idx + 1}. [${error.type}] ${error.message}`);
        if (error.context) {
          lines.push(`     Context: ${error.context}`);
        }
      });
    }

    return lines.join("\n");
  }
}
