// The section worker's brain: sections a b-rep by planes (`sectionBrep`, exact
// geometry, a pure function of typed arrays) and prepares the result for the
// GPU (`prepareGpuPatches`) off the page's thread, so caps that follow a
// moving clip don't cost it the time. `sectionWorker.ts` makes one in a Web
// Worker; tests make one in-process. Provisional, with the kernel worker's
// messages: forms are plain typed arrays, which clone in and move out.
import type { BrepForm } from "./form.ts";
import {
  prepareGpuPatches,
  type GpuPatches,
  type PrepareOptions,
} from "./gpuPatches.ts";
import {
  sectionBrep,
  type SectionOptions,
  type SectionPlaneInput,
  type SectionResult,
} from "./section.ts";

/** One section: the form, the planes to cut it by, and what to prepare of the caps. */
export interface SectionRequest {
  readonly form: BrepForm;
  readonly planes: readonly SectionPlaneInput[];
  readonly options?: SectionOptions;
  /** `prepareGpuPatches`' options for the cap form, to have its `patches` ready for `World.addBrep`'s `prepared` (omit for none). */
  readonly prepare?: PrepareOptions;
}

/** What a section made. */
export interface SectionOutcome {
  readonly result: SectionResult;
  /** The cap form's GPU patches, when the request asked and there is a form. */
  readonly patches: GpuPatches | undefined;
  /** How long the section and the preparing took where they ran, ms. */
  readonly sectionMs: number;
  readonly prepareMs: number;
}

/** What caps need of whatever sections: a worker's client, or this thread. */
export interface SectionRunner {
  /** Sections `request.form`; rejects when the section throws. */
  run(request: SectionRequest): Promise<SectionOutcome>;
}

/** Sections in place, on this thread (what the worker does for each request). */
export function runSection(request: SectionRequest): SectionOutcome {
  let start = performance.now();
  const result = sectionBrep(request.form, request.planes, request.options);
  const sectionMs = performance.now() - start;
  start = performance.now();
  const patches =
    request.prepare && result.form
      ? prepareGpuPatches(result.form, request.prepare)
      : undefined;
  return { result, patches, sectionMs, prepareMs: performance.now() - start };
}

/** Page to worker. A form is sent once under a key and sectioned many times. */
export type SectionMessage =
  | { type: "form"; key: number; form: BrepForm }
  | { type: "forget"; key: number }
  | {
      type: "section";
      id: number;
      key: number;
      planes: readonly SectionPlaneInput[];
      options?: SectionOptions;
      prepare?: PrepareOptions;
    };

/** Worker to page. */
export type SectionReply =
  | { type: "sectioned"; id: number; outcome: SectionOutcome }
  | { type: "error"; id: number; message: string };

export interface SectionHostOptions {
  /** Sends a reply, moving `transfer`'s buffers with it. */
  post(reply: SectionReply, transfer: ArrayBuffer[]): void;
}

/** The buffers of every typed array in `value`, to move with it; a view into a larger buffer is copied first. */
function transferables<T>(value: T, buffers: Set<ArrayBuffer>): T {
  if (ArrayBuffer.isView(value)) {
    const view = value as unknown as {
      buffer: ArrayBufferLike;
      byteLength: number;
      slice(): unknown;
    };
    const own =
      view.buffer instanceof ArrayBuffer &&
      view.byteLength === view.buffer.byteLength
        ? view
        : (view.slice() as typeof view);
    buffers.add(own.buffer as ArrayBuffer);
    return own as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => transferables(item, buffers)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        transferables(item, buffers),
      ]),
    ) as T;
  }
  return value;
}

export class SectionHost {
  private readonly forms = new Map<number, BrepForm>();

  constructor(private readonly options: SectionHostOptions) {}

  receive(message: SectionMessage): void {
    switch (message.type) {
      case "form":
        this.forms.set(message.key, message.form);
        return;
      case "forget":
        this.forms.delete(message.key);
        return;
      case "section": {
        const { id } = message;
        try {
          const form = this.forms.get(message.key);
          if (!form) {
            throw new Error(`the form ${message.key} isn't in the worker`);
          }
          const outcome = runSection({
            form,
            planes: message.planes,
            ...(message.options ? { options: message.options } : {}),
            ...(message.prepare ? { prepare: message.prepare } : {}),
          });
          // The cap form moves; the patches (nested objects) are cloned.
          const buffers = new Set<ArrayBuffer>();
          const moved = outcome.result.form
            ? transferables(outcome.result.form, buffers)
            : undefined;
          this.options.post(
            {
              type: "sectioned",
              id,
              outcome: {
                ...outcome,
                result: { ...outcome.result, form: moved },
              },
            },
            [...buffers],
          );
        } catch (error) {
          this.options.post(
            {
              type: "error",
              id,
              message: error instanceof Error ? error.message : String(error),
            },
            [],
          );
        }
      }
    }
  }
}
