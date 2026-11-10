// Explicit resource management where the browser lacks it (Safari, as of
// 2026-11): `Symbol.dispose`, `Symbol.asyncDispose`, `SuppressedError` and
// `DisposableStack`. A no-op where they exist. Imported first by every module
// that defines a `[Symbol.dispose]` method or makes a `DisposableStack`, so a
// class's method key is the real symbol, not the string "undefined".
//
// The symbols are the registered ones (`Symbol.for("Symbol.dispose")`): the
// same ones the transform's `using` helper falls back to, so lowered `using`
// declarations and these methods agree.

const symbols = Symbol as unknown as Record<string, symbol | undefined>;
for (const name of ["dispose", "asyncDispose"] as const) {
  if (typeof symbols[name] !== "symbol") {
    Object.defineProperty(Symbol, name, {
      value: Symbol.for(`Symbol.${name}`),
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

const scope = globalThis as unknown as Record<string, unknown>;

if (typeof scope.SuppressedError !== "function") {
  /** An error thrown while disposing, with the one it replaced. */
  class SuppressedErrorShim extends Error {
    readonly error: unknown;
    readonly suppressed: unknown;
    constructor(error: unknown, suppressed: unknown, message?: string) {
      super(message ?? "An error was suppressed during disposal.");
      this.name = "SuppressedError";
      this.error = error;
      this.suppressed = suppressed;
    }
  }
  scope.SuppressedError = SuppressedErrorShim;
}

if (typeof scope.DisposableStack !== "function") {
  /** Resources disposed together, last added first (the proposal's `DisposableStack`). */
  class DisposableStackShim {
    #stack: (() => void)[] = [];
    #disposed = false;

    get disposed(): boolean {
      return this.#disposed;
    }

    /** Adds a disposable (or null or undefined, which it skips) and returns it. */
    use<T extends Disposable | null | undefined>(value: T): T {
      this.#check();
      if (value !== null && value !== undefined) {
        const dispose = (value as Disposable)[Symbol.dispose];
        if (typeof dispose !== "function") {
          throw new TypeError("DisposableStack.use: not disposable");
        }
        this.#stack.push(() => dispose.call(value));
      }
      return value;
    }

    /** Adds a value with its own dispose function, and returns the value. */
    adopt<T>(value: T, onDispose: (value: T) => void): T {
      this.#check();
      this.#stack.push(() => onDispose(value));
      return value;
    }

    /** Adds a function to call on dispose. */
    defer(onDispose: () => void): void {
      this.#check();
      this.#stack.push(onDispose);
    }

    /** Moves everything to a new stack, leaving this one disposed. */
    move(): DisposableStackShim {
      this.#check();
      const next = new DisposableStackShim();
      next.#stack = this.#stack;
      this.#stack = [];
      this.#disposed = true;
      return next;
    }

    /** Disposes everything, last added first; errors chain as `SuppressedError`. */
    dispose(): void {
      if (this.#disposed) {
        return;
      }
      this.#disposed = true;
      const stack = this.#stack;
      this.#stack = [];
      let failed = false;
      let error: unknown;
      for (let i = stack.length - 1; i >= 0; i--) {
        try {
          stack[i]!();
        } catch (e) {
          const Suppressed = scope.SuppressedError as new (
            error: unknown,
            suppressed: unknown,
          ) => Error;
          error = failed ? new Suppressed(e, error) : e;
          failed = true;
        }
      }
      if (failed) {
        throw error;
      }
    }

    [Symbol.dispose](): void {
      this.dispose();
    }

    #check(): void {
      if (this.#disposed) {
        throw new ReferenceError("DisposableStack: already disposed");
      }
    }
  }
  scope.DisposableStack = DisposableStackShim;
}

export {};
