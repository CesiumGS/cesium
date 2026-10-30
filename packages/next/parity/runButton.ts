/**
 * Pages the benchmark runner drives (it adds `?bench` and calls their entry
 * function) can also be run by hand: opened without `?bench`, they get a Run
 * button that calls the same entry and shows its results in place.
 */
export function addRunButton(run: () => Promise<unknown>): void {
  if (new URLSearchParams(location.search).has("bench")) {
    return;
  }
  const status = document.querySelector<HTMLElement>("#status");
  const button = document.createElement("button");
  button.textContent = "Run";
  button.style.marginRight = "8px";
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
  if (status) {
    status.before(button);
    if (!status.textContent?.trim()) {
      status.textContent =
        "Press Run (the CLI runner runs this page with ?bench).";
    }
  } else {
    document.body.prepend(button);
  }
}
