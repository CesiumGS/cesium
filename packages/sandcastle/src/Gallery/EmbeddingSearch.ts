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
  embedding?: number[];
}

interface GalleryListItem {
  url: string;
  id: string;
  title: string;
  thumbnail: string;
  lineCount: number;
  description: string;
  labels: string[];
  embedding?: number[];
}

interface GalleryList {
  entries: GalleryListItem[];
  legacyIds: Record<string, string>;
}

class EmbeddingSearch {
  private galleryList: GalleryList | null = null;
  private tokenizer: PreTrainedTokenizer | null = null;
  private model: PreTrainedModel | null = null;
  private modelId: string = "avsolatorio/GIST-small-Embedding-v0";

  async initialize(): Promise<void> {
    if (this.galleryList && this.model && this.tokenizer) {
      return;
    }

    const response = await fetch("gallery/list.json");
    this.galleryList = await response.json();
    console.log(this.galleryList);

    this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
    this.model = await AutoModel.from_pretrained(this.modelId);
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
    if (!this.galleryList || !this.model || !this.tokenizer) {
      console.log("Search occured before initialization completed.");
      return [];
    }

    const inputs = await this.tokenizer([query.trim()], {
      padding: true,
      truncation: true,
    });

    const { sentence_embedding } = await this.model(inputs);
    const queryEmbedding = sentence_embedding.tolist()[0];

    let itemsWithEmbeddings = this.galleryList.entries.filter(
      (item) => item.embedding,
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
      const score = this.cosineSimilarity(queryEmbedding, item.embedding!);
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

// Pre-load the model and gallery list at application startup
// This happens in the background so the UI can load while the model downloads
if (typeof window !== "undefined") {
  embeddingSearch.initialize();
}

export async function vectorSearch(
  query: string,
  limit: number = 10,
  filters?: Record<string, string | string[]> | null,
): Promise<VectorSearchResult[]> {
  return embeddingSearch.search(query, limit, filters);
}
