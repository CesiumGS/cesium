const API_KEY_STORAGE_KEY = "sandcastle_gemini_api_key";
const ANTHROPIC_API_KEY_STORAGE_KEY = "sandcastle_anthropic_api_key";
const CESIUM_ION_TOKEN_STORAGE_KEY = "sandcastle_cesium_ion_token";
const VERTEX_SERVICE_ACCOUNT_STORAGE_KEY = "sandcastle_vertex_service_account";
const VERTEX_REGION_STORAGE_KEY = "sandcastle_vertex_region";

const DEFAULT_VERTEX_REGION = "global";
const VERTEX_REGION_PATTERN = /^[a-z]+[a-z0-9-]*[a-z0-9]$/;

// Minimum valid length for Anthropic API keys (sk-ant- prefix + minimum key content)
const MIN_ANTHROPIC_KEY_LENGTH = 20;

// Use sessionStorage to reduce persistence of sensitive credentials.
// Keys are cleared when the browser tab is closed, limiting the exposure window.
const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null;

export class ApiKeyManager {
  // ============================================================================
  // Gemini API Key Management
  // ============================================================================

  /**
   * Store Gemini API key in sessionStorage
   */
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

  /**
   * Retrieve Gemini API key from sessionStorage
   */
  static getApiKey(): string | null {
    try {
      return storage?.getItem(API_KEY_STORAGE_KEY) ?? null;
    } catch (error) {
      console.warn("Failed to retrieve API key from sessionStorage:", error);
      return null;
    }
  }

  /**
   * Check if Gemini API key exists
   */
  static hasApiKey(): boolean {
    try {
      const key = this.getApiKey();
      return key !== null && key.length > 0;
    } catch (error) {
      console.warn("Failed to check API key existence:", error);
      return false;
    }
  }

  /**
   * Remove Gemini API key from sessionStorage
   */
  static clearApiKey(): void {
    try {
      storage?.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear API key from sessionStorage:", error);
    }
  }

  /**
   * Validate Gemini API key format (basic check)
   */
  static validateApiKeyFormat(apiKey: string): boolean {
    // Gemini API keys typically start with "AI" and are 39 characters
    // This is a basic check - actual validation happens on API call
    return apiKey.startsWith("AI") && apiKey.trim().length >= 30;
  }

  // ============================================================================
  // Anthropic API Key Management
  // ============================================================================

  /**
   * Store Anthropic API key in sessionStorage
   */
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

  /**
   * Retrieve Anthropic API key from sessionStorage
   */
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

  /**
   * Check if Anthropic API key exists
   */
  static hasAnthropicApiKey(): boolean {
    try {
      const key = this.getAnthropicApiKey();
      return key !== null && key.length > 0;
    } catch (error) {
      console.warn("Failed to check Anthropic API key existence:", error);
      return false;
    }
  }

  /**
   * Remove Anthropic API key from sessionStorage
   */
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

  /**
   * Validate Anthropic API key format (basic check)
   * Anthropic API keys start with "sk-ant-"
   */
  static validateAnthropicApiKeyFormat(apiKey: string): boolean {
    const trimmed = apiKey.trim();
    return (
      trimmed.length > MIN_ANTHROPIC_KEY_LENGTH && trimmed.startsWith("sk-ant-")
    );
  }

  // ============================================================================
  // Cesium Ion Token Management
  // ============================================================================

  /**
   * Store Cesium Ion access token in sessionStorage
   */
  static saveCesiumIonToken(token: string): void {
    if (!token || token.trim().length === 0) {
      throw new Error("Cesium Ion token cannot be empty");
    }
    if (!storage) {
      console.warn("sessionStorage unavailable — token will not persist");
      return;
    }
    try {
      storage.setItem(CESIUM_ION_TOKEN_STORAGE_KEY, token.trim());
    } catch (error) {
      console.warn("Failed to save Cesium Ion token to sessionStorage:", error);
    }
  }

  /**
   * Retrieve Cesium Ion access token from sessionStorage
   */
  static getCesiumIonToken(): string | null {
    try {
      return storage?.getItem(CESIUM_ION_TOKEN_STORAGE_KEY) ?? null;
    } catch (error) {
      console.warn(
        "Failed to retrieve Cesium Ion token from sessionStorage:",
        error,
      );
      return null;
    }
  }

  /**
   * Check if Cesium Ion token exists
   */
  static hasCesiumIonToken(): boolean {
    try {
      const token = this.getCesiumIonToken();
      return token !== null && token.length > 0;
    } catch (error) {
      console.warn("Failed to check Cesium Ion token existence:", error);
      return false;
    }
  }

  /**
   * Remove Cesium Ion token from sessionStorage
   */
  static clearCesiumIonToken(): void {
    try {
      storage?.removeItem(CESIUM_ION_TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn(
        "Failed to clear Cesium Ion token from sessionStorage:",
        error,
      );
    }
  }

  /**
   * Validate Cesium Ion token format (basic check)
   * Cesium Ion tokens are JWTs that start with "eyJ"
   */
  static validateCesiumIonTokenFormat(token: string): boolean {
    const trimmed = token.trim();
    // JWT tokens start with "eyJ" (base64 encoded JSON header)
    return trimmed.length > 20 && trimmed.startsWith("eyJ");
  }

  // ============================================================================
  // Vertex AI Service Account Management
  // ============================================================================

  /**
   * Store Vertex AI service-account JSON in sessionStorage
   */
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
      console.warn(
        "sessionStorage unavailable — service account will not persist",
      );
      return;
    }
    try {
      storage.setItem(VERTEX_SERVICE_ACCOUNT_STORAGE_KEY, trimmed);
    } catch (error) {
      console.warn(
        "Failed to save Vertex service account to sessionStorage:",
        error,
      );
    }
  }

  /**
   * Retrieve Vertex AI service-account JSON from sessionStorage
   */
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

  /**
   * Check if Vertex AI service-account JSON exists
   */
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

  /**
   * Remove Vertex AI service-account JSON from sessionStorage
   */
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
   * Validate Vertex AI service-account JSON format.
   * Required fields: type, project_id, client_email, private_key.
   * type must be "service_account", private_key must begin with PEM header.
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

  /**
   * Extract the project ID from the stored service-account JSON
   */
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

  /**
   * Store the Vertex AI region in sessionStorage
   */
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

  /**
   * Retrieve the Vertex AI region (defaults to us-central1)
   */
  static getVertexRegion(): string {
    try {
      return (
        storage?.getItem(VERTEX_REGION_STORAGE_KEY) ?? DEFAULT_VERTEX_REGION
      );
    } catch {
      return DEFAULT_VERTEX_REGION;
    }
  }

  // ============================================================================
  // Multi-Provider Status
  // ============================================================================

  /**
   * Check if at least one AI provider is configured
   */
  static hasAnyCredentials(): boolean {
    return (
      this.hasApiKey() ||
      this.hasAnthropicApiKey() ||
      this.hasVertexServiceAccount()
    );
  }

  /**
   * Get list of configured AI providers
   */
  static getConfiguredProviders(): Array<"gemini" | "anthropic" | "vertex"> {
    const providers: Array<"gemini" | "anthropic" | "vertex"> = [];
    if (this.hasApiKey()) {
      providers.push("gemini");
    }
    if (this.hasAnthropicApiKey()) {
      providers.push("anthropic");
    }
    if (this.hasVertexServiceAccount()) {
      providers.push("vertex");
    }
    return providers;
  }

  /**
   * Clear all credentials (AI keys and tokens)
   */
  static clearAllCredentials(): void {
    this.clearApiKey();
    this.clearAnthropicApiKey();
    this.clearCesiumIonToken();
    this.clearVertexServiceAccount();
  }
}
