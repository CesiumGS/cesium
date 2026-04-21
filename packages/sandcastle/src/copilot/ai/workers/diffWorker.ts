// Runs diff matching off the main thread so large files do not trigger browser unresponsive warnings.
import { DiffApplier } from "../diff/DiffApplier";
import { DiffMatcher } from "../diff/DiffMatcher";
import type { DiffBlock, ApplyOptions, ApplyResult } from "../types";

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

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, sourceCode, diffs, options } = e.data;

  if (type === "applyDiffs") {
    try {
      const matcher = new DiffMatcher();
      const applier = new DiffApplier(matcher);

      const result = applier.applyDiffs(sourceCode, diffs, options);

      const response: WorkerResponse = {
        type: "result",
        result,
      };
      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    }
  }
};

// Keep this file a module so `self` is typed as DedicatedWorkerGlobalScope.
export {};
