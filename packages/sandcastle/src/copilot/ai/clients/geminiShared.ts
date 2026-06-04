import type { ToolCall } from "../types";

export function unescapeGeminiContent(content: string): string {
  return content
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

/**
 * Builds a Gemini `functionCall` content part, echoing the `thoughtSignature`
 * back (or a sentinel when absent) so Gemini's signature validator accepts
 * the follow-up request. Some Gemini SSE payloads omit the signature on
 * tool-call parts; the sentinel `"skip_thought_signature_validator"` is
 * accepted in its place.
 */
export function buildGeminiFunctionCallPart(call: ToolCall) {
  const signature = call.thoughtSignature ?? "skip_thought_signature_validator";
  return {
    functionCall: {
      name: call.name,
      args: call.input,
    },
    thoughtSignature: signature,
    thought_signature: signature,
  };
}

export interface GeminiFunctionCallPart {
  functionCall: {
    name: string;
    args?: Record<string, unknown>;
    thoughtSignature?: string;
    thought_signature?: string;
  };
  thoughtSignature?: string;
  thought_signature?: string;
}

/**
 * Extracts the thought signature from a Gemini function-call part.
 * Gemini's API returns this field inconsistently: it may appear as
 * `thoughtSignature` or `thought_signature`, on the part itself or
 * nested inside the `functionCall` object. Checks all four locations.
 */
export function extractThoughtSignature(
  part: GeminiFunctionCallPart,
): string | undefined {
  return (
    part.thoughtSignature ??
    part.thought_signature ??
    part.functionCall.thoughtSignature ??
    part.functionCall.thought_signature
  );
}

export function isFunctionCallPart(
  part: unknown,
): part is GeminiFunctionCallPart {
  if (typeof part !== "object" || part === null) {
    return false;
  }
  const fc = (part as Record<string, unknown>).functionCall;
  return (
    typeof fc === "object" &&
    fc !== null &&
    typeof (fc as Record<string, unknown>).name === "string"
  );
}
