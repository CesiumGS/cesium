import { distance } from "fastest-levenshtein";
import { MatchStrategy, MatchResult, MatchOptions } from "./types";
import { normalizeString } from "./utils/textNormalization";

/**
 * DiffMatcher implements intelligent fuzzy matching for applying code diffs.
 * Inspired by Aider's multi-strategy matching approach, it tries multiple
 * strategies in order of increasing computational cost to find the best match.
 */
export class DiffMatcher {
  private readonly defaultOptions: Required<MatchOptions> = {
    strategies: [
      MatchStrategy.EXACT,
      MatchStrategy.WHITESPACE_NORMALIZED,
      MatchStrategy.LINE_TRIMMED,
      MatchStrategy.FUZZY,
      MatchStrategy.CONTEXT_BASED,
    ],
    minConfidence: 0.9,
    contextLines: 2,
    caseSensitive: true,
  };

  /**
   * Find a matching section of code using multiple strategies.
   *
   * @param searchText - The text to search for
   * @param sourceCode - The source code to search in
   * @param options - Optional configuration for matching behavior
   * @returns MatchResult if found, null otherwise
   */
  public findMatch(
    searchText: string,
    sourceCode: string,
    options?: MatchOptions,
  ): MatchResult | null {
    if (!searchText || !sourceCode) {
      return null;
    }

    const opts: Required<MatchOptions> = {
      ...this.defaultOptions,
      ...options,
    };

    // Try each strategy in order
    for (const strategy of opts.strategies) {
      let result: MatchResult | null = null;

      switch (strategy) {
        case MatchStrategy.EXACT:
          result = this.exactMatch(searchText, sourceCode, opts);
          break;
        case MatchStrategy.WHITESPACE_NORMALIZED:
          result = this.whitespaceNormalizedMatch(searchText, sourceCode, opts);
          break;
        case MatchStrategy.LINE_TRIMMED:
          result = this.lineTrimmedMatch(searchText, sourceCode, opts);
          break;
        case MatchStrategy.FUZZY:
          result = this.fuzzyMatch(searchText, sourceCode, opts);
          break;
        case MatchStrategy.CONTEXT_BASED:
          result = this.contextBasedMatch(searchText, sourceCode, opts);
          break;
      }

      if (result && result.confidence >= opts.minConfidence) {
        return result;
      }
    }

    return null;
  }

  /**
   * Perform exact character-by-character matching.
   * Tries both raw and normalized text for better AI-generated text handling.
   *
   * @param searchText - The text to search for
   * @param sourceCode - The source code to search in
   * @param options - Matching options
   * @returns MatchResult if found, null otherwise
   */
  private exactMatch(
    searchText: string,
    sourceCode: string,
    options: Required<MatchOptions>,
  ): MatchResult | null {
    const search = options.caseSensitive
      ? searchText
      : searchText.toLowerCase();
    const source = options.caseSensitive
      ? sourceCode
      : sourceCode.toLowerCase();

    // Try exact match first
    let index = source.indexOf(search);

    // If no exact match, try with normalized text
    if (index === -1) {
      const normalizedSearch = options.caseSensitive
        ? normalizeString(searchText)
        : normalizeString(searchText).toLowerCase();
      const normalizedSource = options.caseSensitive
        ? normalizeString(sourceCode)
        : normalizeString(sourceCode).toLowerCase();

      index = normalizedSource.indexOf(normalizedSearch);

      if (index !== -1) {
        // Found in normalized text, need to map back to original position
        // For simplicity, we'll use the same index (works well for most cases)
        return this.createMatchResult(
          index,
          index + searchText.length,
          sourceCode,
          MatchStrategy.EXACT,
          0.99, // Slightly lower confidence since we needed normalization
        );
      }
    }

    if (index === -1) {
      return null;
    }

    return this.createMatchResult(
      index,
      index + searchText.length,
      sourceCode,
      MatchStrategy.EXACT,
      1.0,
    );
  }

  /**
   * Match with normalized whitespace (spaces, tabs, line endings).
   *
   * @param searchText - The text to search for
   * @param sourceCode - The source code to search in
   * @param options - Matching options
   * @returns MatchResult if found, null otherwise
   */
  private whitespaceNormalizedMatch(
    searchText: string,
    sourceCode: string,
    options: Required<MatchOptions>,
  ): MatchResult | null {
    const normalizedSearch = this.normalizeWhitespace(searchText);
    const normalizedSource = this.normalizeWhitespace(sourceCode);

    const search = options.caseSensitive
      ? normalizedSearch
      : normalizedSearch.toLowerCase();
    const source = options.caseSensitive
      ? normalizedSource
      : normalizedSource.toLowerCase();

    const index = source.indexOf(search);

    if (index === -1) {
      return null;
    }

    // Map back to original position in sourceCode
    const originalPos = this.mapNormalizedToOriginal(
      sourceCode,
      normalizedSource,
      index,
      search.length,
    );

    if (!originalPos) {
      return null;
    }

    return this.createMatchResult(
      originalPos.start,
      originalPos.end,
      sourceCode,
      MatchStrategy.WHITESPACE_NORMALIZED,
      0.99,
    );
  }

  /**
   * Line-trimmed match: trims each line individually while preserving line structure.
   * This handles cases where AI models add/remove indentation inconsistently.
   *
   * Guardrail: First and last non-empty lines must match exactly after trimming
   * to prevent false positives from similar code blocks.
   *
   * @param searchText - The text to search for
   * @param sourceCode - The source code to search in
   * @param options - Matching options
   * @returns MatchResult if found, null otherwise
   */
  private lineTrimmedMatch(
    searchText: string,
    sourceCode: string,
    options: Required<MatchOptions>,
  ): MatchResult | null {
    // Split into lines and trim each line individually
    const searchLines = searchText.split("\n").map((line) => line.trim());
    const sourceLines = sourceCode.split("\n");
    const trimmedSourceLines = sourceLines.map((line) => line.trim());

    // Get non-empty lines for anchor validation
    const searchNonEmpty = searchLines.filter((line) => line.length > 0);
    if (searchNonEmpty.length === 0) {
      return null;
    }

    // Apply case sensitivity to trimmed lines
    const searchLinesToMatch = options.caseSensitive
      ? searchLines
      : searchLines.map((l) => l.toLowerCase());
    const sourceLinesToMatch = options.caseSensitive
      ? trimmedSourceLines
      : trimmedSourceLines.map((l) => l.toLowerCase());

    // Slide through source looking for a match
    const searchLen = searchLines.length;
    for (let i = 0; i <= sourceLines.length - searchLen; i++) {
      let allMatch = true;

      // Check if all lines match after trimming
      for (let j = 0; j < searchLen; j++) {
        if (searchLinesToMatch[j] !== sourceLinesToMatch[i + j]) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        // Anchor guardrail: verify first and last non-empty lines match exactly
        // This prevents false positives where trimming makes different code look similar
        const firstNonEmpty = searchNonEmpty[0];
        const lastNonEmpty = searchNonEmpty[searchNonEmpty.length - 1];

        // Find corresponding non-empty lines in matched source
        let sourceFirstNonEmpty = "";
        let sourceLastNonEmpty = "";
        for (let j = i; j < i + searchLen; j++) {
          const trimmed = trimmedSourceLines[j];
          if (trimmed.length > 0) {
            if (!sourceFirstNonEmpty) {
              sourceFirstNonEmpty = trimmed;
            }
            sourceLastNonEmpty = trimmed;
          }
        }

        // Apply case sensitivity to anchor comparison
        const anchor1Match = options.caseSensitive
          ? firstNonEmpty === sourceFirstNonEmpty
          : firstNonEmpty.toLowerCase() === sourceFirstNonEmpty.toLowerCase();
        const anchor2Match = options.caseSensitive
          ? lastNonEmpty === sourceLastNonEmpty
          : lastNonEmpty.toLowerCase() === sourceLastNonEmpty.toLowerCase();

        if (!anchor1Match || !anchor2Match) {
          continue; // Anchors don't match, try next position
        }

        // Calculate character positions
        const startPos = this.lineToCharPos(sourceCode, i);
        const endPos =
          i + searchLen >= sourceLines.length
            ? sourceCode.length
            : this.lineToCharPos(sourceCode, i + searchLen);

        return this.createMatchResult(
          startPos,
          endPos,
          sourceCode,
          MatchStrategy.LINE_TRIMMED,
          0.98, // High confidence but slightly below exact/whitespace-normalized
        );
      }
    }

    return null;
  }

  /**
   * Fuzzy match using Levenshtein distance.
   * Scans through the source code looking for the best match.
   *
   * @param searchText - The text to search for
   * @param sourceCode - The source code to search in
   * @param options - Matching options
   * @returns MatchResult if found, null otherwise
   */
  private fuzzyMatch(
    searchText: string,
    sourceCode: string,
    options: Required<MatchOptions>,
  ): MatchResult | null {
    const searchLen = searchText.length;
    if (searchLen === 0 || sourceCode.length < searchLen) {
      return null;
    }

    // PERFORMANCE: Add timeout protection to prevent browser freezing
    const maxExecutionTime = 2000; // 2 seconds max
    const startTime = Date.now();

    let bestMatch: {
      start: number;
      end: number;
      confidence: number;
    } | null = null;

    // PERFORMANCE: Increase step size for large files to reduce iterations
    const stepSize =
      sourceCode.length > 10000
        ? Math.max(10, Math.floor(searchLen / 5)) // Larger steps for big files
        : Math.max(1, Math.floor(searchLen / 10)); // Fine-grained for smaller files

    for (let i = 0; i <= sourceCode.length - searchLen; i += stepSize) {
      // PERFORMANCE: Check timeout every 100 iterations to prevent infinite hangs
      if (i % 100 === 0 && Date.now() - startTime > maxExecutionTime) {
        console.warn(
          `⚠️ Fuzzy match timeout after ${maxExecutionTime}ms - returning best match found so far`,
        );
        break;
      }

      const candidate = sourceCode.slice(i, i + searchLen);
      const confidence = this.calculateSimilarity(searchText, candidate);

      if (
        confidence >= options.minConfidence &&
        (!bestMatch || confidence > bestMatch.confidence)
      ) {
        bestMatch = {
          start: i,
          end: i + searchLen,
          confidence,
        };

        // If we found a perfect or near-perfect match, stop searching
        if (confidence >= 0.99) {
          break;
        }
      }
    }

    // Also try with slight length variations (±10%)
    // PERFORMANCE: Only do this if we haven't exceeded timeout
    if (
      (!bestMatch || bestMatch.confidence < 0.95) &&
      Date.now() - startTime < maxExecutionTime
    ) {
      const minLen = Math.floor(searchLen * 0.9);
      const maxLen = Math.floor(searchLen * 1.1);

      for (let len = minLen; len <= maxLen; len++) {
        // Check timeout for length variation loop as well
        if (Date.now() - startTime > maxExecutionTime) {
          console.warn(
            `⚠️ Fuzzy match timeout during length variation - stopping early`,
          );
          break;
        }

        if (len === searchLen) {
          continue; // Already tried this
        }

        for (
          let i = 0;
          i <= sourceCode.length - len;
          i += Math.max(1, Math.floor(len / 10))
        ) {
          const candidate = sourceCode.slice(i, i + len);
          const confidence = this.calculateSimilarity(searchText, candidate);

          if (
            confidence >= options.minConfidence &&
            (!bestMatch || confidence > bestMatch.confidence)
          ) {
            bestMatch = {
              start: i,
              end: i + len,
              confidence,
            };

            if (confidence >= 0.99) {
              break;
            }
          }
        }

        if (bestMatch && bestMatch.confidence >= 0.99) {
          break;
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    return this.createMatchResult(
      bestMatch.start,
      bestMatch.end,
      sourceCode,
      MatchStrategy.FUZZY,
      bestMatch.confidence,
    );
  }

  /**
   * Match based on surrounding context lines.
   * Useful when the exact text has changed but the context is recognizable.
   *
   * @param searchText - The text to search for
   * @param sourceCode - The source code to search in
   * @param options - Matching options
   * @returns MatchResult if found, null otherwise
   */
  private contextBasedMatch(
    searchText: string,
    sourceCode: string,
    options: Required<MatchOptions>,
  ): MatchResult | null {
    const searchLines = searchText.split("\n");
    const sourceLines = sourceCode.split("\n");

    if (searchLines.length === 0 || sourceLines.length === 0) {
      return null;
    }

    const contextLines = options.contextLines;

    let bestMatch: {
      startLine: number;
      endLine: number;
      confidence: number;
    } | null = null;

    // Try to match the first and last few lines as context
    for (let i = 0; i <= sourceLines.length - searchLines.length; i++) {
      let matchedLines = 0;
      let totalLines = 0;

      // Check first few lines
      for (let j = 0; j < Math.min(contextLines, searchLines.length); j++) {
        totalLines++;
        let searchLine = this.normalizeWhitespace(searchLines[j]);
        let sourceLine = this.normalizeWhitespace(sourceLines[i + j]);

        // Respect case sensitivity option
        if (!options.caseSensitive) {
          searchLine = searchLine.toLowerCase();
          sourceLine = sourceLine.toLowerCase();
        }

        const similarity = this.calculateSimilarity(searchLine, sourceLine);
        if (similarity >= 0.8) {
          matchedLines++;
        }
      }

      // Check last few lines
      if (searchLines.length > contextLines) {
        for (
          let j = Math.max(contextLines, searchLines.length - contextLines);
          j < searchLines.length;
          j++
        ) {
          totalLines++;
          if (i + j >= sourceLines.length) {
            break;
          }

          let searchLine = this.normalizeWhitespace(searchLines[j]);
          let sourceLine = this.normalizeWhitespace(sourceLines[i + j]);

          // Respect case sensitivity option
          if (!options.caseSensitive) {
            searchLine = searchLine.toLowerCase();
            sourceLine = sourceLine.toLowerCase();
          }

          const similarity = this.calculateSimilarity(searchLine, sourceLine);
          if (similarity >= 0.8) {
            matchedLines++;
          }
        }
      }

      const confidence = totalLines > 0 ? matchedLines / totalLines : 0;

      if (
        confidence >= options.minConfidence &&
        (!bestMatch || confidence > bestMatch.confidence)
      ) {
        bestMatch = {
          startLine: i,
          endLine: i + searchLines.length - 1,
          confidence,
        };
      }
    }

    if (!bestMatch) {
      return null;
    }

    // Convert line numbers to character positions
    const startPos = this.lineToCharPos(sourceCode, bestMatch.startLine);
    const endPos =
      this.lineToCharPos(sourceCode, bestMatch.endLine + 1) ||
      sourceCode.length;

    return this.createMatchResult(
      startPos,
      endPos,
      sourceCode,
      MatchStrategy.CONTEXT_BASED,
      bestMatch.confidence,
    );
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance.
   * Returns a value between 0 (completely different) and 1 (identical).
   *
   * Applies text normalization to handle AI-generated text quirks like
   * smart quotes and typographic characters.
   *
   * PERFORMANCE: Includes early exit optimization to skip expensive
   * Levenshtein calculation for obvious non-matches.
   *
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score (0-1)
   */
  public calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) {
      return 1.0;
    }
    if (str1.length === 0 || str2.length === 0) {
      return 0.0;
    }

    // PERFORMANCE: Quick length-based pre-filter to avoid expensive Levenshtein
    // If strings differ by >20% in length, similarity can't be >80%
    const lengthDiff = Math.abs(str1.length - str2.length);
    const maxLen = Math.max(str1.length, str2.length);

    if (lengthDiff / maxLen > 0.2) {
      // Skip expensive normalization and Levenshtein for obvious non-matches
      return 1 - lengthDiff / maxLen;
    }

    // Normalize both strings to handle smart quotes, typographic characters, etc.
    const normalized1 = normalizeString(str1);
    const normalized2 = normalizeString(str2);

    // Check if they're identical after normalization
    if (normalized1 === normalized2) {
      return 1.0;
    }

    const normalizedMaxLen = Math.max(normalized1.length, normalized2.length);
    const dist = distance(normalized1, normalized2);

    return 1 - dist / normalizedMaxLen;
  }

  /**
   * Normalize whitespace in text while preserving relative indentation.
   * - Converts CRLF to LF
   * - Trims leading/trailing whitespace per line
   * - Converts multiple spaces to single space
   * - Normalizes tabs to spaces
   *
   * @param text - Text to normalize
   * @returns Normalized text
   */
  public normalizeWhitespace(text: string): string {
    return (
      text
        // Normalize line endings
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Split into lines
        .split("\n")
        .map((line) => {
          // Convert tabs to spaces
          const withSpaces = line.replace(/\t/g, "  ");
          // Trim and collapse multiple spaces
          return withSpaces.trim().replace(/\s+/g, " ");
        })
        .join("\n")
        // Collapse multiple consecutive blank lines to single blank line
        .replace(/\n{3,}/g, "\n\n")
        // Also handle case where AI omits blank lines entirely
        .replace(/\n\n+/g, "\n")
    );
  }

  /**
   * Extract context lines around a specific line in source code.
   *
   * @param code - Source code
   * @param startLine - Starting line number (0-indexed)
   * @param contextLines - Number of lines before and after to include
   * @returns Extracted context
   */
  public extractContext(
    code: string,
    startLine: number,
    contextLines: number,
  ): string {
    const lines = code.split("\n");
    const start = Math.max(0, startLine - contextLines);
    const end = Math.min(lines.length, startLine + contextLines + 1);

    return lines.slice(start, end).join("\n");
  }

  /**
   * Convert line number to character position in source code.
   *
   * @param code - Source code
   * @param lineNum - Line number (0-indexed)
   * @returns Character position
   */
  private lineToCharPos(code: string, lineNum: number): number {
    const lines = code.split("\n");
    let pos = 0;

    for (let i = 0; i < lineNum && i < lines.length; i++) {
      pos += lines[i].length + 1; // +1 for newline
    }

    return pos;
  }

  /**
   * Convert character position to line number in source code.
   *
   * @param code - Source code
   * @param charPos - Character position
   * @returns Line number (1-indexed)
   */
  private charPosToLine(code: string, charPos: number): number {
    let line = 1;
    for (let i = 0; i < charPos && i < code.length; i++) {
      if (code[i] === "\n") {
        line++;
      }
    }
    return line;
  }

  /**
   * Map a position in normalized text back to the original text.
   *
   * @param original - Original text
   * @param normalized - Normalized text
   * @param normalizedStart - Start position in normalized text
   * @param normalizedLength - Length in normalized text
   * @returns Start and end positions in original text, or null if mapping fails
   */
  private mapNormalizedToOriginal(
    original: string,
    normalized: string,
    normalizedStart: number,
    normalizedLength: number,
  ): { start: number; end: number } | null {
    let normalizedPos = 0;
    let originalPos = 0;
    let foundStart = -1;
    let foundEnd = -1;

    const originalLines = original.split("\n");
    const normalizedLines = normalized.split("\n");

    let origLineIdx = 0;
    let normLineIdx = 0;

    while (
      origLineIdx < originalLines.length &&
      normLineIdx < normalizedLines.length
    ) {
      const origLine = originalLines[origLineIdx];
      const normLine = normalizedLines[normLineIdx];

      // Check if we're at the start position
      if (foundStart === -1 && normalizedPos >= normalizedStart) {
        foundStart = originalPos;
      }

      // Check if we're at the end position
      if (
        foundStart !== -1 &&
        normalizedPos >= normalizedStart + normalizedLength
      ) {
        foundEnd = originalPos;
        break;
      }

      // Move forward
      originalPos += origLine.length + 1; // +1 for newline
      normalizedPos += normLine.length + 1;

      origLineIdx++;
      normLineIdx++;
    }

    // Handle case where end extends to end of file
    if (foundStart !== -1 && foundEnd === -1) {
      foundEnd = original.length;
    }

    if (foundStart === -1 || foundEnd === -1) {
      return null;
    }

    return { start: foundStart, end: foundEnd };
  }

  /**
   * Create a MatchResult from position information.
   *
   * @param startPos - Start character position
   * @param endPos - End character position
   * @param sourceCode - Source code
   * @param strategy - Strategy used
   * @param confidence - Confidence score
   * @returns MatchResult
   */
  private createMatchResult(
    startPos: number,
    endPos: number,
    sourceCode: string,
    strategy: MatchStrategy,
    confidence: number,
  ): MatchResult {
    return {
      startPos,
      endPos,
      startLine: this.charPosToLine(sourceCode, startPos),
      endLine: this.charPosToLine(sourceCode, endPos),
      strategy,
      confidence,
      matchedText: sourceCode.slice(startPos, endPos),
    };
  }

  /**
   * Find the closest match even if below threshold.
   * This is used for error feedback to help models self-correct.
   *
   * @param searchText - The text to search for
   * @param sourceCode - The source code to search in
   * @param options - Optional configuration for matching behavior
   * @returns Object with confidence, matchedText, and startLine, or null if no candidate found
   */
  public findClosestMatch(
    searchText: string,
    sourceCode: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: MatchOptions,
  ): { confidence: number; matchedText: string; startLine: number } | null {
    if (!searchText || !sourceCode) {
      return null;
    }

    const searchLen = searchText.length;
    if (searchLen === 0 || sourceCode.length < searchLen) {
      return null;
    }

    let bestMatch: {
      start: number;
      confidence: number;
    } | null = null;

    // Use a reasonable step size for performance
    const stepSize = Math.max(1, Math.floor(searchLen / 20));

    // Scan through source looking for the best match (regardless of threshold)
    for (let i = 0; i <= sourceCode.length - searchLen; i += stepSize) {
      const candidate = sourceCode.slice(i, i + searchLen);
      const confidence = this.calculateSimilarity(searchText, candidate);

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          start: i,
          confidence,
        };

        // If we found a very high match, stop early
        if (confidence >= 0.95) {
          break;
        }
      }
    }

    // Also try with slight length variations (±15%)
    const minLen = Math.floor(searchLen * 0.85);
    const maxLen = Math.min(sourceCode.length, Math.floor(searchLen * 1.15));

    for (
      let len = minLen;
      len <= maxLen;
      len += Math.max(1, Math.floor((maxLen - minLen) / 10))
    ) {
      if (len === searchLen) {
        continue;
      } // Already tried

      for (let i = 0; i <= sourceCode.length - len; i += stepSize * 2) {
        const candidate = sourceCode.slice(i, i + len);
        const confidence = this.calculateSimilarity(searchText, candidate);

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            start: i,
            confidence,
          };
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    // Extract the matched text at actual search length for display
    const matchEnd = Math.min(bestMatch.start + searchLen, sourceCode.length);
    const matchedText = sourceCode.slice(bestMatch.start, matchEnd);

    return {
      confidence: bestMatch.confidence,
      matchedText,
      startLine: this.charPosToLine(sourceCode, bestMatch.start),
    };
  }
}
