import { defaultValue } from "@cesium/engine";

let canvasCount = 0;

function createCanvas(width, height) {
  width = defaultValue(width, 1);
  height = defaultValue(height, 1);

  const canvas = document.createElement("canvas");
  canvas.id = `canvas${canvasCount++}`;
  canvas.setAttribute("width", width);
  canvas.setAttribute("clientWidth", width);
  canvas.setAttribute("height", height);
  canvas.setAttribute("clientHeight", height);
  canvas.innerHTML =
    "To view this web page, upgrade your browser; it does not support the HTML5 canvas element.";
  document.body.appendChild(canvas);

  return canvas;
}
export default createCanvas;
