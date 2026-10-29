const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const dpr = devicePixelRatio;
const offscreen = canvas.transferControlToOffscreen();
offscreen.width = Math.round(canvas.clientWidth * dpr);
offscreen.height = Math.round(canvas.clientHeight * dpr);

const worker = new Worker(new URL("./engine-worker.ts", import.meta.url), {
  type: "module",
});
worker.postMessage({ type: "init", canvas: offscreen }, [offscreen]);
worker.onmessage = (event: MessageEvent<{ type: string; text: string }>) => {
  document.querySelector("#stats")!.textContent = event.data.text;
};

document.querySelector("#block")!.addEventListener("click", () => {
  const until = performance.now() + 3000;
  while (performance.now() < until) {
    // Busy-wait: the main thread cannot run any frame callbacks.
  }
});
