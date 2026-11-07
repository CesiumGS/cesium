// Structural sharing for the panel's model (Task 4d). The model is rebuilt
// from every part of the page on each `invalidate`, and while the clock
// plays that is every frame; most of it hasn't changed. `share` hands back
// the previous value wherever the new one is equal, so an unchanged part
// keeps its identity: React's memoized components skip it, and a model
// with nothing changed is the previous object, which the panel doesn't
// render again.

const isPlain = (v: unknown): v is Record<string, unknown> | unknown[] => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  if (Array.isArray(v)) {
    return true;
  }
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
};

const isTyped = (v: unknown): v is ArrayLike<number> =>
  ArrayBuffer.isView(v) && !(v instanceof DataView);

function sameTyped(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (
    a.length !== b.length ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  ) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

/**
 * `next`, with every part equal to the same part of `prev` replaced by
 * `prev`'s (so it keeps its identity); `prev` itself when the two are
 * equal. Plain objects and arrays compare by their contents, typed arrays
 * by their elements, and anything else (a class instance, a function) by
 * identity. Neither argument is changed.
 */
export function share<T>(prev: unknown, next: T): T {
  if (Object.is(prev, next)) {
    return next;
  }
  if (isTyped(prev) && isTyped(next)) {
    return (sameTyped(prev, next) ? prev : next) as T;
  }
  if (!isPlain(prev) || !isPlain(next)) {
    return next;
  }
  if (Array.isArray(prev) !== Array.isArray(next)) {
    return next;
  }
  if (Array.isArray(next)) {
    const p = prev as unknown[];
    let same = p.length === next.length;
    let reused = false;
    const out = next.map((v, i) => {
      const s = share(p[i], v);
      if (s !== p[i]) {
        same = false;
      }
      if (s !== v) {
        reused = true;
      }
      return s;
    });
    return (same ? prev : reused ? out : next) as T;
  }
  const p = prev as Record<string, unknown>;
  const n = next as Record<string, unknown>;
  const keys = Object.keys(n);
  let same = keys.length === Object.keys(p).length;
  let reused = false;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const had = Object.prototype.hasOwnProperty.call(p, k);
    const s = had ? share(p[k], n[k]) : n[k];
    if (!had || s !== p[k]) {
      same = false;
    }
    if (s !== n[k]) {
      reused = true;
    }
    out[k] = s;
  }
  if (same) {
    return prev as T;
  }
  if (!reused) {
    return next;
  }
  // Keep the new value's prototype (a null-prototype record stays one).
  return (
    Object.getPrototypeOf(n) === null
      ? Object.assign(Object.create(null) as object, out)
      : out
  ) as T;
}

/** Whether `a` and `b` are equal as `share` compares them. */
export const sameData = (a: unknown, b: unknown): boolean => share(a, b) === a;
