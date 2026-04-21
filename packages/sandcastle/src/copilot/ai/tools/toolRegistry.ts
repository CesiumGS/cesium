import { RooStyleDiffStrategy } from "../diff/RooStyleDiffStrategy";
import { DiffMatcher } from "../diff/DiffMatcher";
import {
  DiffFormat,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type DiffBlock,
} from "../types";

/**
 * Direct handler return shape: `ToolResult` minus the `tool_call_id`. Handlers
 * don't know the call id; `ToolRegistry.executeTool` is the single place that
 * attaches it to the canonical `ToolResult`.
 */
type HandlerResult = Omit<ToolResult, "tool_call_id">;

type ToolHandler = (input: Record<string, unknown>) => Promise<HandlerResult>;

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  registerTool(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, {
      definition,
      handler,
    });
  }

  /** Returns tool definitions in the shape expected by the LLM tool-calling API. */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

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
      const result = await tool.handler(toolCall.input);
      return {
        ...result,
        tool_call_id: toolCall.id,
      };
    } catch (error) {
      return {
        tool_call_id: toolCall.id,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/** Builds the apply_diff handler; uses middle-out search for better accuracy on large files. */
function createApplyDiffHandler(
  getSourceCode: (file: "javascript" | "html") => string,
): ToolHandler {
  const matcher = new DiffMatcher();
  const strategy = new RooStyleDiffStrategy(matcher);

  return async (input: Record<string, unknown>): Promise<HandlerResult> => {
    try {
      const { file, search, replace } = input;

      if (
        !file ||
        typeof file !== "string" ||
        !["javascript", "html"].includes(file)
      ) {
        return {
          status: "error",
          error: 'Invalid file parameter. Must be "javascript" or "html"',
        };
      }

      if (!search || typeof search !== "string") {
        return {
          status: "error",
          error: "Invalid search parameter. Must be a non-empty string",
        };
      }

      if (replace === undefined || typeof replace !== "string") {
        return {
          status: "error",
          error: "Invalid replace parameter. Must be a string",
        };
      }

      const sourceCode = getSourceCode(file as "javascript" | "html");

      const diff: DiffBlock = {
        search,
        replace,
        format: DiffFormat.SEARCH_REPLACE,
      };

      // Middle-out search expands from the file center, reducing false matches on large files.
      const result = await strategy.applyDiff(sourceCode, diff, {
        minConfidence: 0.9, // Raised after prompt/tool code divergence was fixed.
      });

      if (!result.success) {
        // Surface the closest near-miss so the model can self-correct on retry.
        const closest = matcher.findClosestMatch(search, sourceCode);
        let errorMessage = result.error || "Failed to apply diff";

        if (closest) {
          const confidencePercent = (closest.confidence * 100).toFixed(0);
          const preview =
            closest.matchedText.length > 200
              ? `${closest.matchedText.slice(0, 200)}...`
              : closest.matchedText;

          errorMessage += `\n\nClosest match found (${confidencePercent}% similar) at line ${closest.startLine}:\n\`\`\`\n${preview}\n\`\`\`\n\nTip: Copy the SEARCH block exactly from the code shown above, including all whitespace and formatting.`;
        }

        return {
          status: "error",
          error: errorMessage,
        };
      }

      // Return the other file's current contents so the model doesn't guess at it on the next edit.
      const otherFile = file === "javascript" ? "html" : "javascript";
      const otherFileContents = getSourceCode(
        otherFile as "javascript" | "html",
      );

      return {
        status: "success",
        output: JSON.stringify({
          file,
          modifiedCode: result.modifiedCode,
          match: result.match,
          currentFiles: {
            [otherFile]: otherFileContents,
          },
        }),
      };
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };
}

export function initializeToolRegistry(
  getSourceCode: (file: "javascript" | "html") => string,
): ToolRegistry {
  const registry = new ToolRegistry();

  const applyDiffDefinition: ToolDefinition = {
    name: "apply_diff",
    description:
      "Apply a code change using search/replace diff format. This tool precisely locates and modifies code sections in the JavaScript or HTML file. Use this for targeted code modifications. Prefer the SMALLEST contiguous search block that uniquely identifies the intended edit. CRITICAL: The search string must match the file EXACTLY - copy the exact text from the file shown in the user prompt, including imports, comments, whitespace, and any unchanged anchor lines you keep. Do not include unrelated neighboring code unless it is required to disambiguate the match.",
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
            "The EXACT code to search for. Prefer the smallest contiguous block that uniquely identifies the target edit. Must match the existing code character-for-character, including imports, blank lines, comments, whitespace, and indentation for any lines you include. Copy directly from the file contents shown in the prompt - do not simplify, and do not include unrelated neighboring lines unless they are needed as anchors. If you see \"import Sandcastle from 'Sandcastle';\" in the matched block, you MUST include it in your search string.",
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

/** Null until initializeToolRegistry() runs; callers must set it via setToolRegistry(). */
export let toolRegistry: ToolRegistry | null = null;

export function setToolRegistry(registry: ToolRegistry): void {
  toolRegistry = registry;
}
