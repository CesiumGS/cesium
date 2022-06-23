import CesiumMath from "./Math";

function resizeImageToNextPowerOfTwo(image) {
  const canvas = document.createElement("canvas");
  canvas.width = CesiumMath.nextPowerOfTwo(image.width);
  canvas.height = CesiumMath.nextPowerOfTwo(image.height);
  const canvasContext = canvas.getContext("2d");
  canvasContext.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}
export default resizeImageToNextPowerOfTwo;
