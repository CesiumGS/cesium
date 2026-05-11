const API_KEY_STORAGE_KEY = "sandcastle_gemini_api_key";
const ANTHROPIC_API_KEY_STORAGE_KEY = "sandcastle_anthropic_api_key";
const VERTEX_SERVICE_ACCOUNT_STORAGE_KEY = "sandcastle_vertex_service_account";
const VERTEX_REGION_STORAGE_KEY = "sandcastle_vertex_region";

const DEFAULT_VERTEX_REGION = "global";
const VERTEX_REGION_PATTERN = /^[a-z]+[a-z0-9-]*[a-z0-9]$/;

const MIN_ANTHROPIC_KEY_LENGTH = 20;

// sessionStorage so credentials clear when the tab closes.
const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;

export class ApiKeyManager {
  static saveApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error("API key cannot be empty");
    }
    if (!storage) {
      console.warn("sessionStorage unavailable — API key will not persist");
      return;
    }
    try {
      storage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    } catch (error) {
      console.warn("Failed to save API key to sessionStorage:", error);
    }
  }

  static getApiKey(): string | null {
    try {
      return storage?.getItem(API_KEY_STORAGE_KEY) ?? null;
    } catch (error) {
      console.warn("Failed to retrieve API key from sessionStorage:", error);
      return null;
    }
  }

  static hasApiKey(): boolean {
    try {
      const key = this.getApiKey();
      return key !== null && key.length > 0;
    } catch (error) {
      console.warn("Failed to check API key existence:", error);
      return false;
    }
  }

  static clearApiKey(): void {
    try {
      storage?.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear API key from sessionStorage:", error);
    }
  }

  /** Basic prefix/length check; real validation happens on first API call. */
  static validateApiKeyFormat(apiKey: string): boolean {
    return apiKey.startsWith("AI") && apiKey.trim().length >= 30;
  }

  static saveAnthropicApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error("API key cannot be empty");
    }
    if (!storage) {
      console.warn("sessionStorage unavailable — API key will not persist");
      return;
    }
    try {
      storage.setItem(ANTHROPIC_API_KEY_STORAGE_KEY, apiKey.trim());
    } catch (error) {
      console.warn(
        "Failed to save Anthropic API key to sessionStorage:",
        error,
      );
    }
  }

  static getAnthropicApiKey(): string | null {
    try {
      return storage?.getItem(ANTHROPIC_API_KEY_STORAGE_KEY) ?? null;
    } catch (error) {
      console.warn(
        "Failed to retrieve Anthropic API key from sessionStorage:",
        error,
      );
      return null;
    }
  }

  static hasAnthropicApiKey(): boolean {
    try {
      const key = this.getAnthropicApiKey();
      return key !== null && key.length > 0;
    } catch (error) {
      console.warn("Failed to check Anthropic API key existence:", error);
      return false;
    }
  }

  static clearAnthropicApiKey(): void {
    try {
      storage?.removeItem(ANTHROPIC_API_KEY_STORAGE_KEY);
    } catch (error) {
      console.warn(
        "Failed to clear Anthropic API key from sessionStorage:",
        error,
      );
    }
  }

  /** Anthropic keys start with "sk-ant-". */
  static validateAnthropicApiKeyFormat(apiKey: string): boolean {
    const trimmed = apiKey.trim();
    return (
      trimmed.length > MIN_ANTHROPIC_KEY_LENGTH && trimmed.startsWith("sk-ant-")
    );
  }

  static saveVertexServiceAccount(json: string): void {
    if (!json || json.trim().length === 0) {
      throw new Error("Service account JSON cannot be empty");
    }
    const trimmed = json.trim();
    if (!this.validateVertexServiceAccountFormat(trimmed)) {
      throw new Error(
        'Invalid service account JSON. Required: type "service_account", project_id, client_email, and a valid private_key.',
      );
    }
    if (!storage) {
      throw new Error(
        "sessionStorage is unavailable. The service account cannot be saved in this environment.",
      );
    }
    try {
      storage.setItem(VERTEX_SERVICE_ACCOUNT_STORAGE_KEY, trimmed);
    } catch (error) {
      // Most commonly QuotaExceededError — surface it so the UI can tell the
      // user instead of silently dropping the credential.
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to save Vertex service account to sessionStorage: ${detail}`,
        { cause: error },
      );
    }
  }

  static getVertexServiceAccount(): string | null {
    try {
      return storage?.getItem(VERTEX_SERVICE_ACCOUNT_STORAGE_KEY) ?? null;
    } catch (error) {
      console.warn(
        "Failed to retrieve Vertex service account from sessionStorage:",
        error,
      );
      return null;
    }
  }

  static hasVertexServiceAccount(): boolean {
    try {
      const sa = this.getVertexServiceAccount();
      if (sa === null || sa.length === 0) {
        return false;
      }
      return this.validateVertexServiceAccountFormat(sa);
    } catch (error) {
      console.warn("Failed to check Vertex service account existence:", error);
      return false;
    }
  }

  static clearVertexServiceAccount(): void {
    try {
      storage?.removeItem(VERTEX_SERVICE_ACCOUNT_STORAGE_KEY);
      storage?.removeItem(VERTEX_REGION_STORAGE_KEY);
    } catch (error) {
      console.warn(
        "Failed to clear Vertex service account from sessionStorage:",
        error,
      );
    }
  }

  /**
   * Required fields: type ("service_account"), project_id, client_email,
   * and a PEM-headered private_key.
   */
  static validateVertexServiceAccountFormat(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) {
        return false;
      }
      const credential = parsed as Record<string, unknown>;
      if (credential.type !== "service_account") {
        return false;
      }
      if (
        typeof credential.project_id !== "string" ||
        credential.project_id.length === 0
      ) {
        return false;
      }
      if (
        typeof credential.client_email !== "string" ||
        credential.client_email.length === 0
      ) {
        return false;
      }
      if (typeof credential.private_key !== "string") {
        return false;
      }
      if (!credential.private_key.startsWith("-----BEGIN PRIVATE KEY-----")) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  static getVertexProjectId(): string | null {
    const json = this.getVertexServiceAccount();
    if (!json) {
      return null;
    }
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) {
        return null;
      }
      const credential = parsed as Record<string, unknown>;
      return typeof credential.project_id === "string"
        ? credential.project_id
        : null;
    } catch {
      return null;
    }
  }

  static saveVertexRegion(region: string): void {
    const normalized = region.trim().toLowerCase();
    if (!VERTEX_REGION_PATTERN.test(normalized)) {
      throw new Error(`Invalid region format: ${normalized}`);
    }
    if (!storage) {
      console.warn("sessionStorage unavailable — region will not persist");
      return;
    }
    try {
      storage.setItem(VERTEX_REGION_STORAGE_KEY, normalized);
    } catch (error) {
      console.warn("Failed to save Vertex region to sessionStorage:", error);
    }
  }

  /** Defaults to "global" when no region is stored. */
  static getVertexRegion(): string {
    try {
      return (
        storage?.getItem(VERTEX_REGION_STORAGE_KEY) ?? DEFAULT_VERTEX_REGION
      );
    } catch {
      return DEFAULT_VERTEX_REGION;
    }
  }

  static hasAnyCredentials(): boolean {
    return (
      this.hasApiKey() ||
      this.hasAnthropicApiKey() ||
      this.hasVertexServiceAccount()
    );
  }
}
