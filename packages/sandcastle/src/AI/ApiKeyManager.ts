const API_KEY_STORAGE_KEY = "sandcastle_gemini_api_key";
const ANTHROPIC_API_KEY_STORAGE_KEY = "sandcastle_anthropic_api_key";
const CESIUM_ION_TOKEN_STORAGE_KEY = "sandcastle_cesium_ion_token";

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
    try {
      storage?.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
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
    return (
      apiKey.trim().length > 0 &&
      (apiKey.startsWith("AI") || apiKey.length > 20)
    );
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
    try {
      storage?.setItem(ANTHROPIC_API_KEY_STORAGE_KEY, apiKey.trim());
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
    try {
      storage?.setItem(CESIUM_ION_TOKEN_STORAGE_KEY, token.trim());
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
  // Multi-Provider Status
  // ============================================================================

  /**
   * Check if at least one AI provider is configured
   */
  static hasAnyCredentials(): boolean {
    return this.hasApiKey() || this.hasAnthropicApiKey();
  }

  /**
   * Get list of configured AI providers
   */
  static getConfiguredProviders(): Array<"gemini" | "anthropic"> {
    const providers: Array<"gemini" | "anthropic"> = [];
    if (this.hasApiKey()) {
      providers.push("gemini");
    }
    if (this.hasAnthropicApiKey()) {
      providers.push("anthropic");
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
  }
}
