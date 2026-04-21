import { DiffParser } from "./DiffParser";
import type { ParsedDiff } from "../types";

interface ParsedCode {
  language: "javascript" | "html";
  code: string;
  /** True when the snippet is intended to replace the whole file rather than be inserted. */
  fullReplacement: boolean;
}

interface DiffBasedEdit {
  diffs: ParsedDiff[];
  language: "javascript" | "html";
  explanation?: string;
}

interface ParsedResponse {
  codeBlocks: ParsedCode[];
  diffEdits: DiffBasedEdit[];
  explanation?: string;
}

export class EditParser {
  /** Legacy markdown code-block extractor, kept for pre-diff responses. */
  private static parseCodeBlocks(markdown: string): ParsedCode[] {
    const codeBlocks: ParsedCode[] = [];

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

  /** Heuristic for full-file replacement vs. snippet: imports/structural tags or a nontrivial line count. */
  private static isFullReplacement(code: string, language: string): boolean {
    if (language === "javascript") {
      return code.includes("import") || code.split("\n").length > 5;
    }

    if (language === "html") {
      return (
        code.includes("<!DOCTYPE") ||
        code.includes("<html") ||
        code.includes("<body") ||
        code.split("\n").length > 3
      );
    }

    return false;
  }

  /** Strip markdown fences Gemini sometimes wraps around SEARCH/REPLACE blocks. */
  private static preprocessGeminiResponse(content: string): string {
    let processed = content;

    processed = processed.replace(
      /```[\w]*\n(<<<SEARCH>>>[\s\S]*?<<<REPLACE>>>[\s\S]*?)```/g,
      "$1",
    );

    return processed;
  }

  private static parseDiffBlocks(content: string): ParsedDiff[] {
    const cleaned = this.preprocessGeminiResponse(content);
    return DiffParser.parseDiffBlocks(cleaned);
  }

  private static hasApplicableDiffs(content: string): boolean {
    return DiffParser.hasApplicableDiffs(content);
  }

  /**
   * Return parsed edits plus a markdown copy with every diff or actionable code
   * block stripped. Strips partial blocks too so users never see raw diff markers
   * mid-stream.
   */
  static parseAndClean(response: string): {
    cleanedMarkdown: string;
    parsed: ParsedResponse;
  } {
    const parsed = this.parseResponse(response);

    let cleaned = response;

    // Strip complete Cline format blocks first, then any trailing partial block
    // (unterminated SEARCH) that would otherwise leak during streaming.
    cleaned = cleaned.replace(
      /^\s*[-]{7,}\s*SEARCH>?\s*$[\s\S]*?^\s*[=]{7,}\s*$[\s\S]*?^\s*[+]{7,}\s*REPLACE>?\s*$/gm,
      "",
    );
    cleaned = cleaned.replace(/^\s*[-]{7,}\s*SEARCH>?\s*$[\s\S]*$/gm, "");

    // Legacy <<<SEARCH>>>/<<<REPLACE>>> blocks, complete then partial.
    cleaned = cleaned.replace(
      /<<<SEARCH>>>[\s\S]*?<<<REPLACE>>>[\s\S]*?(?=<<<SEARCH>>>|\n\n|$)/g,
      "",
    );
    cleaned = cleaned.replace(/<<<SEARCH>>>[\s\S]*$/g, "");

    // Same passes for the variants that come wrapped in markdown code fences.
    cleaned = cleaned.replace(
      /```[\w]*\n^\s*[-]{7,}\s*SEARCH>?\s*$[\s\S]*?^\s*[+]{7,}\s*REPLACE>?\s*$\n```/gm,
      "",
    );
    cleaned = cleaned.replace(
      /```[\w]*\n<<<SEARCH>>>[\s\S]*?<<<REPLACE>>>[\s\S]*?```/g,
      "",
    );

    // Only strip code fences when we actually captured them as actionable blocks;
    // otherwise we'd eat regular docs/examples from the narration.
    if (parsed.codeBlocks.length > 0) {
      cleaned = cleaned.replace(
        /```(?:javascript|js|html)\s*\n[\s\S]*?```/g,
        "",
      );
    }

    cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

    return {
      cleanedMarkdown: cleaned,
      parsed,
    };
  }

  /** Split a response into narration, diff edits (SEARCH/REPLACE or unified), and legacy code blocks. */
  private static parseResponse(response: string): ParsedResponse {
    const result: ParsedResponse = {
      codeBlocks: [],
      diffEdits: [],
    };

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

    if (this.hasApplicableDiffs(response)) {
      const diffs = this.parseDiffBlocks(response);
      if (diffs.length > 0) {
        const jsDiffs: ParsedDiff[] = [];
        const htmlDiffs: ParsedDiff[] = [];

        for (const diff of diffs) {
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

    const codeBlocks = this.parseCodeBlocks(response);
    result.codeBlocks = codeBlocks;

    return result;
  }

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

  /** Score content against HTML/JS indicators plus the 200 chars of narration before it. */
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
