import { useCallback, useRef, useState } from "react";
import type { ExecutionResult } from "../ai/types";
import { buildAutoFixPrompt } from "../ai/prompts/PromptBuilder";

const MAX_ATTEMPTS = 3;

type AutoFixStatus =
  | "idle"
  | "running"
  | "success"
  | "stalled"
  | "capped"
  | "aborted";

interface UseAutoFixParams {
  /** Getter (not value) so Switch toggles mid-loop take effect at observe time */
  isEnabled: () => boolean;
  /** Sends a synthetic user message through the chat pipeline to trigger the next fix attempt */
  sendSyntheticMessage: (
    text: string,
    meta: { attempt: number; maxAttempts: number },
  ) => void;
}

interface UseAutoFixReturn {
  status: AutoFixStatus;
  attempt: number;
  /** Call once per user turn, at turn completion, with the final ExecutionResult. */
  observe: (result: ExecutionResult) => void;
  /** Called when the user sends a new (non-synthetic) message — resets state. */
  resetTurn: () => void;
  /** Called when the user aborts — no further attempts will fire. */
  abort: () => void;
}

function normalize(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function fingerprint(errors: Array<{ type: string; message: string }>): string {
  const parts = errors.map((e) => `${e.type}:${normalize(e.message)}`);
  const unique = Array.from(new Set(parts));
  unique.sort();
  return unique.join("\n");
}

export function useAutoFix({
  isEnabled,
  sendSyntheticMessage,
}: UseAutoFixParams): UseAutoFixReturn {
  const [status, setStatus] = useState<AutoFixStatus>("idle");
  const [attempt, setAttempt] = useState(0);
  const attemptRef = useRef(0);
  const lastFingerprintRef = useRef<string | null>(null);
  const abortedRef = useRef(false);

  const resetTurn = useCallback(() => {
    attemptRef.current = 0;
    setAttempt(0);
    lastFingerprintRef.current = null;
    abortedRef.current = false;
    setStatus("idle");
  }, []);

  const abort = useCallback(() => {
    abortedRef.current = true;
    setStatus("aborted");
  }, []);

  const observe = useCallback(
    (result: ExecutionResult) => {
      if (abortedRef.current) {
        return;
      }

      const errors: Array<{ type: string; message: string }> = [
        ...result.consoleErrors.map((e) => ({
          type: e.type,
          message: e.message,
        })),
        ...result.diffErrors.map((m) => ({ type: "diff", message: m })),
      ];

      if (errors.length === 0) {
        // Clean run: finalize any in-flight loop as success, reset for next turn.
        if (attemptRef.current > 0 && status === "running") {
          setStatus("success");
        } else {
          setStatus("idle");
        }
        attemptRef.current = 0;
        lastFingerprintRef.current = null;
        return;
      }

      if (!isEnabled()) {
        setStatus("idle");
        return;
      }

      const fp = fingerprint(errors);

      if (fp === lastFingerprintRef.current) {
        setStatus("stalled");
        return;
      }

      if (attemptRef.current + 1 > MAX_ATTEMPTS) {
        setStatus("capped");
        return;
      }

      attemptRef.current += 1;
      setAttempt(attemptRef.current);
      lastFingerprintRef.current = fp;
      setStatus("running");
      sendSyntheticMessage(buildAutoFixPrompt(errors), {
        attempt: attemptRef.current,
        maxAttempts: MAX_ATTEMPTS,
      });
    },
    [isEnabled, sendSyntheticMessage, status],
  );

  return {
    status,
    attempt,
    observe,
    resetTurn,
    abort,
  };
}
