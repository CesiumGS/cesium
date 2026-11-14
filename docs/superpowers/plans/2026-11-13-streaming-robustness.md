# Streaming robustness: design plan

**Status (2026-11-13):** drafted for the owner's review. Nothing is built. Its milestones (SR-1 to SR-12) are proposed for `CESIUM2_WEBGPU_PLAN.md` §6 as M12; this plan doesn't edit that file. It closes §14 follow-up 7.

**Goal:** a content request that stalls, fails or is throttled costs the view a bounded, visible amount, and the view recovers by itself. Today a request that never answers holds its slot until no view needs the tile, and a failed tile stays failed for the session.

- Every fetch has a deadline derived from what its origin has actually delivered.
- Transient failures retry with backoff, within per-request and per-origin budgets, without starving fresh visible requests.
- Status codes mean something: missing content is "empty", a rejected token is refreshed once, throttling slows the origin down.
- A failed tile gets another chance later. Nothing stays failed for the session unless it can't succeed.
- The refinement plan, the inspector and the job system see all of it as data, not as a log line.

**Sources:**

- `CESIUM2_WEBGPU_PLAN.md` §14 follow-up 7; §13.2 (request scheduling, per-origin windows, `RequestScheduler`, cancellation); §13.3; §15 increment 2 and the "Next increments" list at the end of increment 4; §13.43 and §6 M8 (JP-1: cancel decode on deselection).
- `docs/superpowers/plans/2026-11-13-refinement-and-convergence.md` (§6 M11): `RefinementEntry.failed`, `stalledMs`, `detail`, and "Fetch timeouts are needed before 'a request that never answers' stops being a stall".
- Code, read for this plan: `src/streaming/RequestScheduler.ts`; `tilesetLoad.ts` (`request`, `loadContent`, `cancelLoad`); `tilesetUpdate.ts` (the 30-tick cancel, `buildExternals`); `tilesetState.ts`; `Tile.ts` (`fetchTilesetJson`, `ContentState`); `Stepwise.ts` (`contentAvailable`, `loadTile`); `src/io/gltfParse.ts`, `worker.ts`, `WorkerPool.ts`, `Jobs.ts` (`JobReply`, `fail`, `cancel`), `ion.ts`, `readWithProgress.ts`; `src/globe/TerrainSource.ts`, `GlobeImagery.ts`, `ImageryProvider.ts`; `test/fakeGpu.ts`, `test/tilesetFrame.test.ts`, `test/composite.test.ts`.

## 1. What happens today

Facts from the code, because the design starts from them.

- **Where fetches run.**
  - glTF and 3D Tiles content, terrain and imagery tiles are fetched inside the content workers (`worker.ts`, `parseGltf`), as jobs with `io: true`. Only the window slot and the job live on the main thread.
  - Tileset JSON (root and external), terrain `layer.json`, the ion endpoint and the imagery metadata are fetched on the main thread, once, with no scheduling.
- **No timeout anywhere.** A fetch without an answer holds its slot and its job until the 30-tick cancel (`CANCEL_AFTER_FRAMES` in `tilesetUpdate.ts` and `GlobeImagery.ts`), which only fires for tiles no view has touched. A tile that stays wanted waits forever.
- **Errors cross the worker boundary as strings.** `JobReply.error` is a message; `Jobs.reply` makes `new Error(reply.error)`. The HTTP status and any `Retry-After` header are lost. Messages carry the URL (`Failed to fetch <url>: 404`), which can contain a service key (ion's Google endpoints put theirs in the URL).
- **Failure is terminal.**
  - `loadContent` sets `tile.state = "failed"` for any non-abort error. `request()` only issues tiles in state `unloaded`, and nothing flips `failed` back.
  - An imagery source in state `failed` stays in `sources` until the LRU trims it; `resolve()` skips it and shows the parent's imagery. A terrain tile that fails just fails.
  - `Tileset3D.undrawnReasons` records a grouped reason; `stats.undrawn` counts them.
- **404 is not special.** Terrain's `fetch` throws on `!response.ok`. Imagery treats a zero-byte 200 as `empty` (Bing's missing tile) but a 404 as a failure.
- **Abort is recognised by class.** `loadContent` and `GlobeImagery` test `error instanceof DOMException && error.name === "AbortError"`. `Jobs.cancel` rejects with an AbortError on the main side, so this works today. A timeout abort carries `TimeoutError` instead, so every such test has to change (section 4).
- **The scheduler knows throughput, not latency or errors.** `RequestScheduler` fits the window to delivered bytes per period (§13.2). `RequestSample` carries bytes and protocol. A failure releases the slot with no sample. A throttled origin isn't slowed.
- **Tokens.** `resolveIonAsset` caches an endpoint for 45 minutes and returns `headers` (`Authorization: Bearer <asset token>`). Tilesets, `TerrainSource` and `IonTmsImagery` hold that `headers` object and send it with each request. `BingImagery.fromIon` and `IonTmsImagery.fromIon` run their own endpoint fetches, outside the cache. Nothing handles a 401.
- **Nothing listens for `online`, `offline` or `visibilitychange`.**

## 2. Prior art

Read on 2026-11-13. "SHA" is the commit the source was read at. Where a rendered page wouldn't load, the row says what was read instead.

| System | What it does | Notes for us | Source, date |
| --- | --- | --- | --- |
| CesiumJS 1.x: `Resource`, `RequestScheduler` | `retryAttempts` (default 0) and `retryCallback`. `retryOnError` is called only when the request's state is `FAILED` (never for cancelled), and retries at once: no delay, no backoff. A 204 resolves to `undefined`; no other status is special. The scheduler caps 18 per server and 50 in all, with a priority heap; a request with no slot returns `undefined`. Cancel rejects with "Request cancelled" and aborts the XHR. | No timeout, no `Retry-After`, no status policy: 5xx, 429 and 408 aren't retried. A request that never answers stays `ACTIVE` until the browser errors. `RequestErrorEvent` carries `statusCode` (undefined for a network error) and the response headers, which nothing reads. | `packages/engine/Source/Core/Resource.js`, `RequestScheduler.js`, `RequestErrorEvent.js`, CesiumGS/cesium main, SHA 95021cbc66, read 2026-11-13. |
| CesiumJS 1.x: `IonResource` | One retry per resource, on a 401 or an image error only. All concurrent 401s share one pending endpoint fetch; on success the root's endpoint is replaced and later clones use the new token. The endpoint fetch has no retry. External 3DTILES assets get no retry callback. The token is sent only to the endpoint's own domain. | This is the model for our refresh: single flight, one retry, 401 only. We add 403 (open question, section 12) and a generation counter. | `Core/IonResource.js`, same SHA, read 2026-11-13. |
| CesiumJS 1.x: tiles | `Cesium3DTile` has no retry. A failed tile is `FAILED` and never re-requested (`Cesium3DTilesetTraversal` enqueues only `UNLOADED`). `tileFailed` fires with `{url, message}`. `allTilesLoaded` counts a failed tile as done. A missing-tile policy (status codes drawn as empty) exists only for content codecs such as vector tiles. A cancelled request returns the tile to its previous state, so a later traversal asks again. | The stable visible result for a failed child of a REPLACE parent is "the parent stays". We keep that (section 5). Failed counts exist only through the event. | `Scene/Cesium3DTile.js`, `Cesium3DTileset.js`, `Cesium3DTilesetTraversal.js`, same SHA, read 2026-11-13. |
| CesiumJS 1.x: imagery and terrain | Failure sets `ImageryState.FAILED` or `TerrainState.FAILED` and raises `TileProviderError`. A retry happens only if a listener sets `error.retry = true`, with a count shared per provider (`timesRetried`), not per tile. A failed imagery tile shows the nearest ready ancestor. A failed terrain tile is upsampled from its parent's data; terrain with no availability is marked failed up front to start upsampling. | The fallbacks are the right shape: imagery from the ancestor, terrain upsampled. We make the retry automatic and per tile. | `Scene/ImageryLayer.js`, `GlobeSurfaceTile.js`, `Core/TileProviderError.js`, same SHA, read 2026-11-13. |
| MapLibre GL JS | A load error sets the tile `errored`. Non-404 errors fire an `error` event; a 404 fires none and the tile manager tries a parent (up to 10 levels). No automatic retry: an errored tile in view isn't reloaded; `reload()` retries errored tiles only when the source data changed. A tile that leaves view and comes back is a fresh request (an implicit retry on re-entry). Vector 404 loads as empty; raster 404 errors and the parent shows through; an empty body draws a 1 by 1 transparent tile and counts as loaded. No timeout, no retry, no 429 handling in `ajax.ts`. The only backoff is the expiry reload: 1 s doubling, plus a 30 s clock-skew floor. | 404 is "absent", not "failed"; 204 and empty are "loaded, empty"; re-entry as a retry trigger is cheap. A failed refresh turns a tile that had data into `errored`: we keep stale data. | `src/tile/tile_manager.ts`, `tile.ts`, `util/ajax.ts`, `image_request.ts`, `util/config.ts`, maplibre/maplibre-gl-js main, SHA 04359f2, read 2026-11-13. |
| Mapbox GL JS | Source closed. Docs: `refreshExpiredTiles` (default true). Changelog: 0.47.0 stopped reloading errored tiles; 0.48.0 made 404 tiles empty renderable tiles; 0.50.0 and 3.1.0 fixed "loaded" never firing with errored or 404 tiles. | Confirms the pattern and a bug class: a readiness signal that never fires because a tile errored. | docs.mapbox.com Map reference; `CHANGELOG.md`, main; read 2026-11-13. Behaviour beyond these entries not documented. |
| deck.gl, loaders.gl | An errored tile is marked loaded with null content, so "every selected tile loaded" can finish; `onTileError` reports it. Never retried by itself; `reloadAll()` or `setNeedsReload()` re-fetches. A cancelled tile (scheduler priority below 0) is re-requested next traversal. `maxRequests` 6, re-ranked on each refill. No timeout, retry or backoff. | Settled-but-failed beats pending. Keep cancel and error separate. | `modules/geo-layers/src/tileset-2d/*` (deck.gl default branch, SHA d49263b); `request-scheduler.ts` (loaders.gl default branch, SHA dc09ec2); read 2026-11-13. |
| OpenLayers | Tile states `ERROR` and `EMPTY` (terminal); neither blocks `rendercomplete`. An `<img>` can't see the status, so a 404 is `ERROR`. `load()` accepts an `ERROR` tile, but the renderer and the queue enqueue only `IDLE` tiles, so it is manual. `maxTilesLoading` 16, dropping to 8 while interacting. | Same lesson: terminal states that don't block completion. | `src/ol/TileState.js`, `ImageTile.js`, `TileQueue.js`, `Map.js`, openlayers main, SHA 33bcbad, read 2026-11-13. |
| Brooker, AWS Architecture Blog, "Exponential Backoff And Jitter" | Full jitter: sleep a random time between 0 and `min(cap, base * 2^n)`. Equal jitter keeps half of it. Decorrelated jitter draws from `base` to 3 times the last sleep. Full and equal jitter make about the same number of calls; decorrelated makes more; plain exponential backoff without jitter is the worst. The post gives the formulas as images, so they were taken from its simulator source. | We use full jitter. | aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter; aws-samples/aws-arch-backoff-simulator `backoff_simulator.py`; read 2026-11-13. |
| AWS Builders' Library, "Timeouts, retries and backoff with jitter" | Choose a timeout from an acceptable false-timeout rate (the example is 0.1%, so p99.9 of the dependency's latency) and pad it for internet clients; set connect and request timeouts. Capped exponential backoff with jitter; retry at one layer only (3 retries at each of 5 layers is 243 times the load); a local token-bucket retry budget, then a fixed low rate once it is empty; prefers that to circuit breakers, which add modal behaviour that is hard to test. Retry only when idempotent. | Our latency samples per origin are too few for p99.9, so we use a high percentile with a multiplier and a floor (section 3). One layer retries: the tile, not the fetch. A budget, not a breaker. | builder.aws.com (the aws.amazon.com/builders-library page redirects there), read 2026-11-13. |
| AWS SDK, retry behaviour | Standard mode: 3 attempts in all; delay `random(0,1) * min(20 s, base * 2^retry)`, base 50 ms for transient errors and 1 s for throttling. Retry quota: a bucket of 500; a transient retry costs 14, a throttling retry 5; a first-try success restores 1, a successful retry restores its cost; an empty bucket means no retry, but the first request is never blocked. Retryable: timeouts, connection failures, 500, 502, 503, 504, throttling. 4xx validation and access errors aren't. The page says this needs the opt-in `AWS_NEW_RETRIES_2026=true` until it becomes the default. | The shape of our budget (section 3). | docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html, read 2026-11-13. |
| Google SRE Book, "Handling Overload" and "Addressing Cascading Failures" | At most 3 attempts per request. A per-client retry budget: retry only while retries are under 10% of requests, which cuts worst-case amplification from about 3 times to about 1.1. Always randomised exponential backoff. Always set deadlines. Don't retry permanent errors. | 10% is our sustained ratio. | sre.google/sre-book/handling-overload and /addressing-cascading-failures, read 2026-11-13. |
| Google Cloud Storage, retry strategy | Initial delay 1 s, multiplier 2 in every client library; maximum delay between 30 s and 5 minutes by library. Retries 408, 429, 500, 502, 503, 504, socket timeouts and TCP disconnects; GETs are idempotent. No mention of `Retry-After`. | The retryable status set. | docs.cloud.google.com/storage/docs/retry-strategy, read 2026-11-13. |
| RFC 9110, RFC 6585 | `Retry-After` is an HTTP date or a count of seconds. 408: the client may repeat. 503: temporary overload; may carry `Retry-After`. 504: no timely upstream answer. Idempotent requests may be repeated after a communication failure; a client "SHOULD NOT automatically retry a failed automatic retry". 429 may carry `Retry-After`, and caches must not store it. | Parse both forms of `Retry-After`. Bounded retries. | rfc-editor.org/rfc/rfc9110.txt (sections 10.2.3, 9.2.2, 15), rfc6585 section 4, read 2026-11-13. |
| MDN: `AbortSignal.timeout()`, `AbortSignal.any()` | `timeout()` aborts with a `TimeoutError`; a user abort is an `AbortError`. Its timer counts active time, so it pauses while a worker is suspended. It can't be cancelled. Works in workers. `any()` aborts with the first input's reason. MDN lists both as Baseline widely available (`any()` since March 2024, `timeout()` since April 2024); the research read first-supported versions from MDN's compat data (`any()`: Chrome 116, Firefox 124, Safari 17.4), and SR-2 rechecks them before the code relies on either. | Use `any([cancel, ownTimer])`. Our timers must be cancellable and resettable (a stall timer), so they are plain `setTimeout` on an `AbortController`. Tell the abort reasons apart by `reason.name`. | developer.mozilla.org, `AbortSignal/timeout_static`, `any_static`; the version numbers from MDN's browser-compat-data, read 2026-11-13. |
| MDN: `navigator.onLine`, workers | `false` means offline; `true` doesn't guarantee reachability and can lag. `WorkerNavigator` has `onLine`; `WorkerGlobalScope` has the `online` and `offline` events. | Offline is a hint to hold; only a probe is truth. Workers can listen themselves. | MDN `Navigator/onLine`, `WorkerNavigator`, `WorkerGlobalScope`, read 2026-11-13. |
| Chrome timer throttling; MDN Page Visibility | Hidden pages: timers once per second after a delay; once per minute under intensive throttling (hidden over 5 minutes, chains of 5 or more, quiet for 30 s). The article doesn't mention workers, so whether dedicated workers are throttled is **unconfirmed**. `visibilitychange` fires on the document only. | Don't assume worker timers stay accurate in a hidden tab (section 8). The page forwards visibility. | developer.chrome.com/blog/timer-throttling-in-chrome-88; MDN Page Visibility API; read 2026-11-13. |
| MDN: Resource Timing | `responseStart` and `nextHopProtocol` read as 0 or empty cross-origin without `Timing-Allow-Origin`; passing CORS isn't enough. | Measure our own time to first byte with `performance.now()` around `fetch`; it needs no header. (§14 items 4 and 5 stay useful for the protocol.) | MDN `PerformanceResourceTiming`, `Timing-Allow-Origin`; read 2026-11-13. |
| Pavlutin, "How to Timeout a fetch() Request" | An `AbortController` with a `setTimeout`, cleared once `fetch` resolves, which bounds only the time to headers; the body read is unbounded. The search found the same limit noted elsewhere. No published pattern for a stall timer was found. | Three timers on one controller (section 3) is our own design, not a published one. | dmitripavlutin.com/timeout-fetch-request, read 2026-11-13. |
| Cesium ion REST API | OpenAPI: `GET /v1/assets/{id}/endpoint` returns `url`, `accessToken` (valid "for approximately one hour"), `type`, attributions; external assets return `externalType` and `options`. The `url` is an opaque entry point that can change. Documented statuses: 200, 401, 404. No 403, 429 or `Retry-After` documented. Token docs: no statuses mentioned; account tokens don't expire; a token can now carry an `expiration` (changelog dated 2026-07-16). Quota docs: an account over quota keeps working. | 401 is the documented refresh trigger. 403, 429 and 5xx from `assets.ion.cesium.com` are undocumented: the design handles them by class, and §14 gets a question for ion. | ion.cesium.com/openapi.yaml; cesium.com/learn/ion/cesium-ion-access-tokens, `.../optimizing-quotas`; read 2026-11-13. The rest-api page is client-rendered and couldn't be read. |
| Google Map Tiles API (Photorealistic 3D Tiles) | Session token valid two weeks; a renderer can make at least three hours of tile requests from one root request, then must request the root again (the status at that point is undocumented). Errors: 400 (including an expired session), 403 (key problems), 429 (quota); the page advises exponential backoff from 1 s. Limits: 12,000 renderer tile requests per minute. `Retry-After` not mentioned. | A long session through ion's Google endpoint needs a re-root after the root's window; out of scope here (section 11). | developers.google.com/maps/documentation/tile/{3d-tiles,session_tokens,error_handling,usage-and-billing}, read 2026-11-13. |
| Quantized-mesh, 3D Tiles 1.1, implicit tiling | Terrain `available` lists the rectangles that have data; the spec doesn't say what a server returns for an unavailable tile. 3D Tiles: a tile's `content` is optional and empty tiles are allowed; nothing says what a client does when a content URI fails. | The "404 is empty" rule is our policy, not the spec's. | github.com/CesiumGS/quantized-mesh `SPECIFICATION.md`; CesiumGS/3d-tiles `specification/README.adoc`; read 2026-11-13. |
| iTwin Platform | 429 with `Retry-After` in seconds; limits by tier (Community 500 per minute and 5,000 per hour; Standard and above 5,000 per minute). Mesh-export limits not documented. | `Retry-After` in seconds is real on this origin. | developer.bentley.com/apis/overview/rate-limits, read 2026-11-13. |

**Lessons taken:**

1. **None of the four tile libraries retries on its own.** CesiumJS retries only when an application listener asks, MapLibre, deck.gl and OpenLayers not at all. Automatic retry here is our design, not inherited behaviour, so it needs its own tests.
2. **404 is "absent", not "failed"; 204 and an empty body are "loaded, empty".** MapLibre, Mapbox and the 1.x terrain path all treat them that way.
3. **Settled-but-failed beats pending.** deck.gl and OpenLayers let completion fire around an errored tile; Mapbox shipped two fixes for the opposite. The refinement plan already says "converge around failures".
4. **Retry on re-entry is the cheap trigger,** and every library that lets a tile fail has it by accident (MapLibre drops errored tiles on exit). We make it deliberate: a cool-down, then the next selection asks again.
5. **Keep cancel and error apart.** 1.x, MapLibre and deck.gl all return a cancelled tile to "unloaded" without an error.
6. **One layer retries.** Retrying inside the worker fetch and again at the tile would multiply attempts (Builders' Library, SRE book).
7. **A retry budget, not a circuit breaker.** A token bucket per origin, shaped like the AWS SDK's, with the SRE book's 10% ratio.
8. **Timeouts come from measurement,** with the percentile, padding, floor and cap all parameters, because no source gives a number.
9. **Keep stale data on a failed refresh** (MapLibre's flaw). We never drop a loaded tile because a later request failed.
10. **A timeout isn't an `AbortError`.** Our own abort and `TimeoutError` must be told apart wherever aborts are recognised today.

## 3. Timeouts

### Where they are enforced

In the thread that fetches. For content that is the worker, in one function both workers and tests call.

```ts
/** What a fetch is allowed to take. Computed per origin on the main thread, sent with the request. */
interface NetPolicy {
  /** From `fetch()` to the response headers. */
  ttfbMs: number;
  /** Longest gap between body chunks, once the headers are in. */
  stallMs: number;
  /** Whole-body deadline: scales with the stated size, between these. */
  deadlineFloorMs: number;
  deadlineCapMs: number;
  /** The slowest rate the deadline assumes, bytes per second. */
  minBytesPerSecond: number;
}

/** One request's result: bytes, or a `FetchError`. */
function fetchBytes(url: string, init: RequestInit, options: FetchOptions): Promise<FetchResult>;
```

- **One `AbortController`, three timers.** `fetchBytes` joins the caller's signal and its own with `AbortSignal.any`, and arms `setTimeout` timers it can clear and reset:
  - *Time to first byte:* armed before `fetch`, cleared when the headers arrive. It abandons the request with reason `TimeoutError` and phase `ttfb`.
  - *Stall:* reset on every chunk read from `response.body.getReader()`. Without a stream the body is one `arrayBuffer()` call, so only the deadline applies.
  - *Deadline:* armed when the headers arrive, from `Content-Length` if stated: `clamp(3 * length / max(rate, minBytesPerSecond), floor, cap)`, where `rate` is the origin's slow-end measured rate. With no stated length, the cap.
- **Why not `AbortSignal.timeout`.** It can't be cleared or reset, so it can't be a stall timer, and it would also keep running through the body after the headers arrive. `AbortSignal.any` is used only to join the cancel signal with ours.
- **The abort's reason says which.** A cancelled tile aborts with an `AbortError` (cancellation, not a failure). A timer aborts with a `TimeoutError` carrying the phase. `fetchBytes` returns the reason, never the DOM exception the browser makes from it (a `fetch` aborted with a custom reason rejects with that reason).
- **The same function** serves the glTF and tileset JSON, terrain, imagery, the upsample refetch and sub-resources (external buffers and textures of an i3dm or glTF). Sub-resource fetches use the same policy and fail the tile's attempt as one failure.

### Where the numbers come from

Each origin keeps the last 64 successful requests' time to first byte and body rate (bodies of 16 KB or more; smaller ones measure nothing). We measure with `performance.now()` around `fetch`, because cross-origin Resource Timing hides these without `Timing-Allow-Origin`.

| Value | Rule | Until 8 samples exist | Floor | Cap |
| --- | --- | --- | --- | --- |
| `ttfbMs` | 4 times the p95 of time to first byte | 15 s | 5 s | 30 s |
| `stallMs` | same rule | 10 s | 5 s | 20 s |
| deadline | 3 times (stated length over the origin's p10 body rate); `minBytesPerSecond` 20 KB per second; no stated length gets the cap | 60 s | 10 s | 180 s |

- **Why p95 times 4.** The Builders' Library picks a timeout at the latency of the acceptable false-timeout rate (its example is p99.9). Sixty-four samples can't measure p99.9, so a high percentile with a large multiplier stands in. The floor protects a CDN's cold-cache misses, which can take seconds while its p95 reads tens of milliseconds.
- **The constants are one object,** `NET_DEFAULTS`, in `src/streaming/OriginHealth.ts`, set per engine through `engine.network` (section 10). SR-3 checks them against the recorded throttled profiles (20 Mbit/s with 80 ms, the L1′ low-end profile of §13.3): zero timeouts on a healthy throttled run is a done-when, so the floors can be raised if a profile trips them.
- **Large tiles on slow links.** A 20 MB tile at 200 KB per second takes 100 s; the deadline allows 3 times that, up to the cap. The stall timer is what notices a link that has actually stopped. A restart from zero after a deadline miss is the retry loop's problem, so a deadline miss is the most expensive kind: it counts as two attempts toward the per-tile limit.
- **Main-thread fetches** (tileset JSON, `layer.json`, the ion endpoint, imagery metadata) use the same function with the engine's default policy, until the origin has samples.

## 4. Failures as data

### The failure record

Crossing the worker boundary as a string loses the status, so a failure becomes structured.

```ts
type FailureKind = "network" | "timeout" | "http" | "decode";

interface FetchFailure {
  readonly kind: FailureKind;
  /** The HTTP status, for kind "http". */
  readonly status?: number;
  /** For kind "timeout". */
  readonly phase?: "ttfb" | "stall" | "deadline";
  /** From `Retry-After`, parsed from seconds or an HTTP date, ms from now. */
  readonly retryAfterMs?: number;
}

class FetchError extends Error {
  constructor(readonly failure: FetchFailure, message: string);
}
```

- `JobReply` gains `failure?: FetchFailure`. The worker's catch fills it for errors `fetchBytes` threw; any other error is `kind: "decode"` (the bytes arrived and couldn't be turned into content). `Jobs.fail` builds a `FetchError` from it. The error message stays for people.
- **A truncated body is a network failure.** If the stream ends short of a stated `Content-Length`, or errors, `fetchBytes` throws `kind: "network"`.
- **No URL and no header value in a failure,** its message, the stats, the inspector or the recorder. Messages say "terrain tile, 503", not the address. `undrawnKind` already strips URLs from reasons; the new messages never have one to strip. A test asserts that a failure raised for a URL with a query string and a request with an `Authorization` header contains neither (section 13).
- **Cancelling is not a failure.** An `AbortError` (a `Job.cancel`, a deselected tile, a view's cancel) returns the tile to `unloaded` with no counters moved, as today. Every place that recognises an abort by `DOMException.name === "AbortError"` (`loadContent`, `GlobeImagery`, `loadModel`, the worker pool's callers) uses one helper, `isCancel(error)`, which is true for that and false for a `TimeoutError`. SR-2 lists the sites by search.

### The verdict

One pure function decides what happens to a failed attempt, so the policy is a table, tested as one.

```ts
type Verdict =
  | { do: "retry"; afterMs: number; free?: boolean }  // free: not counted as an attempt
  | { do: "refresh-auth" }                            // one endpoint refresh, then a retry
  | { do: "empty" }                                   // the server says: nothing here
  | { do: "cool"; recoverAfterMs: number }            // failed now, tried again later
  | { do: "fail" };                                   // permanent: failed until `retryFailed()`

function judge(failure: FetchFailure, ctx: JudgeContext): Verdict;
```

`JudgeContext` holds the attempt number, `maxAttempts`, whether the format allows "empty" (`allowMissing`), the request's purpose (a prefetch is never retried), whether the headers are refreshable and were already refreshed this generation, whether the origin's retry budget has a token, whether the attempt overlapped a suspended page (section 8), the clock and the random source (a seed in tests).

| Condition | Class | Verdict |
| --- | --- | --- |
| Network error, truncated body, connection reset | transient | retry |
| Timeout (time to first byte, stall or deadline) | transient | retry; a deadline miss counts as 2 attempts |
| 408, 500, 502, 504 | transient | retry |
| 503 | overload | retry, honouring `Retry-After`; slows the origin |
| 429 | throttle | retry, honouring `Retry-After`; slows the origin; never marks the content bad |
| 401 or 403 with refreshable ion headers, not yet refreshed this generation | auth | refresh-auth, then one retry |
| 401 or 403 otherwise | auth | cool (30 s, then the schedule below), and one engine error per origin |
| 404 or 410, format allows empty | missing | empty |
| 404 or 410, format doesn't (a model's own buffer or texture; tileset JSON of the root) | missing | fail |
| 204, or 200 with no bytes | empty | empty (where the format allows; else fail) |
| 501, 505 and other 5xx; 400, 413, 414, 422, 451 and other 4xx | permanent | fail |
| Decode error on a complete body | decode | fail (the bytes are what the server sent) |
| Attempts used up, or no budget token | exhausted | cool |
| A prefetch of any failing kind | speculative | drop: back to unloaded, no retry, no failure counted |

- **`free` retries.** An attempt that overlapped a hidden page, an offline period or a resume (section 8) isn't charged: the cause was the tab, not the server.
- **Why 403 refreshes.** ion documents only 401 for its endpoint, and 1.x refreshes only on 401. A 403 may be a revoked or out-of-scope token. One refresh costs one endpoint request per burst (single flight, once per generation), so it is cheap to include; SR-7 measures against the real service whether ion ever answers 403 with a stale asset token, and drops the 403 case if it doesn't (open question 5).

## 5. Retries and recovery

### One episode per tile, owned by the tile

An **episode** is the attempts for one tile's content until it succeeds, is cancelled or is given up on. The tile owns it (`Tile.net`), not the worker and not the job. That keeps one layer retrying, releases the window slot during a backoff, and makes the refinement plan's "one owner per item" hold: the tile is one pending item from first request to success.

```ts
/** On a Tile; absent until its first failure. */
interface TileNet {
  attempts: number;          // in this episode
  episodes: number;          // gave up this many times, for the cool-down schedule
  retryAt: number;           // ms; the tile is `unloaded` and waits until then
  recoverAt: number;         // ms; the tile is `failed` and recoverable from then
  last?: FetchFailure;
}
```

`ContentState` stays `"unloaded" | "loading" | "ready" | "failed"`. A retry-wait is `unloaded` with `retryAt` in the future; a cool-down is `failed` with a `recoverAt`; a permanent failure is `failed` with none. Selection and the other readers of `state` need no new case.

**The flow** (in `tilesetLoad.ts`, replacing the catch of `loadContent`):

1. An attempt ends in a failure. `judge` returns a verdict. The origin learns of it (`OriginHealth.failure`, section 6).
2. `retry`: the tile goes to `unloaded` with `retryAt = now + afterMs`. `request()` skips unloaded tiles whose `retryAt` is in the future, before the window and prefetch logic, so a tile in backoff holds no slot and doesn't hold prefetch back. A timer wakes the loop at the earliest `retryAt` and `recoverAt` (the pattern of `casterTimer`).
3. `refresh-auth`: the attempt awaits the shared refresh (section 7), then retries at once.
4. `empty`: the tile ends `ready` with `missing` set. See below.
5. `cool`: the tile goes to `failed` with `recoverAt = now + cooldown(episodes)`: 30 s, then 2 minutes, then 10 minutes for every later episode. `episodes` increases.
6. `fail`: `failed`, no `recoverAt`.

**Delays.** Full jitter (Brooker): `random() * min(cap, base * 2^(attempt - 1))`, with base 250 ms for transient failures and 1 s for 429 and 503, cap 8 s, and a floor of 50 ms. With a `Retry-After`: the larger of the jittered delay and the header, plus up to 20% of it added at random, so a crowd released by the same header doesn't arrive together. A `Retry-After` over 60 s isn't waited out inside the episode: the verdict is `cool` with `recoverAfterMs` equal to it (capped at 10 minutes).

**Limits.**

- `maxAttempts` 3 per episode (the SRE book and the AWS SDK's standard mode), `retry` for the first two failures.
- Per origin, a token bucket (the AWS SDK's shape, with the SRE book's 10%): capacity 300, a retry costs 10, a first-attempt success adds 1, a refill of 1 per second (so a dead origin is still probed once every 10 s). An empty bucket turns `retry` into `cool`; the first attempt of a tile is never refused. A retry that waits out a `Retry-After` costs no token (the server asked for it).
- Retry slots: at most `max(1, floor(window / 4))` of an origin's window may be held by retries at once. A retry takes a slot only through the ordinary `tryAcquire`, in the ordinary order (purpose class, then the tile's priority), so a nearer fresh tile still goes first. The cap is what stops a failing origin from filling the window with doomed requests that each hold a slot for a full timeout.
- A prefetch is never retried and never marked failed; it returns to `unloaded` and is asked for again only if selection wants it again.

**Recovery.** At the start of each tileset update, a sweep over the small set of cooling tiles flips those past `recoverAt` from `failed` to `unloaded`. Selection then asks for them only if it wants them: a tile the camera left stays unloaded, one it returns to (or never left) is requested. Also:

- `tileset.retryFailed()` flips every failed and cooling tile and resets `episodes` (a public method, section 10).
- An `online` event (after an offline period) releases cool-downs whose last failure was `network` or `timeout`.
- A successful token refresh releases `auth` cool-downs.
- A tile that loads successfully clears its `TileNet`.

**Missing content (404, 410, 204, empty body).** Where the format allows it:

| Content | A 404 or 204 means |
| --- | --- |
| 3D Tiles tile content | The tile ends `ready` and draws nothing, with `tile.missing = true`. It is never retried, doesn't count as failed (it counts under `empty`), and `contentAvailable` stays false for it, so a REPLACE parent stays drawn, which is what 1.x shows for a failed child. Without that, "ready and empty" would replace the parent with nothing, a hole (`Stepwise.ts`: `contentAvailable` is "renderable and ready"). An ADD child just draws nothing. |
| An external tileset's JSON | The tile ends `ready` with no children, same flag. |
| Terrain | The tile is upsampled from the nearest ancestor with heights (the machinery `upsampledFrom` already has); `JobReply` returns `missing: true` and `TerrainSource.loadTile` resubmits with the ancestor's data. Its descendants aren't affected. |
| Imagery | The source is `empty`: `resolve()` falls through to the parent's imagery, as for Bing's empty body today. |
| The root tileset JSON, `layer.json`, the ion endpoint, tile map metadata | A failure for the caller (`load` rejects), as today. There is nothing to draw around. |
| A model's own buffers and textures | A failure of that content. A model missing a buffer is wrong, not empty. |

The first warning for each kind of missing content per tileset goes to `warnings` once ("content not found (404)"), the same channel as unsupported formats; the count is in `stats.net.empty`.

## 6. The origin: latency, health and the window

`RequestScheduler` keeps its job (the window and its adaptation, §13.2). A new `OriginHealth`, one per origin and owned by the scheduler, keeps what the new behaviour needs. It is a separate file because the scheduler is already 263 lines and its adaptation is subtle.

```ts
/** @internal */
interface OriginHealth {
  /** What the next request to `origin` may take. */
  policy(origin: string): NetPolicy;
  /** A request finished: feeds the latency and rate samples and the budget. */
  record(origin: string, sample: { ttfbMs: number; transferMs: number; bytes: number }): void;
  /** An attempt failed: counters, the window, a pause for `Retry-After`. */
  failure(origin: string, failure: FetchFailure, now: number): void;
  /** Spends a retry token. False when the bucket is empty. */
  tryRetry(origin: string): boolean;
  /** ms epoch before which no request goes out (a `Retry-After`), or 0. */
  pausedUntil(origin: string): number;
}
```

- **Samples.** The worker reports `ttfbMs`, `transferMs` and `bytes` in the reply (`asset.timing` has `networkMs` for the whole fetch today; the split is new). `RequestSample` carries them to `release`. A time to first byte under 5 ms is taken for a cache hit and isn't sampled (the scheduler's header says cache hits don't count as latency; SR-3 confirms the threshold).
- **A throttled origin slows down.** A 429, a 503 or a timeout is a congestion signal, as loss is to TCP. `failure()` halves an adaptive window (not below 1; the scheduler's floor of 2 drops to 1 while the origin is failing, so a dead origin is probed one request at a time), puts the AIMD phase in `hold`, and ends the hold on the first success. A window pinned by `maximumRequests` isn't touched: only the pause applies. In-flight requests aren't cancelled.
- **`Retry-After` pauses the origin.** `tryAcquire` returns false until `pausedUntil`. The pause covers every tileset, imagery and terrain request on that origin, because the origin is what asked. It is capped at 60 s; longer values become a cool-down (section 5).
- **Offline holds.** While the page is offline (section 8) `tryAcquire` returns false for every origin.
- **Counters per origin,** in `OriginStats`: timeouts by phase, retries, retries that ended in success, failures by class (network, timeout, 4xx, 429, 5xx, decode, auth), empties, the pause (seconds left), the derived policy, the p50 and p95 time to first byte, the retry bucket's level.
- **Hostname only.** Origins are `scheme://host:port`, as the scheduler's keys already are.

## 7. ion tokens

`resolveIonAsset` returns `headers` that tilesets, `TerrainSource` and imagery providers hold by reference. A refresh updates that object in place, so every holder sees the new token on its next request (requests read the headers when they are made; the worker gets them in the payload).

```ts
/** ion.ts: refreshes the headers of an asset resolved by `resolveIonAsset`. */
function refreshIonHeaders(headers: Record<string, string>, failedGeneration: number): Promise<boolean>;
function ionGeneration(headers: Record<string, string>): number;
```

- A `WeakMap` from each headers object to `{ key, generation, pending }` is filled when `fetchIonAsset` builds it. No public type changes: callers pass `ion.headers` as now.
- **Single flight.** Concurrent 401s await one `pending` endpoint fetch (as 1.x). The generation increases when it completes and the headers' `Authorization` value is replaced in place.
- **Once per generation.** A request that failed with generation `g` asks for a refresh only if the current generation is still `g`; if it is newer, the token is already fresh and the attempt just retries. That stops a revoked token from refreshing in a loop: the refreshed token also fails, the verdict is `cool`.
- **Endpoint fetches retry too.** The ion endpoint fetch, `layer.json`, tile map metadata and the Bing metadata fetch go through `fetchResilient`: `fetchBytes` plus up to 3 attempts with the same backoff, in-line, honouring `Retry-After`; a 401 or 403 on the endpoint call itself is a failure with a clear message ("ion token rejected (401)"), never retried.
- **`BingImagery.fromIon` and `IonTmsImagery.fromIon`** register their headers with the same map, so their tile requests refresh like a tileset's.
- **External assets** (Google's 3D Tiles through ion carry `headers: {}` and a key in the URL): nothing to refresh in the headers. A 400, 401 or 403 there is a failure with `cool`. Re-rooting after the Google window ends is a follow-up (section 11).
- **Never printed.** Failure records, stats, the inspector, the recorder, errors and test output carry no header values and no query strings (section 4). `AGENTS.md`: "Never write an ion token into code, logs, URLs, test output, screenshots or builds."
- **One engine error per origin and kind** when a refresh itself fails with 401 or 403 ("ion rejected the token"): it is the application's to fix, and shouldn't repeat for every tile.

## 8. Hidden tabs, sleep and offline

- **`NetState`,** owned by the engine: `online`, `visible`, and the intervals during which either was false. In main-thread mode it listens to `window` `online` and `offline` and `document` `visibilitychange`. In worker mode the page forwards visibility (the document isn't there) and the worker listens to `online` and `offline` itself (`WorkerGlobalScope` has them; MDN read 2026-11-13). `navigator.onLine` seeds it.
- **New requests start only inside ticks.** A hidden page doesn't tick (`requestAnimationFrame` stops), so no retry attempt starts while hidden; retry timers that fire are throttled and harmless, and the work resumes on the next tick. In-flight requests finish normally.
- **Failures caused by the tab are free.** An attempt whose interval overlaps a hidden or offline interval of more than a second, or ends within 2 s of a resume, is marked `suspended`. Its failure gets `free: true`: it doesn't count as an attempt, spends no retry token and doesn't count against the origin's health. A laptop that slept doesn't turn every in-flight tile into a failure.
- **Worker timer accuracy is unconfirmed.** Chrome's throttling article doesn't say whether dedicated workers are throttled. The design doesn't rely on it: a late timer is lenient, not wrong, and the `suspended` rule handles the opposite case. SR-8 measures worker timer drift in a hidden tab (headed Chrome, a page with a worker logging `performance.now()` against its timer) and records it in this plan.
- **Offline.** On `offline` (or `navigator.onLine === false`): no new request starts (`tryAcquire` false), pending tiles stay pending, with `detail.offline`. `true` isn't trusted: failures while `onLine` reads true count normally. On `online`: network-class cool-downs are released and the loop woken; the window starts up again as after any idle period (§13.2), which bounds the burst.
- **Frozen and resumed pages (Page Lifecycle).** A resumed page runs the `suspended` rule above, and its deadlines restart: in-flight requests rearm their timers.

## 9. Interplay

### The job system (§13.43, JP-1)

- **One attempt, one job.** Each attempt is a `Jobs.submit` (or `workers.request`) with the tile's `signal` and priority function. Cancelling in the middle of a backoff is clearing the timer; there is no job to cancel. Cancelling during an attempt is `Job.cancel()`, as JP-1 specifies. Nothing about JP-1's cancel-on-deselection changes.
- **Decode and retries.** A job fails with `kind: "decode"` only if the bytes arrived; those aren't retried (the bytes are the server's). JP-1's `apply` step runs only for a successful attempt; a retried tile's new job has a new id.
- **Slots.** The window slot is held for an attempt and released at its end, before any backoff (`release` is already called from `.then` in `request()`).
- **If JP-1 hasn't landed,** content still goes through `workers.request`; the episode code wraps whichever call `loadContent` makes. The two don't depend on each other.
- **Jobs' own counters.** `JobStats` already counts `cancelledTotal`; a `failedTotal` is added so a failing origin shows in the Jobs section too (SR-9).
- **Out of scope:** a decode that hangs forever. That is a watchdog on the worker, a job-system matter (follow-up, section 11).

### The refinement plan (§6 M11)

The streaming source's entry reads these:

| Entry field | Value |
| --- | --- |
| `pending` | Tiles the view wants and doesn't have, **including tiles waiting out a backoff** (they will be asked for again). |
| `failed` | Tiles in `failed` that the view's selection needs, cooling or permanent. They stop counting as pending, as the plan says; a cooled-down tile that is asked for again moves back to pending. |
| `done` | Tiles loaded, and missing tiles (`empty`). |
| `wants` | `events`, as now. Every pending item has a deadline, a timer or a window: nothing waits forever, and the retry timer wakes the loop. |
| `detail` keys (fixed) | `retrying` (tiles in backoff), `cooling`, `empty`, `paused` (origins paused by `Retry-After`), `offline` (0 or 1), `refreshing` (token refreshes in flight), next to `inFlight`, `queued`, `decoding`, `awaitingUpload`, `prefetch`. |
| `stalledMs` | Unchanged: time since `pending` or `done` last changed. |

- **A request that never answers stops being a stall.** It becomes a timeout, then a retry or a failure, within a bounded time. The inspector's stall flag for a streaming entry becomes: pending above zero, `inFlight`, `retrying` and `queued` all zero, no change for 2 s. That is a real bug, not a slow server.
- **`converged()` waits for retries.** A tile in backoff is still pending, so a wait lasts through the backoff and is ended by `timeoutMs` or `within`; the result's `failed` counts cool-downs and permanent failures, and `pending` entries show `detail.retrying`. A capture that must not wait for a flaky origin passes `within: { streaming: … }` (refinement plan, section 7).
- **`level`.** A failed tile has a stand-in (its parent), so it is `coarse`, never `standIn`: it doesn't hold `correct` back.
- **Epochs.** A camera change starts a new epoch and the counts restart; a tile's `TileNet` persists across epochs, so cool-down progress isn't lost by moving.

### The inspector

A **Network** section beside the existing request-window chart (`widgets/inspector.ts`), following the inspector rules: fixed slots, values change, the layout doesn't.

- **A row per origin** (host only): protocol, window and in flight, time to first byte p50 and p95, the derived timeouts, a state chip ("ok", "backing off · 12 s", "offline", "token refreshing").
- **Counters since the engine started:** timeouts (by phase), retries, retries that succeeded, failures by class (network, timeout, 4xx, 429, 5xx, decode, auth), empties, cancelled (already shown), the retry bucket's level.
- **Per tileset:** the failed and cooling counts with their grouped reasons (the `undrawnReasons` mechanism, which already holds no URLs), and a "Retry failed" button calling `retryFailed()`.
- **A series** in the inspector's time-series section, with the others: failures and retries per second, sharing the time axis and crosshair.
- **The recorder** gets `net_timeouts`, `net_retries`, `net_failed`, `net_paused` columns, and the bench readers (`report.mjs`, `diagnose.mjs`) learn them.
- **Two flags,** both bugs to look at: an origin in a retry storm (retries above 10% of requests over 10 s with an empty bucket) and a stalled streaming entry (above).

## 10. Public surface

Small and optional; defaults are what ship.

```ts
interface NetworkOptions {
  /** Attempts per tile episode. Default 3; 1 turns retries off. */
  maxAttempts?: number;
  /** Replaces derived timeouts with fixed ones, ms (tests, benchmarks). */
  timeouts?: { ttfbMs?: number; stallMs?: number };
  /** Cool-down schedule for failed tiles, ms. Default [30_000, 120_000, 600_000]. */
  cooldownsMs?: readonly number[];
  /** Draw 404 and 204 content as empty. Default true. */
  missingAsEmpty?: boolean;
}
```

- `engine.network` (the defaults for every origin) and `TilesetOptions.network` (one tileset; `false` turns the behaviour off: one attempt, failures permanent, as today).
- `Tileset3D.retryFailed(): void`.
- A `"failed"` tileset event, `{ url, kind, status?, willRetry }`, the counterpart of 1.x's `tileFailed` (which carries `{ url, message }`). It fires per attempt that will not be retried at once, with `willRetry` true while a cool-down will.
- `Tileset3D.stats.net`: `{ attempts, retries, timeouts, empty, cooling, failed }`.
- Parity and benchmark pages use the defaults. They assert zero timeouts, retries and failures on a healthy run (section 13).
- The refinement plan's `converged()` and `view.refinement` are unchanged; the new facts arrive through `detail` and `failed`.

## 11. Non-goals and follow-ups

- **A decode that hangs** (a worker watchdog): a job-system matter.
- **Google's three-hour root window:** a long session through ion's Google endpoint must request the root tileset again; the status at expiry is undocumented. A re-root needs the tileset to swap its tree. Follow-up, after this plan.
- **Hedged requests, range resume, service-worker caching, offline caching:** not planned. The Google policy prohibits caching their content anyway.
- **Prefetch retries:** none, by design.
- **Telemetry.** Failure counts stay on the machine; nothing is sent anywhere.
- **Questions for ion (§14):** whether `assets.ion.cesium.com` ever answers 403, 429 or `Retry-After`; whether a revoked parent token kills an issued endpoint token; the status when an endpoint token expires.

## 12. Open questions for the owner

Each has a recommendation; the plan assumes them.

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| 1 | Where do retries live? | **In the tile** (one attempt per job, the slot released during backoff, one owner). One-off main-thread fetches retry in-line. | Inside the worker's fetch: simpler, but it holds a slot and a job through every backoff and retries at two layers. |
| 2 | A 404 or 204 on 3D Tiles content: literally empty, or "the parent stays"? | **The parent stays** for REPLACE (the child is `ready`, draws nothing, isn't `contentAvailable`), which matches 1.x's result and leaves no hole. | Literal empty: refinement proceeds, but a hole appears where a child is missing. |
| 3 | The default numbers: timeouts from 4 times the p95 with 5 s, 5 s and 10 s floors; 3 attempts; backoff 250 ms and 1 s up to 8 s; cool-downs 30 s, 2 minutes, 10 minutes. | **Yes, as constants in one object, tuned in SR-3 and SR-11 against the throttled profiles.** | Ask for no defaults: leave the timeouts off until configured. |
| 4 | Are `engine.network`, `TilesetOptions.network`, `retryFailed()` and the `"failed"` event public API? | **Yes, small.** Apps will want to retry after a captive-portal login, and 1.x has `tileFailed`. | Internal only; add on demand. |
| 5 | Refresh on 403 as well as 401 for ion? | **Yes**, one refresh per generation, and SR-7 checks the real service and drops 403 if ion never uses it for a stale token. | 401 only, as 1.x. |
| 6 | How long is a `Retry-After` honoured in place? | **Up to 60 s, then a cool-down of that length (capped at 10 minutes).** | Honour any value, with the tile pending throughout. |
| 7 | One-off worker loads (sky pack, star map, glare kernel): retries? | **Timeouts and failure kinds only;** retries wait for JP-2's one-off loads, which own them. Main-thread one-offs retry. | Retries for all now. |
| 8 | When a token refresh fails with 401, who hears? | **One engine error per origin and kind** (`engine.errors`), and the inspector chip. | Throw from the next API call; surfaces too late. |

## 13. The fault-injection harness and tests

### The harness: `test/faultNetwork.ts`

A fake `fetch` driven by a script, on a virtual clock, plus an adapter that runs the real request path on the fake GPU. It is test code, not engine code.

```ts
/** What one response does. Fields compose. */
interface Behaviour {
  /** Time to first byte, ms. Default 5. */
  ttfbMs?: number;
  /** Body time, ms, spread over chunks. */
  bodyMs?: number;
  status?: number;                      // default 200
  headers?: Record<string, string>;     // e.g. "Retry-After": "3"
  body?: Uint8Array | string;
  /** Fails with a network error: before any response, or part way through the body. */
  drop?: "before" | "mid-body";
  /** Stops answering: before the headers, or mid-body. The request ends only when aborted. */
  stall?: "ttfb" | "mid-body";
}

class FaultNetwork {
  constructor(clock: FakeClock, seed?: number);
  /** The script: the first matching rule wins; a function sees the attempt number. */
  rule(match: string | RegExp | ((url: string) => boolean),
       behaviour: Behaviour | Behaviour[] | ((attempt: number) => Behaviour)): this;
  readonly fetch: typeof fetch;                // honours `init.signal`, `init.headers`
  /** Every request: url, attempt number, start and end times, outcome. */
  readonly log: ReadonlyArray<{ url: string; attempt: number; at: number; end: number; outcome: string }>;
  install(): void;                             // `vi.stubGlobal("fetch", …)`
}
```

- **A virtual clock.** `vi.useFakeTimers` with `performance` faked, so the scheduler's `performance.now()`, the backoff timers and the stall timers all run on it; a `FakeClock.advance(ms)` helper steps it and flushes promises. The jitter's random source takes a seed.
- **Real `Response` objects** (Node 24 has them) with a `ReadableStream` body that emits chunks on the clock and honours the abort signal, so stall and mid-body drops exercise the real chunk loop.
- **`faultLoadGltf(engine, net)`** replaces `engine.loadGltf` (tests already `vi.spyOn(engine, "loadGltf")`) with `fetchBytes` over `net.fetch`, then returns the usual `triangle()` asset (the test files each define one). The real timers, classification, verdicts, scheduler and tile code run; only the decode is faked. The same wrapper stands in for terrain and imagery requests on the fake GPU.
- **The limit, stated:** `worker.ts` itself doesn't run in Node (the fake `Worker` is inert). The worker's use of `fetchBytes` and `JobReply.failure` is covered by calling the same code directly, and by the headless check.

### Unit and engine tests, by milestone

- **`fetchBytes`** (`test/fetchBytes.test.ts`): each timer fires its phase at the policy's time and not before; a stall resets on each chunk; a deadline scales with `Content-Length`; a cancel is an `AbortError` and a timer a `TimeoutError`; a truncated body is `network`; 204 and 404 return `missing`; `Retry-After` parses in seconds and as an HTTP date.
- **`judge`** (`test/netVerdict.test.ts`): the table in section 4, row by row, plus the attempts, budget, prefetch and suspended cases.
- **`OriginHealth`** (`test/originHealth.test.ts`): derived timeouts for the recorded profiles stay at their floors; samples move them within floor and cap; a 429 halves an adaptive window and leaves a pinned one; `Retry-After` pauses `tryAcquire`; the bucket drains and refills.
- **Episodes** (`test/tileRetry.test.ts`, `fakeEngine()` and a tileset as in `tilesetFrame.test.ts`): a transient 503 retries and loads; three failures cool; the cool-down releases and a wanted tile loads; a cancelled tile in backoff is gone; a 404 child leaves its REPLACE parent drawn; a prefetch isn't retried; retries never take more than a quarter of a window; a 200-tile outage makes a bounded number of attempts (the retry-storm test).
- **Tokens** (`test/ionRefresh.test.ts`): 50 tiles 401 at once make one endpoint call; headers change in place; a refreshed token that is also rejected cools instead of looping; no failure, stat, error or log line contains the token or a query string.
- **`NetState`** (`test/netState.test.ts`): offline holds new requests; an `online` event releases network cool-downs; an attempt over a hidden interval is `free`.

### The headless check

One script, `scripts/faultCheck.mjs`, on its own dev server and port (AGENTS.md). It starts `scripts/faultServer.mjs`, a small Node HTTP server that serves a synthetic tileset (a handful of tiles) and a fault script per path: delay, a 503 with `Retry-After`, a 429, a 404, a 204, a drop mid-body, a stall, and a token that stops being accepted after N requests. The page loads that tileset with a real engine and the real worker, then asserts, from `stats.net` and the final state: every injected transient fault retried and loaded; the stalled request timed out and recovered; the 404 child left its parent drawn; the rejected token refreshed once; the final tileset state is converged with no failed tile. It needs no ion token and no shaders (no GPU-safety exposure beyond the engine's own). Playwright's routing of worker requests isn't relied on; a real server is more direct.

### The parity suites' expectations

- **A healthy run changes nothing.** `stats.net` shows zero timeouts, retries and failures on every 2.0 parity and benchmark page. Each page asserts it and prints the counts, so a floor set too low shows up as a failed page, not a silent difference.
- **Request counts stay comparable.** `requestsTotal` (the L1′ measurement) counts first attempts; retries are counted in `stats.net.retries` only.
- **The throttled L1′ profiles run clean.** A 20 Mbit/s, 80 ms link produces no timeouts (SR-3's profile test and SR-11's run).
- **Pinned windows keep their meaning.** Parity runs with `maximumRequests` aren't adapted; only the pause and the retry slot cap apply, and the cap uses the pinned window.
- **1.x isn't touched.** Its side of every comparison keeps its own behaviour; the one deliberate difference is that a missing child is `ready` and empty here and `FAILED` in 1.x, with the same drawn result (section 5).
- **Existing tests that stub 404** (`test/composite.test.ts` fails a composite's inner tile on a 404; `tilesetFrame.test.ts` answers unknown URLs with a 404) are read in SR-5 and updated where the new meaning (empty, or a failure of a sub-resource) changes them.

### Review focus

The inputs and conditions the plan implies that most need a test of their own, most likely first:

1. **A dead origin with many tiles wanted:** the number of attempts and the request rate stay bounded (bucket, window halving, retry slots, pause); fresh visible requests are never refused.
2. **A 404 child under a REPLACE parent:** no hole, and the tileset still settles.
3. **A response arriving after its cancel or its timeout,** and a `TimeoutError` mistaken for a cancel (or the reverse) at any of the sites that recognise aborts.
4. **Secrets in diagnostics:** no URL query, no header value, in any failure record, stat, event, error, recorder row or test output.
5. **A laptop that slept, a tab that was hidden, a network that came back:** no false failures charged, no burst larger than the window.

## 14. Milestones

Sized for one agent each; proposed for §6 as M12. Per the cost rules: Sonnet by default, Opus for SR-3 and SR-4 (the scheduler and the episodes are the design and the risk). Each runs typecheck, eslint and prettier on its files, its own tests on the fake device (`test/fakeGpu.ts`), and at most one headless check. The full suite runs once at the end of SR-6 and again at the end of SR-11. No durations: order and dependencies only.

| # | Milestone | Files | Done when | Needs |
| --- | --- | --- | --- | --- |
| SR-1 | **The fault-injection harness.** `FaultNetwork`, `FakeClock`, `faultLoadGltf`; the harness tested on its own. | new `test/faultNetwork.ts`, `test/faultNetwork.test.ts` | The harness's tests show each behaviour: latency, status, `Retry-After`, drop before and mid-body, stall, abort, ordering by the clock, a seed that repeats. | nothing |
| SR-2 | **The fetch layer.** `FetchFailure`, `FetchError`, `fetchBytes` (three timers, `AbortSignal.any`), `fetchResilient`, `isCancel`, `parseRetryAfter`, `NetPolicy` with its defaults; `JobReply.failure`; the worker's fetch sites and `parseGltf`, `fetchTilesetJson` and the main-thread one-offs use them. Single attempt, so tiles still fail as today, but with the structured failure and a deadline. | new `src/io/fetchFailure.ts`, `fetchBytes.ts`; `io/worker.ts`, `gltfParse.ts`, `Jobs.ts`, `streaming/Tile.ts`, `tilesetLoad.ts` (the cancel helper) | `fetchBytes` and failure tests pass. The sites that recognised `AbortError` by name are found by search and use `isCancel`. A stalled request now fails after its deadline instead of waiting. Messages carry no URL (tested). | SR-1 |
| SR-3 | **Origin health.** `OriginHealth` inside `RequestScheduler`: samples, derived `NetPolicy`, the retry bucket, the window's response to throttling, `Retry-After` pauses, per-origin counters; the policy goes into every request's payload. | new `src/streaming/OriginHealth.ts`; `RequestScheduler.ts`, `io/worker.ts`, `Jobs.ts` (the sample in the reply) | The policy table holds for the recorded profiles with zero timeouts at 20 Mbit/s and 80 ms; a 429 halves an adaptive window; a pinned window isn't touched; `Retry-After` pauses; the bucket's numbers are tested. | SR-2 |
| SR-4 | **Retries for 3D Tiles content.** `judge`, backoff, `TileNet`, episodes in `loadContent`, the retry timer and wake, the retry slot cap, prefetch drop, `stats.net`, the `"failed"` event. | new `src/streaming/tileRetry.ts`, `src/io/backoff.ts`; `tilesetLoad.ts`, `tilesetState.ts`, `Tile.ts`, `tilesetTypes.ts`, `Tileset3D.ts` | The verdict table and episode tests pass, including the 200-tile outage (bounded attempts), cancelled-in-backoff and the retry slot cap. Existing streaming tests pass unchanged. | SR-3 |
| SR-5 | **Missing content and recovery.** `tile.missing` and `contentAvailable`, 404 and 204 as empty for content and external tilesets, the cool-down sweep, `retryFailed()`, release on `online` and token refresh; the stubbed-404 tests reviewed and updated. | `Tile.ts`, `Stepwise.ts` (`contentAvailable`), `tilesetUpdate.ts`, `tilesetLoad.ts`, `test/composite.test.ts`, `test/tilesetFrame.test.ts` | A 404 child leaves its REPLACE parent drawn and the tileset settles; a cooled-down tile reloads when wanted; `retryFailed()` resets. The rest of the suite is unchanged. | SR-4 |
| SR-6 | **The globe.** Terrain: retries as episodes and 404 as upsampling from the ancestor; imagery sources: retries, a `retryAt` and cool-down on the source, 404 and 204 as `empty`; the 30-tick cancels use `isCancel`. | `globe/TerrainSource.ts`, `GlobeImagery.ts`, `io/worker.ts`, `tileRetry.ts` | Terrain and imagery tests on the fake device: a transient failure retries and loads; a 404 terrain tile is upsampled; a failed imagery source recovers after its cool-down. | SR-4, SR-5 |
| SR-7 | **ion tokens.** The headers registry, `refreshIonHeaders`, the generation counter, the 401 and 403 flow in the episodes, `fetchResilient` for the endpoint and metadata fetches, `BingImagery` and `IonTmsImagery` registration, the one engine error. SR-7 also measures what the real service does on a stale token (with an ion token the owner supplies, never printed), and settles open question 5. | `io/ion.ts`, `globe/ImageryProvider.ts`, `tilesetLoad.ts`, `Engine.ts` (the error) | The token tests pass (one refresh for 50 simultaneous 401s; no loop; no token or query in any output). | SR-4 |
| SR-8 | **Online, hidden, offline.** `NetState`, forwarding in worker mode, `free` retries, the offline hold, the release on `online`, the rearm on resume; the worker timer drift measurement. | new `src/streaming/NetState.ts`; `RequestScheduler.ts`, `Engine.ts`, the worker mode's message set, `tileRetry.ts` | The `NetState` tests pass; the drift measurement is written into section 8 of this plan. | SR-4 |
| SR-9 | **Inspector and recorder.** The Network section, the per-origin rows and chips, the failed list with "Retry failed", the series, the recorder columns, `JobStats.failedTotal`, the two flags. | `widgets/inspector.ts`, `inspectable.ts`, `engine.ts`, `recorder.ts`, `recorderRows.ts`, `bench/suite` readers | The DOM-skeleton test holds (the layout doesn't change across states). The owner reviews it by clicking around (the UI quality bar). | SR-6, SR-7, SR-8 |
| SR-10 | **Refinement entries.** `pending`, `failed`, `done` and the `detail` keys on the streaming entry, and the stall flag's new rule. | the streaming source's adapter (from R1: `Tileset3D.ts`, `GlobeImagery.ts`) | R1's agreement check still holds; a test with a flaky origin shows `retrying`, then `failed`, then `pending` again after the cool-down; `converged({ timeoutMs })` ends with the failure counted. | SR-6 and refinement R1 (R5 for `wake(kind)`) |
| SR-11 | **The headless check and the parity guard.** `faultServer.mjs`, `faultCheck.mjs`; the zero-faults assertion on the parity and benchmark pages; the throttled-profile run. | new `scripts/faultServer.mjs`, `faultCheck.mjs`; `parity/*.ts`, `bench/suite` | The check passes on its own port; every 2.0 parity page prints zero timeouts, retries and failures on a healthy run, at the full and the throttled profiles. Defaults adjusted if a floor was too low. | SR-6, SR-7, SR-8 |
| SR-12 | **Handbook, plan updates.** The handbook page (what the engine does when the network misbehaves, with a "checked" date); §14 item 7 closed and the ion questions added; §13.2 and §15 notes. | `handbook/src/tabs/`, `CESIUM2_WEBGPU_PLAN.md` | Reviewed by the owner. | SR-9, SR-10 |

**Order.** SR-1 to SR-4 are a chain. SR-5 follows SR-4. SR-6, SR-7 and SR-8 can then run together (different files, except `tileRetry.ts`, which SR-4 and SR-5 leave stable). SR-9 and SR-10 follow, then SR-11 and SR-12.

**For the overall plan (§6, M12):** "Streaming robustness (proposed 2026-11-13)": SR-1 harness; SR-2 fetch layer; SR-3 origin health (Opus); SR-4 retries for 3D Tiles (Opus); SR-5 missing content and recovery; SR-6 the globe; SR-7 ion tokens; SR-8 online, hidden and offline; SR-9 inspector and recorder; SR-10 refinement entries (needs refinement R1); SR-11 headless check and parity guard; SR-12 handbook and plan updates. No durations: order and dependencies only.

## 15. Risks

- **Timeouts too tight** produce retries on slow but healthy links. The floors, the multiplier, the p10 rate and the throttled-profile gates are there for this, and `engine.network.timeouts` is the escape hatch. A deadline miss on a huge tile costs a restart from zero; the stall timer, not the deadline, is the sharp tool.
- **Retries that make an outage worse.** The bucket, the retry slots, window halving and pauses are the defence; the retry-storm test is the check. The first request of a tile is never refused, so a dead origin still gets probed.
- **Aborts recognised by name** are scattered. SR-2 searches for them and replaces each with `isCancel`; a missed one turns a timeout into a silent unload (a loop of re-requests). The harness's timeout tests would show it as repeated attempts.
- **A refreshed header object mutated in place** relies on holders keeping the reference. Anything that copies `headers` (a spread) would keep the old token: SR-7 searches for copies, and the single-generation rule limits the damage to one extra cool-down.
- **`ready` and empty with `missing`** touches the selection's readiness rule (`contentAvailable`). Its tests (SR-5) run beside the existing Stepwise and Budgeted suites; a mistake shows as a hole or a stuck parent.
- **Worker timers in hidden tabs** are unmeasured; the `suspended` rule is the fallback.
- **ion's undocumented behaviour** (403, 429, expiry of the endpoint token) is handled by class, not by status. SR-7's measurement and the questions in §14 narrow it.
