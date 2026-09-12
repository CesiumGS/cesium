import type { StreamChunk } from "../types";

export function createStallTimeout(
  controller: AbortController,
  stallTimeoutMs: number,
): { reset: () => void; clear: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return {
    reset() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => controller.abort(), stallTimeoutMs);
    },
    clear() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    },
  };
}

/**
 * Wires an external AbortSignal to the controller.
 * Returns true if the signal is already aborted (caller should exit early).
 */
export function wireAbortSignal(
  controller: AbortController,
  abortSignal?: AbortSignal,
): boolean {
  if (!abortSignal) {
    return false;
  }
  if (abortSignal.aborted) {
    return true;
  }
  abortSignal.addEventListener("abort", () => controller.abort(), {
    once: true,
  });
  return false;
}

export function formatStreamError(
  error: unknown,
  abortSignal?: AbortSignal,
  fallbackMessage: string = "API request failed",
): StreamChunk & { type: "error" } {
  if (error instanceof Error && error.name === "AbortError") {
    return {
      type: "error",
      error: abortSignal?.aborted
        ? "Request stopped by user"
        : "Request timed out",
    };
  }
  return {
    type: "error",
    error: error instanceof Error ? error.message : fallbackMessage,
  };
}

/**
 * Makes a streaming POST request and returns either the response body or an
 * error string. Resets the stall timeout after the fetch completes.
 */
export async function postStreamRequest(
  url: string,
  headers: Record<string, string>,
  requestBody: unknown,
  controller: AbortController,
  stallTimeout: { reset: () => void },
): Promise<{ body: ReadableStream<Uint8Array> } | { error: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(requestBody as object),
    signal: controller.signal,
  });
  stallTimeout.reset();
  if (!response.ok) {
    return { error: await extractFetchError(response) };
  }
  if (!response.body) {
    return { error: "No response body" };
  }
  return { body: response.body };
}

async function extractFetchError(response: Response): Promise<string> {
  let errorMessage = `HTTP error! status: ${response.status}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.error?.message || errorMessage;
  } catch {
    // Response body was not valid JSON
  }
  return errorMessage;
}
