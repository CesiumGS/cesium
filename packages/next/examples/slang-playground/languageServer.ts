import cesiumSlang from "../../src/shaders/cesium.slang?raw";
import { cesiumModule } from "../../src/scene/slangStages.ts";

/** An LSP position: line from 0, UTF-16 column. */
export interface Position {
  line: number;
  character: number;
}
export interface Range {
  start: Position;
  end: Position;
}
export interface Diagnostic {
  range: Range;
  /** LSP: 1 error, 2 warning, 3 information, 4 hint. */
  severity: number;
  message: string;
  code: string;
}
export interface Completion {
  label: string;
  /** LSP CompletionItemKind. */
  kind: number;
  detail: string;
  documentation?: string;
}
export interface Signature {
  signatures: Array<{
    label: string;
    documentation?: string;
    parameters: Array<[number, number]>;
  }>;
  activeSignature: number;
  activeParameter: number;
}

/**
 * The custom shader contract module as compiled shaders see it (no named
 * values): what `import cesium;` resolves to, for the server and for the
 * playground's Contract reference (line numbers agree).
 */
export const CONTRACT = cesiumModule(cesiumSlang, {
  attributes: {},
  metadata: {},
  uniforms: {},
  instance: {},
});

/** Where a symbol is defined: the user's document or the contract. */
export interface Definition {
  file: "user" | "cesium" | "other";
  range: Range;
}

/**
 * The playground's client for the Slang language server
 * (languageServer.worker.ts): one worker, the user's document sent whole on
 * change, requests answered in order.
 */
export class SlangLanguageServer {
  private readonly worker: Worker;
  private nextId = 0;
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  readonly ready: Promise<unknown>;

  constructor(slangUrl: string) {
    this.worker = new Worker(
      new URL("./languageServer.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onmessage = (
      e: MessageEvent<{ id: number; result?: unknown; error?: string }>,
    ) => {
      const request = this.pending.get(e.data.id);
      this.pending.delete(e.data.id);
      if (e.data.error !== undefined) {
        request?.reject(new Error(e.data.error));
      } else {
        request?.resolve(e.data.result);
      }
    };
    this.ready = this.request("start", {
      url: new URL(slangUrl, location.href).href,
      cesium: CONTRACT,
    });
  }

  private request<T>(
    op: string,
    data: Record<string, unknown> = {},
  ): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.worker.postMessage({ id, op, ...data });
    });
  }

  /** The user's document changed (sent whole). */
  setText(text: string): Promise<unknown> {
    return this.request("text", { text });
  }

  diagnostics(): Promise<Diagnostic[]> {
    return this.request("diagnostics");
  }

  completion(position: Position, trigger?: string): Promise<Completion[]> {
    return this.request("completion", { position, trigger });
  }

  hover(
    position: Position,
  ): Promise<{ value: string; range: Range } | undefined> {
    return this.request("hover", { position });
  }

  signature(position: Position): Promise<Signature | undefined> {
    return this.request("signature", { position });
  }

  /** Go to definition: where the symbol at `position` is defined. */
  async definition(position: Position): Promise<Definition[]> {
    const found = await this.request<Array<{ uri: string; range: Range }>>(
      "definition",
      { position },
    );
    return (found ?? []).map(({ uri, range }) => ({
      file: /(^|\/)user\.slang$/.test(uri)
        ? "user"
        : /(^|\/)cesium\.slang$/.test(uri)
          ? "cesium"
          : "other",
      range,
    }));
  }

  dispose(): void {
    this.worker.terminate();
    for (const { reject } of this.pending.values()) {
      reject(new Error("The language server stopped."));
    }
    this.pending.clear();
  }
}
