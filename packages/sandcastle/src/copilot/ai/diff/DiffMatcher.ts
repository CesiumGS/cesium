import { distance } from "fastest-levenshtein";
import { MatchStrategy, MatchResult, MatchOptions } from "../types";
import { normalizeString } from "../utils/textNormalization";

/** Maximum time allowed for fuzzy matching before returning best result found */
const FUZZY_MATCH_TIMEOUT_MS = 2000;

/** Source code length above which we use coarser step sizes for performance */
const LARGE_FILE_THRESHOLD = 10000;

/** Confidence at or above which we consider a match near-perfect and stop searching */
const NEAR_PERFECT_CONFIDENCE = 0.99;

/**
 * Locates a search pattern inside source code using a cascade of increasingly
 * permissive strategies (exact -> whitespace-normalized -> line-trimmed -> fuzzy -> context).
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

  /** Exact substring match, with a normalized-text fallback for smart-quote/typography drift. */
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

    let index = source.indexOf(search);

    if (index === -1) {
      const normalizedSearch = options.caseSensitive
        ? normalizeString(searchText)
        : normalizeString(searchText).toLowerCase();
      const normalizedSource = options.caseSensitive
        ? normalizeString(sourceCode)
        : normalizeString(sourceCode).toLowerCase();

      index = normalizedSource.indexOf(normalizedSearch);

      if (index !== -1) {
        // Reuse the normalized index as the original offset - good enough for typical ASCII drift.
        return this.createMatchResult(
          index,
          index + searchText.length,
          sourceCode,
          MatchStrategy.EXACT,
          0.99,
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
   * Handles inconsistent AI indentation by trimming each line, with an anchor
   * guardrail requiring the first/last non-empty lines to match exactly after trim.
   */
  private lineTrimmedMatch(
    searchText: string,
    sourceCode: string,
    options: Required<MatchOptions>,
  ): MatchResult | null {
    const searchLines = searchText.split("\n").map((line) => line.trim());
    const sourceLines = sourceCode.split("\n");
    const trimmedSourceLines = sourceLines.map((line) => line.trim());

    const searchNonEmpty = searchLines.filter((line) => line.length > 0);
    if (searchNonEmpty.length === 0) {
      return null;
    }

    const searchLinesToMatch = options.caseSensitive
      ? searchLines
      : searchLines.map((l) => l.toLowerCase());
    const sourceLinesToMatch = options.caseSensitive
      ? trimmedSourceLines
      : trimmedSourceLines.map((l) => l.toLowerCase());

    const searchLen = searchLines.length;
    for (let i = 0; i <= sourceLines.length - searchLen; i++) {
      let allMatch = true;

      for (let j = 0; j < searchLen; j++) {
        if (searchLinesToMatch[j] !== sourceLinesToMatch[i + j]) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        // Anchor guardrail: trimming can make unrelated code blocks look equal.
        const firstNonEmpty = searchNonEmpty[0];
        const lastNonEmpty = searchNonEmpty[searchNonEmpty.length - 1];

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

        const anchor1Match = options.caseSensitive
          ? firstNonEmpty === sourceFirstNonEmpty
          : firstNonEmpty.toLowerCase() === sourceFirstNonEmpty.toLowerCase();
        const anchor2Match = options.caseSensitive
          ? lastNonEmpty === sourceLastNonEmpty
          : lastNonEmpty.toLowerCase() === sourceLastNonEmpty.toLowerCase();

        if (!anchor1Match || !anchor2Match) {
          continue;
        }

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
          0.98,
        );
      }
    }

    return null;
  }

  /** Fuzzy Levenshtein scan; bounded by FUZZY_MATCH_TIMEOUT_MS to avoid stalling on large files. */
  private fuzzyMatch(
    searchText: string,
    sourceCode: string,
    options: Required<MatchOptions>,
  ): MatchResult | null {
    const searchLen = searchText.length;
    if (searchLen === 0 || sourceCode.length < searchLen) {
      return null;
    }

    const startTime = Date.now();

    let bestMatch: {
      start: number;
      end: number;
      confidence: number;
    } | null = null;

    const stepSize =
      sourceCode.length > LARGE_FILE_THRESHOLD
        ? Math.max(10, Math.floor(searchLen / 5))
        : Math.max(1, Math.floor(searchLen / 10));

    for (let i = 0; i <= sourceCode.length - searchLen; i += stepSize) {
      // Timeout check every 100 iterations keeps worst-case bounded on huge files.
      if (i % 100 === 0 && Date.now() - startTime > FUZZY_MATCH_TIMEOUT_MS) {
        console.warn(
          `Fuzzy match timeout after ${FUZZY_MATCH_TIMEOUT_MS}ms - returning best match found so far`,
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

        if (confidence >= NEAR_PERFECT_CONFIDENCE) {
          break;
        }
      }
    }

    // Retry with slight length variations (+-10%) in case the AI added or dropped a token.
    if (
      (!bestMatch || bestMatch.confidence < 0.95) &&
      Date.now() - startTime < FUZZY_MATCH_TIMEOUT_MS
    ) {
      const minLen = Math.floor(searchLen * 0.9);
      const maxLen = Math.floor(searchLen * 1.1);

      for (let len = minLen; len <= maxLen; len++) {
        if (Date.now() - startTime > FUZZY_MATCH_TIMEOUT_MS) {
          console.warn(
            `Fuzzy match timeout during length variation - stopping early`,
          );
          break;
        }

        if (len === searchLen) {
          continue;
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

            if (confidence >= NEAR_PERFECT_CONFIDENCE) {
              break;
            }
          }
        }

        if (bestMatch && bestMatch.confidence >= NEAR_PERFECT_CONFIDENCE) {
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

  /** Match by the surrounding context lines, for when the exact body has drifted. */
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

    for (let i = 0; i <= sourceLines.length - searchLines.length; i++) {
      let matchedLines = 0;
      let totalLines = 0;

      for (let j = 0; j < Math.min(contextLines, searchLines.length); j++) {
        totalLines++;
        let searchLine = this.normalizeWhitespace(searchLines[j]);
        let sourceLine = this.normalizeWhitespace(sourceLines[i + j]);

        if (!options.caseSensitive) {
          searchLine = searchLine.toLowerCase();
          sourceLine = sourceLine.toLowerCase();
        }

        const similarity = this.calculateSimilarity(searchLine, sourceLine);
        if (similarity >= 0.8) {
          matchedLines++;
        }
      }

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

  /** 0 to 1 similarity after text normalization, with a length-diff early exit. */
  public calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) {
      return 1.0;
    }
    if (str1.length === 0 || str2.length === 0) {
      return 0.0;
    }

    // Length differing by >20% caps similarity under 80%, so skip the expensive distance call.
    const lengthDiff = Math.abs(str1.length - str2.length);
    const maxLen = Math.max(str1.length, str2.length);

    if (lengthDiff / maxLen > 0.2) {
      return 1 - lengthDiff / maxLen;
    }

    const normalized1 = normalizeString(str1);
    const normalized2 = normalizeString(str2);

    if (normalized1 === normalized2) {
      return 1.0;
    }

    const normalizedMaxLen = Math.max(normalized1.length, normalized2.length);
    const dist = distance(normalized1, normalized2);

    return 1 - dist / normalizedMaxLen;
  }

  /** Canonicalizes line endings, indentation, and run-of-whitespace so differently-formatted text can compare equal. */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => {
        const withSpaces = line.replace(/\t/g, "  ");
        return withSpaces.trim().replace(/\s+/g, " ");
      })
      .join("\n")
      .replace(/\n{2,}/g, "\n");
  }

  private lineToCharPos(code: string, lineNum: number): number {
    const lines = code.split("\n");
    let pos = 0;

    for (let i = 0; i < lineNum && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }

    return pos;
  }

  /** Returns a 1-indexed line number for a character offset. */
  private charPosToLine(code: string, charPos: number): number {
    let line = 1;
    for (let i = 0; i < charPos && i < code.length; i++) {
      if (code[i] === "\n") {
        line++;
      }
    }
    return line;
  }

  /** Map a (start, length) in normalized text back to the equivalent range in the original. */
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

      if (foundStart === -1 && normalizedPos >= normalizedStart) {
        foundStart = originalPos;
      }

      if (
        foundStart !== -1 &&
        normalizedPos >= normalizedStart + normalizedLength
      ) {
        foundEnd = originalPos;
        break;
      }

      originalPos += origLine.length + 1;
      normalizedPos += normLine.length + 1;

      origLineIdx++;
      normLineIdx++;
    }

    // Match extends to EOF - pin end to original length.
    if (foundStart !== -1 && foundEnd === -1) {
      foundEnd = original.length;
    }

    if (foundStart === -1 || foundEnd === -1) {
      return null;
    }

    return { start: foundStart, end: foundEnd };
  }

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

  /** Return the closest candidate regardless of minConfidence - used to craft self-correction hints for the model. */
  public findClosestMatch(
    searchText: string,
    sourceCode: string,
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

    const stepSize = Math.max(1, Math.floor(searchLen / 20));

    for (let i = 0; i <= sourceCode.length - searchLen; i += stepSize) {
      const candidate = sourceCode.slice(i, i + searchLen);
      const confidence = this.calculateSimilarity(searchText, candidate);

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          start: i,
          confidence,
        };

        if (confidence >= 0.95) {
          break;
        }
      }
    }

    const minLen = Math.floor(searchLen * 0.85);
    const maxLen = Math.min(sourceCode.length, Math.floor(searchLen * 1.15));

    for (
      let len = minLen;
      len <= maxLen;
      len += Math.max(1, Math.floor((maxLen - minLen) / 10))
    ) {
      if (len === searchLen) {
        continue;
      }

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

    const matchEnd = Math.min(bestMatch.start + searchLen, sourceCode.length);
    const matchedText = sourceCode.slice(bestMatch.start, matchEnd);

    return {
      confidence: bestMatch.confidence,
      matchedText,
      startLine: this.charPosToLine(sourceCode, bestMatch.start),
    };
  }
}
