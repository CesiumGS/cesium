import type { FactPath, Predicate, Scalar, Subject } from "./types.ts";

const KEYS: readonly string[] = [
  "equals",
  "in",
  "includes",
  "above",
  "below",
  "has",
  "all",
  "any",
  "not",
];

/** The value at `path`; throws for a context path when there is no context. */
function read(subject: Subject, path: FactPath): Scalar {
  const { facts, context } = subject;
  switch (path) {
    case "renderer":
      return facts.renderer;
    case "limitsTier":
      return facts.limitsTier;
    case "canvasFormat":
      return facts.canvasFormat;
    case "adapter.vendor":
      return facts.adapter.vendor;
    case "adapter.architecture":
      return facts.adapter.architecture;
    case "adapter.isFallbackAdapter":
      return facts.adapter.isFallbackAdapter;
    case "probes.storageWritesRunPerSample":
      return facts.probes.storageWritesRunPerSample;
    case "context.pixels":
    case "context.altitudeKm": {
      if (!context) {
        throw new Error(`${path} read where there is no context`);
      }
      return path === "context.pixels" ? context.pixels : context.altitudeKm;
    }
  }
}

/** Whether `predicate` holds over `subject`. Throws on a shape it doesn't know. */
export function evaluate(predicate: Predicate, subject: Subject): boolean {
  const keys = Object.keys(predicate);
  if (keys.length !== 1 || !KEYS.includes(keys[0]!)) {
    throw new Error(`not a predicate: ${JSON.stringify(predicate)}`);
  }
  if ("equals" in predicate) {
    return read(subject, predicate.equals[0]) === predicate.equals[1];
  }
  if ("in" in predicate) {
    return predicate.in[1].includes(read(subject, predicate.in[0]));
  }
  if ("includes" in predicate) {
    const value = read(subject, predicate.includes[0]);
    return (
      typeof value === "string" &&
      value.toLowerCase().includes(predicate.includes[1].toLowerCase())
    );
  }
  if ("above" in predicate) {
    return (read(subject, predicate.above[0]) as number) > predicate.above[1];
  }
  if ("below" in predicate) {
    return (read(subject, predicate.below[0]) as number) < predicate.below[1];
  }
  if ("has" in predicate) {
    return subject.facts.features.includes(predicate.has);
  }
  if ("all" in predicate) {
    return predicate.all.every((p) => evaluate(p, subject));
  }
  if ("any" in predicate) {
    return predicate.any.some((p) => evaluate(p, subject));
  }
  return !evaluate(predicate.not, subject);
}

/** The fact paths `predicate` reads, to check a support rule never reads context. */
export function pathsRead(predicate: Predicate): FactPath[] {
  if ("equals" in predicate) {
    return [predicate.equals[0]];
  }
  if ("in" in predicate) {
    return [predicate.in[0]];
  }
  if ("includes" in predicate) {
    return [predicate.includes[0]];
  }
  if ("above" in predicate) {
    return [predicate.above[0]];
  }
  if ("below" in predicate) {
    return [predicate.below[0]];
  }
  if ("has" in predicate) {
    return [];
  }
  if ("all" in predicate) {
    return predicate.all.flatMap(pathsRead);
  }
  if ("any" in predicate) {
    return predicate.any.flatMap(pathsRead);
  }
  return pathsRead(predicate.not);
}
