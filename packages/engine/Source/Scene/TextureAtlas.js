import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import Texture from "../Renderer/Texture.js";

// The atlas is made up of regions of space called nodes that contain images or child nodes.
function TextureAtlasNode(
  bottomLeft,
  topRight,
  childNode1,
  childNode2,
  imageIndex,
) {
  this.bottomLeft = defaultValue(bottomLeft, Cartesian2.ZERO);
  this.topRight = defaultValue(topRight, Cartesian2.ZERO);
  this.childNode1 = childNode1;
  this.childNode2 = childNode2;
  this.imageIndex = imageIndex;
}

const defaultInitialSize = new Cartesian2(16.0, 16.0);

/**
 * A TextureAtlas stores multiple images in one square texture and keeps
 * track of the texture coordinates for each image. TextureAtlas is dynamic,
 * meaning new images can be added at any point in time.
 * Texture coordinates are subject to change if the texture atlas resizes, so it is
 * important to check {@link TextureAtlas#getGUID} before using old values.
 *
 * @alias TextureAtlas
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Scene} options.context The context in which the texture gets created.
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
  if (!defined(options.context)) {
    throw new DeveloperError("context is required.");
  }
  if (borderWidthInPixels < 0) {
    throw new DeveloperError(
      "borderWidthInPixels must be greater than or equal to zero.",
    );
  }
  if (initialSize.x < 1 || initialSize.y < 1) {
    throw new DeveloperError("initialSize must be greater than zero.");
  }
  //>>includeEnd('debug');

  this._context = options.context;
  this._pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
  this._borderWidthInPixels = borderWidthInPixels;
  this._textureCoordinates = [];
  this._guid = createGuid();
  this._idHash = {};
  this._indexHash = {};
  this._initialSize = initialSize;

  this._root = undefined;
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
   * An array of {@link BoundingRectangle} texture coordinate regions for all the images in the texture atlas.
   * The x and y values of the rectangle correspond to the bottom-left corner of the texture coordinate.
   * The coordinates are in the order that the corresponding images were added to the atlas.
   * @memberof TextureAtlas.prototype
   * @type {BoundingRectangle[]}
   */
  textureCoordinates: {
    get: function () {
      return this._textureCoordinates;
    },
  },

  /**
   * The texture that all of the images are being written to.
   * @memberof TextureAtlas.prototype
   * @type {Texture}
   */
  texture: {
    get: function () {
      if (!defined(this._texture)) {
        this._texture = new Texture({
          context: this._context,
          width: this._initialSize.x,
          height: this._initialSize.y,
          pixelFormat: this._pixelFormat,
        });
      }
      return this._texture;
    },
  },

  /**
   * The number of images in the texture atlas. This value increases
   * every time addImage or addImages is called.
   * Texture coordinates are subject to change if the texture atlas resizes, so it is
   * important to check {@link TextureAtlas#getGUID} before using old values.
   * @memberof TextureAtlas.prototype
   * @type {number}
   */
  numberOfImages: {
    get: function () {
      return this._textureCoordinates.length;
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

// Builds a larger texture and copies the old texture into the new one.
function resizeAtlas(textureAtlas, image) {
  const context = textureAtlas._context;
  const numImages = textureAtlas.numberOfImages;
  const scalingFactor = 2.0;
  const borderWidthInPixels = textureAtlas._borderWidthInPixels;
  if (numImages > 0) {
    const oldAtlasWidth = textureAtlas._texture.width;
    const oldAtlasHeight = textureAtlas._texture.height;
    const atlasWidth =
      scalingFactor * (oldAtlasWidth + image.width + borderWidthInPixels);
    const atlasHeight =
      scalingFactor * (oldAtlasHeight + image.height + borderWidthInPixels);
    const widthRatio = oldAtlasWidth / atlasWidth;
    const heightRatio = oldAtlasHeight / atlasHeight;

    // Create new node structure, putting the old root node in the bottom left.
    const nodeBottomRight = new TextureAtlasNode(
      new Cartesian2(oldAtlasWidth + borderWidthInPixels, borderWidthInPixels),
      new Cartesian2(atlasWidth, oldAtlasHeight),
    );
    const nodeBottomHalf = new TextureAtlasNode(
      new Cartesian2(),
      new Cartesian2(atlasWidth, oldAtlasHeight),
      textureAtlas._root,
      nodeBottomRight,
    );
    const nodeTopHalf = new TextureAtlasNode(
      new Cartesian2(borderWidthInPixels, oldAtlasHeight + borderWidthInPixels),
      new Cartesian2(atlasWidth, atlasHeight),
    );
    const nodeMain = new TextureAtlasNode(
      new Cartesian2(),
      new Cartesian2(atlasWidth, atlasHeight),
      nodeBottomHalf,
      nodeTopHalf,
    );

    // Resize texture coordinates.
    for (let i = 0; i < textureAtlas._textureCoordinates.length; i++) {
      const texCoord = textureAtlas._textureCoordinates[i];
      if (defined(texCoord)) {
        texCoord.x *= widthRatio;
        texCoord.y *= heightRatio;
        texCoord.width *= widthRatio;
        texCoord.height *= heightRatio;
      }
    }

    // Copy larger texture.
    const newTexture = new Texture({
      context: textureAtlas._context,
      width: atlasWidth,
      height: atlasHeight,
      pixelFormat: textureAtlas._pixelFormat,
    });

    const framebuffer = new Framebuffer({
      context: context,
      colorTextures: [textureAtlas._texture],
      destroyAttachments: false,
    });

    framebuffer._bind();
    newTexture.copyFromFramebuffer(0, 0, 0, 0, atlasWidth, atlasHeight);
    framebuffer._unBind();
    framebuffer.destroy();
    textureAtlas._texture =
      textureAtlas._texture && textureAtlas._texture.destroy();
    textureAtlas._texture = newTexture;
    textureAtlas._root = nodeMain;
  } else {
    // First image exceeds initialSize
    let initialWidth = scalingFactor * (image.width + 2 * borderWidthInPixels);
    let initialHeight =
      scalingFactor * (image.height + 2 * borderWidthInPixels);
    if (initialWidth < textureAtlas._initialSize.x) {
      initialWidth = textureAtlas._initialSize.x;
    }
    if (initialHeight < textureAtlas._initialSize.y) {
      initialHeight = textureAtlas._initialSize.y;
    }
    textureAtlas._texture =
      textureAtlas._texture && textureAtlas._texture.destroy();
    textureAtlas._texture = new Texture({
      context: textureAtlas._context,
      width: initialWidth,
      height: initialHeight,
      pixelFormat: textureAtlas._pixelFormat,
    });
    textureAtlas._root = new TextureAtlasNode(
      new Cartesian2(borderWidthInPixels, borderWidthInPixels),
      new Cartesian2(initialWidth, initialHeight),
    );
  }
}

// A recursive function that finds the best place to insert
// a new image based on existing image 'nodes'.
// Inspired by: http://blackpawn.com/texts/lightmaps/default.html
function findNode(textureAtlas, node, image) {
  if (!defined(node)) {
    return undefined;
  }

  // If a leaf node
  if (!defined(node.childNode1) && !defined(node.childNode2)) {
    // Node already contains an image, don't add to it.
    if (defined(node.imageIndex)) {
      return undefined;
    }

    const nodeWidth = node.topRight.x - node.bottomLeft.x;
    const nodeHeight = node.topRight.y - node.bottomLeft.y;
    const widthDifference = nodeWidth - image.width;
    const heightDifference = nodeHeight - image.height;

    // Node is smaller than the image.
    if (widthDifference < 0 || heightDifference < 0) {
      return undefined;
    }

    // If the node is the same size as the image, return the node
    if (widthDifference === 0 && heightDifference === 0) {
      return node;
    }

    // Vertical split (childNode1 = left half, childNode2 = right half).
    if (widthDifference > heightDifference) {
      node.childNode1 = new TextureAtlasNode(
        new Cartesian2(node.bottomLeft.x, node.bottomLeft.y),
        new Cartesian2(node.bottomLeft.x + image.width, node.topRight.y),
      );
      // Only make a second child if the border gives enough space.
      const childNode2BottomLeftX =
        node.bottomLeft.x + image.width + textureAtlas._borderWidthInPixels;
      if (childNode2BottomLeftX < node.topRight.x) {
        node.childNode2 = new TextureAtlasNode(
          new Cartesian2(childNode2BottomLeftX, node.bottomLeft.y),
          new Cartesian2(node.topRight.x, node.topRight.y),
        );
      }
    }
    // Horizontal split (childNode1 = bottom half, childNode2 = top half).
    else {
      node.childNode1 = new TextureAtlasNode(
        new Cartesian2(node.bottomLeft.x, node.bottomLeft.y),
        new Cartesian2(node.topRight.x, node.bottomLeft.y + image.height),
      );
      // Only make a second child if the border gives enough space.
      const childNode2BottomLeftY =
        node.bottomLeft.y + image.height + textureAtlas._borderWidthInPixels;
      if (childNode2BottomLeftY < node.topRight.y) {
        node.childNode2 = new TextureAtlasNode(
          new Cartesian2(node.bottomLeft.x, childNode2BottomLeftY),
          new Cartesian2(node.topRight.x, node.topRight.y),
        );
      }
    }
    return findNode(textureAtlas, node.childNode1, image);
  }

  // If not a leaf node
  return (
    findNode(textureAtlas, node.childNode1, image) ||
    findNode(textureAtlas, node.childNode2, image)
  );
}

// Adds image of given index to the texture atlas. Called from addImage and addImages.
function addImage(textureAtlas, image, index) {
  const node = findNode(textureAtlas, textureAtlas._root, image);
  if (defined(node)) {
    // Found a node that can hold the image.
    node.imageIndex = index;

    // Add texture coordinate and write to texture
    const atlasWidth = textureAtlas._texture.width;
    const atlasHeight = textureAtlas._texture.height;
    const nodeWidth = node.topRight.x - node.bottomLeft.x;
    const nodeHeight = node.topRight.y - node.bottomLeft.y;
    const x = node.bottomLeft.x / atlasWidth;
    const y = node.bottomLeft.y / atlasHeight;
    const w = nodeWidth / atlasWidth;
    const h = nodeHeight / atlasHeight;
    textureAtlas._textureCoordinates[index] = new BoundingRectangle(x, y, w, h);
    textureAtlas._texture.copyFrom({
      source: image,
      xOffset: node.bottomLeft.x,
      yOffset: node.bottomLeft.y,
    });
  } else {
    // No node found, must resize the texture atlas.
    resizeAtlas(textureAtlas, image);
    addImage(textureAtlas, image, index);
  }

  textureAtlas._guid = createGuid();
}

function getIndex(atlas, image) {
  if (!defined(atlas) || atlas.isDestroyed()) {
    return -1;
  }

  const index = atlas.numberOfImages;

  addImage(atlas, image, index);

  return index;
}

/**
 * If the image is already in the atlas, the existing index is returned. Otherwise, the result is undefined.
 *
 * @param {string} id An identifier to detect whether the image already exists in the atlas.
 * @returns {number|undefined} The image index, or undefined if the image does not exist in the atlas.
 */
TextureAtlas.prototype.getImageIndex = function (id) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(id)) {
    throw new DeveloperError("id is required.");
  }
  //>>includeEnd('debug');

  return this._indexHash[id];
};

/**
 * Adds an image to the atlas synchronously.  If the image is already in the atlas, the atlas is unchanged and
 * the existing index is used.
 *
 * @param {string} id An identifier to detect whether the image already exists in the atlas.
 * @param {HTMLImageElement|HTMLCanvasElement} image An image or canvas to add to the texture atlas.
 * @returns {number} The image index.
 */
TextureAtlas.prototype.addImageSync = function (id, image) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(id)) {
    throw new DeveloperError("id is required.");
  }
  if (!defined(image)) {
    throw new DeveloperError("image is required.");
  }
  //>>includeEnd('debug');

  let index = this._indexHash[id];
  if (defined(index)) {
    // we're already aware of this source
    return index;
  }

  index = getIndex(this, image);
  // store the promise
  this._idHash[id] = Promise.resolve(index);
  this._indexHash[id] = index;
  // but return the value synchronously
  return index;
};

/**
 * Adds an image to the atlas.  If the image is already in the atlas, the atlas is unchanged and
 * the existing index is used.
 *
 * @param {string} id An identifier to detect whether the image already exists in the atlas.
 * @param {HTMLImageElement|HTMLCanvasElement|string|Resource|Promise|TextureAtlas.CreateImageCallback} image An image or canvas to add to the texture atlas,
 *        or a URL to an Image, or a Promise for an image, or a function that creates an image.
 * @returns {Promise<number>} A Promise for the image index.
 */
TextureAtlas.prototype.addImage = function (id, image) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(id)) {
    throw new DeveloperError("id is required.");
  }
  if (!defined(image)) {
    throw new DeveloperError("image is required.");
  }
  //>>includeEnd('debug');

  let indexPromise = this._idHash[id];
  if (defined(indexPromise)) {
    // we're already aware of this source
    return indexPromise;
  }

  // not in atlas, create the promise for the index

  if (typeof image === "function") {
    // if image is a function, call it
    image = image(id);
    //>>includeStart('debug', pragmas.debug);
    if (!defined(image)) {
      throw new DeveloperError("image is required.");
    }
    //>>includeEnd('debug');
  } else if (typeof image === "string" || image instanceof Resource) {
    // Get a resource
    const resource = Resource.createIfNeeded(image);
    image = resource.fetchImage();
  }

  const that = this;
  indexPromise = Promise.resolve(image).then(function (image) {
    const index = getIndex(that, image);
    that._indexHash[id] = index;
    return index;
  });

  // store the promise
  this._idHash[id] = indexPromise;

  return indexPromise;
};

/**
 * Add a sub-region of an existing atlas image as additional image indices.
 *
 * @param {string} id The identifier of the existing image.
 * @param {BoundingRectangle} subRegion An {@link BoundingRectangle} sub-region measured in pixels from the bottom-left.
 *
 * @returns {Promise<number>} A Promise for the image index.
 */
TextureAtlas.prototype.addSubRegion = function (id, subRegion) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(id)) {
    throw new DeveloperError("id is required.");
  }
  if (!defined(subRegion)) {
    throw new DeveloperError("subRegion is required.");
  }
  //>>includeEnd('debug');

  const indexPromise = this._idHash[id];
  if (!defined(indexPromise)) {
    throw new RuntimeError(`image with id "${id}" not found in the atlas.`);
  }

  const that = this;
  return Promise.resolve(indexPromise).then(function (index) {
    if (index === -1) {
      // the atlas is destroyed
      return -1;
    }
    const atlasWidth = that._texture.width;
    const atlasHeight = that._texture.height;

    const baseRegion = that._textureCoordinates[index];
    const x = baseRegion.x + subRegion.x / atlasWidth;
    const y = baseRegion.y + subRegion.y / atlasHeight;
    const w = subRegion.width / atlasWidth;
    const h = subRegion.height / atlasHeight;
    const newIndex =
      that._textureCoordinates.push(new BoundingRectangle(x, y, w, h)) - 1;
    that._indexHash[id] = newIndex;

    that._guid = createGuid();

    return newIndex;
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
 *
 * @example
 * atlas = atlas && atlas.destroy();
 *
 * @see TextureAtlas#isDestroyed
 */
TextureAtlas.prototype.destroy = function () {
  this._texture = this._texture && this._texture.destroy();
  return destroyObject(this);
};

/**
 * A function that creates an image.
 * @callback TextureAtlas.CreateImageCallback
 * @param {string} id The identifier of the image to load.
 * @returns {HTMLImageElement|Promise<HTMLImageElement>} The image, or a promise that will resolve to an image.
 */
export default TextureAtlas;
