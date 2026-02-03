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
} from "./types";

/**
 * DiffApplier implements an order-invariant algorithm for applying multiple diffs to source code.
 * Inspired by Cline's breakthrough innovation, this class can correctly apply a series of
 * search-and-replace blocks even when provided out of sequence by AI models.
 *
 * Key Features:
 * - Order-invariant: Handles diffs in any order
 * - Conflict detection: Detects and reports overlapping or conflicting diffs
 * - Intelligent sorting: Sorts diffs by actual position in file
 * - Bottom-to-top application: Preserves line numbers during application
 * - Offset tracking: Maintains cumulative offset changes
 * - Validation: Can validate diffs before applying (dry-run mode)
 *
 * @example
 * ```typescript
 * const applier = new DiffApplier();
 * const result = applier.applyDiffs(sourceCode, diffs);
 * if (result.success) {
 *   console.log("Applied changes:", result.modifiedCode);
 * } else {
 *   console.error("Errors:", result.errors);
 * }
 * ```
 */
export class DiffApplier {
  private readonly matcher: DiffMatcher;

  constructor(matcher?: DiffMatcher) {
    this.matcher = matcher || new DiffMatcher();
  }

  /**
   * Apply an array of diffs to source code in an order-invariant way.
   *
   * Algorithm:
   * 1. For each diff, use DiffMatcher to find its position
   * 2. Validate all diffs can be matched (fail early if not)
   * 3. Sort matched diffs by startPos (ascending)
   * 4. Check for overlaps/conflicts
   * 5. Apply diffs in reverse order (bottom-to-top) to preserve positions
   * 6. Track applied diffs with actual positions
   * 7. Return result with success status and modified code
   *
   * @param sourceCode - The original source code
   * @param diffs - Array of diff blocks to apply
   * @param options - Optional configuration
   * @returns Result containing modified code or errors
   */
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

    // Step 1: Match all diffs to their positions
    const matchResults = this.matchAllDiffs(sourceCode, diffs, opts);

    // Separate successful matches from failures
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
        unmatchedDiffs.push({
          diff,
          inputIndex,
          reason: error.message,
        });
      }
    });

    // Step 2: Sort by position (ascending order) for conflict detection
    const sorted = this.sortDiffsByPosition(successful);

    // Step 3: Detect conflicts BEFORE deduplication
    // This ensures we properly detect and report duplicate matches as conflicts
    const conflicts = this.detectConflicts(sorted);

    // Step 4: ROBUSTNESS: Deduplicate diffs with identical search patterns or overlapping matches
    // This prevents the catastrophic bug where duplicate diffs create infinite replacements
    const deduplicated = this.deduplicateMatches(
      successful,
      errors,
      unmatchedDiffs,
    );

    // Step 5: Re-sort deduplicated matches
    const sortedDeduplicated = this.sortDiffsByPosition(deduplicated);

    // Step 6: If in strict mode and there are errors, fail early
    if (opts.strict && errors.length > 0) {
      return {
        success: false,
        appliedDiffs: [],
        errors,
        validation: {
          valid: false,
          conflicts,
          unmatchedDiffs,
          totalDiffs: diffs.length,
          matchedDiffs: deduplicated.length,
        },
      };
    }

    if (conflicts.length > 0 && !opts.allowOverlaps) {
      // Add conflict errors
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
            totalDiffs: diffs.length,
            matchedDiffs: successful.length,
          },
        };
      }
    }

    // Step 7: Validation result
    const validation: ValidationResult = {
      valid: errors.length === 0 && conflicts.length === 0,
      conflicts,
      unmatchedDiffs,
      totalDiffs: diffs.length,
      matchedDiffs: deduplicated.length,
    };

    // If dry-run, return validation without modifying code
    if (opts.dryRun) {
      return {
        success: validation.valid,
        appliedDiffs: [],
        errors,
        validation,
      };
    }

    // Step 8: Apply diffs in reverse order (bottom-to-top)
    const result = this.applyDiffsInOrder(sourceCode, sortedDeduplicated, opts);

    // Combine all errors
    const allErrors = [...errors, ...result.errors];

    return {
      success: allErrors.length === 0,
      modifiedCode: result.modifiedCode,
      appliedDiffs: result.appliedDiffs,
      errors: allErrors,
      validation,
    };
  }

  /**
   * Validate diffs without applying them.
   * This is equivalent to calling applyDiffs with dryRun: true.
   *
   * @param sourceCode - The source code to validate against
   * @param diffs - Array of diffs to validate
   * @param options - Optional matching options
   * @returns Validation result
   */
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

  /**
   * Apply diffs with progress reporting and browser yield points.
   * PERFORMANCE: This async version yields to the browser every few diffs
   * to prevent blocking the main thread and allow UI updates.
   *
   * @param sourceCode - The original source code
   * @param diffs - Array of diff blocks to apply
   * @param onProgress - Optional callback for progress updates
   * @param options - Optional configuration
   * @returns Promise resolving to ApplyResult
   */
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

    // Report initial progress
    onProgress?.(0, diffs.length, "Starting diff matching...");

    // Step 1: Match all diffs with progress reporting
    const matchResults: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult | null;
      error?: DiffError;
    }> = [];

    for (let i = 0; i < diffs.length; i++) {
      // Report progress for each diff
      onProgress?.(
        i + 1,
        diffs.length,
        `Matching diff ${i + 1} of ${diffs.length}...`,
      );

      // Yield to browser every 3 diffs to prevent UI freeze
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

    // Continue with the standard applyDiffs logic
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
        unmatchedDiffs.push({
          diff,
          inputIndex,
          reason: error.message,
        });
      }
    });

    // Sort by position for conflict detection
    const sorted = this.sortDiffsByPosition(successful);

    // Detect conflicts BEFORE deduplication
    const conflicts = this.detectConflicts(sorted);

    // ROBUSTNESS: Deduplicate diffs with identical search patterns or overlapping matches
    const deduplicated = this.deduplicateMatches(
      successful,
      errors,
      unmatchedDiffs,
    );

    // Re-sort deduplicated matches
    const sortedDeduplicated = this.sortDiffsByPosition(deduplicated);

    // Rest of the logic follows the original applyDiffs method
    if (opts.strict && errors.length > 0) {
      return {
        success: false,
        appliedDiffs: [],
        errors,
        validation: {
          valid: false,
          conflicts,
          unmatchedDiffs,
          totalDiffs: diffs.length,
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
            totalDiffs: diffs.length,
            matchedDiffs: successful.length,
          },
        };
      }
    }

    const validation: ValidationResult = {
      valid: errors.length === 0 && conflicts.length === 0,
      conflicts,
      unmatchedDiffs,
      totalDiffs: diffs.length,
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

  /**
   * Match all diffs to their positions in the source code.
   *
   * @param sourceCode - The source code
   * @param diffs - Array of diffs
   * @param options - Apply options
   * @returns Array of match results or errors
   */
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
          // Calculate best similarity score to help debugging
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

  /**
   * Find the best similarity score in the source code for debugging purposes.
   *
   * @param searchText - Text to search for
   * @param sourceCode - Source code to search in
   * @returns Best similarity score and location, or null if none found
   */
  private findBestSimilarity(
    searchText: string,
    sourceCode: string,
  ): { score: number; location: string } | null {
    const searchLen = searchText.length;
    if (searchLen === 0 || sourceCode.length < searchLen) {
      return null;
    }

    let bestScore = 0;
    let bestLocation = "";
    const stepSize = Math.max(1, Math.floor(searchLen / 20)); // Sample every 5%

    for (let i = 0; i <= sourceCode.length - searchLen; i += stepSize) {
      const candidate = sourceCode.slice(i, i + searchLen);
      const similarity = this.matcher.calculateSimilarity(
        searchText,
        candidate,
      );

      if (similarity > bestScore) {
        bestScore = similarity;
        // Extract a line preview for context
        const lines = sourceCode.slice(0, i).split("\n");
        const lineNum = lines.length;
        const lineContent = candidate.split("\n")[0].slice(0, 50);
        bestLocation = `line ${lineNum}: ${lineContent}...`;
      }

      // If we found a very close match, we can stop early
      if (bestScore >= 0.95) {
        break;
      }
    }

    return bestScore > 0 ? { score: bestScore, location: bestLocation } : null;
  }

  /**
   * Sort diffs by their actual position in the file (ascending order).
   * This is critical for the order-invariant algorithm.
   *
   * @param matches - Array of successful matches
   * @returns Sorted array
   */
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
      // Primary sort: by start position
      if (a.match.startPos !== b.match.startPos) {
        return a.match.startPos - b.match.startPos;
      }
      // Secondary sort: by end position (for nested matches)
      if (a.match.endPos !== b.match.endPos) {
        return a.match.endPos - b.match.endPos;
      }
      // Tertiary sort: by input index (preserve original order for identical matches)
      return a.inputIndex - b.inputIndex;
    });
  }

  /**
   * ROBUSTNESS: Deduplicate matches with identical search patterns or overlapping positions.
   * This prevents the catastrophic bug where AI generates duplicate diffs that create
   * infinite repeated replacements in the code.
   *
   * Strategy:
   * 1. Normalize search patterns (remove extra whitespace)
   * 2. Track seen patterns and matched position ranges
   * 3. Keep only the FIRST occurrence of each unique pattern/position
   * 4. Log warnings for skipped duplicates
   *
   * @param matches - Array of successful matches
   * @param errors - Error array to append warnings to
   * @param unmatchedDiffs - Unmatched diffs array to append skipped diffs to
   * @returns Deduplicated array of matches
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
    const seenPatterns = new Map<string, number>(); // normalized pattern -> first inputIndex
    const seenPositions = new Map<string, number>(); // "start-end" -> first inputIndex
    const deduplicated: typeof matches = [];

    for (const match of matches) {
      // Normalize the search pattern (collapse whitespace, trim)
      const normalizedPattern = match.diff.search
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      // Create position key
      const positionKey = `${match.match.startPos}-${match.match.endPos}`;

      // Check if we've seen this pattern before
      const previousPatternIndex = seenPatterns.get(normalizedPattern);
      const previousPositionIndex = seenPositions.get(positionKey);

      if (previousPatternIndex !== undefined) {
        // Duplicate search pattern detected!
        console.warn(
          `⚠️ DUPLICATE DIFF: Skipping diff ${match.inputIndex} - identical search pattern already seen in diff ${previousPatternIndex}`,
        );
        console.warn(
          `   Search pattern: "${match.diff.search.slice(0, 100)}..."`,
        );

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

        continue; // Skip this duplicate
      }

      if (previousPositionIndex !== undefined) {
        // Same position range detected!
        console.warn(
          `⚠️ OVERLAPPING DIFF: Skipping diff ${match.inputIndex} - same position range already matched by diff ${previousPositionIndex}`,
        );

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

        continue; // Skip this overlap
      }

      // This is a unique match - keep it
      seenPatterns.set(normalizedPattern, match.inputIndex);
      seenPositions.set(positionKey, match.inputIndex);
      deduplicated.push(match);
    }

    const skippedCount = matches.length - deduplicated.length;
    if (skippedCount > 0) {
      console.warn(
        `🛡️ PROTECTION: Skipped ${skippedCount} duplicate/overlapping diff(s) to prevent code corruption`,
      );
    }

    return deduplicated;
  }

  /**
   * Detect conflicts between diffs.
   * Conflicts include:
   * - Overlapping regions
   * - Duplicate matches
   * - Order dependencies
   *
   * @param sorted - Sorted array of matches
   * @param options - Apply options
   * @returns Array of conflicts
   */
  public detectConflicts(
    sorted: Array<{
      diff: DiffBlock;
      inputIndex: number;
      match: MatchResult;
    }>,
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];

        // Check for overlapping regions
        if (this.regionsOverlap(a.match, b.match)) {
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

        // Check for duplicate matches (same exact region)
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
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two match regions overlap.
   *
   * @param a - First match
   * @param b - Second match
   * @returns True if regions overlap
   */
  private regionsOverlap(a: MatchResult, b: MatchResult): boolean {
    // Regions overlap if one starts before the other ends
    return (
      (a.startPos < b.endPos && a.endPos > b.startPos) ||
      (b.startPos < a.endPos && b.endPos > a.startPos)
    );
  }

  /**
   * Apply diffs in order (reverse order for bottom-to-top application).
   * This preserves line numbers and character positions.
   *
   * @param sourceCode - Original source code
   * @param sorted - Sorted matches
   * @param options - Apply options
   * @returns Result with modified code and applied diffs
   */
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

    // Apply in reverse order (bottom-to-top)
    // This ensures that earlier positions remain valid
    for (let i = sorted.length - 1; i >= 0; i--) {
      const { diff, inputIndex, match } = sorted[i];

      try {
        // Extract the text to replace
        const before = modifiedCode.slice(0, match.startPos);
        const after = modifiedCode.slice(match.endPos);

        // Calculate the offset adjustment
        const originalLength = match.endPos - match.startPos;
        const newLength = diff.replace.length;
        const offsetAdjustment = newLength - originalLength;

        // Apply the replacement
        modifiedCode = before + diff.replace + after;

        // Record the applied diff
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

  /**
   * Truncate text for context display.
   *
   * @param text - Text to truncate
   * @param maxLength - Maximum length
   * @returns Truncated text
   */
  private truncateForContext(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}...`;
  }

  /**
   * Get detailed information about applied diffs.
   * Useful for logging and debugging.
   *
   * @param result - Apply result
   * @returns Human-readable summary
   */
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
