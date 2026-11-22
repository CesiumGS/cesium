/**
 * The budget arbiter (CS-847): every source says what it wants each tick
 * (`BudgetClient.want`), and after all have updated the engine grants per
 * origin and over one byte budget for all of them. That is
 * docs/design/tile-selection-and-memory.md's "Scheduling across tilesets" and
 * "Budget-driven refinement" made the seam's contract:
 *
 * - **Classes first** (`now`, `refine`, `prefetch`), as I/O priority classes
 *   are: classes make sources comparable where their own priorities aren't.
 *   Prefetch is the idle class: on an origin, it is granted only when no
 *   `now` or `refine` want waits there for a slot; and while any `now` or
 *   `refine` want waits for bytes, on any origin, no prefetch is granted,
 *   since the byte budget is shared. A want larger than the whole budget
 *   can never fit: it is refused and reported, and holds nothing back.
 * - **Then benefit per cost,** with aging: a want's score rises the longer it
 *   waits, so no source starves another inside a class.
 * - **One window per origin** (`slotsPerOrigin` loads in flight), and **one
 *   byte budget** for what every source holds and is loading.
 *
 * Seen at Mount Rainier (r25): one tileset's prefetches filled an origin's
 * window while terrain's visible tiles waited, because sources took free
 * slots in update order. Here update order doesn't matter.
 */
import type {
  BudgetClient,
  ContentKey,
  SourceGrant,
  Want,
  WantClass,
} from "./types.ts";

/**
 * The arbiter's settings.
 * @experimental
 */
export interface BudgetOptions {
  /** Bytes every source may hold and load together. Default 1 GiB. */
  readonly bytes?: number;
  /** Loads in flight per origin. Default 16, the request scheduler's starting window. */
  readonly slotsPerOrigin?: number;
  /** Ticks of waiting that double a want's score within its class. Default 30. */
  readonly agingTicks?: number;
}

const CLASS_RANK: Readonly<Record<WantClass, number>> = {
  now: 0,
  refine: 1,
  prefetch: 2,
};

/** A decode millisecond weighs as much as this many bytes in a want's cost. */
const BYTES_PER_DECODE_MS = 64 * 1024;

interface Held {
  readonly origin: string;
  bytes: number;
}

/** One source's side of the budget. */
class Client implements BudgetClient {
  /** This tick's wants, by key. */
  wants = new Map<ContentKey, Want>();
  /** Granted, not yet settled: its origin's slot and its bytes are reserved. */
  readonly inFlight = new Map<ContentKey, Held>();
  /** Loaded and held. */
  readonly held = new Map<ContentKey, number>();
  /** How many ticks each wanted key has waited. */
  ages = new Map<ContentKey, number>();
  /** Granted since its last update, most urgent first. */
  granted: ContentKey[] = [];
  /** Wanted keys larger than the whole budget, reported once while wanted. */
  oversized = new Set<ContentKey>();
  private resident_ = 0;

  constructor(
    readonly order: number,
    private readonly arbiter: BudgetArbiter,
  ) {}

  want(want: Want): void {
    checkWant(want);
    if (this.inFlight.has(want.key) || this.held.has(want.key)) {
      return; // already loading or loaded
    }
    const was = this.wants.get(want.key);
    if (!was || CLASS_RANK[want.class] < CLASS_RANK[was.class]) {
      this.wants.set(want.key, want);
    }
  }

  settle(key: ContentKey, bytes?: number): void {
    const flight = this.inFlight.get(key);
    if (!flight) {
      // Never granted, or released (a grant its update threw on goes back):
      // ignored, and said, since a load it settles this way runs twice.
      this.arbiter.report(
        `BudgetClient.settle: "${key.slice(0, 64)}" isn't in flight (never granted, settled already or released); ignored.`,
      );
      return;
    }
    let held = bytes ?? flight.bytes;
    if (!(held >= 0) || !Number.isFinite(held)) {
      // Refused, not applied: NaN would stop every source's loading, and a
      // negative value would enlarge the budget. It settles at what its
      // grant reserved, so its slot frees.
      this.arbiter.report(
        `BudgetClient.settle: "${key.slice(0, 64)}" settled at ${String(bytes)} bytes; it takes a finite number from 0. Counted at the ${flight.bytes} bytes its want asked.`,
      );
      held = flight.bytes;
    }
    this.inFlight.delete(key);
    this.arbiter.endFlight(flight);
    this.held.set(key, held);
    this.resident_ += held;
    this.arbiter.hold(held);
  }

  release(key: ContentKey): void {
    const flight = this.inFlight.get(key);
    if (flight) {
      this.inFlight.delete(key);
      this.arbiter.endFlight(flight);
    }
    const held = this.held.get(key);
    if (held !== undefined) {
      this.held.delete(key);
      this.resident_ -= held;
      this.arbiter.hold(-held);
    }
  }

  get resident(): number {
    return this.resident_;
  }

  /** Releases everything it holds or loads. */
  clear(): void {
    for (const key of [...this.inFlight.keys(), ...this.held.keys()]) {
      this.release(key);
    }
    this.wants.clear();
    this.ages.clear();
    this.oversized.clear();
    this.granted = [];
  }
}

/**
 * Grants every source's wants per origin and over one byte budget.
 * @experimental
 */
export class BudgetArbiter {
  readonly bytes: number;
  readonly slotsPerOrigin: number;
  readonly agingTicks: number;
  private readonly clients: Client[] = [];
  private nextOrder = 0;
  private resident_ = 0;
  private reserved = 0;
  private readonly flights = new Map<string, number>();

  /** Where a refused value is reported (a source's mistake, not a throw). */
  readonly report: (message: string) => void;

  constructor(
    options: BudgetOptions = {},
    report: (message: string) => void = (message) => console.error(message),
  ) {
    this.report = report;
    this.bytes = positive(options.bytes ?? 1024 * 1024 * 1024, "bytes");
    this.slotsPerOrigin = Math.floor(
      positive(options.slotsPerOrigin ?? 16, "slotsPerOrigin"),
    );
    this.agingTicks = positive(options.agingTicks ?? 30, "agingTicks");
  }

  /** A new source's client. */
  client(): BudgetClient {
    const client = new Client(this.nextOrder++, this);
    this.clients.push(client);
    return client;
  }

  /** Frees everything `client` holds and forgets it. */
  remove(client: BudgetClient): void {
    const at = this.clients.indexOf(client as Client);
    if (at >= 0) {
      this.clients[at]!.clear();
      this.clients.splice(at, 1);
    }
  }

  /** What every source holds, bytes. */
  get resident(): number {
    return this.resident_;
  }

  /** Loads in flight on `origin`. */
  inFlight(origin: string): number {
    return this.flights.get(origin) ?? 0;
  }

  /**
   * After every source updated: grants this tick's wants, class first,
   * then benefit per cost with aging, per origin and within the byte
   * budget. Clears the wants. Returns how many it granted.
   */
  arbitrate(): number {
    interface Entry {
      readonly client: Client;
      readonly want: Want;
      readonly rank: number;
      readonly score: number;
      readonly seq: number;
    }
    const entries: Entry[] = [];
    let seq = 0;
    for (const client of this.clients) {
      const ages = new Map<ContentKey, number>();
      const oversized = new Set<ContentKey>();
      for (const want of client.wants.values()) {
        if (want.cost.bytes > this.bytes) {
          // It can never fit: refused, said once while it's wanted, and it
          // holds back nothing else (it never makes the bytes busy).
          if (!client.oversized.has(want.key)) {
            this.report(
              `BudgetClient.want: "${want.key.slice(0, 64)}" asks ${want.cost.bytes} bytes, more than the whole budget of ${this.bytes}; refused.`,
            );
          }
          oversized.add(want.key);
          continue;
        }
        const age = client.ages.get(want.key) ?? 0;
        ages.set(want.key, age);
        const cost = Math.max(
          1,
          want.cost.bytes + (want.cost.decodeMs ?? 0) * BYTES_PER_DECODE_MS,
        );
        entries.push({
          client,
          want,
          rank: CLASS_RANK[want.class],
          score: (want.benefit / cost) * (1 + age / this.agingTicks),
          seq: seq++,
        });
      }
      client.ages = ages; // keys no longer wanted forget their age
      client.oversized = oversized;
    }
    entries.sort(
      (a, b) =>
        a.rank - b.rank ||
        b.score - a.score ||
        a.client.order - b.client.order ||
        a.seq - b.seq,
    );
    /** Origins where a `now` or `refine` want waits ungranted this tick. */
    const busy = new Set<string>();
    /**
     * A `now` or `refine` want that would fit in an empty budget waits for
     * bytes: no prefetch goes anywhere. (One larger than the budget never
     * gets here: it can't fit, so waiting for it would stop prefetch for good.)
     */
    let bytesBusy = false;
    let granted = 0;
    for (const { client, want, rank } of entries) {
      const origin = want.origin;
      const idle = rank === CLASS_RANK.prefetch;
      const slot = this.inFlight(origin) < this.slotsPerOrigin;
      const bytes =
        this.resident_ + this.reserved + want.cost.bytes <= this.bytes;
      if (!slot || !bytes || (idle && (bytesBusy || busy.has(origin)))) {
        if (!idle) {
          busy.add(origin);
          bytesBusy ||= !bytes;
        }
        client.ages.set(want.key, (client.ages.get(want.key) ?? 0) + 1);
        continue;
      }
      client.inFlight.set(want.key, { origin, bytes: want.cost.bytes });
      client.ages.delete(want.key);
      client.granted.push(want.key);
      this.flights.set(origin, this.inFlight(origin) + 1);
      this.reserved += want.cost.bytes;
      granted++;
    }
    for (const client of this.clients) {
      client.wants = new Map();
    }
    return granted;
  }

  /**
   * Gives back `keys` of a grant its source never acted on (its update
   * threw): those still in flight are released, so the next tick's wants
   * get them again. Keys it settled before it threw stay held.
   */
  returnGrant(client: BudgetClient, keys: readonly ContentKey[]): void {
    const c = client as Client;
    for (const key of keys) {
      if (c.inFlight.has(key)) {
        c.release(key);
      }
    }
  }

  /** What `client` was granted since it last asked, and clears it. */
  takeGrant(client: BudgetClient): SourceGrant {
    const c = client as Client;
    const keys = c.granted;
    c.granted = [];
    return {
      keys,
      bytes: { budget: this.bytes, resident: this.resident_ },
    };
  }

  /** @internal A grant settled or was released: its slot and reservation free. */
  endFlight(flight: Held): void {
    const left = this.inFlight(flight.origin) - 1;
    if (left > 0) {
      this.flights.set(flight.origin, left);
    } else {
      this.flights.delete(flight.origin);
    }
    this.reserved -= flight.bytes;
  }

  /** @internal Bytes held changed by `delta`. */
  hold(delta: number): void {
    this.resident_ += delta;
  }
}

function checkWant(want: Want): void {
  if (typeof want.key !== "string") {
    throw new TypeError("BudgetClient.want: a want's key is a string.");
  }
  if (!Object.hasOwn(CLASS_RANK, want.class)) {
    throw new RangeError(
      `BudgetClient.want: class "${String(want.class)}"; it takes "now", "refine" or "prefetch".`,
    );
  }
  if (!(want.benefit >= 0) || !Number.isFinite(want.benefit)) {
    throw new RangeError(
      `BudgetClient.want: benefit is ${want.benefit}; it takes a finite number from 0.`,
    );
  }
  if (!(want.cost.bytes >= 0) || !Number.isFinite(want.cost.bytes)) {
    throw new RangeError(
      `BudgetClient.want: cost.bytes is ${want.cost.bytes}; it takes a finite number from 0.`,
    );
  }
  const decodeMs = want.cost.decodeMs;
  if (
    decodeMs !== undefined &&
    (!(decodeMs >= 0) || !Number.isFinite(decodeMs))
  ) {
    throw new RangeError(
      `BudgetClient.want: cost.decodeMs is ${decodeMs}; it takes a finite number from 0.`,
    );
  }
  if (typeof want.origin !== "string" || want.origin.length === 0) {
    throw new TypeError("BudgetClient.want: a want names its origin.");
  }
}

function positive(value: number, name: string): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(
      `BudgetArbiter: ${name} is ${value}; it takes a finite number above 0.`,
    );
  }
  return value;
}
