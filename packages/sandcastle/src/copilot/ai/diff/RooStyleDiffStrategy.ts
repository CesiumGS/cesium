import { DiffMatcher } from "./DiffMatcher";
import {
  MatchStrategy,
  type DiffBlock,
  type MatchResult,
  type MatchOptions,
} from "../types";

interface IndentationInfo {
  /** The literal indentation prefix (spaces or tabs). */
  indent: string;
  /** Indentation level (number of indent units). */
  level: number;
  type: "tabs" | "spaces";
  /** Size of one indent unit: 2 or 4 for spaces, 1 for tabs. */
  size: number;
}

/**
 * Diff strategy inspired by Roo Code: middle-out fuzzy search to reduce false
 * matches on large files, plus indentation reconciliation on replacement.
 */
export class RooStyleDiffStrategy {
  private matcher: DiffMatcher;

  constructor(matcher?: DiffMatcher) {
    this.matcher = matcher || new DiffMatcher();
  }

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
      const match = await this.middleOutSearch(
        sourceCode,
        diff.search,
        options,
      );

      if (!match) {
        return {
          success: false,
          error: "No match found for search pattern",
        };
      }

      const sourceIndent = this.detectIndentation(sourceCode, match.startPos);

      const adjustedReplace = this.adjustIndentation(
        diff.replace,
        diff.search,
        sourceIndent,
      );

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

  /** Search outward from the middle of the file to reduce false matches on big files. */
  private async middleOutSearch(
    sourceCode: string,
    searchPattern: string,
    options?: MatchOptions,
  ): Promise<MatchResult | null> {
    const lines = sourceCode.split("\n");
    const middleIndex = Math.floor(lines.length / 2);

    const searchOrder = this.generateMiddleOutSearchOrder(
      lines.length,
      middleIndex,
    );

    for (const { startLine, endLine } of searchOrder) {
      const chunkStartPos = this.getCharPosition(lines, startLine);
      const chunkEndPos = this.getCharPosition(lines, endLine);
      const chunk = sourceCode.substring(chunkStartPos, chunkEndPos);

      const result = this.matcher.findMatch(searchPattern, chunk, {
        ...options,
        strategies: [
          MatchStrategy.EXACT,
          MatchStrategy.WHITESPACE_NORMALIZED,
          MatchStrategy.FUZZY,
        ],
      });

      if (result) {
        // Translate chunk-local positions back into whole-file coordinates.
        return {
          ...result,
          startPos: chunkStartPos + result.startPos,
          endPos: chunkStartPos + result.endPos,
          startLine: startLine + result.startLine - 1,
          endLine: startLine + result.endLine - 1,
        };
      }
    }

    return this.matcher.findMatch(searchPattern, sourceCode, options);
  }

  /**
   * Produce [startLine, endLine) chunks in middle-out search order. Chunks are
   * ~20% of the file (min 20 lines) so search cost stays bounded per chunk.
   */
  private generateMiddleOutSearchOrder(
    totalLines: number,
    middleIndex: number,
  ): Array<{ startLine: number; endLine: number }> {
    const chunkSize = Math.max(20, Math.floor(totalLines / 5));
    const chunks: Array<{ startLine: number; endLine: number }> = [];

    let midStart = Math.max(
      0,
      Math.floor(middleIndex - Math.floor(chunkSize / 2)),
    );
    let midEnd = Math.min(
      totalLines,
      Math.floor(middleIndex + Math.floor(chunkSize / 2)),
    );
    chunks.push({ startLine: midStart, endLine: midEnd });

    let backwardStart = midStart - chunkSize;
    let forwardEnd = midEnd + chunkSize;

    while (backwardStart >= 0 || forwardEnd <= totalLines) {
      if (backwardStart >= 0) {
        chunks.push({
          startLine: Math.max(0, backwardStart),
          endLine: midStart,
        });
        midStart = backwardStart;
        backwardStart -= chunkSize;
      }

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

  private getCharPosition(lines: string[], lineNumber: number): number {
    let pos = 0;
    for (let i = 0; i < lineNumber && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    return pos;
  }

  /** Inspect the line containing `position` to infer its indentation character and unit size. */
  private detectIndentation(
    sourceCode: string,
    position: number,
  ): IndentationInfo {
    const beforePos = sourceCode.substring(0, position);
    const lines = beforePos.split("\n");
    const currentLine = lines[lines.length - 1];

    const match = currentLine.match(/^(\s*)/);
    const indent = match ? match[1] : "";

    const usesTabs = indent.includes("\t");
    const type = usesTabs ? "tabs" : "spaces";

    let size = 1;
    if (!usesTabs && indent.length > 0) {
      // Guess 4-space indent when the count is a multiple of 4, otherwise 2.
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
   * Shift each line of `replaceCode` by the indent delta between the search
   * pattern and the matched source line, so the replacement lands at the
   * correct nesting level.
   */
  private adjustIndentation(
    replaceCode: string,
    searchCode: string,
    sourceIndent: IndentationInfo,
  ): string {
    const searchLines = searchCode.split("\n");
    const searchFirstLine = searchLines[0] || "";
    const searchIndentMatch = searchFirstLine.match(/^(\s*)/);
    const searchIndent = searchIndentMatch ? searchIndentMatch[1] : "";

    const sourceTotalIndent = sourceIndent.indent.length;
    const searchTotalIndent = searchIndent.length;
    const indentDiff = sourceTotalIndent - searchTotalIndent;

    if (indentDiff === 0) {
      return replaceCode;
    }

    const replaceLines = replaceCode.split("\n");
    const adjustedLines = replaceLines.map((line) => {
      if (line.trim().length === 0) {
        return line;
      }

      if (indentDiff > 0) {
        const additionalIndent =
          sourceIndent.type === "tabs"
            ? "\t".repeat(Math.floor(indentDiff / sourceIndent.size))
            : " ".repeat(indentDiff);
        return additionalIndent + line;
      }
      const removeCount = Math.abs(indentDiff);
      if (sourceIndent.type === "tabs") {
        return line.replace(new RegExp(`^\t{1,${removeCount}}`), "");
      }
      return line.replace(new RegExp(`^ {1,${removeCount}}`), "");
    });

    return adjustedLines.join("\n");
  }
}
