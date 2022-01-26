import buildModuleUrl from "./buildModuleUrl.js";
import Color from "./Color.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Resource from "./Resource.js";
import writeTextToCanvas from "./writeTextToCanvas.js";

/**
 * A utility class for generating custom map pins as canvas elements.
 * <br /><br />
 * <div align='center'>
 * <img src='Images/PinBuilder.png' width='500'/><br />
 * Example pins generated using both the maki icon set, which ships with Cesium, and single character text.
 * </div>
 *
 * @alias PinBuilder
 * @constructor
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Map%20Pins.html|Cesium Sandcastle PinBuilder Demo}
 */
function PinBuilder() {
  this._cache = {};
}

/**
 * Creates an empty pin of the specified color and size.
 *
 * @param {Color} color The color of the pin.
 * @param {Number} size The size of the pin, in pixels.
 * @returns {HTMLCanvasElement} The canvas element that represents the generated pin.
 */
PinBuilder.prototype.fromColor = function (color, size) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(color)) {
    throw new DeveloperError("color is required");
  }
  if (!defined(size)) {
    throw new DeveloperError("size is required");
  }
  //>>includeEnd('debug');
  return createPin(undefined, undefined, color, size, this._cache);
};

/**
 * Creates a pin with the specified icon, color, and size.
 *
 * @param {Resource|String} url The url of the image to be stamped onto the pin.
 * @param {Color} color The color of the pin.
 * @param {Number} size The size of the pin, in pixels.
 * @returns {HTMLCanvasElement|Promise.<HTMLCanvasElement>} The canvas element or a Promise to the canvas element that represents the generated pin.
 */
PinBuilder.prototype.fromUrl = function (url, color, size) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(url)) {
    throw new DeveloperError("url is required");
  }
  if (!defined(color)) {
    throw new DeveloperError("color is required");
  }
  if (!defined(size)) {
    throw new DeveloperError("size is required");
  }
  //>>includeEnd('debug');
  return createPin(url, undefined, color, size, this._cache);
};

/**
 * Creates a pin with the specified {@link https://www.mapbox.com/maki/|maki} icon identifier, color, and size.
 *
 * @param {String} id The id of the maki icon to be stamped onto the pin.
 * @param {Color} color The color of the pin.
 * @param {Number} size The size of the pin, in pixels.
 * @returns {HTMLCanvasElement|Promise.<HTMLCanvasElement>} The canvas element or a Promise to the canvas element that represents the generated pin.
 */
PinBuilder.prototype.fromMakiIconId = function (id, color, size) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(id)) {
    throw new DeveloperError("id is required");
  }
  if (!defined(color)) {
    throw new DeveloperError("color is required");
  }
  if (!defined(size)) {
    throw new DeveloperError("size is required");
  }
  //>>includeEnd('debug');
  return createPin(
    buildModuleUrl("Assets/Textures/maki/" + encodeURIComponent(id) + ".png"),
    undefined,
    color,
    size,
    this._cache
  );
};

/**
 * Creates a pin with the specified text, color, and size.  The text will be sized to be as large as possible
 * while still being contained completely within the pin.
 *
 * @param {String} text The text to be stamped onto the pin.
 * @param {Color} color The color of the pin.
 * @param {Number} size The size of the pin, in pixels.
 * @returns {HTMLCanvasElement} The canvas element that represents the generated pin.
 */
PinBuilder.prototype.fromText = function (text, color, size) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(text)) {
    throw new DeveloperError("text is required");
  }
  if (!defined(color)) {
    throw new DeveloperError("color is required");
  }
  if (!defined(size)) {
    throw new DeveloperError("size is required");
  }
  //>>includeEnd('debug');

  return createPin(undefined, text, color, size, this._cache);
};

const colorScratch = new Color();

//This function (except for the 3 commented lines) was auto-generated from an online tool,
//http://www.professorcloud.com/svg-to-canvas/, using Assets/Textures/pin.svg as input.
//The reason we simply can't load and draw the SVG directly to the canvas is because
//it taints the canvas in Internet Explorer (and possibly some other browsers); making
//it impossible to create a WebGL texture from the result.
function drawPin(context2D, color, size) {
  context2D.save();
  context2D.scale(size / 24, size / 24); //Added to auto-generated code to scale up to desired size.
  context2D.fillStyle = color.toCssColorString(); //Modified from auto-generated code.
  context2D.strokeStyle = color.brighten(0.6, colorScratch).toCssColorString(); //Modified from auto-generated code.
  context2D.lineWidth = 0.846;
  context2D.beginPath();
  context2D.moveTo(6.72, 0.422);
  context2D.lineTo(17.28, 0.422);
  context2D.bezierCurveTo(18.553, 0.422, 19.577, 1.758, 19.577, 3.415);
  context2D.lineTo(19.577, 10.973);
  context2D.bezierCurveTo(19.577, 12.63, 18.553, 13.966, 17.282, 13.966);
  context2D.lineTo(14.386, 14.008);
  context2D.lineTo(11.826, 23.578);
  context2D.lineTo(9.614, 14.008);
  context2D.lineTo(6.719, 13.965);
  context2D.bezierCurveTo(5.446, 13.983, 4.422, 12.629, 4.422, 10.972);
  context2D.lineTo(4.422, 3.416);
  context2D.bezierCurveTo(4.423, 1.76, 5.447, 0.423, 6.718, 0.423);
  context2D.closePath();
  context2D.fill();
  context2D.stroke();
  context2D.restore();
}

//This function takes an image or canvas and uses it as a template
//to "stamp" the pin with a white image outlined in black.  The color
//values of the input image are ignored completely and only the alpha
//values are used.
function drawIcon(context2D, image, size) {
  //Size is the largest image that looks good inside of pin box.
  const imageSize = size / 2.5;
  let sizeX = imageSize;
  let sizeY = imageSize;

  if (image.width > image.height) {
    sizeY = imageSize * (image.height / image.width);
  } else if (image.width < image.height) {
    sizeX = imageSize * (image.width / image.height);
  }

  //x and y are the center of the pin box
  const x = Math.round((size - sizeX) / 2);
  const y = Math.round((7 / 24) * size - sizeY / 2);

  context2D.globalCompositeOperation = "destination-out";
  context2D.drawImage(image, x - 1, y, sizeX, sizeY);
  context2D.drawImage(image, x, y - 1, sizeX, sizeY);
  context2D.drawImage(image, x + 1, y, sizeX, sizeY);
  context2D.drawImage(image, x, y + 1, sizeX, sizeY);

  context2D.globalCompositeOperation = "destination-over";
  context2D.fillStyle = Color.BLACK.toCssColorString();
  context2D.fillRect(x - 1, y - 1, sizeX + 2, sizeY + 2);

  context2D.globalCompositeOperation = "destination-out";
  context2D.drawImage(image, x, y, sizeX, sizeY);

  context2D.globalCompositeOperation = "destination-over";
  context2D.fillStyle = Color.WHITE.toCssColorString();
  context2D.fillRect(x - 1, y - 2, sizeX + 2, sizeY + 2);
}

const stringifyScratch = new Array(4);
function createPin(url, label, color, size, cache) {
  //Use the parameters as a unique ID for caching.
  stringifyScratch[0] = url;
  stringifyScratch[1] = label;
  stringifyScratch[2] = color;
  stringifyScratch[3] = size;
  const id = JSON.stringify(stringifyScratch);

  const item = cache[id];
  if (defined(item)) {
    return item;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context2D = canvas.getContext("2d");
  drawPin(context2D, color, size);

  if (defined(url)) {
    const resource = Resource.createIfNeeded(url);

    //If we have an image url, load it and then stamp the pin.
    const promise = resource.fetchImage().then(function (image) {
      drawIcon(context2D, image, size);
      cache[id] = canvas;
      return canvas;
    });
    cache[id] = promise;
    return promise;
  } else if (defined(label)) {
    //If we have a label, write it to a canvas and then stamp the pin.
    const image = writeTextToCanvas(label, {
      font: "bold " + size + "px sans-serif",
    });
    drawIcon(context2D, image, size);
  }

  cache[id] = canvas;
  return canvas;
}
export default PinBuilder;
