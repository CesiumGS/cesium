// What lets the panel's parts skip a render when what they show didn't
// change (Task 4d). The model keeps every unchanged part's identity
// (share.ts), so a memoized component compares its props by identity; these
// keep the rest of its props stable too: callbacks made in a render, and
// values derived in one.
import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * A memo comparator: the props are equal when every prop is the same, and
 * `prop`'s object is compared only on the `fields` the component reads (a
 * scenario view whose other fields moved doesn't render it again).
 */
export function equalOn<P extends object, K extends keyof P>(
  prop: K,
  fields: readonly (keyof P[K])[],
): (a: Readonly<P>, b: Readonly<P>) => boolean {
  return (a, b) => {
    for (const k of Object.keys(b) as (keyof P)[]) {
      if (k !== prop && !Object.is(a[k], b[k])) {
        return false;
      }
    }
    if (Object.keys(a).length !== Object.keys(b).length) {
      return false;
    }
    const x = a[prop];
    const y = b[prop];
    return x === y || fields.every((f) => Object.is(x[f], y[f]));
  };
}

/** `fn` as one function for the component's life, always calling the latest `fn`. */
export function useStableCallback<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const latest = useRef(fn);
  useLayoutEffect(() => {
    latest.current = fn;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}

/**
 * `next`, or the last value when `same` says they're equal: a derived value
 * that keeps its identity. It writes a ref during render; that is
 * idempotent (the same `next` always leaves the same value), so a render
 * React throws away or repeats does no harm.
 */
export function useStable<T>(next: T, same: (a: T, b: T) => boolean): T {
  const last = useRef(next);
  if (last.current !== next && !same(last.current, next)) {
    last.current = next;
  }
  return last.current;
}

/** Whether two sets hold the same members. */
export const sameSet = <T>(
  a: ReadonlySet<T> | undefined,
  b: ReadonlySet<T> | undefined,
): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.size === b.size &&
    [...a].every((x) => b.has(x)));
