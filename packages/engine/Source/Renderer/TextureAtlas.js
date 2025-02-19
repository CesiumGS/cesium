import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import PixelFormat from "../Core/PixelFormat.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TexturePacker from "../Core/TexturePacker.js";
import Framebuffer from "./Framebuffer.js";
import Texture from "./Texture.js";

const defaultInitialSize = Object.freeze(new Cartesian2(16.0, 16.0));

/**
 * A TextureAtlas stores multiple images in one square texture and keeps
 * track of the texture coordinates for each image. TextureAtlas is dynamic,
 * meaning new images can be added at any point in time.
 * Texture coordinates are subject to change if the texture atlas resizes, so it is
 * important to check {@link TextureAtlas#guid} before using old values.
 *
 * @alias TextureAtlas
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGBA] The pixel format of the texture.
 * @param {number} [options.borderWidthInPixels=1] The amount of spacing between adjacent images in pixels.
 * @param {Cartesian2} [options.initialSize=new Cartesian2(16.0, 16.0)] The initial side lengths of the texture.
 *
 * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
 * @exception {DeveloperError} initialSize must be greater than zero.
 *
 * @private
 */
function TextureAtlas(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const borderWidthInPixels = defaultValue(options.borderWidthInPixels, 1.0);
  const initialSize = defaultValue(options.initialSize, defaultInitialSize);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals(
    "options.borderWidthInPixels",
    borderWidthInPixels,
    0,
  );
  Check.typeOf.number.greaterThan("options.initialSize.x", initialSize.x, 0);
  Check.typeOf.number.greaterThan("options.initialSize.y", initialSize.y, 0);
  //>>includeEnd('debug');

  this._pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
  this._borderWidthInPixels = borderWidthInPixels;
  this._initialSize = initialSize;

  this._texturePacker = undefined;
  this._rectangles = [];
  this._subRegions = {};
  this._guid = createGuid();

  this._imagesToAddQueue = [];
  this._imagesToRemoveQueue = [];
  this._indexById = {};
  this._indexPromiseById = {};
  this._nextIndex = 0;
}

Object.defineProperties(TextureAtlas.prototype, {
  /**
   * The amount of spacing between adjacent images in pixels.
   * @memberof TextureAtlas.prototype
   * @type {number}
   */
  borderWidthInPixels: {
    get: function () {
      return this._borderWidthInPixels;
    },
  },

  /**
   * An array of {@link BoundingRectangle} pixel offset and dimensions for all the images in the texture atlas.
   * The x and y values of the rectangle correspond to the bottom-left corner of the texture coordinate.
   * The coordinates are in the order that the corresponding images were added to the atlas.
   * @memberof TextureAtlas.prototype
   * @type {BoundingRectangle[]}
   */
  rectangles: {
    get: function () {
      return this._rectangles;
    },
  },

  /**
   * The texture that all of the images are being written to. The value will be <code>undefined</code> until the first update.
   * @memberof TextureAtlas.prototype
   * @type {Texture|undefined}
   */
  texture: {
    get: function () {
      return this._texture;
    },
  },

  /**
   * The pixel format of the texture.
   * @memberof TextureAtlas.prototype
   * @type {PixelFormat}
   * @default PixelFormat.RGBA
   */
  pixelFormat: {
    get: function () {
      return this._pixelFormat;
    },
  },

  /**
   * The number of images in the texture atlas. This value increases
   * every time addImage or addImages is called.
   * Texture coordinates are subject to change if the texture atlas resizes, so it is
   * important to check {@link TextureAtlas#guid} before using old values.
   * @memberof TextureAtlas.prototype
   * @type {number}
   */
  numberOfImages: {
    get: function () {
      return this._nextIndex;
    },
  },

  /**
   * The atlas' globally unique identifier (GUID).
   * The GUID changes whenever the texture atlas is modified.
   * Classes that use a texture atlas should check if the GUID
   * has changed before processing the atlas data.
   * @memberof TextureAtlas.prototype
   * @type {string}
   */
  guid: {
    get: function () {
      return this._guid;
    },
  },
});

/**
 * Get texture coordinate for reading on the GPU.
 * @param {number} index
 * @param {BoundingRectangle} [result]
 * @return {BoundingRectangle}
 *
 * @example
 * const index = await atlas.addImage("myImage", image);
 * const rectangle = atlas.computeTextureCoordinates(index);
 * BoundingRectangle.pack(rectangle, bufferView);
 */
TextureAtlas.prototype.computeTextureCoordinates = function (index, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  //>>includeEnd('debug');

  const texture = this._texture;
  const rectangle = this._rectangles[index];

  if (!defined(result)) {
    result = new BoundingRectangle();
  }

  const atlasWidth = texture.width;
  const atlasHeight = texture.height;

  const width = rectangle.width;
  const height = rectangle.height;
  let x = rectangle.x;
  let y = rectangle.y;

  const parentIndex = this._subRegions[index];
  if (defined(parentIndex)) {
    const parentRectangle = this._rectangles[parentIndex];

    x += parentRectangle.x;
    y += parentRectangle.y;
  }

  result.x = x / atlasWidth;
  result.y = y / atlasHeight;
  result.width = width / atlasWidth;
  result.height = height / atlasHeight;

  return result;
};

/**
 * Perform a WebGL texture copy for each existing image from its previous packed position to its new packed position in the new texture.
 * @param {Context} context The rendering context
 * @param {number} width The pixel width of the texture
 * @param {number} height The pixel height of the texture
 * @param {BoundingRectangle[]} rectangles The packed bounding rectangles for the reszied texture
 * @param {number} queueOffset Index of the last queued item that was successfully packed
 */
TextureAtlas.prototype._copyFromTexture = function (
  context,
  width,
  height,
  rectangles,
  queueOffset,
) {
  const pixelFormat = this._pixelFormat;
  const newTexture = new Texture({
    context,
    height,
    width,
    pixelFormat,
  });

  // Some rectangles may have been packed but are not yet stored in the texture
  const oldRectangles = this.rectangles;
  const copyCount = oldRectangles.length - queueOffset;
  if (copyCount === 0) {
    // No images exist in the texture which need copying
    newTexture._initialized = true;
    return newTexture;
  }

  const gl = context._gl;
  const target = newTexture._textureTarget;

  const oldTexture = this._texture;
  const framebuffer = new Framebuffer({
    context,
    colorTextures: [oldTexture],
    destroyAttachments: false,
  });

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, newTexture._texture);

  framebuffer._bind();

  // Copy any textures from the old atlas to its new position in the new atlas
  const subRegions = this._subRegions;
  for (let index = 0; index < copyCount; ++index) {
    const rectangle = rectangles[index];
    const frameBufferOffset = oldRectangles[index];

    if (
      !defined(rectangle) ||
      !defined(frameBufferOffset) ||
      defined(subRegions[index]) // The rectangle corresponds to a subregion of a parent image
    ) {
      continue;
    }

    const { x, y, width, height } = rectangle;
    gl.copyTexSubImage2D(
      target,
      0,
      x,
      y,
      frameBufferOffset.x,
      frameBufferOffset.y,
      width,
      height,
    );
  }

  gl.bindTexture(target, null);
  newTexture._initialized = true;

  framebuffer._unBind();
  framebuffer.destroy();

  return newTexture;
};

/**
 * Recreates the texture atlas texture with new dimensions and repacks images as needed.
 * @param {Context} context The rendering context
 * @param {number}[queueOffset = 0] Index of the last queued item that was successfully packed
 */
TextureAtlas.prototype._resize = function (context, queueOffset = 0) {
  const borderPadding = this._borderWidthInPixels;
  const oldRectangles = this._rectangles;
  const queue = this._imagesToAddQueue;

  const oldTexture = this._texture;
  let width = oldTexture.width;
  let height = oldTexture.height;

  let areaRemoved = 0;
  const indexesToRemove = this._imagesToRemoveQueue;
  for (const index of indexesToRemove) {
    const { height, width } = oldRectangles[index];
    areaRemoved += height * width;
    oldRectangles[index] = undefined;
  }
  indexesToRemove.length = 0;

  // Get the rectangles (width and height) of the current set of images
  const toPack = oldRectangles.filter(defined).map((image, index) => {
    return new AddImageRequest({ index, image });
  });

  // Add the new set of images
  let maxWidth = 0;
  let maxHeight = 0;
  let areaQueued = 0;
  for (let i = queueOffset; i < queue.length; ++i) {
    const { width, height } = queue[i].image;
    maxWidth = Math.max(maxWidth, width);
    maxHeight = Math.max(maxHeight, height);
    areaQueued += width * height;
    toPack.push(queue[i]);
  }

  // At minimum, the texture will need to scale to accomodate the largest width and height
  width = Math.max(maxWidth, width);
  height = Math.max(maxHeight, height);

  // Determine by what factor the texture need to be sclaed by at minimum
  const areaDifference = Math.max(areaQueued - areaRemoved, 0);
  let scalingFactor = 1.0;
  while (areaDifference / width / height >= 1.0) {
    scalingFactor *= 2.0;

    // Resize by one dimension
    if (width > height) {
      height *= scalingFactor;
    } else {
      width *= scalingFactor;
    }
  }

  toPack.sort(
    ({ image: imageA }, { image: imageB }) =>
      imageB.height * imageB.width - imageA.height * imageA.width,
  );

  const subRegions = this._subRegions;
  const newRectangles = [];
  let texturePacker;
  while (newRectangles.length === 0) {
    texturePacker = new TexturePacker({ height, width, borderPadding });

    for (let i = 0; i < toPack.length; ++i) {
      const { index, image } = toPack[i];
      if (!defined(image)) {
        continue;
      }

      // Subregions are specified relative to their parents
      // There's no need to update them
      if (defined(subRegions[index])) {
        newRectangles[index] = oldRectangles[index];
        continue;
      }

      const repackedNode = texturePacker.pack(index, image);
      if (!defined(repackedNode)) {
        // Could not fit everything into the new texture.
        // Scale texture size and try again
        if (width > height) {
          // Resize height
          height *= 2.0;
        } else {
          // Resize width
          width *= 2.0;
        }

        newRectangles.length = 0;
        break;
      }

      newRectangles[index] = repackedNode.rectangle;
    }
  }

  this._texturePacker = texturePacker;
  this._texture = this._copyFromTexture(
    context,
    width,
    height,
    newRectangles,
    queueOffset,
  );

  oldTexture.destroy();

  this._rectangles = newRectangles;
  this._guid = createGuid();
};

/**
 * Return the index of the image region for the specified ID. If the image is already in the atlas, the existing index is returned. Otherwise, the result is undefined.
 * @param {string} id An identifier to detect whether the image already exists in the atlas.
 * @returns {number|undefined} The image index, or undefined if the image does not exist in the atlas.
 */
TextureAtlas.prototype.getImageIndex = function (id) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("id", id);
  //>>includeEnd('debug');

  return this._indexById[id];
};

/**
 * Copy image data into the underlying texture atlas.
 * @param {AddImageRequest} imageRequest The data needed to resolve the call to addImage in the queue
 */
TextureAtlas.prototype._copyImageToTexture = function ({
  index,
  image,
  resolve,
  reject,
}) {
  const texture = this._texture;
  const rectangle = this._rectangles[index];

  try {
    texture.copyFrom({
      source: image,
      xOffset: rectangle.x,
      yOffset: rectangle.y,
    });

    if (defined(resolve)) {
      resolve(index);
    }
  } catch (e) {
    if (defined(reject)) {
      reject(e);
      return;
    }

    throw e;
  }
};

/**
 * @private
 * Info needed to add a queued image to the texture atlas when update operatons are executed, typically at the end of a frame.
 * @constructor
 * @param {object} options Object with the following properties:
 * @param {number} options.index An identifier
 * @param {TexturePacker.PackableObject} options.image An object, such as an <code>Image</code> with <code>width</code> and <code>height</code> properties in pixels
 * @param {function} options.resolve The promise resolver
 * @param {function} options.reject The promise rejecter
 */
function AddImageRequest({ index, image, resolve, reject }) {
  this.index = index;
  this.image = image;
  this.resolve = resolve;
  this.reject = reject;
  this.rectangle = undefined;
}

/**
 * Adds an image to the queue for this frame.
 * The image will be copied to the texture at the end of the frame, resizing the texture if needed.
 *
 * @private
 * @param {number} index An identifier
 * @param {TexturePacker.PackableObject} image An object, such as an <code>Image</code> with <code>width</code> and <code>height</code> properties in pixels
 * @returns {Promise<number>} Promise which resolves to the image index once the image has been added, or rejects if there was an error. The promise resolves to <code>-1</code> if the texture atlas is destoyed in the interim.
 */
TextureAtlas.prototype._addImage = function (index, image) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.defined("image", image);
  //>>includeEnd('debug');

  return new Promise((resolve, reject) => {
    this._imagesToAddQueue.push(
      new AddImageRequest({
        index,
        image,
        resolve,
        reject,
      }),
    );

    this._imagesToAddQueue.sort(
      ({ image: imageA }, { image: imageB }) =>
        imageB.height * imageB.width - imageA.height * imageA.width,
    );
  });
};

/**
 * Process the image queue for this frame, copying to the texture atlas and resizing the texture as needed.
 * @param {Context} context The rendering context
 * @return {boolean} true if the texture was updated this frame
 */
TextureAtlas.prototype._processImageQueue = function (context) {
  const queue = this._imagesToAddQueue;
  if (queue.length === 0) {
    return false;
  }

  let error;
  for (let i = 0; i < queue.length; ++i) {
    const imageRequest = queue[i];
    const { image, index } = imageRequest;
    const node = this._texturePacker.pack(index, image);
    if (!defined(node)) {
      // Atlas cannot fit all images in the queue
      // Bail early and resize
      try {
        this._resize(context, i);
      } catch (e) {
        error = e;
      }
      break;
    }
    this._rectangles[index] = node.rectangle;
  }

  for (let i = 0; i < queue.length; ++i) {
    if (defined(error)) {
      queue[i].reject(error);
      continue;
    }

    this._copyImageToTexture(queue[i]);
  }

  queue.length = 0;
  return true;
};

/**
 * Processes any updates queued this frame, and updates rendering resources accordingly. Call before or after a frame has been rendered to avoid any race conditions for any dependant render commands.
 * @param {Context} context The rendering context
 * @return {boolean} true if rendering resources were updated.
 */
TextureAtlas.prototype.update = function (context) {
  if (!defined(this._texture)) {
    const width = this._initialSize.x;
    const height = this._initialSize.y;
    const pixelFormat = this._pixelFormat;
    const borderPadding = this._borderWidthInPixels;

    this._texture = new Texture({
      context,
      width,
      height,
      pixelFormat,
    });

    this._texturePacker = new TexturePacker({
      height,
      width,
      borderPadding,
    });
  }

  return this._processImageQueue(context);
};

async function resolveImage(image, id) {
  if (typeof image === "function") {
    image = image(id);
  }

  if (typeof image === "string" || image instanceof Resource) {
    // Fetch the resource
    const resource = Resource.createIfNeeded(image);
    image = resource.fetchImage();
  }

  return image;
}

/**
 * Adds an image to the atlas.  If the image is already in the atlas, the atlas is unchanged and
 * the existing index is used.
 *
 * @param {string} id An identifier to detect whether the image already exists in the atlas.
 * @param {HTMLImageElement|HTMLCanvasElement|string|Resource|Promise|TextureAtlas.CreateImageCallback} image An image or canvas to add to the texture atlas,
 *        or a URL to an Image, or a Promise for an image, or a function that creates an image.
 * @returns {Promise<number>} A Promise that resolves to the image region index. -1 is returned if resouces are in the process of being destroyed.
 */
TextureAtlas.prototype.addImage = function (id, image) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("id", id);
  Check.defined("image", image);
  //>>includeEnd('debug');

  let promise = this._indexPromiseById[id];
  if (defined(promise)) {
    // This image has already been added
    return promise;
  }

  const index = this._nextIndex++;
  this._lastIndex = index;
  this._indexById[id] = index;

  const resolveAndAddImage = async () => {
    image = await resolveImage(image, id);
    //>>includeStart('debug', pragmas.debug);
    Check.defined("image", image);
    //>>includeEnd('debug');

    if (this.isDestroyed()) {
      return -1;
    }

    return this._addImage(index, image);
  };

  promise = resolveAndAddImage();
  this._indexPromiseById[id] = promise;
  return promise;
};

/**
 * Add a sub-region of an existing atlas image as additional image indices.
 *
 * @param {string} id The identifier of the existing image.
 * @param {BoundingRectangle} subRegion An {@link BoundingRectangle} defining a region of an existing image, measured in pixels from the bottom-left of the image.
 * @returns {Promise<number>} A Promise that resolves to the image region index. -1 is returned if resouces are in the process of being destroyed.
 */
TextureAtlas.prototype.addImageSubRegion = function (id, subRegion) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("id", id);
  Check.defined("subRegion", subRegion);
  //>>includeEnd('debug');

  const indexPromise = this._indexPromiseById[id];
  if (!defined(indexPromise)) {
    throw new RuntimeError(`image with id "${id}" not found in the atlas.`);
  }

  const index = this._nextIndex++;
  this._lastIndex = index;

  return indexPromise.then((imageIndex) => {
    if (imageIndex === -1) {
      // The atlas has been destroyed
      return -1;
    }

    const rectangle = this._rectangles[imageIndex];

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.lessThanOrEquals(
      "subRegion.x",
      subRegion.x,
      rectangle.width,
    );
    Check.typeOf.number.lessThanOrEquals(
      "subRegion.x + subRegion.width",
      subRegion.x + subRegion.width,
      rectangle.width,
    );
    Check.typeOf.number.lessThanOrEquals(
      "subRegion.y",
      subRegion.y,
      rectangle.height,
    );
    Check.typeOf.number.lessThanOrEquals(
      "subRegion.y + subRegion.height",
      subRegion.y + subRegion.height,
      rectangle.height,
    );
    //>>includeEnd('debug');

    const x = rectangle.x + subRegion.x;
    const y = rectangle.y + subRegion.y;
    const w = subRegion.width;
    const h = subRegion.height;
    this._rectangles[index] = new BoundingRectangle(x, y, w, h);

    this._subRegions[index] = imageIndex;

    return index;
  });
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see TextureAtlas#destroy
 */
TextureAtlas.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * atlas = atlas && atlas.destroy();
 *
 * @see TextureAtlas#isDestroyed
 */
TextureAtlas.prototype.destroy = function () {
  this._texture = this._texture && this._texture.destroy();
  this._imagesToAddQueue.forEach(({ resolve }) => resolve(-1));

  return destroyObject(this);
};

/**
 * A function that creates an image.
 * @callback TextureAtlas.CreateImageCallback
 * @param {string} id The identifier of the image to load.
 * @returns {HTMLImageElement|Promise<HTMLImageElement>} The image, or a promise that will resolve to an image.
 */
export default TextureAtlas;
