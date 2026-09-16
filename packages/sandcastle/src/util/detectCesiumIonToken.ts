const tokenAssignmentPatterns = [
  /(?:Cesium\.)?Ion\.defaultAccessToken\s*=\s*(["'`])([^"'`\n]+)\1/g,
  /\b(?:accessToken|access_token|token)\s*:\s*(["'`])([^"'`\n]+)\1/g,
  /\b(?:accessToken|access_token|token)\s*=\s*(["'`])([^"'`\n]+)\1/g,
];

const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function decodeBase64UrlSegment(value: string): string | undefined {
  try {
    const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=");
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    return atob(base64);
  } catch {
    return undefined;
  }
}

function parseJwtPayload(token: string): Record<string, unknown> | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return undefined;
  }

  const payloadText = decodeBase64UrlSegment(parts[1]);
  if (!payloadText) {
    return undefined;
  }

  try {
    return JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function isLikelyJwtToken(tokenValue: string): boolean {
  if (!jwtPattern.test(tokenValue)) {
    return false;
  }

  const payload = parseJwtPayload(tokenValue);
  return !!payload;
}

function extractAssignedTokenLiterals(sourceText: string): string[] {
  const tokens: string[] = [];
  for (const pattern of tokenAssignmentPatterns) {
    pattern.lastIndex = 0;
    let match = pattern.exec(sourceText);
    while (match) {
      tokens.push(match[2]);
      match = pattern.exec(sourceText);
    }
  }
  return tokens;
}

export function containsEmbeddedCesiumIonToken(
  code: string,
  html: string,
): boolean {
  const sourceText = `${code}\n${html}`;
  const tokenCandidates = extractAssignedTokenLiterals(sourceText);
  return tokenCandidates.some(isLikelyJwtToken);
}
