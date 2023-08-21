/**
 * Constructs an image from a TypedArray of pixel values
 *
 * @param {Uint8Array} typedArray The array of pixel values
 * @param {number} width The width of the image to create
 * @param {number} height The height of the image to create
 * @returns {HTMLCanvasElement} A new canvas containing the constructed image
 *
 * @private
 */
function getImageFromTypedArray(typedArray, width, height) {
  // Input typedArray is Uint8Array, ImageData needs Uint8ClampedArray
  // To avoid copying, make a new DataView of the same buffer
  const dataArray = new Uint8ClampedArray(typedArray.buffer);
  const imageData = new ImageData(dataArray, width, height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").putImageData(imageData, 0, 0);

  return canvas;
}
export default getImageFromTypedArray;
