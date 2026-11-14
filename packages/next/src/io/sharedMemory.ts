// Shared memory when the page allows it (plan §13.43): with cross-origin
// isolation (COOP `same-origin` and COEP `require-corp` or `credentialless`)
// a `SharedArrayBuffer` passes between the page and the workers without a
// copy. Without it, the same data is transferred or copied: nothing may
// require it.

/** How the job system passes data it keeps: shared, or transferred and copied. */
export type JobMemory = "shared" | "transfer";

/** Whether this thread (the page or a worker) can share memory now. */
export function sharedMemory(): boolean {
  return (
    globalThis.crossOriginIsolated === true &&
    typeof SharedArrayBuffer === "function"
  );
}

/** `sharedMemory()` as the job system reports it. */
export function jobMemory(): JobMemory {
  return sharedMemory() ? "shared" : "transfer";
}

type Typed = Uint8Array | Uint16Array | Uint32Array | Float32Array;
type TypedConstructor<T extends Typed> = {
  new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
  readonly BYTES_PER_ELEMENT: number;
};

/**
 * The arrays copied into one `SharedArrayBuffer`, each aligned to 4 bytes,
 * as views of the same types and lengths. Data kept on the page and posted
 * to workers again (a terrain tile's heights) is then shared each time it
 * is posted, not copied.
 */
export function shareArrays<T extends readonly Typed[]>(arrays: T): T {
  let bytes = 0;
  for (const a of arrays) {
    bytes += Math.ceil(a.byteLength / 4) * 4;
  }
  const buffer = new SharedArrayBuffer(bytes);
  let offset = 0;
  return arrays.map((a) => {
    const Ctor = a.constructor as TypedConstructor<Typed>;
    const view = new Ctor(buffer, offset, a.length);
    view.set(a as never);
    offset += Math.ceil(a.byteLength / 4) * 4;
    return view;
  }) as unknown as T;
}
