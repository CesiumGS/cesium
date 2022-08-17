import Cartesian3 from "../Core/Cartesian3.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import loadKTX2 from "../Core/loadKTX2.js";
import PixelFormat from "../Core/PixelFormat.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import ComputeCommand from "../Renderer/ComputeCommand.js";
import CubeMap from "../Renderer/CubeMap.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import VertexArray from "../Renderer/VertexArray.js";
import OctahedralProjectionAtlasFS from "../Shaders/OctahedralProjectionAtlasFS.js";
import OctahedralProjectionFS from "../Shaders/OctahedralProjectionFS.js";
import OctahedralProjectionVS from "../Shaders/OctahedralProjectionVS.js";

/**
 * Packs all mip levels of a cube map into a 2D texture atlas.
 *
 * Octahedral projection is a way of putting the cube maps onto a 2D texture
 * with minimal distortion and easy look up.
 * See Chapter 16 of WebGL Insights "HDR Image-Based Lighting on the Web" by Jeff Russell
 * and "Octahedron Environment Maps" for reference.
 *
 * @private
 */
function OctahedralProjectedCubeMap(url) {
  this._url = url;

  this._cubeMapBuffers = undefined;
  this._cubeMaps = undefined;
  this._texture = undefined;
  this._mipTextures = undefined;
  this._va = undefined;
  this._sp = undefined;

  this._maximumMipmapLevel = undefined;

  this._loading = false;
  this._ready = false;

  const cubeMap = this;
  this._readyPromise = new Promise((resolve, reject) => {
    cubeMap._completeLoadFromCache = (cachedTexture) => {
      cleanupResources(this);
      this._texture = cachedTexture;
      this._maximumMipmapLevel = this._texture.maximumMipmapLevel;
      this._ready = true;
      resolve();
      return;
    };

    cubeMap._failLoad = (error) => {
      reject(error);
    };

    cubeMap._completeLoad = () => {
      this._ready = true;
      resolve();
    };
  });
}

Object.defineProperties(OctahedralProjectedCubeMap.prototype, {
  /**
   * The url to the KTX2 file containing the specular environment map and convoluted mipmaps.
   * @memberof OctahedralProjectedCubeMap.prototype
   * @type {String}
   * @readonly
   */
  url: {
    get: function () {
      return this._url;
    },
  },
  /**
   * A texture containing all the packed convolutions.
   * @memberof OctahedralProjectedCubeMap.prototype
   * @type {Texture}
   * @readonly
   */
  texture: {
    get: function () {
      return this._texture;
    },
  },
  /**
   * The maximum number of mip levels.
   * @memberOf OctahedralProjectedCubeMap.prototype
   * @type {Number}
   * @readonly
   */
  maximumMipmapLevel: {
    get: function () {
      return this._maximumMipmapLevel;
    },
  },
  /**
   * Determines if the texture atlas is complete and ready to use.
   * @memberof OctahedralProjectedCubeMap.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },
  /**
   * Gets a promise that resolves when the texture atlas is ready to use.
   * @memberof OctahedralProjectedCubeMap.prototype
   * @type {Promise<void>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

OctahedralProjectedCubeMap.isSupported = function (context) {
  return (
    (context.colorBufferHalfFloat && context.halfFloatingPointTexture) ||
    (context.floatingPointTexture && context.colorBufferFloat)
  );
};

// These vertices are based on figure 1 from "Octahedron Environment Maps".
const v1 = new Cartesian3(1.0, 0.0, 0.0);
const v2 = new Cartesian3(0.0, 0.0, 1.0);
const v3 = new Cartesian3(-1.0, 0.0, 0.0);
const v4 = new Cartesian3(0.0, 0.0, -1.0);
const v5 = new Cartesian3(0.0, 1.0, 0.0);
const v6 = new Cartesian3(0.0, -1.0, 0.0);

// top left, left, top, center, right, top right, bottom, bottom left, bottom right
const cubeMapCoordinates = [v5, v3, v2, v6, v1, v5, v4, v5, v5];
const length = cubeMapCoordinates.length;
const flatCubeMapCoordinates = new Float32Array(length * 3);

let offset = 0;
for (let i = 0; i < length; ++i, offset += 3) {
  Cartesian3.pack(cubeMapCoordinates[i], flatCubeMapCoordinates, offset);
}

const flatPositions = new Float32Array([
  -1.0,
  1.0, // top left
  -1.0,
  0.0, // left
  0.0,
  1.0, // top
  0.0,
  0.0, // center
  1.0,
  0.0, // right
  1.0,
  1.0, // top right
  0.0,
  -1.0, // bottom
  -1.0,
  -1.0, // bottom left
  1.0,
  -1.0, // bottom right
]);
const indices = new Uint16Array([
  0,
  1,
  2, // top left, left, top,
  2,
  3,
  1, // top, center, left,
  7,
  6,
  1, // bottom left, bottom, left,
  3,
  6,
  1, // center, bottom, left,
  2,
  5,
  4, // top, top right, right,
  3,
  4,
  2, // center, right, top,
  4,
  8,
  6, // right, bottom right, bottom,
  3,
  4,
  6, //center, right, bottom
]);

function createVertexArray(context) {
  const positionBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: flatPositions,
    usage: BufferUsage.STATIC_DRAW,
  });
  const cubeMapCoordinatesBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: flatCubeMapCoordinates,
    usage: BufferUsage.STATIC_DRAW,
  });
  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: indices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.UNSIGNED_SHORT,
  });

  const attributes = [
    {
      index: 0,
      vertexBuffer: positionBuffer,
      componentsPerAttribute: 2,
      componentDatatype: ComponentDatatype.FLOAT,
    },
    {
      index: 1,
      vertexBuffer: cubeMapCoordinatesBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
    },
  ];
  return new VertexArray({
    context: context,
    attributes: attributes,
    indexBuffer: indexBuffer,
  });
}

function createUniformTexture(texture) {
  return function () {
    return texture;
  };
}

function cleanupResources(map) {
  map._va = map._va && map._va.destroy();
  map._sp = map._sp && map._sp.destroy();

  let i;
  let length;

  const cubeMaps = map._cubeMaps;
  if (defined(cubeMaps)) {
    length = cubeMaps.length;
    for (i = 0; i < length; ++i) {
      cubeMaps[i].destroy();
    }
  }
  const mipTextures = map._mipTextures;
  if (defined(mipTextures)) {
    length = mipTextures.length;
    for (i = 0; i < length; ++i) {
      mipTextures[i].destroy();
    }
  }

  map._va = undefined;
  map._sp = undefined;
  map._cubeMaps = undefined;
  map._cubeMapBuffers = undefined;
  map._mipTextures = undefined;
}

/**
 * Creates compute commands to generate octahedral projections of each cube map
 * and then renders them to an atlas.
 * <p>
 * Only needs to be called twice. The first call queues the compute commands to generate the atlas.
 * The second call cleans up unused resources. Every call afterwards is a no-op.
 * </p>
 *
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
OctahedralProjectedCubeMap.prototype.update = function (frameState) {
  const context = frameState.context;

  if (!OctahedralProjectedCubeMap.isSupported(context)) {
    return;
  }

  if (defined(this._texture) && defined(this._va)) {
    cleanupResources(this);
  }
  if (defined(this._texture)) {
    return;
  }

  if (!defined(this._texture) && !this._loading) {
    const cachedTexture = frameState.context.textureCache.getTexture(this._url);
    if (defined(cachedTexture)) {
      this._completeLoadFromCache(cachedTexture);
    }
  }

  const cubeMapBuffers = this._cubeMapBuffers;
  if (!defined(cubeMapBuffers) && !this._loading) {
    const that = this;
    loadKTX2(this._url)
      .then(function (buffers) {
        that._cubeMapBuffers = buffers;
        that._loading = false;
      })
      .catch(function (e) {
        that._failLoad(e);
      });
    this._loading = true;
  }

  if (!defined(this._cubeMapBuffers)) {
    return;
  }

  const defines = [];
  // Datatype is defined if it is a normalized type (i.e. ..._UNORM, ..._SFLOAT)
  let pixelDatatype = cubeMapBuffers[0].positiveX.pixelDatatype;
  if (!defined(pixelDatatype)) {
    pixelDatatype = context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT;
  } else {
    defines.push("RGBA_NORMALIZED");
  }
  const pixelFormat = PixelFormat.RGBA;

  const fs = new ShaderSource({
    defines: defines,
    sources: [OctahedralProjectionFS],
  });

  this._va = createVertexArray(context);
  this._sp = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: OctahedralProjectionVS,
    fragmentShaderSource: fs,
    attributeLocations: {
      position: 0,
      cubeMapCoordinates: 1,
    },
  });

  // We only need up to 6 mip levels to avoid artifacts.
  const length = Math.min(cubeMapBuffers.length, 6);
  this._maximumMipmapLevel = length - 1;
  const cubeMaps = (this._cubeMaps = new Array(length));
  const mipTextures = (this._mipTextures = new Array(length));
  const originalSize = cubeMapBuffers[0].positiveX.width * 2.0;
  const uniformMap = {
    originalSize: function () {
      return originalSize;
    },
  };

  // First we project each cubemap onto a flat octahedron, and write that to a texture.
  for (let i = 0; i < length; ++i) {
    // Swap +Y/-Y faces since the octahedral projection expects this order.
    const positiveY = cubeMapBuffers[i].positiveY;
    cubeMapBuffers[i].positiveY = cubeMapBuffers[i].negativeY;
    cubeMapBuffers[i].negativeY = positiveY;

    const cubeMap = (cubeMaps[i] = new CubeMap({
      context: context,
      source: cubeMapBuffers[i],
      pixelDatatype: pixelDatatype,
    }));
    const size = cubeMaps[i].width * 2;

    const mipTexture = (mipTextures[i] = new Texture({
      context: context,
      width: size,
      height: size,
      pixelDatatype: pixelDatatype,
      pixelFormat: pixelFormat,
    }));

    const command = new ComputeCommand({
      vertexArray: this._va,
      shaderProgram: this._sp,
      uniformMap: {
        cubeMap: createUniformTexture(cubeMap),
      },
      outputTexture: mipTexture,
      persists: true,
      owner: this,
    });
    frameState.commandList.push(command);

    uniformMap[`texture${i}`] = createUniformTexture(mipTexture);
  }

  this._texture = new Texture({
    context: context,
    width: originalSize * 1.5 + 2.0, // We add a 1 pixel border to avoid linear sampling artifacts.
    height: originalSize,
    pixelDatatype: pixelDatatype,
    pixelFormat: pixelFormat,
  });

  this._texture.maximumMipmapLevel = this._maximumMipmapLevel;
  context.textureCache.addTexture(this._url, this._texture);

  const atlasCommand = new ComputeCommand({
    fragmentShaderSource: OctahedralProjectionAtlasFS,
    uniformMap: uniformMap,
    outputTexture: this._texture,
    persists: false,
    owner: this,
  });
  frameState.commandList.push(atlasCommand);

  this._completeLoad();
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see OctahedralProjectedCubeMap#destroy
 */
OctahedralProjectedCubeMap.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see OctahedralProjectedCubeMap#isDestroyed
 */
OctahedralProjectedCubeMap.prototype.destroy = function () {
  cleanupResources(this);
  this._texture = this._texture && this._texture.destroy();
  return destroyObject(this);
};
export default OctahedralProjectedCubeMap;
