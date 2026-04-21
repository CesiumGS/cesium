export function unescapeGeminiContent(content: string): string {
  return content
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
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
