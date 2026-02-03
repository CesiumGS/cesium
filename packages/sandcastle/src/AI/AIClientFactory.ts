import { GeminiClient } from "./GeminiClient";
import { AnthropicClient } from "./AnthropicClient";
import { ApiKeyManager } from "./ApiKeyManager";
import type {
  AIModel,
  AIProvider,
  GeminiModel,
  ClaudeModel,
  CodeContext,
  StreamChunk,
  GeminiClientOptions,
  AnthropicClientOptions,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ConversationHistory,
} from "./types";

/**
 * Unified interface for AI clients
 * Provides a consistent API across different providers
 */
export interface AIClient {
  generateWithContext(
    userMessage: string,
    context: CodeContext,
    useDiffFormat?: boolean,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: ConversationHistory,
    attachments?: Array<{ mimeType: string; base64Data: string }>,
  ): AsyncGenerator<StreamChunk>;

  submitToolResult?(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: ConversationHistory,
    tools?: ToolDefinition[],
  ): AsyncGenerator<StreamChunk>;

  setModel(model: AIModel): void;
  getModel(): AIModel;
}

/**
 * Factory for creating and managing AI clients based on the selected model
 * Handles provider detection and credential validation
 */
export class AIClientFactory {
  /**
   * Determine which provider a model belongs to
   */
  static getProviderForModel(model: AIModel): AIProvider {
    const geminiModels: GeminiModel[] = [
      "gemini-3-flash-preview",
      "gemini-3-pro-preview",
    ];

    const claudeModels: ClaudeModel[] = [
      "claude-opus-4-5-20251101",
      "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5-20251001",
    ];

    if (geminiModels.includes(model as GeminiModel)) {
      return "gemini";
    }

    if (claudeModels.includes(model as ClaudeModel)) {
      return "anthropic";
    }

    throw new Error(`Unknown model: ${model}`);
  }

  /**
   * Check if a specific provider has valid credentials
   */
  static hasCredentialsForProvider(provider: AIProvider): boolean {
    switch (provider) {
      case "gemini":
        return ApiKeyManager.hasApiKey();
      case "anthropic":
        return ApiKeyManager.hasAnthropicApiKey();
      default:
        return false;
    }
  }

  /**
   * Check if a specific model can be used (has valid credentials)
   */
  static canUseModel(model: AIModel): boolean {
    const provider = this.getProviderForModel(model);
    return this.hasCredentialsForProvider(provider);
  }

  /**
   * Create an AI client for the specified model
   * @param model - The AI model to use
   * @param options - Optional configuration
   * @throws Error if credentials are not available for the model's provider
   */
  static createClient(
    model: AIModel,
    options?: {
      geminiOptions?: GeminiClientOptions;
      anthropicOptions?: AnthropicClientOptions;
    },
  ): AIClient {
    const provider = this.getProviderForModel(model);

    switch (provider) {
      case "gemini": {
        const apiKey = ApiKeyManager.getApiKey();
        if (!apiKey) {
          throw new Error(
            "Gemini API key not found. Please configure your API key in settings.",
          );
        }
        return new GeminiClient(
          apiKey,
          model as GeminiModel,
          options?.geminiOptions,
        );
      }

      case "anthropic": {
        const apiKey = ApiKeyManager.getAnthropicApiKey();
        if (!apiKey) {
          throw new Error(
            "Anthropic API key not found. Please configure your API key in settings.",
          );
        }
        return new AnthropicClient(
          apiKey,
          model as ClaudeModel,
          options?.anthropicOptions,
        );
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Get all available models (those with valid credentials)
   */
  static getAvailableModels(): AIModel[] {
    const availableModels: AIModel[] = [];

    // Add Claude models first if Anthropic API key is available (preferred)
    if (ApiKeyManager.hasAnthropicApiKey()) {
      availableModels.push(
        "claude-sonnet-4-5-20250929",
        "claude-opus-4-5-20251101",
        "claude-haiku-4-5-20251001",
      );
    }

    // Add Gemini models if API key is available
    if (ApiKeyManager.hasApiKey()) {
      availableModels.push("gemini-3-flash-preview", "gemini-3-pro-preview");
    }

    return availableModels;
  }

  /**
   * Get the default model (prefers Claude when Anthropic is configured)
   */
  static getDefaultModel(): AIModel | null {
    const availableModels = this.getAvailableModels();

    if (availableModels.length === 0) {
      return null;
    }

    // Prefer Claude Sonnet 4.5 as default when Anthropic is configured
    if (ApiKeyManager.hasAnthropicApiKey()) {
      return "claude-sonnet-4-5-20250929";
    }

    // Fall back to Gemini Flash as default
    if (availableModels.includes("gemini-3-flash-preview")) {
      return "gemini-3-flash-preview";
    }

    // Otherwise return first available
    return availableModels[0];
  }

  /**
   * Get model display information
   */
  static getModelInfo(model: AIModel): {
    displayName: string;
    description: string;
    provider: AIProvider;
    badge: string;
  } {
    const provider = this.getProviderForModel(model);

    const modelInfo: Record<
      AIModel,
      { displayName: string; description: string; badge: string }
    > = {
      // Claude models
      "claude-opus-4-5-20251101": {
        displayName: "Claude Opus 4.5",
        description:
          "Premium model with maximum intelligence ($5/$25 per MTok)",
        badge: "🎭 Opus",
      },
      "claude-sonnet-4-5-20250929": {
        displayName: "Claude Sonnet 4.5",
        description: "Best for complex agents and coding ($3/$15 per MTok)",
        badge: "🎵 Sonnet",
      },
      "claude-haiku-4-5-20251001": {
        displayName: "Claude Haiku 4.5",
        description: "Fastest with near-frontier intelligence ($1/$5 per MTok)",
        badge: "⚡ Haiku",
      },
      // Gemini models
      "gemini-3-flash-preview": {
        displayName: "Gemini 3 Flash",
        description: "Pro-grade reasoning at Flash speed ($0.50/$3 per MTok)",
        badge: "⚡ Flash",
      },
      "gemini-3-pro-preview": {
        displayName: "Gemini 3 Pro",
        description: "State-of-the-art reasoning & multimodal",
        badge: "🧠 Pro",
      },
    };

    return {
      ...modelInfo[model],
      provider,
    };
  }
}
