/**
 * Tool Registry for Roo Code Style Tool-Based Diff Application
 *
 * Manages available tools that can be called by the LLM and their handlers.
 */

import { RooStyleDiffStrategy } from "../RooStyleDiffStrategy";
import { DiffMatcher } from "../DiffMatcher";
import {
  DiffFormat,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type DiffBlock,
} from "../types";

/**
 * Tool handler function signature
 */
export type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<ToolResult>;

/**
 * Internal tool registration
 */
interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

/**
 * Tool Registry
 * Stores and manages tools available for LLM calling
 */
export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a new tool
   */
  registerTool(definition: ToolDefinition, handler: ToolHandler): void {
    if (this.tools.has(definition.name)) {
      console.warn(
        `Tool "${definition.name}" is already registered. Overwriting.`,
      );
    }

    this.tools.set(definition.name, {
      definition,
      handler,
    });

    // Minimized logging - kept for tool call mechanics
    console.log(`✅ Registered tool: ${definition.name}`);
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool definitions (for passing to LLM)
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);

    if (!tool) {
      return {
        tool_call_id: toolCall.id,
        status: "error",
        error: `Tool "${toolCall.name}" not found`,
      };
    }

    try {
      // Tool call mechanics logging - KEEP
      console.log(`🔧 Executing tool: ${toolCall.name}`, toolCall.input);
      const result = await tool.handler(toolCall.input);
      return {
        ...result,
        tool_call_id: toolCall.id,
      };
    } catch (error) {
      // Minimized error logging
      // console.error(`❌ Tool execution error for ${toolCall.name}:`, error);
      return {
        tool_call_id: toolCall.id,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create the applyDiff tool handler using RooStyleDiffStrategy
 * Uses middle-out search algorithm for better performance and accuracy
 */
function createApplyDiffHandler(
  getSourceCode: (file: "javascript" | "html") => string,
): ToolHandler {
  const matcher = new DiffMatcher();
  const strategy = new RooStyleDiffStrategy(matcher);

  return async (input: Record<string, unknown>): Promise<ToolResult> => {
    try {
      console.log("[ToolRegistry] 🔧 apply_diff handler invoked with input:", {
        hasFile: !!input.file,
        hasSearch: !!input.search,
        hasReplace: "replace" in input,
        searchLength:
          typeof input.search === "string" ? input.search.length : undefined,
        replaceLength:
          typeof input.replace === "string" ? input.replace.length : undefined,
      });

      // Validate input
      const { file, search, replace } = input;

      if (
        !file ||
        typeof file !== "string" ||
        !["javascript", "html"].includes(file)
      ) {
        console.log("[ToolRegistry] ❌ Invalid file parameter:", file);
        return {
          tool_call_id: "",
          status: "error",
          error: 'Invalid file parameter. Must be "javascript" or "html"',
        };
      }

      if (!search || typeof search !== "string") {
        console.log(
          "[ToolRegistry] ❌ Invalid search parameter:",
          typeof search,
        );
        return {
          tool_call_id: "",
          status: "error",
          error: "Invalid search parameter. Must be a non-empty string",
        };
      }

      if (replace === undefined || typeof replace !== "string") {
        console.log(
          "[ToolRegistry] ❌ Invalid replace parameter:",
          typeof replace,
        );
        return {
          tool_call_id: "",
          status: "error",
          error: "Invalid replace parameter. Must be a string",
        };
      }

      // Get source code
      console.log(`[ToolRegistry] 📄 Getting source code for file: ${file}`);
      const sourceCode = getSourceCode(file as "javascript" | "html");
      console.log(`[ToolRegistry] 📊 Source code length: ${sourceCode.length}`);

      // Create diff block
      const diff: DiffBlock = {
        search,
        replace,
        format: DiffFormat.SEARCH_REPLACE,
      };
      console.log(`[ToolRegistry] 📋 Created diff block:`, {
        format: diff.format,
        searchPreview: `${search.substring(0, 100)}...`,
        replacePreview: `${replace.substring(0, 100)}...`,
      });

      // Apply diff using RooStyleDiffStrategy with middle-out search
      // This algorithm starts from the middle of the file and expands outward,
      // reducing false matches and improving performance on large files
      console.log(
        "[ToolRegistry] 🔄 Applying diff with RooStyle middle-out search...",
      );
      const result = await strategy.applyDiff(sourceCode, diff, {
        minConfidence: 0.9, // Higher threshold now that prompt/tool code divergence is fixed
      });

      console.log("[ToolRegistry] 📊 Diff application result:", {
        success: result.success,
        hasMatch: !!result.match,
        matchStrategy: result.match?.strategy,
        confidence: result.match?.confidence,
        hasModifiedCode: !!result.modifiedCode,
        error: result.error,
      });

      if (!result.success) {
        console.log(
          "[ToolRegistry] ❌ Diff application failed:",
          result.error,
        );

        // Find closest match to help the model self-correct
        const closest = matcher.findClosestMatch(search, sourceCode);
        let errorMessage = result.error || "Failed to apply diff";

        if (closest) {
          const confidencePercent = (closest.confidence * 100).toFixed(0);
          const preview = closest.matchedText.length > 200
            ? `${closest.matchedText.slice(0, 200)}...`
            : closest.matchedText;

          errorMessage += `\n\nClosest match found (${confidencePercent}% similar) at line ${closest.startLine}:\n\`\`\`\n${preview}\n\`\`\`\n\nTip: Copy the SEARCH block exactly from the code shown above, including all whitespace and formatting.`;
        }

        return {
          tool_call_id: "",
          status: "error",
          error: errorMessage,
        };
      }

      // Log successful match with strategy used - tool call mechanics
      console.log(
        `[ToolRegistry] ✅ Diff applied successfully using ${result.match?.strategy || "unknown"} matching (confidence: ${((result.match?.confidence || 0) * 100).toFixed(1)}%)`,
      );

      // Get the OTHER file's current contents so the model knows what to search for
      // when making subsequent edits. This prevents the model from guessing file contents.
      const otherFile = file === "javascript" ? "html" : "javascript";
      const otherFileContents = getSourceCode(otherFile as "javascript" | "html");

      return {
        tool_call_id: "",
        status: "success",
        output: JSON.stringify({
          file,
          modifiedCode: result.modifiedCode,
          match: result.match,
          // Include current state of the OTHER file so model can make accurate subsequent diffs
          currentFiles: {
            [otherFile]: otherFileContents,
          },
        }),
      };
    } catch (error) {
      // Minimized error logging
      // console.error('applyDiff handler error:', error);
      return {
        tool_call_id: "",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };
}

/**
 * Initialize and configure the global tool registry
 *
 * @param getSourceCode - Function to retrieve current source code for a file
 * @returns Configured ToolRegistry instance
 */
export function initializeToolRegistry(
  getSourceCode: (file: "javascript" | "html") => string,
): ToolRegistry {
  const registry = new ToolRegistry();

  // Register applyDiff tool
  const applyDiffDefinition: ToolDefinition = {
    name: "apply_diff",
    description:
      "Apply a code change using search/replace diff format. This tool precisely locates and modifies code sections in the JavaScript or HTML file. Use this for targeted code modifications. CRITICAL: The search string must match the file EXACTLY - copy the exact text from the file shown in the user prompt, including ALL lines, imports, comments, and whitespace. Do not skip or omit any lines.",
    input_schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "Which file to modify",
          enum: ["javascript", "html"],
        },
        search: {
          type: "string",
          description:
            "The EXACT code to search for. Must match the existing code character-for-character, including ALL imports, blank lines, comments, whitespace, and indentation. Copy directly from the file contents shown in the prompt - do not skip any lines or simplify. If you see \"import Sandcastle from 'Sandcastle';\" in the file, you MUST include it in your search string.",
        },
        replace: {
          type: "string",
          description:
            "The new code to replace the search pattern with. Indentation will be automatically adjusted to match the surrounding code.",
        },
      },
      required: ["file", "search", "replace"],
    },
  };

  registry.registerTool(
    applyDiffDefinition,
    createApplyDiffHandler(getSourceCode),
  );

  return registry;
}

/**
 * Singleton tool registry instance
 * Note: Must be initialized with initializeToolRegistry() before use
 */
export let toolRegistry: ToolRegistry | null = null;

/**
 * Set the global tool registry instance
 */
export function setToolRegistry(registry: ToolRegistry): void {
  toolRegistry = registry;
}
