import {
  AutoModel,
  AutoTokenizer,
  PreTrainedModel,
  PreTrainedTokenizer,
} from "@huggingface/transformers";

export interface VectorSearchResult {
  rank: number;
  id: string;
  legacy_id: string;
  title: string;
  description: string;
  labels: string[];
  distance: number;
  score: number;
  url: string;
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
  private loadingPromise: Promise<void> | null = null;

  /**
   * Load the gallery list with embeddings
   */
  private async loadGalleryList(): Promise<void> {
    if (this.galleryList) {
      return;
    }

    try {
      const response = await fetch("gallery/list.json");
      if (!response.ok) {
        throw new Error(`Failed to load gallery list: ${response.statusText}`);
      }
      this.galleryList = await response.json();

      // Verify that embeddings are present
      const itemsWithEmbeddings = this.galleryList!.entries.filter(
        (item) => item.embedding,
      );
      if (itemsWithEmbeddings.length === 0) {
        throw new Error(
          "No embeddings found in gallery list. Run the build script to generate them.",
        );
      }

      console.log(
        `Loaded ${itemsWithEmbeddings.length} gallery items with embeddings`,
      );
    } catch (error) {
      console.error("Failed to load gallery list:", error);
      throw error;
    }
  }

  /**
   * Initialize the embedding model
   */
  private async loadModel(): Promise<void> {
    if (this.model && this.tokenizer) {
      return;
    }

    try {
      console.log(
        `Loading embedding model: ${this.modelId} (this may take a moment on first load)...`,
      );
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
      this.model = await AutoModel.from_pretrained(this.modelId);
      console.log(`Embedding model loaded successfully: ${this.modelId}`);
    } catch (error) {
      console.error("Failed to load embedding model:", error);
      throw error;
    }
  }

  /**
   * Initialize both the gallery list and the model
   */
  async initialize(): Promise<void> {
    // If already fully initialized, return immediately
    if (this.galleryList && this.model && this.tokenizer) {
      return;
    }

    // If currently loading, wait for that to finish
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading
    this.loadingPromise = (async () => {
      await Promise.all([this.loadGalleryList(), this.loadModel()]);
      // Clear the promise after successful initialization
      this.loadingPromise = null;
    })();

    return this.loadingPromise;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
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

  /**
   * Perform a vector similarity search
   * @param query - The search query text
   * @param limit - Maximum number of results to return
   * @returns Array of search results ranked by relevance
   */
  async search(
    query: string,
    limit: number = 10,
  ): Promise<VectorSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      if (!this.galleryList || !this.model || !this.tokenizer) {
        await this.initialize();
      }

      if (!this.galleryList || !this.model || !this.tokenizer) {
        throw new Error("Vector search not properly initialized");
      }

      const inputs = await this.tokenizer([query.trim()], {
        padding: true,
        truncation: true,
      });

      const { sentence_embedding } = await this.model(inputs);
      const queryEmbedding = sentence_embedding.tolist()[0];

      const itemsWithEmbeddings = this.galleryList.entries.filter(
        (item) => item.embedding,
      );
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

      // Format results to match expected interface
      const formattedResults = topResults.map((result, index) => ({
        rank: index + 1,
        id: result.id,
        legacy_id: result.id, // Use id as legacy_id for compatibility
        title: result.title,
        description: result.description,
        labels: result.labels,
        distance: result.distance,
        score: result.score,
        url: result.url,
      }));

      return formattedResults;
    } catch (error) {
      console.error("[EmbeddingSearch] Search failed:", error);
      // Return empty results on error so the app can continue
      return [];
    }
  }

  /**
   * Check if the search service is ready
   */
  isReady(): boolean {
    return (
      this.galleryList !== null &&
      this.model !== null &&
      this.tokenizer !== null
    );
  }
}

const embeddingSearch = new EmbeddingSearch();

// Pre-load the model and gallery list at application startup
// This happens in the background so the UI can load while the model downloads
if (typeof window !== "undefined") {
  // Start loading immediately when the module is imported
  embeddingSearch
    .initialize()
    .then(() => {
      console.log(
        "[EmbeddingSearch] Model and embeddings pre-loaded and ready for search!",
      );
    })
    .catch((error) => {
      console.error("[EmbeddingSearch] Failed to pre-load model:", error);
    });
}

/**
 * Performs vector search using the local embedding model
 * @param query - The search query string
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Promise resolving to array of search results
 */
export async function vectorSearch(
  query: string,
  limit: number = 10,
): Promise<VectorSearchResult[]> {
  return embeddingSearch.search(query, limit);
}

export { embeddingSearch };
