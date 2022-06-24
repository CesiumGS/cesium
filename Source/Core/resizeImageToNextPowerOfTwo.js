import CesiumMath from "./Math.js";

/**
 * Resizes an image to ensure both width and height are powers of 2.
 * NOTE: The input image is resampled larger, rather than padded.
 * The aspect ratio of the image will change
 *
 * @private
 * @param {HTMLImageElement|HTMLCanvasElement} image The image to be resized
 * @returns {HTMLCanvasElement} A new canvas with the resized image drawn to it
 */
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
