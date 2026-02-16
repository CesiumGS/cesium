import { DiffParser } from "./DiffParser";
import { DiffMatcher } from "./DiffMatcher";
import { StreamingDiffProcessor } from "./StreamingDiffProcessor";
import type {
  ParsedDiff,
  MatchResult,
  MatchOptions,
  StreamChunk,
  DiffBlock,
} from "./types";

/**
 * Parses AI responses and extracts code blocks that can be applied to the editor
 */
export interface ParsedCode {
  language: "javascript" | "html";
  code: string;
  fullReplacement: boolean; // If true, replace entire file; if false, it's a snippet
}

/**
 * Result of extracting a diff-based edit from AI response
 */
export interface DiffBasedEdit {
  diffs: ParsedDiff[];
  language: "javascript" | "html";
  explanation?: string;
}

/**
 * Result of parsing an AI response, which may contain code blocks, diffs, or both
 */
export interface ParsedResponse {
  codeBlocks: ParsedCode[];
  diffEdits: DiffBasedEdit[];
  explanation?: string;
}

export class EditParser {
  /**
   * Extract code blocks from markdown-formatted AI response (backward compatible)
   */
  static parseCodeBlocks(markdown: string): ParsedCode[] {
    const codeBlocks: ParsedCode[] = [];

    // Match code blocks with language specifiers
    const codeBlockRegex = /```(javascript|js|html)\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      const language = match[1] === "js" ? "javascript" : match[1];
      const code = match[2].trim();

      if (language === "javascript" || language === "html") {
        codeBlocks.push({
          language: language as "javascript" | "html",
          code,
          fullReplacement: this.isFullReplacement(code, language),
        });
      }
    }

    return codeBlocks;
  }

  /**
   * Determine if the code block is meant to replace the entire file
   * Heuristics: contains imports, has significant structure, etc.
   */
  private static isFullReplacement(code: string, language: string): boolean {
    if (language === "javascript") {
      // If it has imports or is more than 5 lines, likely a full replacement
      return code.includes("import") || code.split("\n").length > 5;
    }

    if (language === "html") {
      // If it has DOCTYPE or full HTML structure
      return (
        code.includes("<!DOCTYPE") ||
        code.includes("<html") ||
        code.includes("<body") ||
        code.split("\n").length > 3
      );
    }

    return false;
  }

  /**
   * Check if the response contains code that should be applied
   */
  static hasApplicableCode(markdown: string): boolean {
    return /```(javascript|js|html)/.test(markdown);
  }

  /**
   * Extract a summary/explanation from the AI response (text before first code block)
   */
  static extractExplanation(markdown: string): string {
    const firstCodeBlock = markdown.search(/```/);
    if (firstCodeBlock === -1) {
      return markdown.trim();
    }
    return markdown.substring(0, firstCodeBlock).trim();
  }

  /**
   * Preprocess Gemini response to remove artifacts that interfere with diff parsing
   * Gemini sometimes wraps SEARCH/REPLACE blocks in markdown code fences
   *
   * @param content - The raw AI response content
   * @returns Cleaned content with artifacts removed
   */
  static preprocessGeminiResponse(content: string): string {
    let processed = content;

    // Strip markdown code fences around SEARCH/REPLACE blocks
    // Match: ``` or ```javascript/html/etc followed by SEARCH/REPLACE, then closing ```
    processed = processed.replace(
      /```[\w]*\n(<<<SEARCH>>>[\s\S]*?<<<REPLACE>>>[\s\S]*?)```/g,
      "$1",
    );

    return processed;
  }

  /**
   * Parse diff blocks from AI response using DiffParser
   * Delegates to the DiffParser for parsing SEARCH/REPLACE and unified diff formats
   *
   * @param content - The AI response content to parse
   * @returns Array of parsed diffs
   */
  static parseDiffBlocks(content: string): ParsedDiff[] {
    // Preprocess to remove Gemini artifacts before parsing
    const cleaned = this.preprocessGeminiResponse(content);
    return DiffParser.parseDiffBlocks(cleaned);
  }

  /**
   * Check if the response contains applicable diffs
   * Uses DiffParser to detect SEARCH/REPLACE or unified diff formats
   *
   * @param content - The AI response content to check
   * @returns True if the content contains diff blocks
   */
  static hasApplicableDiffs(content: string): boolean {
    return DiffParser.hasApplicableDiffs(content);
  }

  /**
   * Parse an AI response and return cleaned markdown without diff/code blocks
   * This is the preferred method for rendering in the UI as it separates
   * displayable markdown from actionable code/diff blocks.
   *
   * @param response - The full AI response text
   * @returns Object containing cleaned markdown and parsed edits/code blocks
   */
  static parseAndClean(response: string): {
    cleanedMarkdown: string;
    parsed: ParsedResponse;
  } {
    const parsed = this.parseResponse(response);

    let cleaned = response;

    // CRITICAL FIX: Remove ALL diff blocks (complete AND partial)
    // This prevents users from seeing raw diff markers during streaming

    // Step 1: Remove COMPLETE Cline format diffs first
    // Pattern: ------- SEARCH\n...\n=======\n...\n+++++++ REPLACE
    cleaned = cleaned.replace(
      /^\s*[-]{7,}\s*SEARCH>?\s*$[\s\S]*?^\s*[=]{7,}\s*$[\s\S]*?^\s*[+]{7,}\s*REPLACE>?\s*$/gm,
      "",
    );

    // Step 2: Remove PARTIAL/INCOMPLETE Cline format blocks (for streaming)
    // This catches any `------- SEARCH` that doesn't have a complete `+++++++ REPLACE` yet
    cleaned = cleaned.replace(/^\s*[-]{7,}\s*SEARCH>?\s*$[\s\S]*$/gm, "");

    // Step 3: Remove COMPLETE legacy format diffs
    // Pattern: <<<SEARCH>>>\n...\n<<<REPLACE>>>\n...
    cleaned = cleaned.replace(
      /<<<SEARCH>>>[\s\S]*?<<<REPLACE>>>[\s\S]*?(?=<<<SEARCH>>>|\n\n|$)/g,
      "",
    );

    // Step 4: Remove PARTIAL legacy format blocks
    cleaned = cleaned.replace(/<<<SEARCH>>>[\s\S]*$/g, "");

    // Also handle cases where diffs might be wrapped in code fences
    // Cline format in code fences
    cleaned = cleaned.replace(
      /```[\w]*\n^\s*[-]{7,}\s*SEARCH>?\s*$[\s\S]*?^\s*[+]{7,}\s*REPLACE>?\s*$\n```/gm,
      "",
    );

    // Legacy format in code fences
    cleaned = cleaned.replace(
      /```[\w]*\n<<<SEARCH>>>[\s\S]*?<<<REPLACE>>>[\s\S]*?```/g,
      "",
    );

    // Remove code blocks that will be rendered separately
    // Only remove if we actually parsed them as actionable code
    if (parsed.codeBlocks.length > 0) {
      cleaned = cleaned.replace(
        /```(?:javascript|js|html)\s*\n[\s\S]*?```/g,
        "",
      );
    }

    // Clean up any excessive whitespace left behind
    cleaned = cleaned
      .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines
      .trim();

    return {
      cleanedMarkdown: cleaned,
      parsed,
    };
  }

  /**
   * Intelligently parse an AI response that may contain code blocks, diffs, or both
   * Decision logic:
   * - If response contains SEARCH/REPLACE markers → use diff parsing
   * - Otherwise → fall back to code block parsing (existing behavior)
   * - Supports mixed responses (both code blocks and diffs)
   *
   * @param response - The full AI response text
   * @returns Parsed response containing code blocks and/or diff edits
   */
  static parseResponse(response: string): ParsedResponse {
    const result: ParsedResponse = {
      codeBlocks: [],
      diffEdits: [],
    };

    // Extract explanation (text before first code block or diff)
    const firstCodeBlock = response.search(/```/);
    const firstDiff = response.search(/<<<SEARCH>>>|^---\s+/m);

    let explanationEnd = -1;
    if (firstCodeBlock !== -1 && firstDiff !== -1) {
      explanationEnd = Math.min(firstCodeBlock, firstDiff);
    } else if (firstCodeBlock !== -1) {
      explanationEnd = firstCodeBlock;
    } else if (firstDiff !== -1) {
      explanationEnd = firstDiff;
    }

    if (explanationEnd !== -1) {
      result.explanation = response.substring(0, explanationEnd).trim();
    } else {
      result.explanation = response.trim();
    }

    // Parse diffs if present
    if (this.hasApplicableDiffs(response)) {
      const diffs = this.parseDiffBlocks(response);
      if (diffs.length > 0) {
        // Group diffs by inferred language
        const jsDiffs: ParsedDiff[] = [];
        const htmlDiffs: ParsedDiff[] = [];

        for (const diff of diffs) {
          // Try to infer language from context
          const language = this.inferLanguageFromDiff(diff, response);
          if (language === "html") {
            htmlDiffs.push(diff);
          } else {
            jsDiffs.push(diff);
          }
        }

        if (jsDiffs.length > 0) {
          result.diffEdits.push({
            diffs: jsDiffs,
            language: "javascript",
            explanation: result.explanation,
          });
        }

        if (htmlDiffs.length > 0) {
          result.diffEdits.push({
            diffs: htmlDiffs,
            language: "html",
            explanation: result.explanation,
          });
        }
      }
    }

    // Parse code blocks (backward compatibility)
    const codeBlocks = this.parseCodeBlocks(response);
    result.codeBlocks = codeBlocks;

    return result;
  }

  /**
   * Extract diff-based edits from AI response with intelligent matching
   * This method combines diff parsing with the DiffMatcher for applying changes
   *
   * @param response - The AI response text
   * @param sourceCode - The current source code to apply diffs to
   * @param language - The language of the source code
   * @param options - Optional matching options for DiffMatcher
   * @returns Array of match results for each diff block
   */
  static extractDiffBasedEdit(
    response: string,
    sourceCode: string,
    language: "javascript" | "html",
    options?: MatchOptions,
  ): MatchResult[] {
    const diffs = this.parseDiffBlocks(response);
    if (diffs.length === 0) {
      return [];
    }

    const matcher = new DiffMatcher();
    const matches: MatchResult[] = [];

    for (const diff of diffs) {
      // Only process diffs that match the requested language
      const diffLanguage = this.inferLanguageFromDiff(diff, response);
      if (diffLanguage !== language) {
        continue;
      }

      const match = matcher.findMatch(diff.block.search, sourceCode, options);
      if (match) {
        matches.push(match);
      }
    }

    return matches;
  }

  /**
   * Infer the programming language from a parsed diff based on content and context
   */
  private static inferLanguageFromDiff(
    diff: ParsedDiff,
    fullResponse: string,
  ): "javascript" | "html" {
    const contextPos = fullResponse.indexOf(diff.raw);
    return this.scoreLanguage(
      diff.block.search,
      diff.block.replace,
      fullResponse,
      contextPos,
    );
  }

  /**
   * Process a single streaming chunk and update the streaming diff processor
   * This method handles different chunk types and coordinates with StreamingDiffProcessor
   *
   * @param chunk - The stream chunk to process
   * @param processor - The streaming diff processor instance
   * @returns Object containing text to append, diff updates, or errors
   */
  static processStreamChunk(
    chunk: StreamChunk,
    processor: StreamingDiffProcessor,
  ): {
    textToAppend?: string;
    diffUpdate?: { diffIndex: number; diff: DiffBlock };
    error?: string;
  } {
    try {
      switch (chunk.type) {
        case "text":
          // Regular text content that should be appended to the response
          return { textToAppend: chunk.text };

        case "reasoning":
          // Reasoning/thinking content is handled separately by the caller
          // We don't append it to the main text
          return {};

        case "diff_start":
          // Initialize a new diff block
          processor.processDiffStart(chunk.diffIndex, chunk.language);
          return {};

        case "diff_search":
          // Accumulate search content
          processor.processDiffSearch(chunk.diffIndex, chunk.content);
          return {};

        case "diff_replace":
          // Accumulate replace content
          processor.processDiffReplace(chunk.diffIndex, chunk.content);
          return {};

        case "diff_complete": {
          // Finalize the diff block
          const finalDiff = processor.processDiffComplete(chunk.diffIndex);
          if (finalDiff) {
            return {
              diffUpdate: {
                diffIndex: chunk.diffIndex,
                diff: finalDiff,
              },
            };
          }
          return { error: `Failed to complete diff ${chunk.diffIndex}` };
        }

        case "usage":
          // Token usage metadata is handled separately by the caller
          return {};

        case "error":
          // Return error to be handled by caller
          return { error: chunk.error };

        default:
          return {};
      }
    } catch (error) {
      // Catch and return any processing errors
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error processing chunk";
      return { error: errorMessage };
    }
  }

  /**
   * Build a complete ParsedResponse from accumulated streaming data
   * This method constructs the final response object after streaming is complete
   *
   * @param accumulatedText - The full accumulated text from all text chunks
   * @param completedDiffs - Array of completed diff blocks from streaming
   * @returns ParsedResponse with diffs and description
   */
  static buildStreamingResponse(
    accumulatedText: string,
    completedDiffs: DiffBlock[],
  ): ParsedResponse {
    const result: ParsedResponse = {
      codeBlocks: [],
      diffEdits: [],
    };

    // Extract explanation from accumulated text (text before any code/diff markers)
    const firstCodeBlock = accumulatedText.search(/```/);
    const firstDiff = accumulatedText.search(/<<<SEARCH>>>|^---\s+/m);

    let explanationEnd = -1;
    if (firstCodeBlock !== -1 && firstDiff !== -1) {
      explanationEnd = Math.min(firstCodeBlock, firstDiff);
    } else if (firstCodeBlock !== -1) {
      explanationEnd = firstCodeBlock;
    } else if (firstDiff !== -1) {
      explanationEnd = firstDiff;
    }

    if (explanationEnd !== -1) {
      result.explanation = accumulatedText.substring(0, explanationEnd).trim();
    } else {
      result.explanation = accumulatedText.trim();
    }

    // Group completed diffs by inferred language
    if (completedDiffs.length > 0) {
      const jsDiffs: ParsedDiff[] = [];
      const htmlDiffs: ParsedDiff[] = [];

      for (let i = 0; i < completedDiffs.length; i++) {
        const diffBlock = completedDiffs[i];

        // Infer language from the diff content
        const language = this.inferLanguageFromDiffBlock(
          diffBlock,
          accumulatedText,
        );

        const parsedDiff: ParsedDiff = {
          block: diffBlock,
          raw: `------- SEARCH\n${diffBlock.search}\n=======\n${diffBlock.replace}\n+++++++ REPLACE`,
          index: i,
        };

        if (language === "html") {
          htmlDiffs.push(parsedDiff);
        } else {
          jsDiffs.push(parsedDiff);
        }
      }

      if (jsDiffs.length > 0) {
        result.diffEdits.push({
          diffs: jsDiffs,
          language: "javascript",
          explanation: result.explanation,
        });
      }

      if (htmlDiffs.length > 0) {
        result.diffEdits.push({
          diffs: htmlDiffs,
          language: "html",
          explanation: result.explanation,
        });
      }
    }

    // Parse any code blocks from accumulated text (backward compatibility)
    const codeBlocks = this.parseCodeBlocks(accumulatedText);
    result.codeBlocks = codeBlocks;

    return result;
  }

  /**
   * Infer language from a DiffBlock (delegates to shared scoreLanguage)
   */
  private static inferLanguageFromDiffBlock(
    diffBlock: DiffBlock,
    fullResponse: string,
  ): "javascript" | "html" {
    const contextPos = fullResponse.indexOf(diffBlock.search.substring(0, 100));
    return this.scoreLanguage(
      diffBlock.search,
      diffBlock.replace,
      fullResponse,
      contextPos,
    );
  }

  private static readonly HTML_INDICATORS = [
    /<[a-z][\s\S]*>/i,
    /<!doctype/i,
    /<html/i,
    /<head/i,
    /<body/i,
    /<div/i,
    /<span/i,
    /<button/i,
    /<input/i,
    /<form/i,
  ];

  private static readonly JS_INDICATORS = [
    /\bconst\b/,
    /\blet\b/,
    /\bvar\b/,
    /\bfunction\b/,
    /\bclass\b/,
    /\bimport\b/,
    /\bexport\b/,
    /\bconsole\./,
    /\breturn\b/,
    /=>/,
    /\bviewer\b/i,
    /\bCesium\./,
  ];

  /**
   * Shared language scoring logic for both ParsedDiff and DiffBlock inputs.
   * Scores content against HTML and JS indicators, plus surrounding context.
   */
  private static scoreLanguage(
    search: string,
    replace: string,
    fullResponse: string,
    contextPos: number,
  ): "javascript" | "html" {
    const combined = `${search.toLowerCase()} ${replace.toLowerCase()}`;

    let htmlScore = 0;
    let jsScore = 0;

    for (const indicator of this.HTML_INDICATORS) {
      if (indicator.test(combined)) {
        htmlScore++;
      }
    }
    for (const indicator of this.JS_INDICATORS) {
      if (indicator.test(combined)) {
        jsScore++;
      }
    }

    if (contextPos > 0) {
      const contextBefore = fullResponse
        .substring(Math.max(0, contextPos - 200), contextPos)
        .toLowerCase();

      if (contextBefore.includes("html") || contextBefore.includes("markup")) {
        htmlScore += 2;
      }
      if (
        contextBefore.includes("javascript") ||
        contextBefore.includes("js")
      ) {
        jsScore += 2;
      }
    }

    return htmlScore > jsScore ? "html" : "javascript";
  }
}
