import {
  AutoModel,
  AutoTokenizer,
  PreTrainedModel,
  PreTrainedTokenizer,
} from "@huggingface/transformers";

export interface VectorSearchResult {
  score: number;
  distance: number;
  url: string;
  id: string;
  title: string;
  thumbnail: string;
  lineCount: number;
  description: string;
  labels: string[];
}

interface GalleryListItem {
  url: string;
  id: string;
  title: string;
  thumbnail: string;
  lineCount: number;
  description: string;
  labels: string[];
}

export interface GalleryList {
  entries: GalleryListItem[];
  legacyIds: Record<string, string>;
}

type EmbeddingsMap = Record<string, number[]>;

class EmbeddingSearch {
  private galleryList: GalleryList | null = null;
  private embeddings: EmbeddingsMap | null = null;
  private tokenizer: PreTrainedTokenizer | null = null;
  private model: PreTrainedModel | null = null;
  private modelId: string = "avsolatorio/GIST-small-Embedding-v0";
  private onInitializedCallbacks: (() => void)[] = [];

  async initialize(galleryList: GalleryList): Promise<void> {
    if (this.embeddings && this.model && this.tokenizer) {
      return;
    }

    this.galleryList = galleryList;

    const embeddingsResponse = await fetch("gallery/embeddings.json");
    this.embeddings = await embeddingsResponse.json();

    this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
    this.model = await AutoModel.from_pretrained(this.modelId, {
      dtype: "q8",
    });
    this.onInitializedCallbacks.forEach((callback) => callback());
  }

  onInitialized(callback: () => void): void {
    if (this.galleryList && this.embeddings && this.model && this.tokenizer) {
      callback();
    } else {
      this.onInitializedCallbacks.push(callback);
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(
    query: string,
    limit: number = 10,
    filters?: Record<string, string | string[]> | null,
  ): Promise<VectorSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    if (
      !this.galleryList ||
      !this.embeddings ||
      !this.model ||
      !this.tokenizer
    ) {
      return [];
    }

    const inputs = await this.tokenizer([query.trim()], {
      padding: true,
      truncation: true,
    });

    const { sentence_embedding } = await this.model(inputs);
    const queryEmbedding = sentence_embedding.tolist()[0];

    let itemsWithEmbeddings = this.galleryList.entries.filter(
      (item) => this.embeddings![item.id],
    );

    if (filters) {
      itemsWithEmbeddings = itemsWithEmbeddings.filter((item) => {
        if (typeof filters.labels === "string") {
          return item.labels.includes(filters.labels);
        }
        return false;
      });
    }

    const results = itemsWithEmbeddings.map((item) => {
      const embedding = this.embeddings![item.id];
      const score = this.cosineSimilarity(queryEmbedding, embedding);
      return {
        ...item,
        score,
        distance: 1 - score, // Convert similarity to distance
      };
    });

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);
    return topResults;
  }
}

const embeddingSearch = new EmbeddingSearch();

export async function initializeEmbeddingSearch(
  galleryList: GalleryList,
): Promise<void> {
  return embeddingSearch.initialize(galleryList);
}

export async function vectorSearch(
  query: string,
  limit: number = 10,
  filters?: Record<string, string | string[]> | null,
): Promise<VectorSearchResult[]> {
  return embeddingSearch.search(query, limit, filters);
}

export function onEmbeddingModelLoaded(callback: () => void): void {
  embeddingSearch.onInitialized(callback);
}
