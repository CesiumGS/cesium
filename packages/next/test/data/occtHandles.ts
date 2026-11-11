// Counts the embind handles a piece of code leaves alive (plan §13.33): wraps
// the OCCT module so every object it hands out that has a `delete` is
// recorded, and removed again by that `delete`. A heap's size can't show a
// leak here, as embind frees a forgotten handle once the JS garbage
// collector gets to it; this shows it at once.

interface Handle {
  delete(): void;
}

const isHandle = (v: unknown): v is Handle =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Partial<Handle>).delete === "function";

/** The module wrapped, and how many of its handles are alive, with their creators for a report. */
export function trackHandles<T extends object>(
  oc: T,
): { module: T; live(): number; describe(): string[] } {
  const live = new Map<object, string>();
  const proxies = new WeakMap<object, unknown>();

  const wrapResult = (value: unknown, origin: string): unknown => {
    if (isHandle(value)) {
      live.set(value, origin);
      return new Proxy(value, {
        get(target, key) {
          if (key === "delete") {
            return () => {
              live.delete(target);
              target.delete();
            };
          }
          const member = Reflect.get(target, key) as unknown;
          return typeof member === "function"
            ? (...args: unknown[]) =>
                wrapResult(
                  Reflect.apply(member, target, args),
                  `${origin}.${String(key)}`,
                )
            : member;
        },
      });
    }
    // A call with several results: { returnValue, First, Last }.
    if (
      typeof value === "object" &&
      value !== null &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      const record = value as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        record[key] = wrapResult(record[key], `${origin}.${key}`);
      }
    }
    return value;
  };

  // A class or a bag of static functions: its constructors and calls hand out handles.
  const wrapClass = (target: object, name: string): unknown => {
    const cached = proxies.get(target);
    if (cached) {
      return cached;
    }
    const proxy = new Proxy(target, {
      construct: (t, args) =>
        wrapResult(
          Reflect.construct(t as never, args),
          `new ${name}`,
        ) as object,
      get(t, key) {
        const member = Reflect.get(t, key) as unknown;
        return typeof member === "function"
          ? (...args: unknown[]) =>
              wrapResult(
                Reflect.apply(member, t, args),
                `${name}.${String(key)}`,
              )
          : member;
      },
    });
    proxies.set(target, proxy);
    return proxy;
  };

  const module = new Proxy(oc, {
    get(target, key) {
      const member = Reflect.get(target, key) as unknown;
      return typeof member === "function"
        ? wrapClass(member, String(key))
        : member;
    },
  });
  return {
    module,
    live: () => live.size,
    describe: () => [...live.values()],
  };
}
