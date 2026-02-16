/**
 * ErrorContext - Utility functions for auto-iteration error handling
 *
 * Provides functions for:
 * - Creating unique error signatures for comparison
 * - Formatting rich error context for AI
 * - Detecting error oscillation patterns
 * - Determining error criticality
 */

import type {
  ExecutionResult,
  ConsoleError,
  AutoIterationConfig,
} from "./types";

/**
 * Create a unique signature for an execution result to detect duplicate errors
 *
 * @param result - The execution result to create a signature for
 * @returns A string signature representing the unique error state
 *
 * @example
 * ```typescript
 * const sig1 = createErrorSignature(result1);
 * const sig2 = createErrorSignature(result2);
 * if (sig1 === sig2) {
 *   console.log("Same errors detected");
 * }
 * ```
 */
export function createErrorSignature(result: ExecutionResult): string {
  const diffErrorsSorted = [...result.diffErrors].sort();
  const consoleErrorsSorted = [...result.consoleErrors]
    .map((e) => e.message)
    .sort();

  // Combine all error sources into a single signature
  const allErrors = [...diffErrorsSorted, ...consoleErrorsSorted];

  // Create hash-like signature by joining errors with a unique delimiter
  return allErrors.join("|||");
}

/**
 * Format execution results into rich context for AI
 *
 * Instead of just sending error messages, this creates a comprehensive
 * execution report including:
 * - Diff application errors with context
 * - Runtime console errors with stack traces (if available)
 * - Execution summary and timing
 *
 * @param result - The execution result to format
 * @param config - Auto-iteration configuration (for stack trace inclusion)
 * @returns Formatted context string to send to AI
 *
 * @example
 * ```typescript
 * const context = formatExecutionContext(result, config);
 * const prompt = `${context}\n\nPlease analyze and fix these errors.`;
 * ```
 */
export function formatExecutionContext(
  result: ExecutionResult,
  config: AutoIterationConfig,
): string {
  const parts: string[] = [];

  // Diff application errors section
  if (result.diffErrors.length > 0) {
    parts.push("## Diff Application Errors:");
    parts.push("");
    result.diffErrors.forEach((error, i) => {
      parts.push(`${i + 1}. ${error}`);
    });
    parts.push("");
  }

  // Runtime console errors section
  if (result.consoleErrors.length > 0) {
    parts.push("## Runtime Console Errors:");
    parts.push("");
    result.consoleErrors.forEach((error, i) => {
      parts.push(`${i + 1}. ${error.message}`);

      // Include stack trace if configured and available
      if (config.includeStackTraces && error.stack) {
        // Indent stack trace for readability
        const stackLines = error.stack.split("\n").slice(0, 5); // Limit to first 5 lines
        stackLines.forEach((line) => {
          parts.push(`   ${line}`);
        });
      }
    });
    parts.push("");
  }

  // Execution summary
  parts.push("## Execution Summary:");
  parts.push(`- Diffs attempted: ${result.appliedCount}`);
  parts.push(`- Diff application errors: ${result.diffErrors.length}`);
  parts.push(`- Runtime console errors: ${result.consoleErrors.length}`);

  if (result.executionTimeMs !== undefined) {
    parts.push(
      `- Execution time: ${(result.executionTimeMs / 1000).toFixed(2)}s`,
    );
  }

  return parts.join("\n");
}

/**
 * Detect if errors are oscillating in an A→B→A pattern
 *
 * Oscillation occurs when errors cycle between different states,
 * indicating the AI is making changes that fix one error but
 * introduce another, then fix that but re-introduce the first.
 *
 * @param recentSignatures - Array of recent error signatures (newest last)
 * @param currentSignature - The current error signature to check
 * @returns True if oscillation is detected, false otherwise
 *
 * @example
 * ```typescript
 * const signatures = ["errorA", "errorB", "errorA"];
 * if (detectOscillation(signatures, "errorB")) {
 *   console.log("Oscillation detected! Stopping iteration.");
 * }
 * ```
 */
export function detectOscillation(
  recentSignatures: string[],
  currentSignature: string,
): boolean {
  if (recentSignatures.length < 2) {
    return false; // Not enough history
  }

  // Check if current signature matches any of the last 3 signatures
  // (excluding the immediately previous one, since that's just the same error)
  const last3 = recentSignatures.slice(-3);
  const matchingOldErrors = last3
    .slice(0, -1)
    .filter((sig) => sig === currentSignature);

  // Oscillation = same error appears multiple times non-consecutively
  return matchingOldErrors.length > 0;
}

/**
 * Determine if an error is critical and should trigger immediate escalation
 *
 * Critical errors include:
 * - Syntax errors that prevent execution
 * - Reference errors for core functionality
 * - Infinite recursion or stack overflow
 *
 * @param error - The console error to evaluate
 * @returns True if the error is critical, false otherwise
 *
 * @example
 * ```typescript
 * if (isErrorCritical(error)) {
 *   // Skip normal iteration, escalate immediately
 *   triggerEscalation();
 * }
 * ```
 */
export function isErrorCritical(error: ConsoleError): boolean {
  const message = error.message.toLowerCase();

  // Critical error patterns
  const criticalPatterns = [
    /syntaxerror/i,
    /referenceerror.*is not defined/i,
    /maximum call stack/i,
    /out of memory/i,
    /script error/i, // Cross-origin script errors
    /cannot read property.*undefined/i, // Common critical runtime errors
    /cannot read properties of null/i,
  ];

  return criticalPatterns.some((pattern) => pattern.test(message));
}

/**
 * Calculate a confidence score for whether the AI can fix the errors
 *
 * Higher confidence = errors are likely fixable
 * Lower confidence = may need user intervention
 *
 * @param result - The execution result to evaluate
 * @returns Confidence score from 0 (no confidence) to 1 (high confidence)
 *
 * @example
 * ```typescript
 * const confidence = calculateFixConfidence(result);
 * if (confidence < 0.3) {
 *   console.log("Low confidence - consider asking user for help");
 * }
 * ```
 */
export function calculateFixConfidence(result: ExecutionResult): number {
  let score = 1.0;

  // Penalize for multiple errors
  const totalErrors = result.diffErrors.length + result.consoleErrors.length;
  if (totalErrors > 3) {
    score -= 0.2;
  }
  if (totalErrors > 5) {
    score -= 0.2;
  }

  // Penalize for critical errors
  const criticalErrors = result.consoleErrors.filter(isErrorCritical).length;
  score -= criticalErrors * 0.15;

  // Penalize for diff application failures (harder to fix than runtime errors)
  score -= result.diffErrors.length * 0.1;

  // Ensure score stays in valid range
  return Math.max(0, Math.min(1, score));
}

/**
 * Check if the execution result indicates success (no errors)
 *
 * @param result - The execution result to check
 * @returns True if there are no errors, false otherwise
 */
export function hasNoErrors(result: ExecutionResult): boolean {
  return result.diffErrors.length === 0 && result.consoleErrors.length === 0;
}

/**
 * Get a human-readable summary of the execution result
 *
 * @param result - The execution result to summarize
 * @returns A brief one-line summary
 *
 * @example
 * ```typescript
 * const summary = getExecutionSummary(result);
 * console.log(summary); // "2 diff errors, 1 runtime error"
 * ```
 */
export function getExecutionSummary(result: ExecutionResult): string {
  const parts: string[] = [];

  if (result.diffErrors.length > 0) {
    parts.push(
      `${result.diffErrors.length} diff error${result.diffErrors.length === 1 ? "" : "s"}`,
    );
  }

  if (result.consoleErrors.length > 0) {
    parts.push(
      `${result.consoleErrors.length} runtime error${result.consoleErrors.length === 1 ? "" : "s"}`,
    );
  }

  if (parts.length === 0) {
    return "No errors";
  }

  return parts.join(", ");
}

/**
 * Detect if the AI message contains a completion signal indicating the task is done
 *
 * This function checks for explicit completion phrases that indicate the AI considers
 * the task successfully completed. It's used by the auto-iteration system to know
 * when to stop iterating even if minor errors remain.
 *
 * Completion signals include:
 * - "task complete", "task is complete", "completed successfully"
 * - "all done", "finished", "implementation complete"
 * - "no errors", "everything works", "working correctly"
 *
 * The function uses case-insensitive matching and avoids false positives from
 * negative phrases like "not complete", "incomplete", "not finished".
 *
 * @param messageContent - The AI's message content to analyze
 * @returns True if a completion signal is detected, false otherwise
 *
 * @example
 * ```typescript
 * const aiMessage = "Task complete! Everything is working correctly.";
 * if (detectCompletionSignal(aiMessage)) {
 *   console.log("AI indicated task completion - stopping iteration");
 *   stopIteration();
 * }
 * ```
 */
export function detectCompletionSignal(messageContent: string): boolean {
  // Normalize content for case-insensitive matching
  const content = messageContent.toLowerCase();

  // Negative patterns that should NOT trigger completion
  // Check these first to avoid false positives
  const negativePatterns = [
    /not\s+complete/i,
    /incomplete/i,
    /not\s+finished/i,
    /unfinished/i,
    /not\s+done/i,
    /not\s+working/i,
    /doesn't\s+work/i,
    /does not\s+work/i,
    /still\s+(has|have)\s+(errors|issues)/i,
  ];

  // If any negative pattern matches, immediately return false
  if (negativePatterns.some((pattern) => pattern.test(content))) {
    return false;
  }

  // Positive completion patterns
  const completionPatterns = [
    // Task completion
    /task\s+(is\s+)?complete/i,
    /task\s+completed/i,
    /completed\s+successfully/i,
    /successfully\s+completed/i,
    /implementation\s+(is\s+)?complete/i,
    /implementation\s+completed/i,

    // Finished states
    /all\s+done/i,
    /\bfinished\b/i,
    /\bdone\b/i, // Word boundary to avoid "undone"

    // No errors / working states
    /no\s+(more\s+)?errors/i,
    /error-free/i,
    /everything\s+(is\s+)?work(s|ing)(\s+correctly)?/i,
    /working\s+(correctly|as\s+expected|properly)/i,
    /\ball\s+working\b/i,
    /fix(ed)?\s+successfully/i,
    /successfully\s+fix(ed)?/i,

    // Ready / good to go
    /ready\s+to\s+go/i,
    /good\s+to\s+go/i,
    /should\s+be\s+working\s+now/i,
  ];

  // Check if any completion pattern matches
  return completionPatterns.some((pattern) => pattern.test(content));
}
