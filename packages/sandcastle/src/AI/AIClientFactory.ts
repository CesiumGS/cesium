import { GeminiClient } from "./GeminiClient";
import { AnthropicClient } from "./AnthropicClient";
import { VertexAIClient } from "./VertexAIClient";
import { ApiKeyManager } from "./ApiKeyManager";
import type {
  AIModel,
  AIProvider,
  AIRoute,
  GeminiModel,
  ClaudeModel,
  ModelEntry,
  ModelSelection,
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
  "gemini-3.1-pro-preview",
] as const;

/** Single source of truth for supported Claude models (order = display priority) */
const CLAUDE_MODELS: readonly ClaudeModel[] = [
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5-20251001",
] as const;

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3-flash-preview";
const DEFAULT_CLAUDE_MODEL: ClaudeModel = "claude-sonnet-4-6";

/** Display names for all models */
const MODEL_DISPLAY_NAMES: Record<AIModel, string> = {
  "claude-opus-4-7": "Claude Opus 4.7",
  "claude-sonnet-4-6": "Claude Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "gemini-3-flash-preview": "Gemini 3 Flash Preview",
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro Preview",
};

/**
 * Vertex region allowlists for models that have known region restrictions.
 * Models not listed here are treated as region-flexible.
 */
const VERTEX_REGION_ALLOWLIST: Partial<Record<AIModel, readonly string[]>> = {
  // Source: Google Cloud model cards (March 2026).
  "claude-opus-4-7": ["us-east5", "europe-west1", "asia-southeast1", "global"],
  "claude-sonnet-4-6": [
    "us-east5",
    "europe-west1",
    "asia-southeast1",
    "global",
  ],
  "claude-haiku-4-5-20251001": [
    "us-east5",
    "europe-west1",
    "asia-east1",
    "global",
  ],
};

function normalizeVertexRegion(region: string): string {
  return region.trim().toLowerCase();
}

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
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk>;

  submitToolResult?(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: ConversationHistory,
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
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
   * Returns supported Vertex regions for a model, or null if unrestricted.
   */
  static getSupportedVertexRegions(model: AIModel): readonly string[] | null {
    return VERTEX_REGION_ALLOWLIST[model] ?? null;
  }

  /**
   * Returns true when a model can be served from a given Vertex region.
   */
  static isVertexRegionSupported(model: AIModel, region: string): boolean {
    const allowlist = this.getSupportedVertexRegions(model);
    if (!allowlist) {
      return true;
    }
    return allowlist.includes(normalizeVertexRegion(region));
  }

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
    return {
      displayName: MODEL_DISPLAY_NAMES[model],
      provider,
    };
  }

  // ==========================================================================
  // Route-aware APIs
  // ==========================================================================

  /**
   * Get all model entries with route info for display.
   * Order: Claude first, then Gemini. When a model is available via both
   * direct and vertex routes, both entries are emitted with display suffixes.
   */
  static getAvailableModelEntries(): ModelEntry[] {
    const entries: ModelEntry[] = [];
    const allModels = this.getAllModelIds();

    const hasVertex = ApiKeyManager.hasVertexServiceAccount();
    const vertexRegion = ApiKeyManager.getVertexRegion();

    for (const model of allModels) {
      const provider = this.getProviderForModel(model);
      const displayName = MODEL_DISPLAY_NAMES[model];

      const hasDirect = this.hasCredentialsForProvider(provider);
      const hasVertexForModel =
        hasVertex && this.isVertexRegionSupported(model, vertexRegion);

      // Determine if we need suffixes (model available on multiple routes)
      const needsSuffix = hasDirect && hasVertexForModel;

      if (hasDirect) {
        entries.push({
          id: model,
          route: "direct",
          displayName,
          displaySuffix: needsSuffix ? "(Direct)" : undefined,
          provider,
        });
      }

      if (hasVertexForModel) {
        entries.push({
          id: model,
          route: "vertex",
          displayName,
          displaySuffix: needsSuffix ? "(Vertex)" : undefined,
          provider,
        });
      }
    }

    return entries;
  }

  /**
   * Check if a model can be used via a specific route
   */
  static canUseModelRoute(model: AIModel, route: AIRoute): boolean {
    if (route === "vertex") {
      if (!ApiKeyManager.hasVertexServiceAccount()) {
        return false;
      }
      const region = ApiKeyManager.getVertexRegion();
      return this.isVertexRegionSupported(model, region);
    }
    // direct route
    const provider = this.getProviderForModel(model);
    return this.hasCredentialsForProvider(provider);
  }

  /**
   * Create an AI client for a model+route selection
   */
  static createClientForRoute(
    selection: ModelSelection,
    options?: {
      geminiOptions?: GeminiClientOptions;
      anthropicOptions?: AnthropicClientOptions;
    },
  ): AIClient {
    if (selection.route === "vertex") {
      const serviceAccountJson = ApiKeyManager.getVertexServiceAccount();
      if (!serviceAccountJson) {
        throw new Error(
          "Vertex AI service account not found. Please configure your credentials in settings.",
        );
      }
      const region = ApiKeyManager.getVertexRegion();
      if (!this.isVertexRegionSupported(selection.model, region)) {
        const supportedRegions = this.getSupportedVertexRegions(
          selection.model,
        );
        const guidance = supportedRegions
          ? ` Supported regions: ${supportedRegions.join(", ")}.`
          : "";
        throw new Error(
          `${MODEL_DISPLAY_NAMES[selection.model]} is not available on Vertex AI in region "${region}".${guidance}`,
        );
      }
      return new VertexAIClient(
        serviceAccountJson,
        region,
        selection.model,
        options,
      );
    }

    // Direct route delegates to existing createClient
    return this.createClient(selection.model, options);
  }

  /**
   * Get the default model selection with route.
   * Prefers direct Claude > direct Gemini > vertex Claude > vertex Gemini.
   */
  static getDefaultModelSelection(): ModelSelection | null {
    // Prefer direct Claude
    if (ApiKeyManager.hasAnthropicApiKey()) {
      return { model: DEFAULT_CLAUDE_MODEL, route: "direct" };
    }

    // Direct Gemini
    if (ApiKeyManager.hasApiKey()) {
      return { model: DEFAULT_GEMINI_MODEL, route: "direct" };
    }

    // Vertex (any model)
    if (ApiKeyManager.hasVertexServiceAccount()) {
      const region = ApiKeyManager.getVertexRegion();
      const allModels = this.getAllModelIds();
      for (const model of allModels) {
        if (this.isVertexRegionSupported(model, region)) {
          return { model, route: "vertex" };
        }
      }
    }

    return null;
  }
}
