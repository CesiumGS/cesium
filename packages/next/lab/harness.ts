import "./harness.css";

/**
 * Test harness pages (parity checks, microbenchmarks, spikes), each one
 * module with two hosts: Dyno's Lab (`/#/lab/<id>`) mounts it in the app;
 * its own .html page mounts it alone, for the CLI runner (bench/run.mjs),
 * which opens the page with `?bench` and calls its entry function in a
 * page with nothing else on the main thread.
 */
export interface Harness {
  /**
   * Draws the page's markup into `root` and wires it up. `params` are
   * the page's options (the URL's query when standalone, the route's
   * search in Dyno). Returns the run function (also the runner's entry),
   * other functions the runner calls by name, and an optional teardown.
   */
  mount(root: HTMLElement, params: URLSearchParams): Mounted;
}

export interface Mounted {
  run: () => Promise<unknown>;
  /** More globals for the runner (`runLodReference`, …), standalone only. */
  entries?: Record<string, (...args: never[]) => unknown>;
  dispose?: () => void;
}

/** A harness page as Dyno lists it. */
export interface HarnessInfo {
  /** The route segment: /#/lab/<id>. */
  id: string;
  group: "parity" | "microbenchmarks" | "spikes";
  title: string;
  /** One or two sentences: what it checks or measures. */
  description: string;
  /** The standalone page (the runner's URL, without `?bench`). */
  page: string;
  /** The global the runner calls (`runModels`). */
  entry: string;
  /** Needs this repository's 1.x build (`/cesium1x/`) as a page global. */
  cesium1x?: boolean;
  /** The module, loaded when opened. */
  load: () => Promise<Harness>;
}

/**
 * Hosts a harness on its own page: mounts it in `#root`, exposes its run
 * function as the runner's entry, and, opened by hand (no `?bench`),
 * adds a Run button.
 */
export function standalone(harness: Harness, entry: string): void {
  const root = document.getElementById("root")!;
  root.classList.add("harness", "standalone");
  const params = new URLSearchParams(location.search);
  const { run, entries } = harness.mount(root, params);
  Object.assign(globalThis, { [entry]: run, ...entries });
  if (params.has("bench")) {
    return;
  }
  const status = root.querySelector<HTMLElement>(".status");
  const button = document.createElement("button");
  button.textContent = "Run";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await run();
    } catch (error) {
      if (status) {
        status.textContent = `error: ${error instanceof Error ? error.message : String(error)}`;
      }
    } finally {
      button.disabled = false;
    }
  });
  (status ?? root.firstElementChild ?? root).before(button);
}
