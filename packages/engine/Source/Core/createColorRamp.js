// @ts-check

/** @import Color from "./Color.js"; */

/**
 * Creates a color ramp that linearly interpolates between the given colors.
 *
 * @param {Color[]} colors The array of colors to use for the color ramp.
 * @param {number} rampLength The length (in number of samples) of the color ramp to create.
 * @returns {Uint8Array} A typed array representing the color ramp.
 *
 * @private
 */
function createColorRamp(colors, rampLength) {
  const ramp = document.createElement("canvas");
  ramp.width = rampLength;
  ramp.height = 1;
  const ctx = ramp.getContext("2d");
  const grd = ctx.createLinearGradient(0, 0, ramp.width, 0);

  const stepSize = 1 / (colors.length - 1);
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const stop = i * stepSize;
    const cssColor = color.toCssColorString();
    grd.addColorStop(stop, cssColor);
  }

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, ramp.width, ramp.height);

  const imageData = ctx.getImageData(0, 0, ramp.width, ramp.height);
  const array = new Uint8Array(imageData.data.buffer);
  return array;
}

export default createColorRamp;
