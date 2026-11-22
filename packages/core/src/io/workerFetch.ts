/**
 * Workers' requests through the page's `FetchProvider` (CS-809). A worker
 * never fetches: it asks the page, which makes the request (origin rules,
 * hooks, credentials, proxy, the 401 renewal) and hands the body back,
 * transferred. So a host's hooks and function proxies run where the host
 * set them, and a source's headers (an asset token) never reach a worker:
 * the page keeps them, keyed by the job or request they came with.
 *
 * Worker to page: `{ fetch: n, url, kind, accept?, scope? }` (`scope`: the
 * job it serves, whose headers it carries). Page to worker:
 * `{ fetchReply: n, status, contentType, body? }` (a body only for a 2xx),
 * or `{ fetchReply: n, error, abort? }`. Worker to page `{ fetchCancel: n }`
 * stops one.
 */

import {
  FetchProvider,
  type ProviderRequestInit,
  type RequestKind,
} from "./fetchProvider.ts";

/** A worker's request, as posted to the page. */
export interface WorkerFetchRequest {
  fetch: number;
  url: string;
  kind: RequestKind;
  accept?: string;
  /** The job (or request) it serves: its headers go with it. */
  scope?: number;
}

export interface WorkerFetchCancel {
  fetchCancel: number;
}

export type WorkerFetchReply =
  | {
      fetchReply: number;
      status: number;
      contentType: string | null;
      body?: ArrayBuffer;
    }
  | { fetchReply: number; error: string; abort?: true };

/** Whether a worker's message is one of the bridge's (not a job reply). */
export function isWorkerFetchMessage(
  data: unknown,
): data is WorkerFetchRequest | WorkerFetchCancel {
  return (
    typeof data === "object" &&
    data !== null &&
    ("fetch" in data || "fetchCancel" in data)
  );
}

// ---- Worker side ----------------------------------------------------------

/** What a worker's `fetch` stand-in takes. */
export interface WorkerFetchInit {
  kind: RequestKind;
  accept?: string;
  /** The job it serves (`WorkerFetchRequest.scope`). */
  scope?: number;
  signal?: AbortSignal;
}

const pending = new Map<
  number,
  { resolve: (response: Response) => void; reject: (error: unknown) => void }
>();
let nextFetch = 1;

/**
 * In a worker: a request made by the page's provider. Resolves with a
 * `Response` holding the body (none for a status outside 2xx).
 */
export function workerFetch(
  url: string,
  init: WorkerFetchInit,
): Promise<Response> {
  const scope = globalThis as unknown as {
    postMessage(message: unknown): void;
  };
  const id = nextFetch++;
  init.signal?.throwIfAborted();
  return new Promise<Response>((resolve, reject) => {
    const onAbort = () => {
      pending.delete(id);
      scope.postMessage({ fetchCancel: id } satisfies WorkerFetchCancel);
      reject(init.signal!.reason);
    };
    init.signal?.addEventListener("abort", onAbort, { once: true });
    const done = () => init.signal?.removeEventListener("abort", onAbort);
    pending.set(id, {
      resolve: (response) => {
        done();
        resolve(response);
      },
      reject: (error) => {
        done();
        reject(error);
      },
    });
    scope.postMessage({
      fetch: id,
      url,
      kind: init.kind,
      ...(init.accept ? { accept: init.accept } : {}),
      ...(init.scope !== undefined ? { scope: init.scope } : {}),
    } satisfies WorkerFetchRequest);
  });
}

/**
 * In a worker's `onmessage`: settles the request a reply names. Returns
 * whether the message was one.
 */
export function settleWorkerFetch(data: unknown): boolean {
  if (typeof data !== "object" || data === null || !("fetchReply" in data)) {
    return false;
  }
  const reply = data as WorkerFetchReply;
  const entry = pending.get(reply.fetchReply);
  pending.delete(reply.fetchReply);
  if (!entry) {
    return true;
  }
  if ("error" in reply) {
    entry.reject(
      reply.abort
        ? new DOMException("Aborted", "AbortError")
        : new Error(reply.error),
    );
  } else {
    entry.resolve(
      new Response(reply.status === 204 ? null : (reply.body ?? null), {
        status: reply.status,
        ...(reply.contentType
          ? { headers: { "Content-Type": reply.contentType } }
          : {}),
      }),
    );
  }
  return true;
}

// ---- Page side ------------------------------------------------------------

/** Where a worker's replies go (a `Worker`, or a fake in tests). */
export interface WorkerFetchPort {
  postMessage(message: WorkerFetchReply, transfer: Transferable[]): void;
}

/**
 * The page's side of one worker: serves its requests with the provider,
 * each with the headers of the job (or request) it belongs to.
 */
export class WorkerFetchServer {
  private readonly inFlight = new Map<number, AbortController>();
  /** Requests by the job they serve, to stop them with it. */
  private readonly byScope = new Map<number, Set<number>>();
  private readonly headers = new Map<
    number,
    Readonly<Record<string, string>>
  >();

  constructor(
    private readonly port: WorkerFetchPort,
    private readonly provider: () => FetchProvider = () =>
      FetchProvider.default,
  ) {}

  /**
   * Keeps `headers` for scope `scope` (a job id): requests the worker makes
   * while it runs carry them.
   */
  open(scope: number, headers: Readonly<Record<string, string>> | undefined) {
    if (headers) {
      this.headers.set(scope, headers);
    }
  }

  /** Stops a scope's requests and forgets its headers. */
  close(scope: number): void {
    for (const id of this.byScope.get(scope) ?? []) {
      this.inFlight.get(id)?.abort();
    }
    this.byScope.delete(scope);
    this.headers.delete(scope);
  }

  /** Serves a bridge message from the worker. */
  serve(message: WorkerFetchRequest | WorkerFetchCancel): void {
    if ("fetchCancel" in message) {
      this.inFlight.get(message.fetchCancel)?.abort();
      return;
    }
    void this.run(message);
  }

  private async run(request: WorkerFetchRequest) {
    const scope = request.scope;
    const controller = new AbortController();
    this.inFlight.set(request.fetch, controller);
    if (scope !== undefined) {
      let set = this.byScope.get(scope);
      if (!set) {
        set = new Set();
        this.byScope.set(scope, set);
      }
      set.add(request.fetch);
    }
    try {
      const init: ProviderRequestInit = {
        kind: request.kind,
        signal: controller.signal,
        ...(request.accept ? { accept: request.accept } : {}),
        ...(scope !== undefined && this.headers.has(scope)
          ? { headers: this.headers.get(scope) }
          : {}),
      };
      const response = await this.provider().fetch(request.url, init);
      const ok = response.status >= 200 && response.status < 300;
      const body = ok ? await response.arrayBuffer() : undefined;
      if (!ok) {
        void response.body?.cancel().catch(() => {});
      }
      this.port.postMessage(
        {
          fetchReply: request.fetch,
          status: response.status,
          contentType: response.headers.get("Content-Type"),
          ...(body ? { body } : {}),
        },
        body ? [body] : [],
      );
    } catch (error) {
      const abort =
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError");
      this.port.postMessage(
        {
          fetchReply: request.fetch,
          // A transport's own message (no URL: the provider adds none).
          error: abort
            ? "aborted"
            : `request failed (${error instanceof Error ? error.name : "error"})`,
          ...(abort ? { abort: true as const } : {}),
        },
        [],
      );
    } finally {
      this.inFlight.delete(request.fetch);
      if (scope !== undefined) {
        this.byScope.get(scope)?.delete(request.fetch);
      }
    }
  }
}
