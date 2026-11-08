import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
// ---
viewer.canvas.addEventListener("click", async (event) => {
  // A promise: the answer is read back from the GPU.
  const hit = await viewer.pick(event.offsetX, event.offsetY);
  console.log(hit?.properties);
});
