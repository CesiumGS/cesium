import { OpenAIClient } from "./OpenAIClient";
import { GeminiClient } from "./GeminiClient";
import { AnthropicClient } from "./AnthropicClient";
import { VertexAIClient } from "./VertexAIClient";
import { ApiKeyManager } from "./ApiKeyManager";
import type {
  AIModel,
  OpenAIModel,
  OpenAIClientOptions,
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
} from "../types";

const GEMINI_MODELS: readonly GeminiModel[] = [
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
] as const;

/** Order = display priority */
const CLAUDE_MODELS: readonly ClaudeModel[] = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
] as const;

const OPENAI_MODELS: readonly OpenAIModel[] = [
  "gpt-6.1-sol",
  "gpt-6-luna",
  "gpt-6-astra",
];

const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3-flash-preview";
const DEFAULT_CLAUDE_MODEL: ClaudeModel = "claude-opus-4-8";

const MODEL_DISPLAY_NAMES: Record<AIModel, string> = {
  "gpt-6-luna": "GPT-6 Luna",
  "gpt-6.1-sol": "GPT-6.1 Sol",
  "gpt-6-astra": "GPT-6 Astra",
  "claude-opus-4-8": "Claude Opus 4.8",
  "claude-sonnet-4-6": "Claude Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "gemini-3-flash-preview": "Gemini 3 Flash Preview",
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro Preview",
};

/**
 * Vertex region allowlists for models with known region restrictions.
 * Models not listed here are treated as region-flexible.
 * Source: Google Cloud model cards (April 2026).
 */
const VERTEX_REGION_ALLOWLIST: Partial<Record<AIModel, readonly string[]>> = {
  "claude-opus-4-8": ["us", "eu", "global"],
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

export interface AIClient {
  generateWithContext(
    userMessage: string,
    context: CodeContext,
    customAddendum?: string,
    tools?: ToolDefinition[],
    conversationHistory?: ConversationHistory,
    attachments?: Array<{ mimeType: string; base64Data: string }>,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk>;

  submitToolResult(
    toolCall: ToolCall,
    result: ToolResult,
    systemPrompt: string,
    conversationHistory: ConversationHistory,
    tools?: ToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<StreamChunk>;
}

export class AIClientFactory {
  /** Returns null when the model has no region restrictions. */
  static getSupportedVertexRegions(model: AIModel): readonly string[] | null {
    return VERTEX_REGION_ALLOWLIST[model] ?? null;
  }

  static isVertexRegionSupported(model: AIModel, region: string): boolean {
    if (this.getProviderForModel(model) === "openai") {
      return false;
    }
    const allowlist = this.getSupportedVertexRegions(model);
    if (!allowlist) {
      return true;
    }
    return allowlist.includes(normalizeVertexRegion(region));
  }

  static getProviderForModel(model: AIModel): AIProvider {
    if ((GEMINI_MODELS as readonly string[]).includes(model)) {
      return "gemini";
    }

    if ((CLAUDE_MODELS as readonly string[]).includes(model)) {
      return "anthropic";
    }

    if ((OPENAI_MODELS as readonly string[]).includes(model)) {
      return "openai";
    }

    throw new Error(`Unknown model: ${model}`);
  }

  static hasCredentialsForProvider(provider: AIProvider): boolean {
    switch (provider) {
      case "openai":
        return ApiKeyManager.hasOpenAIApiKey();
      case "gemini":
        return ApiKeyManager.hasApiKey();
      case "anthropic":
        return ApiKeyManager.hasAnthropicApiKey();
      default:
        return false;
    }
  }

  /** @throws Error if credentials are not available for the model's provider */
  static createClient(
    model: AIModel,
    options?: {
      openaiOptions?: OpenAIClientOptions;
      geminiOptions?: GeminiClientOptions;
      anthropicOptions?: AnthropicClientOptions;
    },
  ): AIClient {
    const provider = this.getProviderForModel(model);

    switch (provider) {
      case "openai": {
        const apiKey = ApiKeyManager.getOpenAIApiKey();
        if (!apiKey) {
          throw new Error(
            "OpenAI API key not found. Please configure your API key in settings.",
          );
        }
        return new OpenAIClient(
          apiKey,
          model as OpenAIModel,
          options?.openaiOptions,
        );
      }
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

  /** Keep existing provider order, then OpenAI. */
  static getAllModelIds(): AIModel[] {
    return [...CLAUDE_MODELS, ...GEMINI_MODELS, ...OPENAI_MODELS];
  }

  /**
   * Claude, Gemini, then OpenAI. When a model is available via both direct
   * and vertex routes, both entries are emitted with display suffixes.
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

  static canUseModelRoute(model: AIModel, route: AIRoute): boolean {
    // Unknown/removed model ids (e.g. a stale value persisted in localStorage
    // before the model was removed) are never usable. Return false instead of
    // letting getProviderForModel throw "Unknown model" below.
    if (!(this.getAllModelIds() as string[]).includes(model)) {
      return false;
    }
    if (route === "vertex") {
      if (!ApiKeyManager.hasVertexServiceAccount()) {
        return false;
      }
      const region = ApiKeyManager.getVertexRegion();
      return this.isVertexRegionSupported(model, region);
    }
    const provider = this.getProviderForModel(model);
    return this.hasCredentialsForProvider(provider);
  }

  static createClientForRoute(
    selection: ModelSelection,
    options?: {
      openaiOptions?: OpenAIClientOptions;
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

    return this.createClient(selection.model, options);
  }

  /** Prefers direct Claude, Gemini, OpenAI, then supported Vertex models. */
  static getDefaultModelSelection(): ModelSelection | null {
    if (ApiKeyManager.hasAnthropicApiKey()) {
      return { model: DEFAULT_CLAUDE_MODEL, route: "direct" };
    }

    if (ApiKeyManager.hasApiKey()) {
      return { model: DEFAULT_GEMINI_MODEL, route: "direct" };
    }

    if (ApiKeyManager.hasOpenAIApiKey()) {
      return { model: "gpt-6.1-sol", route: "direct" };
    }

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
