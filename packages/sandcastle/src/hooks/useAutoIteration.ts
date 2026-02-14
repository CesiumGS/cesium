import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type {
  ChatMessage as ChatMessageType,
  IterationState,
  AutoIterationConfig,
  CodeContext,
} from "../AI/types";
import { detectOscillation } from "../AI/ErrorContext";

const ERROR_DETECTION_DEBOUNCE_MS = 1000;

interface UseAutoIterationParams {
  messages: ChatMessageType[];
  isLoading: boolean;
  isCurrentlyStreaming: boolean;
  currentCode?: CodeContext;
  autoIterationConfig: AutoIterationConfig;
  triggerFollowUp: (prompt: string) => void;
}

export function useAutoIteration({
  messages,
  isLoading,
  isCurrentlyStreaming,
  currentCode,
  autoIterationConfig,
  triggerFollowUp,
}: UseAutoIterationParams) {
  const [iterationState, setIterationState] = useState<IterationState>({
    errorIterationCount: 0,
    consecutiveMistakes: 0,
    totalRequests: 0,
    lastErrorSignature: "",
    recentErrorSignatures: [],
    escalationActive: false,
  });

  const [iterationStatus, setIterationStatus] = useState<{
    isWaiting: boolean;
    isIterating: boolean;
    currentIteration: number;
    completionMessage: string | null;
    completionType:
      | "success"
      | "max-iterations"
      | "oscillation"
      | "max-requests"
      | null;
  }>({
    isWaiting: false,
    isIterating: false,
    currentIteration: 0,
    completionMessage: null,
    completionType: null,
  });

  // Timeout refs
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const errorDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const iterationDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const followUpIterationTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Guard refs
  const autoIterationScheduledRef = useRef(false);
  const oscillationMessageShownRef = useRef(false);
  const lastErrorMessageRef = useRef<{
    content: string;
    timestamp: number;
  } | null>(null);
  const lastErrorDetectionRunRef = useRef<number>(0);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
      if (errorDebounceTimeoutRef.current) {
        clearTimeout(errorDebounceTimeoutRef.current);
      }
      if (iterationDelayTimeoutRef.current) {
        clearTimeout(iterationDelayTimeoutRef.current);
      }
      if (followUpIterationTimeoutRef.current) {
        clearTimeout(followUpIterationTimeoutRef.current);
      }
      autoIterationScheduledRef.current = false;
    };
  }, []);

  // Auto-hide completion messages
  useEffect(() => {
    if (iterationStatus.completionMessage) {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
      completionTimeoutRef.current = setTimeout(() => {
        setIterationStatus((prev) => ({
          ...prev,
          completionMessage: null,
          completionType: null,
        }));
        completionTimeoutRef.current = null;
      }, 5000);
      return () => {
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
      };
    }
  }, [iterationStatus.completionMessage]);

  // Memoized error analysis
  const currentErrorSignature = useMemo(() => {
    const runtimeErrors =
      currentCode?.consoleMessages?.filter((msg) => msg.type === "error") || [];
    if (runtimeErrors.length === 0) {
      return "";
    }
    return runtimeErrors.map((e) => e.message).join("|");
  }, [currentCode?.consoleMessages]);

  const isCurrentlyOscillating = useMemo(() => {
    if (!autoIterationConfig.detectOscillation || !currentErrorSignature) {
      return false;
    }
    return detectOscillation(
      iterationState.recentErrorSignatures,
      currentErrorSignature,
    );
  }, [
    autoIterationConfig.detectOscillation,
    iterationState.recentErrorSignatures,
    currentErrorSignature,
  ]);

  const formattedErrorContext = useMemo(() => {
    const runtimeErrors =
      currentCode?.consoleMessages?.filter((msg) => msg.type === "error") || [];
    if (runtimeErrors.length === 0) {
      return "";
    }
    return runtimeErrors.map((err, i) => `${i + 1}. ${err.message}`).join("\n");
  }, [currentCode?.consoleMessages]);

  // Core error detection logic
  const handleErrorDetection = useCallback(() => {
    const now = Date.now();
    if (now - lastErrorDetectionRunRef.current < 2000) {
      return;
    }
    lastErrorDetectionRunRef.current = now;

    if (messages.length === 0 || isLoading || isCurrentlyStreaming) {
      return;
    }
    if (autoIterationScheduledRef.current) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "assistant") {
      return;
    }

    const runtimeErrors =
      currentCode?.consoleMessages?.filter((msg) => msg.type === "error") || [];

    if (runtimeErrors.length > 0) {
      const errorSignature = currentErrorSignature;
      const isOscillating = isCurrentlyOscillating;
      const isSameError = errorSignature === iterationState.lastErrorSignature;
      const shouldIterate =
        iterationState.errorIterationCount <
          autoIterationConfig.maxIterations &&
        !isSameError &&
        !isOscillating &&
        !iterationState.escalationActive;

      if (shouldIterate) {
        autoIterationScheduledRef.current = true;

        setIterationState((prev) => ({
          ...prev,
          lastErrorSignature: errorSignature,
          errorIterationCount: prev.errorIterationCount + 1,
          recentErrorSignatures: [
            ...prev.recentErrorSignatures,
            errorSignature,
          ].slice(-5),
        }));

        setIterationStatus({
          isWaiting: true,
          isIterating: true,
          currentIteration: iterationState.errorIterationCount + 1,
          completionMessage: null,
          completionType: null,
        });

        const followUpPrompt = `The code is running but the following console errors occurred:\n\n${formattedErrorContext}\n\nPlease analyze and fix these errors.`;

        const isDuplicate =
          lastErrorMessageRef.current &&
          lastErrorMessageRef.current.content === followUpPrompt &&
          now - lastErrorMessageRef.current.timestamp < 3000;

        if (isDuplicate) {
          autoIterationScheduledRef.current = false;
          return;
        }

        lastErrorMessageRef.current = {
          content: followUpPrompt,
          timestamp: now,
        };

        if (iterationDelayTimeoutRef.current) {
          clearTimeout(iterationDelayTimeoutRef.current);
        }

        iterationDelayTimeoutRef.current = setTimeout(() => {
          autoIterationScheduledRef.current = false;
          setIterationStatus((prev) => ({ ...prev, isWaiting: false }));
          triggerFollowUp(followUpPrompt);
          iterationDelayTimeoutRef.current = null;
        }, 1000);
      } else if (
        isOscillating &&
        !iterationState.escalationActive &&
        !oscillationMessageShownRef.current
      ) {
        oscillationMessageShownRef.current = true;
        setIterationState((prev) => ({ ...prev, escalationActive: true }));
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: "Oscillation detected, stopping",
          completionType: "oscillation",
        });
      } else if (isSameError) {
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: "Same errors detected, stopping",
          completionType: "oscillation",
        });
      } else if (
        iterationState.errorIterationCount >= autoIterationConfig.maxIterations
      ) {
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: "Max iterations reached",
          completionType: "max-iterations",
        });
      }
    } else if (iterationState.lastErrorSignature !== "") {
      setIterationState((prev) => ({
        ...prev,
        lastErrorSignature: "",
        errorIterationCount: 0,
      }));
      setIterationStatus({
        isWaiting: false,
        isIterating: false,
        currentIteration: 0,
        completionMessage: iterationStatus.isIterating
          ? "Errors fixed successfully"
          : null,
        completionType: iterationStatus.isIterating ? "success" : null,
      });
      oscillationMessageShownRef.current = false;
      lastErrorMessageRef.current = null;
    } else if (iterationStatus.isWaiting) {
      setIterationStatus((prev) => ({ ...prev, isWaiting: false }));
    }
  }, [
    messages,
    isLoading,
    isCurrentlyStreaming,
    currentCode?.consoleMessages,
    iterationState.lastErrorSignature,
    iterationState.errorIterationCount,
    iterationState.escalationActive,
    iterationStatus.isWaiting,
    iterationStatus.isIterating,
    currentErrorSignature,
    isCurrentlyOscillating,
    autoIterationConfig.maxIterations,
    formattedErrorContext,
    triggerFollowUp,
  ]);

  // Debounced error detection
  useEffect(() => {
    if (errorDebounceTimeoutRef.current) {
      clearTimeout(errorDebounceTimeoutRef.current);
    }
    errorDebounceTimeoutRef.current = setTimeout(() => {
      handleErrorDetection();
      errorDebounceTimeoutRef.current = null;
    }, ERROR_DETECTION_DEBOUNCE_MS);
    return () => {
      if (errorDebounceTimeoutRef.current) {
        clearTimeout(errorDebounceTimeoutRef.current);
        errorDebounceTimeoutRef.current = null;
      }
    };
  }, [handleErrorDetection]);

  const handleSubmitGuidance = useCallback(
    async (guidance: string) => {
      setIterationState((prev) => ({
        ...prev,
        escalationActive: false,
        consecutiveMistakes: 0,
      }));
      setIterationStatus((prev) => ({
        ...prev,
        completionMessage: null,
        completionType: null,
      }));
      oscillationMessageShownRef.current = false;
      triggerFollowUp(guidance);
    },
    [triggerFollowUp],
  );

  const handleSkipGuidance = useCallback(() => {
    setIterationState((prev) => ({
      ...prev,
      escalationActive: false,
      errorIterationCount: 0,
      consecutiveMistakes: 0,
    }));
    setIterationStatus({
      isWaiting: false,
      isIterating: false,
      currentIteration: 0,
      completionMessage: "Iteration stopped by user",
      completionType: "max-requests",
    });
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
    }
    completionTimeoutRef.current = setTimeout(() => {
      setIterationStatus((prev) => ({
        ...prev,
        completionMessage: null,
        completionType: null,
      }));
      completionTimeoutRef.current = null;
    }, 5000);
  }, []);

  const incrementTotalRequests = useCallback(() => {
    setIterationState((prev) => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
    }));
  }, []);

  const resetIteration = useCallback(() => {
    setIterationState({
      errorIterationCount: 0,
      consecutiveMistakes: 0,
      totalRequests: 0,
      lastErrorSignature: "",
      recentErrorSignatures: [],
      escalationActive: false,
    });
    setIterationStatus({
      isWaiting: false,
      isIterating: false,
      currentIteration: 0,
      completionMessage: null,
      completionType: null,
    });
    oscillationMessageShownRef.current = false;
    lastErrorMessageRef.current = null;
    lastErrorDetectionRunRef.current = 0;
  }, []);

  /**
   * Check for errors after a response and trigger follow-up iteration if needed.
   * Called by the parent after sendMessageWithContent completes.
   */
  const checkPostResponseErrors = useCallback(
    (
      allErrors: string[],
      errorSignatureBefore: string,
      wasIterating: boolean,
    ) => {
      if (allErrors.length > 0) {
        const errorSignature = allErrors.join("|");
        const isOscillating =
          autoIterationConfig.detectOscillation &&
          detectOscillation(
            iterationState.recentErrorSignatures,
            errorSignature,
          );
        const isSameError =
          errorSignatureBefore !== "" &&
          errorSignature === errorSignatureBefore;
        const shouldIterate =
          iterationState.errorIterationCount <
            autoIterationConfig.maxIterations &&
          !isSameError &&
          !isOscillating &&
          !iterationState.escalationActive;

        if (shouldIterate) {
          const newIterationCount = iterationState.errorIterationCount + 1;
          setIterationState((prev) => ({
            ...prev,
            lastErrorSignature: errorSignature,
            errorIterationCount: prev.errorIterationCount + 1,
            recentErrorSignatures: [
              ...prev.recentErrorSignatures,
              errorSignature,
            ].slice(-5),
          }));
          setIterationStatus({
            isWaiting: false,
            isIterating: true,
            currentIteration: newIterationCount,
            completionMessage: null,
            completionType: null,
          });

          const errorContext = allErrors
            .map((err, i) => `${i + 1}. ${err}`)
            .join("\n");
          const followUpPrompt = `The changes were applied but the following console errors occurred:\n\n${errorContext}\n\nPlease analyze and fix these errors.`;

          const now = Date.now();
          const isDuplicate =
            lastErrorMessageRef.current &&
            lastErrorMessageRef.current.content === followUpPrompt &&
            now - lastErrorMessageRef.current.timestamp < 3000;

          if (!isDuplicate) {
            lastErrorMessageRef.current = {
              content: followUpPrompt,
              timestamp: now,
            };

            if (followUpIterationTimeoutRef.current) {
              clearTimeout(followUpIterationTimeoutRef.current);
            }
            followUpIterationTimeoutRef.current = setTimeout(() => {
              triggerFollowUp(followUpPrompt);
              followUpIterationTimeoutRef.current = null;
            }, 500);

            return { shouldIterate: true, prompt: followUpPrompt };
          }
        } else {
          if (
            isOscillating &&
            !iterationState.escalationActive &&
            !oscillationMessageShownRef.current
          ) {
            oscillationMessageShownRef.current = true;
            setIterationState((prev) => ({ ...prev, escalationActive: true }));
            setIterationStatus({
              isWaiting: false,
              isIterating: false,
              currentIteration: 0,
              completionMessage: "Oscillation detected, stopping",
              completionType: "oscillation",
            });
          } else if (isSameError) {
            setIterationStatus({
              isWaiting: false,
              isIterating: false,
              currentIteration: 0,
              completionMessage: "Same errors detected, stopping",
              completionType: "oscillation",
            });
          } else if (
            iterationState.errorIterationCount >=
            autoIterationConfig.maxIterations
          ) {
            setIterationStatus({
              isWaiting: false,
              isIterating: false,
              currentIteration: 0,
              completionMessage: "Max iterations reached",
              completionType: "max-iterations",
            });
          }
          setIterationState((prev) => ({
            ...prev,
            lastErrorSignature: "",
            errorIterationCount: 0,
          }));
        }
      } else {
        setIterationState((prev) => ({
          ...prev,
          lastErrorSignature: "",
          errorIterationCount: 0,
          consecutiveMistakes: 0,
        }));
        setIterationStatus({
          isWaiting: false,
          isIterating: false,
          currentIteration: 0,
          completionMessage: wasIterating ? "Errors fixed successfully" : null,
          completionType: wasIterating ? "success" : null,
        });
        oscillationMessageShownRef.current = false;
        lastErrorMessageRef.current = null;
      }
      return { shouldIterate: false, prompt: null };
    },
    [
      autoIterationConfig.detectOscillation,
      autoIterationConfig.maxIterations,
      iterationState.recentErrorSignatures,
      iterationState.errorIterationCount,
      iterationState.escalationActive,
      triggerFollowUp,
    ],
  );

  const setWaiting = useCallback((isWaiting: boolean) => {
    setIterationStatus((prev) => ({ ...prev, isWaiting }));
  }, []);

  return {
    iterationState,
    iterationStatus,
    handleSubmitGuidance,
    handleSkipGuidance,
    incrementTotalRequests,
    resetIteration,
    checkPostResponseErrors,
    setWaiting,
  };
}
