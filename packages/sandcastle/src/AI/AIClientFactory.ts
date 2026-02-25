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

/** Single source of truth for supported Gemini models */
const GEMINI_MODELS: readonly GeminiModel[] = [
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
] as const;

/** Single source of truth for supported Claude models (order = display priority) */
const CLAUDE_MODELS: readonly ClaudeModel[] = [
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
] as const;

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3-flash-preview";
const DEFAULT_CLAUDE_MODEL: ClaudeModel = "claude-sonnet-4-5-20250929";

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
    if ((GEMINI_MODELS as readonly string[]).includes(model)) {
      return "gemini";
    }

    if ((CLAUDE_MODELS as readonly string[]).includes(model)) {
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
   * Get all model IDs in display order (Claude first, then Gemini)
   */
  static getAllModelIds(): AIModel[] {
    return [...CLAUDE_MODELS, ...GEMINI_MODELS];
  }

  /**
   * Get all available models (those with valid credentials)
   */
  static getAvailableModels(): AIModel[] {
    const availableModels: AIModel[] = [];

    // Add Claude models first if Anthropic API key is available (preferred)
    if (ApiKeyManager.hasAnthropicApiKey()) {
      availableModels.push(...CLAUDE_MODELS);
    }

    // Add Gemini models if API key is available
    if (ApiKeyManager.hasApiKey()) {
      availableModels.push(...GEMINI_MODELS);
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

    // Prefer Claude Sonnet as default when Anthropic is configured
    if (ApiKeyManager.hasAnthropicApiKey()) {
      return DEFAULT_CLAUDE_MODEL;
    }

    // Fall back to Gemini Flash as default
    if (availableModels.includes(DEFAULT_GEMINI_MODEL)) {
      return DEFAULT_GEMINI_MODEL;
    }

    return availableModels[0];
  }

  /**
   * Get model display information
   */
  static getModelInfo(model: AIModel): {
    displayName: string;
    provider: AIProvider;
  } {
    const provider = this.getProviderForModel(model);

    const modelInfo: Record<AIModel, { displayName: string }> = {
      "claude-opus-4-6": { displayName: "Claude Opus 4.6" },
      "claude-sonnet-4-5-20250929": { displayName: "Claude Sonnet 4.5" },
      "claude-haiku-4-5-20251001": { displayName: "Claude Haiku 4.5" },
      "gemini-3-flash-preview": { displayName: "Gemini 3 Flash" },
      "gemini-3-pro-preview": { displayName: "Gemini 3 Pro" },
    };

    return {
      ...modelInfo[model],
      provider,
    };
  }
}
