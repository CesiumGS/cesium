const TOKEN_LIFETIME_SECONDS = 3600;
const REFRESH_MARGIN_SECONDS = 300;
const CLOCK_SKEW_SECONDS = 30;
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";

interface ServiceAccountCredential {
  type: string;
  project_id: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix ms
}

/**
 * Handles Vertex AI authentication via GCP service-account JWT + token exchange.
 *
 * SECURITY: This class never logs service-account JSON, private keys,
 * JWT assertions, or bearer tokens.
 */
export class VertexAuth {
  private readonly credential: ServiceAccountCredential;
  private cachedToken: CachedToken | null = null;
  private inflight: Promise<string> | null = null;

  constructor(serviceAccountJson: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error(
        "Invalid service account JSON: failed to parse. Please paste the full JSON key file.",
      );
    }

    const obj = parsed as Record<string, unknown>;
    if (typeof obj !== "object" || obj === null) {
      throw new Error("Invalid service account JSON: expected a JSON object.");
    }
    if (obj.type !== "service_account") {
      throw new Error(
        `Invalid service account JSON: "type" must be "service_account", got "${String(obj.type)}".`,
      );
    }
    if (typeof obj.project_id !== "string" || obj.project_id.length === 0) {
      throw new Error(
        'Invalid service account JSON: missing or empty "project_id".',
      );
    }
    if (typeof obj.client_email !== "string" || obj.client_email.length === 0) {
      throw new Error(
        'Invalid service account JSON: missing or empty "client_email".',
      );
    }
    if (typeof obj.private_key !== "string") {
      throw new Error('Invalid service account JSON: missing "private_key".');
    }
    if (!obj.private_key.startsWith("-----BEGIN PRIVATE KEY-----")) {
      throw new Error(
        'Invalid service account JSON: "private_key" does not have a valid PEM header.',
      );
    }

    this.credential = {
      type: obj.type as string,
      project_id: obj.project_id as string,
      private_key_id:
        typeof obj.private_key_id === "string" ? obj.private_key_id : undefined,
      private_key: obj.private_key as string,
      client_email: obj.client_email as string,
    };
  }

  get projectId(): string {
    return this.credential.project_id;
  }

  get clientEmail(): string {
    return this.credential.client_email;
  }

  /**
   * Returns a valid access token, using cache when possible.
   * Deduplicates concurrent calls so only one token exchange flies at a time.
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with refresh margin)
    if (this.cachedToken) {
      const nowMs = Date.now();
      if (nowMs < this.cachedToken.expiresAt - REFRESH_MARGIN_SECONDS * 1000) {
        return this.cachedToken.accessToken;
      }
    }

    // Deduplicate in-flight requests
    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.exchangeToken().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  /**
   * Clear the cached token (e.g. on 401/403 responses).
   */
  clearCache(): void {
    this.cachedToken = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async exchangeToken(): Promise<string> {
    const jwt = await this.buildSignedJwt();

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errBody = await response.text();
        const errJson = JSON.parse(errBody) as {
          error_description?: string;
          error?: string;
        };
        detail =
          errJson.error_description || errJson.error || response.statusText;
      } catch {
        detail = response.statusText;
      }
      throw new Error(
        `Vertex AI token exchange failed (${response.status}): ${detail}`,
      );
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (
      typeof data.access_token !== "string" ||
      data.access_token.length === 0
    ) {
      throw new Error(
        "Vertex AI token exchange returned an empty access_token.",
      );
    }
    if (typeof data.expires_in !== "number" || data.expires_in <= 0) {
      throw new Error(
        "Vertex AI token exchange returned an invalid expires_in.",
      );
    }

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  private async buildSignedJwt(): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const header: Record<string, string> = {
      alg: "RS256",
      typ: "JWT",
    };
    if (this.credential.private_key_id) {
      header.kid = this.credential.private_key_id;
    }

    const claims = {
      iss: this.credential.client_email,
      scope: SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: nowSeconds - CLOCK_SKEW_SECONDS,
      exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    };

    const encodedHeader = base64UrlEncode(
      new TextEncoder().encode(JSON.stringify(header)),
    );
    const encodedClaims = base64UrlEncode(
      new TextEncoder().encode(JSON.stringify(claims)),
    );

    const signingInput = `${encodedHeader}.${encodedClaims}`;

    const privateKey = await importPkcs8Key(this.credential.private_key);
    const signatureBuffer = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(signingInput),
    );

    const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));
    return `${signingInput}.${encodedSignature}`;
  }
}

// =============================================================================
// Crypto and encoding helpers
// =============================================================================

/**
 * Import a PEM-encoded PKCS#8 private key for RS256 signing.
 */
async function importPkcs8Key(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryString = atob(pemBody);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * URL-safe base64 encoding without padding (per RFC 7515).
 */
function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
