/**
 * Roo Code Style Diff Strategy
 *
 * Implements a robust diff-patch strategy inspired by Roo Code's approach:
 * - Tool-based LLM calling for structured diff application
 * - Fuzzy matching with middle-out search algorithm
 * - Intelligent indentation preservation
 * - Better precision and reduced false matches
 */

import { DiffMatcher } from "./DiffMatcher";
import type { DiffBlock, MatchResult, MatchOptions, MatchStrategy } from "./types";

/**
 * Result of indentation detection
 */
interface IndentationInfo {
  /** The indentation string (spaces or tabs) */
  indent: string;
  /** Indentation level (number of indent units) */
  level: number;
  /** Whether tabs or spaces are used */
  type: "tabs" | "spaces";
  /** Size of one indent unit (2 or 4 for spaces, 1 for tabs) */
  size: number;
}

/**
 * Roo Code inspired diff strategy with advanced matching and indentation handling
 */
export class RooStyleDiffStrategy {
  private matcher: DiffMatcher;

  constructor(matcher?: DiffMatcher) {
    this.matcher = matcher || new DiffMatcher();
  }

  /**
   * Apply a diff block using the Roo style strategy
   *
   * @param sourceCode - The source code to modify
   * @param diff - The diff block to apply
   * @param options - Matching options
   * @returns Match result with modified code
   */
  async applyDiff(
    sourceCode: string,
    diff: DiffBlock,
    options?: MatchOptions,
  ): Promise<{
    success: boolean;
    modifiedCode?: string;
    match?: MatchResult;
    error?: string;
  }> {
    try {
      console.log("[RooStyleDiffStrategy] 🚀 applyDiff called with middle-out search");
      console.log("[RooStyleDiffStrategy] Source length:", sourceCode.length, "lines:", sourceCode.split("\n").length);

      // 1. Find the code to replace using middle-out search
      const match = await this.middleOutSearch(
        sourceCode,
        diff.search,
        options,
      );

      if (!match) {
        // Silently return error - the tool result will communicate this to the LLM
        // Diagnostic logging removed to reduce console spam
        return {
          success: false,
          error: "No match found for search pattern",
        };
      }

      // 2. Detect indentation at match location
      const sourceIndent = this.detectIndentation(sourceCode, match.startPos);

      // 3. Adjust replacement code indentation if needed
      const adjustedReplace = this.adjustIndentation(
        diff.replace,
        diff.search,
        sourceIndent,
      );

      // 4. Apply the replacement
      const before = sourceCode.substring(0, match.startPos);
      const after = sourceCode.substring(match.endPos);
      const modifiedCode = before + adjustedReplace + after;

      return {
        success: true,
        modifiedCode,
        match,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Middle-out search algorithm
   * Starts searching from the middle of the file and expands outward
   * This reduces false matches in large files by finding contextually relevant sections first
   *
   * @param sourceCode - The source code to search
   * @param searchPattern - The pattern to find
   * @param options - Match options
   * @returns Match result or null
   */
  private async middleOutSearch(
    sourceCode: string,
    searchPattern: string,
    options?: MatchOptions,
  ): Promise<MatchResult | null> {
    const lines = sourceCode.split("\n");
    const middleIndex = Math.floor(lines.length / 2);

    // Calculate search chunks (start from middle, alternate forward/backward)
    const searchOrder = this.generateMiddleOutSearchOrder(
      lines.length,
      middleIndex,
    );

    // Try fuzzy match on each chunk in middle-out order
    for (const { startLine, endLine } of searchOrder) {
      const chunkStartPos = this.getCharPosition(lines, startLine);
      const chunkEndPos = this.getCharPosition(lines, endLine);
      const chunk = sourceCode.substring(chunkStartPos, chunkEndPos);

      // Try to match within this chunk (prefer exact match first, then fallback to fuzzy)
      const result = this.matcher.findMatch(searchPattern, chunk, {
        ...options,
        strategies: [
          MatchStrategy.EXACT,
          MatchStrategy.WHITESPACE_NORMALIZED,
          MatchStrategy.FUZZY,
        ],
      });

      if (result) {
        // Adjust positions to account for chunk offset
        return {
          ...result,
          startPos: chunkStartPos + result.startPos,
          endPos: chunkStartPos + result.endPos,
          startLine: startLine + result.startLine - 1,
          endLine: startLine + result.endLine - 1,
        };
      }
    }

    // If no match found in chunks, try full search as fallback
    return this.matcher.findMatch(searchPattern, sourceCode, options);
  }

  /**
   * Generate search order for middle-out algorithm
   * Returns array of {startLine, endLine} chunks to search in order
   *
   * Example for 100 lines:
   * 1. Lines 40-60 (middle)
   * 2. Lines 20-40 (before middle)
   * 3. Lines 60-80 (after middle)
   * 4. Lines 0-20 (start)
   * 5. Lines 80-100 (end)
   */
  private generateMiddleOutSearchOrder(
    totalLines: number,
    middleIndex: number,
  ): Array<{ startLine: number; endLine: number }> {
    const chunkSize = Math.max(20, Math.floor(totalLines / 5)); // 20% chunks, min 20 lines
    const chunks: Array<{ startLine: number; endLine: number }> = [];

    // Start with middle chunk
    let midStart = Math.max(
      0,
      Math.floor(middleIndex - Math.floor(chunkSize / 2)),
    );
    let midEnd = Math.min(
      totalLines,
      Math.floor(middleIndex + Math.floor(chunkSize / 2)),
    );
    chunks.push({ startLine: midStart, endLine: midEnd });

    // Alternate backward and forward
    let backwardStart = midStart - chunkSize;
    let forwardEnd = midEnd + chunkSize;

    while (backwardStart >= 0 || forwardEnd <= totalLines) {
      // Backward chunk
      if (backwardStart >= 0) {
        chunks.push({
          startLine: Math.max(0, backwardStart),
          endLine: midStart,
        });
        midStart = backwardStart;
        backwardStart -= chunkSize;
      }

      // Forward chunk
      if (forwardEnd <= totalLines) {
        chunks.push({
          startLine: midEnd,
          endLine: Math.min(totalLines, forwardEnd),
        });
        midEnd = forwardEnd;
        forwardEnd += chunkSize;
      }
    }

    return chunks;
  }

  /**
   * Get character position from line number
   */
  private getCharPosition(lines: string[], lineNumber: number): number {
    let pos = 0;
    for (let i = 0; i < lineNumber && i < lines.length; i++) {
      pos += lines[i].length + 1; // +1 for newline
    }
    return pos;
  }

  /**
   * Detect indentation at a specific position in the source code
   * Looks at the line containing the position and analyzes its indentation
   *
   * @param sourceCode - The source code
   * @param position - Character position to check
   * @returns Indentation information
   */
  private detectIndentation(
    sourceCode: string,
    position: number,
  ): IndentationInfo {
    // Find the line containing this position
    const beforePos = sourceCode.substring(0, position);
    const lines = beforePos.split("\n");
    const currentLine = lines[lines.length - 1];

    // Analyze indentation
    const match = currentLine.match(/^(\s*)/);
    const indent = match ? match[1] : "";

    // Determine type and size
    const usesTabs = indent.includes("\t");
    const type = usesTabs ? "tabs" : "spaces";

    let size = 1; // For tabs
    if (!usesTabs && indent.length > 0) {
      // Detect space indent size (2 or 4)
      // Check common patterns
      const spaceCount = indent.length;
      size = spaceCount % 4 === 0 ? 4 : 2;
    }

    const level = usesTabs
      ? indent.split("\t").length - 1
      : Math.floor(indent.length / size);

    return {
      indent,
      level,
      type,
      size,
    };
  }

  /**
   * Adjust indentation of replacement code to match source location
   *
   * Strategy:
   * 1. Detect indentation of search pattern
   * 2. Detect indentation of replacement code
   * 3. Calculate the difference in indentation between source location and search pattern
   * 4. Apply that difference to the replacement code
   *
   * @param replaceCode - The replacement code
   * @param searchCode - The original search code
   * @param sourceIndent - Indentation at the source location
   * @returns Adjusted replacement code with correct indentation
   */
  private adjustIndentation(
    replaceCode: string,
    searchCode: string,
    sourceIndent: IndentationInfo,
  ): string {
    // Get base indentation from search pattern (first line)
    const searchLines = searchCode.split("\n");
    const searchFirstLine = searchLines[0] || "";
    const searchIndentMatch = searchFirstLine.match(/^(\s*)/);
    const searchIndent = searchIndentMatch ? searchIndentMatch[1] : "";

    // Calculate indent difference
    // If source has more indent than search, we need to add that difference to replace
    const sourceTotalIndent = sourceIndent.indent.length;
    const searchTotalIndent = searchIndent.length;
    const indentDiff = sourceTotalIndent - searchTotalIndent;

    if (indentDiff === 0) {
      // No adjustment needed
      return replaceCode;
    }

    // Apply indent adjustment to each line of replacement
    const replaceLines = replaceCode.split("\n");
    const adjustedLines = replaceLines.map((line) => {
      if (line.trim().length === 0) {
        // Keep empty lines as-is
        return line;
      }

      if (indentDiff > 0) {
        // Add indentation
        const additionalIndent =
          sourceIndent.type === "tabs"
            ? "\t".repeat(Math.floor(indentDiff / sourceIndent.size))
            : " ".repeat(indentDiff);
        return additionalIndent + line;
      } 
        // Remove indentation
        const removeCount = Math.abs(indentDiff);
        if (sourceIndent.type === "tabs") {
          return line.replace(new RegExp(`^\t{1,${removeCount}}`), "");
        } 
          return line.replace(new RegExp(`^ {1,${removeCount}}`), "");
        
      
    });

    return adjustedLines.join("\n");
  }

  /**
   * Validate that a diff block is well-formed
   */
  validateDiff(diff: DiffBlock): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!diff.search || diff.search.trim().length === 0) {
      errors.push("Search pattern is empty");
    }

    if (diff.search && diff.search.length > 10000) {
      errors.push("Search pattern is too long (>10000 chars)");
    }

    if (diff.replace && diff.replace.length > 50000) {
      errors.push("Replace content is too long (>50000 chars)");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
