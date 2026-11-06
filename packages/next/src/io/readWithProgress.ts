// Reads a fetch response's body while reporting the bytes received, for the
// loaders that show loading progress (plan frames-explorer R9).

/**
 * A loader's fetch progress: `item` is the file being fetched, `received` its
 * bytes so far and `total` its size from the response's `Content-Length`, or
 * `undefined` when the response states none (or the body outgrows it, as a
 * compressed one does). Calls for one item come in order, `received` never
 * decreasing; the last one has the whole body.
 */
export type LoadProgress = (
  item: string,
  received: number,
  total: number | undefined,
) => void;

/** The response's `Content-Length`, when it states a whole number of bytes. */
function contentLength(response: Response): number | undefined {
  const header = response.headers?.get("Content-Length");
  if (header === null || header === undefined || !/^\d+$/.test(header)) {
    return undefined;
  }
  return Number(header);
}

/**
 * The response's body, read as a stream when `onProgress` is given: it is
 * called with 0 bytes once the headers are in, then after every chunk. A body
 * that fails part way rejects. Without `onProgress`, or for a response with no
 * stream, it is `response.arrayBuffer()` (reported once, whole).
 *
 * With a `Content-Length`, the chunks are copied into one buffer of that size
 * as they arrive and that buffer is returned, so the body is held once. A body
 * that outgrows its stated length (a compressed one) falls back to collecting
 * the chunks and joining them at the end, and one that falls short is cut to
 * what arrived.
 */
export async function readWithProgress(
  response: Response,
  onProgress?: (received: number, total: number | undefined) => void,
): Promise<ArrayBuffer> {
  if (!onProgress) {
    return response.arrayBuffer();
  }
  const stated = contentLength(response);
  const reader = response.body?.getReader();
  if (!reader) {
    const whole = await response.arrayBuffer();
    onProgress(
      whole.byteLength,
      stated !== undefined && whole.byteLength <= stated ? stated : undefined,
    );
    return whole;
  }
  // One buffer of the stated size, filled in place; undefined once the body
  // outgrows it (or with no stated size), and the chunks are kept instead.
  let filled: Uint8Array | undefined =
    stated === undefined ? undefined : new Uint8Array(stated);
  const chunks: Uint8Array[] = [];
  let received = 0;
  const total = () =>
    stated !== undefined && received <= stated ? stated : undefined;
  onProgress(0, total());
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (filled !== undefined && received + value.byteLength > filled.length) {
      chunks.push(filled.subarray(0, received));
      filled = undefined;
    }
    if (filled !== undefined) {
      filled.set(value, received);
    } else {
      chunks.push(value);
    }
    received += value.byteLength;
    onProgress(received, total());
  }
  if (filled !== undefined) {
    return received === filled.length
      ? (filled.buffer as ArrayBuffer)
      : (filled.buffer.slice(0, received) as ArrayBuffer);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}
