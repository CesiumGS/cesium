/**
 * Web Worker for diff matching and application
 * PERFORMANCE: Offloads CPU-intensive diff matching to a background thread
 * to prevent blocking the main thread and causing browser "unresponsive" warnings
 */

import { DiffApplier } from "../DiffApplier";
import { DiffMatcher } from "../DiffMatcher";
import type { DiffBlock, ApplyOptions, ApplyResult } from "../types";

// Worker message types
interface WorkerRequest {
  type: "applyDiffs";
  sourceCode: string;
  diffs: DiffBlock[];
  options?: ApplyOptions;
}

interface WorkerResponse {
  type: "result" | "error";
  result?: ApplyResult;
  error?: string;
}

// Listen for messages from the main thread
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, sourceCode, diffs, options } = e.data;

  if (type === "applyDiffs") {
    try {
      // Create matcher and applier instances in the worker
      const matcher = new DiffMatcher();
      const applier = new DiffApplier(matcher);

      // Perform the CPU-intensive diff matching and application
      const result = applier.applyDiffs(sourceCode, diffs, options);

      // Send result back to main thread
      const response: WorkerResponse = {
        type: "result",
        result,
      };
      self.postMessage(response);
    } catch (error) {
      // Handle errors gracefully
      const response: WorkerResponse = {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    }
  }
};

// Export empty object for TypeScript
export {};
