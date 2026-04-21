import { DiffBlock, DiffFormat, DiffParseError, ParsedDiff } from "../types";

/** Parses AI-generated diff blocks in either Cline SEARCH/REPLACE format or unified-diff format. */
export class DiffParser {
  private static readonly LEGACY_SEARCH_START = "<<<SEARCH>>>";
  private static readonly LEGACY_REPLACE_START = "<<<REPLACE>>>";
  private static readonly LEGACY_SEARCH_END = "<<<END>>>";

  private static readonly CLINE_SEARCH_START_REGEX =
    /^\s*[-]{7,}\s*SEARCH>?\s*$/m;
  private static readonly CLINE_SEARCH_END_REGEX = /^\s*[=]{7,}\s*$/m;
  private static readonly CLINE_REPLACE_END_REGEX =
    /^\s*[+]{7,}\s*REPLACE>?\s*$/m;

  private static readonly UNIFIED_HEADER_PATTERN = /^\s*---\s+(.+)$/m;
  private static readonly UNIFIED_NEW_PATTERN = /^\s*\+\+\+\s+(.+)$/m;
  private static readonly UNIFIED_HUNK_PATTERN =
    /^\s*@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m;

  /**
   * Auto-detect format and extract all diff blocks.
   * @throws {DiffParseError} If a block is structurally present but malformed.
   */
  static parseDiffBlocks(content: string): ParsedDiff[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const format = this.extractDiffFormat(content);
    if (!format) {
      return [];
    }

    switch (format) {
      case DiffFormat.SEARCH_REPLACE:
        return this.parseSearchReplaceDiffs(content);
      case DiffFormat.UNIFIED:
        return this.parseUnifiedDiffs(content);
      default:
        return [];
    }
  }

  /**
   * Parse SEARCH/REPLACE diffs. Tries the primary Cline marker format
   * (------- SEARCH / ======= / +++++++ REPLACE); falls back to the legacy
   * <<<SEARCH>>>/<<<REPLACE>>> marker pair only if no Cline blocks are present.
   */
  private static parseSearchReplaceDiffs(content: string): ParsedDiff[] {
    const diffs: ParsedDiff[] = [];

    const clinePattern =
      /^\s*[-]{7,}\s*SEARCH>?\s*$\n([\s\S]*?)^\s*[=]{7,}\s*$\n([\s\S]*?)^\s*[+]{7,}\s*REPLACE>?\s*$/gm;

    let match;
    let index = 0;
    let hasClineFormat = false;

    while ((match = clinePattern.exec(content)) !== null) {
      hasClineFormat = true;
      const searchContent = match[1];
      const replaceContent = match[2];

      const raw = match[0];

      if (searchContent === undefined || replaceContent === undefined) {
        throw new DiffParseError(
          "Invalid SEARCH/REPLACE block: missing search or replace content",
          "MISSING_CONTENT",
          raw,
        );
      }

      const search = searchContent.trim();
      const replace = replaceContent.trim();

      const block: DiffBlock = {
        search,
        replace,
        format: DiffFormat.SEARCH_REPLACE,
      };

      if (!this.validateDiffBlock(block)) {
        throw new DiffParseError(
          "Invalid diff block: validation failed",
          "VALIDATION_FAILED",
          raw,
        );
      }

      diffs.push({
        block,
        raw,
        index: index++,
      });
    }

    if (!hasClineFormat) {
      const legacyPattern = new RegExp(
        `${this.escapeRegex(this.LEGACY_SEARCH_START)}([\\s\\S]*?)${this.escapeRegex(this.LEGACY_REPLACE_START)}([\\s\\S]*?)(?:${this.escapeRegex(this.LEGACY_SEARCH_END)}|\\n\\n|(?=${this.escapeRegex(this.LEGACY_SEARCH_START)})|$)`,
        "g",
      );

      while ((match = legacyPattern.exec(content)) !== null) {
        const searchContent = match[1];
        const replaceContent = match[2];

        const raw = match[0];

        if (searchContent === undefined || replaceContent === undefined) {
          throw new DiffParseError(
            "Invalid SEARCH/REPLACE block: missing search or replace content",
            "MISSING_CONTENT",
            raw,
          );
        }

        const search = searchContent.trim();
        const replace = replaceContent.trim();

        const block: DiffBlock = {
          search,
          replace,
          format: DiffFormat.SEARCH_REPLACE,
        };

        if (!this.validateDiffBlock(block)) {
          throw new DiffParseError(
            "Invalid diff block: validation failed",
            "VALIDATION_FAILED",
            raw,
          );
        }

        diffs.push({
          block,
          raw,
          index: index++,
        });
      }
    }

    return diffs;
  }

  /** Parse unified diff: --- a/file / +++ b/file / @@ ... @@ / -old / +new. */
  private static parseUnifiedDiffs(content: string): ParsedDiff[] {
    const diffs: ParsedDiff[] = [];

    const fileBlocks = content.split(/(?=^---\s+)/m);

    let index = 0;

    for (const fileBlock of fileBlocks) {
      if (!fileBlock.trim()) {
        continue;
      }

      const hasOldHeader = this.UNIFIED_HEADER_PATTERN.test(fileBlock);
      const hasNewHeader = this.UNIFIED_NEW_PATTERN.test(fileBlock);

      if (!hasOldHeader || !hasNewHeader) {
        continue;
      }

      // Capture each hunk body up to the next @@ or file header via negative lookahead.
      const hunkPattern =
        /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@[^\n]*\n((?:(?!^@@|^---).)*$(?:\n(?!^@@|^---).*$)*)/gm;
      let hunkMatch;

      while ((hunkMatch = hunkPattern.exec(fileBlock)) !== null) {
        const startLineOld = parseInt(hunkMatch[1], 10);
        const hunkContent = hunkMatch[5];

        const lines = hunkContent.split("\n").filter((l) => l.length > 0);
        const searchLines: string[] = [];
        const replaceLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("-")) {
            searchLines.push(line.substring(1));
          } else if (line.startsWith("+")) {
            replaceLines.push(line.substring(1));
          } else if (line.startsWith(" ")) {
            const contextLine = line.substring(1);
            searchLines.push(contextLine);
            replaceLines.push(contextLine);
          } else if (line.trim().length > 0) {
            // Unprefixed non-empty line: treat as context, not an addition/removal.
            searchLines.push(line);
            replaceLines.push(line);
          }
        }

        const search = searchLines.join("\n").trimEnd();
        const replace = replaceLines.join("\n").trimEnd();

        if (search.trim() === "" && replace.trim() === "") {
          continue;
        }

        if (search.trim() === "") {
          continue;
        }

        const block: DiffBlock = {
          search,
          replace,
          startLine: startLineOld,
          endLine: startLineOld + searchLines.length - 1,
          format: DiffFormat.UNIFIED,
        };

        if (!this.validateDiffBlock(block)) {
          continue;
        }

        diffs.push({
          block,
          raw: hunkMatch[0],
          index: index++,
        });
      }
    }

    return diffs;
  }

  static validateDiffBlock(block: DiffBlock): boolean {
    if (block.search === undefined || block.replace === undefined) {
      return false;
    }

    // Empty search = nothing to find. Empty replace is allowed (deletion).
    if (block.search.trim().length === 0) {
      return false;
    }

    if (block.startLine !== undefined && block.startLine < 1) {
      return false;
    }

    if (
      block.endLine !== undefined &&
      block.startLine !== undefined &&
      block.endLine < block.startLine
    ) {
      return false;
    }

    if (!Object.values(DiffFormat).includes(block.format)) {
      return false;
    }

    return true;
  }

  static extractDiffFormat(content: string): DiffFormat | null {
    if (
      this.CLINE_SEARCH_START_REGEX.test(content) &&
      this.CLINE_SEARCH_END_REGEX.test(content) &&
      this.CLINE_REPLACE_END_REGEX.test(content)
    ) {
      return DiffFormat.SEARCH_REPLACE;
    }

    if (
      content.includes(this.LEGACY_SEARCH_START) &&
      content.includes(this.LEGACY_REPLACE_START)
    ) {
      return DiffFormat.SEARCH_REPLACE;
    }

    if (
      this.UNIFIED_HEADER_PATTERN.test(content) &&
      this.UNIFIED_NEW_PATTERN.test(content) &&
      this.UNIFIED_HUNK_PATTERN.test(content)
    ) {
      return DiffFormat.UNIFIED;
    }

    return null;
  }

  /** Cheap format check, without running the full parse. */
  static hasApplicableDiffs(content: string): boolean {
    return this.extractDiffFormat(content) !== null;
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
