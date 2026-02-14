import { DiffBlock, DiffFormat, DiffParseError, ParsedDiff } from "./types";

/**
 * Parses AI-generated diff blocks from various formats.
 * Supports multiple diff formats including SEARCH/REPLACE and unified diff formats.
 *
 * @example
 * ```typescript
 * // Cline format (primary)
 * const content = `
 * ------- SEARCH
 * const oldCode = "example";
 * =======
 * const newCode = "updated";
 * +++++++ REPLACE
 * `;
 * const diffs = DiffParser.parseDiffBlocks(content);
 *
 * // Legacy format (still supported)
 * const legacyContent = `
 * <<<SEARCH>>>
 * const oldCode = "example";
 * <<<REPLACE>>>
 * const newCode = "updated";
 * `;
 * const legacyDiffs = DiffParser.parseDiffBlocks(legacyContent);
 * ```
 */
export class DiffParser {
  // Legacy format markers (for backward compatibility)
  private static readonly LEGACY_SEARCH_START = "<<<SEARCH>>>";
  private static readonly LEGACY_REPLACE_START = "<<<REPLACE>>>";
  private static readonly LEGACY_SEARCH_END = "<<<END>>>";

  // Cline format regex patterns
  private static readonly CLINE_SEARCH_START_REGEX =
    /^\s*[-]{7,}\s*SEARCH>?\s*$/m;
  private static readonly CLINE_SEARCH_END_REGEX = /^\s*[=]{7,}\s*$/m;
  private static readonly CLINE_REPLACE_END_REGEX =
    /^\s*[+]{7,}\s*REPLACE>?\s*$/m;

  // Unified diff format markers
  private static readonly UNIFIED_HEADER_PATTERN = /^\s*---\s+(.+)$/m;
  private static readonly UNIFIED_NEW_PATTERN = /^\s*\+\+\+\s+(.+)$/m;
  private static readonly UNIFIED_HUNK_PATTERN =
    /^\s*@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m;

  /**
   * Parse diff blocks from AI-generated content.
   * Automatically detects the diff format and extracts all diff blocks.
   *
   * @param content - The raw content containing diff blocks
   * @returns Array of parsed diffs with metadata
   * @throws {DiffParseError} If the content contains malformed diff blocks
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
   * Parse SEARCH/REPLACE format diffs.
   * Format (Cline): ------- SEARCH\n...\n=======\n...\n+++++++ REPLACE
   * Format (Legacy): <<<SEARCH>>>...<<<REPLACE>>>...<<<END>>> (optional)
   *
   * @param content - Content containing SEARCH/REPLACE blocks
   * @returns Array of parsed diffs
   */
  private static parseSearchReplaceDiffs(content: string): ParsedDiff[] {
    const diffs: ParsedDiff[] = [];

    // Try Cline format first (primary format)
    // Use a regex that matches the markers and captures content between them
    const clinePattern =
      /^\s*[-]{7,}\s*SEARCH>?\s*$\n([\s\S]*?)^\s*[=]{7,}\s*$\n([\s\S]*?)^\s*[+]{7,}\s*REPLACE>?\s*$/gm;

    let match;
    let index = 0;
    let hasClineFormat = false;

    while ((match = clinePattern.exec(content)) !== null) {
      hasClineFormat = true;
      const searchContent = match[1];
      const replaceContent = match[2];

      // Extract the raw block text
      const raw = match[0];

      // Validate the block has meaningful content
      if (searchContent === undefined || replaceContent === undefined) {
        throw new DiffParseError(
          "Invalid SEARCH/REPLACE block: missing search or replace content",
          "MISSING_CONTENT",
          raw,
        );
      }

      // Trim the content but preserve internal whitespace structure
      const search = searchContent.trim();
      const replace = replaceContent.trim();

      // Create the diff block
      const block: DiffBlock = {
        search,
        replace,
        format: DiffFormat.SEARCH_REPLACE,
      };

      // Validate the block
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

    // If no Cline format found, try legacy format
    if (!hasClineFormat) {
      const legacyPattern = new RegExp(
        `${this.escapeRegex(this.LEGACY_SEARCH_START)}([\\s\\S]*?)${this.escapeRegex(this.LEGACY_REPLACE_START)}([\\s\\S]*?)(?:${this.escapeRegex(this.LEGACY_SEARCH_END)}|\\n\\n|(?=${this.escapeRegex(this.LEGACY_SEARCH_START)})|$)`,
        "g",
      );

      while ((match = legacyPattern.exec(content)) !== null) {
        const searchContent = match[1];
        const replaceContent = match[2];

        // Extract the raw block text
        const raw = match[0];

        // Validate the block has meaningful content
        if (searchContent === undefined || replaceContent === undefined) {
          throw new DiffParseError(
            "Invalid SEARCH/REPLACE block: missing search or replace content",
            "MISSING_CONTENT",
            raw,
          );
        }

        // Trim the content but preserve internal whitespace structure
        const search = searchContent.trim();
        const replace = replaceContent.trim();

        // Create the diff block
        const block: DiffBlock = {
          search,
          replace,
          format: DiffFormat.SEARCH_REPLACE,
        };

        // Validate the block
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

  /**
   * Parse unified diff format.
   * Format: --- a/file\n+++ b/file\n@@ ... @@\n-old\n+new
   *
   * @param content - Content containing unified diff blocks
   * @returns Array of parsed diffs
   */
  private static parseUnifiedDiffs(content: string): ParsedDiff[] {
    const diffs: ParsedDiff[] = [];

    // Split by file headers (--- markers)
    const fileBlocks = content.split(/(?=^---\s+)/m);

    let index = 0;

    for (const fileBlock of fileBlocks) {
      if (!fileBlock.trim()) {
        continue;
      }

      // Check for valid unified diff structure
      const hasOldHeader = this.UNIFIED_HEADER_PATTERN.test(fileBlock);
      const hasNewHeader = this.UNIFIED_NEW_PATTERN.test(fileBlock);

      if (!hasOldHeader || !hasNewHeader) {
        continue; // Skip invalid blocks
      }

      // Extract hunks (@@...@@ sections)
      // Use negative lookahead to capture all lines until we hit another hunk or file header
      const hunkPattern =
        /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@[^\n]*\n((?:(?!^@@|^---).)*$(?:\n(?!^@@|^---).*$)*)/gm;
      let hunkMatch;

      while ((hunkMatch = hunkPattern.exec(fileBlock)) !== null) {
        const startLineOld = parseInt(hunkMatch[1], 10);
        // const startLineNew = parseInt(hunkMatch[3], 10); // Not currently used
        const hunkContent = hunkMatch[5];

        // Parse the hunk content to extract search and replace
        const lines = hunkContent.split("\n").filter((l) => l.length > 0);
        const searchLines: string[] = [];
        const replaceLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("-")) {
            searchLines.push(line.substring(1));
          } else if (line.startsWith("+")) {
            replaceLines.push(line.substring(1));
          } else if (line.startsWith(" ")) {
            // Context lines appear in both
            const contextLine = line.substring(1);
            searchLines.push(contextLine);
            replaceLines.push(contextLine);
          } else if (line.trim().length > 0) {
            // Treat lines without prefix as context
            searchLines.push(line);
            replaceLines.push(line);
          }
        }

        const search = searchLines.join("\n").trimEnd();
        const replace = replaceLines.join("\n").trimEnd();

        if (search.trim() === "" && replace.trim() === "") {
          continue; // Skip empty diffs
        }

        // Skip if search is empty (nothing to match)
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
          continue; // Skip invalid blocks
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

  /**
   * Validate a diff block to ensure it has valid structure.
   *
   * @param block - The diff block to validate
   * @returns True if the block is valid, false otherwise
   */
  static validateDiffBlock(block: DiffBlock): boolean {
    // Check that search and replace are defined
    if (block.search === undefined || block.replace === undefined) {
      return false;
    }

    // Empty search is not allowed (nothing to find)
    if (block.search.trim().length === 0) {
      return false;
    }

    // Empty replace is allowed (deletion)

    // Validate line numbers if provided
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

    // Validate format is a known format
    if (!Object.values(DiffFormat).includes(block.format)) {
      return false;
    }

    return true;
  }

  /**
   * Extract the diff format from content.
   * Returns null if no recognized format is found.
   *
   * @param content - The content to analyze
   * @returns The detected diff format or null
   */
  static extractDiffFormat(content: string): DiffFormat | null {
    // Check for Cline SEARCH/REPLACE format (primary)
    if (
      this.CLINE_SEARCH_START_REGEX.test(content) &&
      this.CLINE_SEARCH_END_REGEX.test(content) &&
      this.CLINE_REPLACE_END_REGEX.test(content)
    ) {
      return DiffFormat.SEARCH_REPLACE;
    }

    // Check for legacy SEARCH/REPLACE format (backward compatibility)
    if (
      content.includes(this.LEGACY_SEARCH_START) &&
      content.includes(this.LEGACY_REPLACE_START)
    ) {
      return DiffFormat.SEARCH_REPLACE;
    }

    // Check for unified diff format
    if (
      this.UNIFIED_HEADER_PATTERN.test(content) &&
      this.UNIFIED_NEW_PATTERN.test(content) &&
      this.UNIFIED_HUNK_PATTERN.test(content)
    ) {
      return DiffFormat.UNIFIED;
    }

    return null;
  }

  /**
   * Check if content contains any applicable diffs.
   * This is a quick check without full parsing.
   *
   * @param content - The content to check
   * @returns True if the content likely contains diffs
   */
  static hasApplicableDiffs(content: string): boolean {
    return this.extractDiffFormat(content) !== null;
  }

  /**
   * Escape special regex characters in a string.
   *
   * @param str - String to escape
   * @returns Escaped string safe for use in RegExp
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
