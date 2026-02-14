/**
 * Shared prompt building utilities for AI clients.
 *
 * Extracts duplicated logic from AnthropicClient and GeminiClient
 * into a single source of truth.
 */

import type { CodeContext } from "./types";
import { CESIUMJS_API_DEPRECATIONS } from "./prompts";

const DIFF_SYSTEM_INSTRUCTIONS = `You are an AI assistant helping with CesiumJS code in Sandcastle.

# CODE EDITING INSTRUCTIONS

## IMPORTANT: Use the apply_diff Tool

You MUST use the \`apply_diff\` tool for ALL code changes. DO NOT output code directly as text.

### How to Use apply_diff:

Call the \`apply_diff\` function with:
- **file**: Either "javascript" or "html"
- **search**: The EXACT code to find (must match character-for-character)
- **replace**: The new code to replace with

### CRITICAL RULES:

1. **Exact Matching Required:**
   - \`search\` content must match the file EXACTLY
   - Character-for-character including whitespace, tabs, spaces
   - Include all comments, blank lines, formatting
   - Never truncate lines mid-way through
   - Each line must be complete

2. **First Match Only:**
   - Each tool call replaces only the FIRST occurrence
   - Use multiple tool calls for multiple changes
   - Make calls in the order they appear in the file

3. **Include All Lines:**
   - Include ALL lines in the section being edited, both changed AND unchanged
   - Do NOT omit unchanged lines between changes
   - Include the complete code section from start to end

4. **Special Operations:**
   - **Delete code:** Use empty string in \`replace\`
   - **Add code:** Include anchor line in \`search\`
5. **One Tool Call per Response:**
   - Make at most ONE \`apply_diff\` call
   - After calling the tool, STOP and wait for the tool result

### AUTO-FORMATTING AWARENESS:

- After changes are applied, the editor may auto-format the code
- This can modify indentation, quotes, line breaks, imports, etc.
- For SUBSEQUENT edits, use the FORMATTED version as reference
- CRITICAL: \`search\` must match the actual formatted code in the file

## RESPONSE FORMAT:

- Be concise and direct
- Skip "I will..." preambles - just use the tool
- Brief explanation (1-2 sentences) ONLY if the change needs context
- Then immediately call apply_diff
- No verbose descriptions of what you're about to do
${CESIUMJS_API_DEPRECATIONS}`;

const CONTEXT_SYSTEM_INSTRUCTIONS = `You are an AI assistant helping with CesiumJS code in Sandcastle.

When suggesting code changes:
1. Provide clear explanations
2. If modifying existing code, use code blocks with the full modified sections
3. If creating new code, provide complete, runnable examples
4. Use CesiumJS best practices and the Cesium API correctly
${CESIUMJS_API_DEPRECATIONS}`;

function buildPrompt(
  userMessage: string,
  context: CodeContext,
  baseSystemPrompt: string,
  customAddendum?: string,
): { systemPrompt: string; userPrompt: string } {
  let systemPrompt = baseSystemPrompt;

  if (customAddendum && customAddendum.trim()) {
    systemPrompt += `

# IMPORTANT USER INSTRUCTIONS

${customAddendum.trim()}`;
  }

  const consoleSection = formatConsoleMessages(context.consoleMessages);

  const userPrompt = `Current JavaScript Code:
\`\`\`javascript
${context.javascript}
\`\`\`

Current HTML:
\`\`\`html
${context.html}
\`\`\`
${consoleSection}

User Request: ${userMessage}`;

  return { systemPrompt, userPrompt };
}

export function buildDiffBasedPrompt(
  userMessage: string,
  context: CodeContext,
  customAddendum?: string,
) {
  return buildPrompt(
    userMessage,
    context,
    DIFF_SYSTEM_INSTRUCTIONS,
    customAddendum,
  );
}

export function buildContextPrompt(
  userMessage: string,
  context: CodeContext,
  customAddendum?: string,
) {
  return buildPrompt(
    userMessage,
    context,
    CONTEXT_SYSTEM_INSTRUCTIONS,
    customAddendum,
  );
}

export function formatConsoleMessages(
  consoleMessages?: Array<{
    type: "log" | "warn" | "error";
    message: string;
  }>,
): string {
  if (!consoleMessages || consoleMessages.length === 0) {
    return "";
  }

  const logs = consoleMessages.filter((msg) => msg.type === "log");
  const warnings = consoleMessages.filter((msg) => msg.type === "warn");
  const errors = consoleMessages.filter((msg) => msg.type === "error");

  let section = "\nConsole Output:\n";

  if (errors.length > 0) {
    section += "\nErrors:\n";
    errors.forEach((error, index) => {
      section += `  ${index + 1}. ${error.message}\n`;
    });
  }

  if (warnings.length > 0) {
    section += "\nWarnings:\n";
    warnings.forEach((warning, index) => {
      section += `  ${index + 1}. ${warning.message}\n`;
    });
  }

  if (logs.length > 0) {
    section += "\nLogs:\n";
    logs.forEach((log, index) => {
      section += `  ${index + 1}. ${log.message}\n`;
    });
  }

  section += "\n";
  return section;
}
