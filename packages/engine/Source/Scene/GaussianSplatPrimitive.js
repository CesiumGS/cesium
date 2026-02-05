import Frozen from "../Core/Frozen.js";
import Matrix4 from "../Core/Matrix4.js";
import ModelUtility from "./Model/ModelUtility.js";
import GaussianSplatSorter from "./GaussianSplatSorter.js";
import GaussianSplatTextureGenerator from "./GaussianSplatTextureGenerator.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import GaussianSplatRenderResources from "./GaussianSplatRenderResources.js";
import BlendingState from "./BlendingState.js";
import Pass from "../Renderer/Pass.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../Shaders/PrimitiveGaussianSplatVS.js";
import GaussianSplatFS from "../Shaders/PrimitiveGaussianSplatFS.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Geometry from "../Core/Geometry.js";
import GeometryAttribute from "../Core/GeometryAttribute.js";
import VertexArray from "../Renderer/VertexArray.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import RenderState from "../Renderer/RenderState.js";
import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import Axis from "./Axis.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Quaternion from "../Core/Quaternion.js";
import SplitDirection from "./SplitDirection.js";
import destroyObject from "../Core/destroyObject.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import Transforms from "../Core/Transforms.js";

const scratchMatrix4A = new Matrix4();
const scratchMatrix4B = new Matrix4();
const scratchMatrix4C = new Matrix4();
const scratchMatrix4D = new Matrix4();

const GaussianSplatSortingState = {
  IDLE: 0,
  WAITING: 1,
  SORTING: 2,
  SORTED: 3,
  ERROR: 4,
};

const SnapshotState = {
  BUILDING: "BUILDING",
  TEXTURE_PENDING: "TEXTURE_PENDING",
  TEXTURE_READY: "TEXTURE_READY",
  SORTING: "SORTING",
  READY: "READY",
};

function haveSelectedTilesChanged(primitive, selectedTiles) {
  const prevSet = primitive._selectedTileSet;
  if (!defined(prevSet) || prevSet.size !== selectedTiles.length) {
    return true;
  }

  for (let i = 0; i < selectedTiles.length; i++) {
    if (!prevSet.has(selectedTiles[i])) {
      return true;
    }
  }

  return false;
}

function isActiveSort(primitive, activeSort) {
  return (
    defined(activeSort) &&
    activeSort.requestId === primitive._sortRequestId &&
    activeSort.dataGeneration === primitive._splatDataGeneration
  );
}

function destroySnapshotTextures(snapshot) {
  if (!defined(snapshot)) {
    return;
  }
  if (defined(snapshot.gaussianSplatTexture)) {
    snapshot.gaussianSplatTexture.destroy();
    snapshot.gaussianSplatTexture = undefined;
  }
  if (defined(snapshot.sphericalHarmonicsTexture)) {
    snapshot.sphericalHarmonicsTexture.destroy();
    snapshot.sphericalHarmonicsTexture = undefined;
  }
}

function retireTexture(primitive, texture, frameNumber) {
  if (!defined(texture)) {
    return;
  }
  const retired = primitive._retiredTextures;
  retired.push({
    texture: texture,
    frameNumber: frameNumber,
  });
}

function releaseRetiredTextures(primitive, frameNumber) {
  const retired = primitive._retiredTextures;
  if (!defined(retired) || retired.length === 0) {
    return;
  }
  const next = [];
  for (let i = 0; i < retired.length; i++) {
    const entry = retired[i];
    if (frameNumber - entry.frameNumber > 0) {
      entry.texture.destroy();
    } else {
      next.push(entry);
    }
  }
  primitive._retiredTextures = next;
}

function commitSnapshot(primitive, snapshot, frameState) {
  if (!defined(snapshot.indexes) || snapshot.state !== SnapshotState.READY) {
    throw new DeveloperError("Committing snapshot before it is READY.");
  }

  const frameNumber = defined(frameState) ? frameState.frameNumber : 0;
  const currentSnapshot = primitive._snapshot;
  if (defined(currentSnapshot)) {
    if (
      defined(currentSnapshot.gaussianSplatTexture) &&
      currentSnapshot.gaussianSplatTexture !== snapshot.gaussianSplatTexture
    ) {
      retireTexture(
        primitive,
        currentSnapshot.gaussianSplatTexture,
        frameNumber,
      );
    }
    if (
      defined(currentSnapshot.sphericalHarmonicsTexture) &&
      currentSnapshot.sphericalHarmonicsTexture !==
        snapshot.sphericalHarmonicsTexture
    ) {
      retireTexture(
        primitive,
        currentSnapshot.sphericalHarmonicsTexture,
        frameNumber,
      );
    }
  } else {
    if (
      defined(primitive.gaussianSplatTexture) &&
      primitive.gaussianSplatTexture !== snapshot.gaussianSplatTexture
    ) {
      retireTexture(primitive, primitive.gaussianSplatTexture, frameNumber);
    }
    if (
      defined(primitive.sphericalHarmonicsTexture) &&
      primitive.sphericalHarmonicsTexture !== snapshot.sphericalHarmonicsTexture
    ) {
      retireTexture(
        primitive,
        primitive.sphericalHarmonicsTexture,
        frameNumber,
      );
    }
  }

  primitive._snapshot = snapshot;
  primitive._positions = snapshot.positions;
  primitive._rotations = snapshot.rotations;
  primitive._scales = snapshot.scales;
  primitive._colors = snapshot.colors;
  primitive._shData = snapshot.shData;
  primitive._sphericalHarmonicsDegree = snapshot.sphericalHarmonicsDegree;
  primitive._numSplats = snapshot.numSplats;
  primitive._indexes = snapshot.indexes;
  primitive.gaussianSplatTexture = snapshot.gaussianSplatTexture;
  primitive.sphericalHarmonicsTexture = snapshot.sphericalHarmonicsTexture;
  primitive._lastTextureWidth = snapshot.lastTextureWidth;
  primitive._lastTextureHeight = snapshot.lastTextureHeight;
  primitive._hasGaussianSplatTexture = defined(snapshot.gaussianSplatTexture);
  primitive._needsGaussianSplatTexture = false;
  primitive._gaussianSplatTexturePending = false;

  primitive._vertexArray = undefined;
  primitive._vertexArrayLen = -1;
  primitive._drawCommand = undefined;
  primitive._sorterPromise = undefined;
  primitive._activeSort = undefined;
  primitive._sorterState = GaussianSplatSortingState.IDLE;
  primitive._dirty = false;
}

function createSphericalHarmonicsTexture(context, shData) {
  const texture = new Texture({
    context: context,
    source: {
      width: shData.width,
      height: shData.height,
      arrayBufferView: shData.data,
    },
    preMultiplyAlpha: false,
    skipColorSpaceConversion: true,
    pixelFormat: PixelFormat.RG_INTEGER,
    pixelDatatype: PixelDatatype.UNSIGNED_INT,
    flipY: false,
    sampler: Sampler.NEAREST,
  });

  return texture;
}

function createGaussianSplatTexture(context, splatTextureData) {
  return new Texture({
    context: context,
    source: {
      width: splatTextureData.width,
      height: splatTextureData.height,
      arrayBufferView: splatTextureData.data,
    },
    preMultiplyAlpha: false,
    skipColorSpaceConversion: true,
    pixelFormat: PixelFormat.RGBA_INTEGER,
    pixelDatatype: PixelDatatype.UNSIGNED_INT,
    flipY: false,
    sampler: Sampler.NEAREST,
  });
}

/** A primitive that renders Gaussian splats.
 * <p>
 * This primitive is used to render Gaussian splats in a 3D Tileset.
 * It is designed to work with the KHR_gaussian_splatting and KHR_gaussian_splatting_compression_spz_2 extensions.
 * </p>
 * @alias GaussianSplatPrimitive
 * @constructor
 * @param {object} options An object with the following properties:
 * @param {Cesium3DTileset} options.tileset The tileset that this primitive belongs to.
 * @param {boolean} [options.debugShowBoundingVolume=false] Whether to show the bounding volume of the primitive for debugging purposes.
 * @private
 */

function GaussianSplatPrimitive(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  /**
   * The positions of the Gaussian splats in the primitive.
   * @type {undefined|Float32Array}
   * @private
   */
  this._positions = undefined;
  /**
   * The rotations of the Gaussian splats in the primitive.
   * @type {undefined|Float32Array}
   * @private
   */
  this._rotations = undefined;
  /**
   * The scales of the Gaussian splats in the primitive.
   * @type {undefined|Float32Array}
   * @private
   */
  this._scales = undefined;
  /**
   * The colors of the Gaussian splats in the primitive.
   * @type {undefined|Uint8Array}
   * @private
   */
  this._colors = undefined;
  /**
   * The indexes of the Gaussian splats in the primitive.
   * Used to index into the splat attribute texture in the vertex shader.
   * @type {undefined|Uint32Array}
   * @private
   */
  this._indexes = undefined;
  /**
   * The number of splats in the primitive.
   * This is the total number of splats across all selected tiles.
   * @type {number}
   * @private
   */
  this._numSplats = 0;
  /**
   * Indicates whether or not the primitive needs a Gaussian splat texture.
   * This is set to true when the primitive is first created or when the splat attributes change.
   * @type {boolean}
   * @private
   */
  this._needsGaussianSplatTexture = true;
  this._snapshot = undefined;
  this._pendingSnapshot = undefined;
  this._retiredTextures = [];

  /**
   * The previous view matrix used to determine if the primitive needs to be updated.
   * This is used to avoid unnecessary updates when the view matrix hasn't changed.
   * @type {Matrix4}
   * @private
   */
  this._prevViewMatrix = new Matrix4();

  /**
   * Indicates whether or not to show the bounding volume of the primitive for debugging purposes.
   * This is used to visualize the bounding volume of the primitive in the scene.
   * @type {boolean}
   * @private
   */
  this._debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;

  /**
   * The texture used to store the Gaussian splat attributes.
   * This texture is created from the splat attributes (positions, scales, rotations, colors)
   * and is used in the vertex shader to render the splats.
   * @type {undefined|Texture}
   * @private
   * @see {@link GaussianSplatTextureGenerator}
   */
  this.gaussianSplatTexture = undefined;

  /**
   * The texture used to store the spherical harmonics coefficients for the Gaussian splats.
   * @type {undefined|Texture}
   * @private
   */
  this.sphericalHarmonicsTexture = undefined;

  /**
   * The last width of the Gaussian splat texture.
   * This is used to track changes in the texture size and update the primitive accordingly.
   * @type {number}
   * @private
   */
  this._lastTextureWidth = 0;
  /**
   * The last height of the Gaussian splat texture.
   * This is used to track changes in the texture size and update the primitive accordingly.
   * @type {number}
   * @private
   */
  this._lastTextureHeight = 0;
  /**
   * The vertex array used to render the Gaussian splats.
   * This vertex array contains the attributes needed to render the splats, such as positions and indexes.
   * @type {undefined|VertexArray}
   * @private
   */
  this._vertexArray = undefined;
  /**
   * The length of the vertex array, used to track changes in the number of splats.
   * This is used to determine if the vertex array needs to be rebuilt.
   * @type {number}
   * @private
   */
  this._vertexArrayLen = -1;
  this._splitDirection = SplitDirection.NONE;

  /**
   * The dirty flag forces the primitive to render this frame.
   * @type {boolean}
   * @private
   */
  this._dirty = false;

  this._tileset = options.tileset;

  this._baseTilesetUpdate = this._tileset.update;
  this._tileset.update = this._wrappedUpdate.bind(this);

  this._tileset.tileLoad.addEventListener(this.onTileLoad, this);
  this._tileset.tileVisible.addEventListener(this.onTileVisible, this);

  /**
   * Tracks current count of selected tiles.
   * This is used to determine if the primitive needs to be rebuilt.
   * @type {number}
   * @private
   */
  this.selectedTileLength = 0;
  this._selectedTileSet = new Set();

  /**
   * Indicates whether or not the primitive is ready for use.
   * @type {boolean}
   * @private
   */
  this._ready = false;

  /**
   * Indicates whether or not the primitive has a Gaussian splat texture.
   * @type {boolean}
   * @private
   */
  this._hasGaussianSplatTexture = false;

  /**
   * Indicates whether or not the primitive is currently generating a Gaussian splat texture.
   * @type {boolean}
   * @private
   */
  this._gaussianSplatTexturePending = false;

  /**
   * The draw command used to render the Gaussian splats.
   * @type {undefined|DrawCommand}
   * @private
   */
  this._drawCommand = undefined;
  /**
   * The root transform of the tileset.
   * This is used to transform the splats into world space.
   * @type {undefined|Matrix4}
   * @private
   */
  this._rootTransform = undefined;

  /**
   * The axis correction matrix to transform the splats from Y-up to Z-up.
   * @type {Matrix4}
   * @private
   */
  this._axisCorrectionMatrix = ModelUtility.getAxisCorrectionMatrix(
    Axis.Y,
    Axis.X,
    new Matrix4(),
  );

  /**
   * Indicates whether or not the primitive has been destroyed.
   * @type {boolean}
   * @private
   */
  this._isDestroyed = false;

  /**
   * The state of the Gaussian splat sorting process.
   * This is used to track the progress of the sorting operation.
   * @type {GaussianSplatSortingState}
   * @private
   */
  this._sorterState = GaussianSplatSortingState.IDLE;
  /**
   * A promise that resolves when the Gaussian splat sorting operation is complete.
   * This is used to track the progress of the sorting operation.
   * @type {undefined|Promise}
   * @private
   */
  this._sorterPromise = undefined;
  this._splatDataGeneration = 0;
  this._sortRequestId = 0;
  this._activeSort = undefined;
  this._pendingSortPromise = undefined;
  this._pendingSort = undefined;

  /**
   * An error that occurred during the Gaussian splat sorting operation.
   * Thrown when state is ERROR.
   * @type {undefined|Error}
   * @private
   */
  this._sorterError = undefined;
}

Object.defineProperties(GaussianSplatPrimitive.prototype, {
  /**
   * Indicates whether the primitive is ready for use.
   * @memberof GaussianSplatPrimitive.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * The {@link SplitDirection} to apply to this point.
   * @memberof GaussianSplatPrimitive.prototype
   * @type {SplitDirection}
   * @default {@link SplitDirection.NONE}
   */
  splitDirection: {
    get: function () {
      return this._splitDirection;
    },
    set: function (value) {
      if (this._splitDirection !== value) {
        this._splitDirection = value;
        this._dirty = true;
      }
    },
  },
});

/**
 * Since we aren't visible at the scene level, we need to wrap the tileset update
 * so we not only get called but ensure we update immediately after the tileset.
 * @param {FrameState} frameState
 * @private
 *
 */
GaussianSplatPrimitive.prototype._wrappedUpdate = function (frameState) {
  this._baseTilesetUpdate.call(this._tileset, frameState);
  this.update(frameState);
};

/**
 * Destroys the primitive and releases its resources in a deterministic manner.
 * @private
 */
GaussianSplatPrimitive.prototype.destroy = function () {
  this._positions = undefined;
  this._rotations = undefined;
  this._scales = undefined;
  this._colors = undefined;
  this._indexes = undefined;
  destroySnapshotTextures(this._pendingSnapshot);
  destroySnapshotTextures(this._snapshot);
  if (defined(this._retiredTextures)) {
    for (let i = 0; i < this._retiredTextures.length; i++) {
      this._retiredTextures[i].texture.destroy();
    }
  }
  this._retiredTextures = [];
  this._pendingSnapshot = undefined;
  this._snapshot = undefined;
  this.gaussianSplatTexture = undefined;
  this.sphericalHarmonicsTexture = undefined;

  const drawCommand = this._drawCommand;
  if (defined(drawCommand)) {
    drawCommand.shaderProgram =
      drawCommand.shaderProgram && drawCommand.shaderProgram.destroy();
  }

  if (defined(this._vertexArray)) {
    this._vertexArray.destroy();
    this._vertexArray = undefined;
  }

  this._tileset.update = this._baseTilesetUpdate.bind(this._tileset);

  return destroyObject(this);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * @returns {boolean} Returns true if the primitive has been destroyed, otherwise false.
 * @private
 */
GaussianSplatPrimitive.prototype.isDestroyed = function () {
  return this._isDestroyed;
};

/**
 * Event callback for when a tile is loaded.
 * This method is called when a tile is loaded and the primitive needs to be updated.
 * It sets the dirty flag to true, indicating that the primitive needs to be rebuilt.
 * @param {Cesium3DTile} tile
 * @private
 */
GaussianSplatPrimitive.prototype.onTileLoad = function (tile) {
  this._dirty = true;
};

/**
 * Callback for visible tiles.
 * @param {Cesium3DTile} tile
 * @private
 */
GaussianSplatPrimitive.prototype.onTileVisible = function (tile) {};

/**
 * Transforms the tile's splat primitive attributes into world space.
 * <br /><br />
 * This method applies the computed transform of the tile and the tileset's bounding sphere
 * to the splat primitive's position, rotation, and scale attributes.
 * It modifies the attributes in place, transforming them from local space to world space.
 *
 * @param {Cesium3DTile} tile
 * @private
 */
GaussianSplatPrimitive.transformTile = function (tile) {
  const computedTransform = tile.computedTransform;
  const gltfPrimitive = tile.content.gltfPrimitive;
  const gaussianSplatPrimitive = tile.tileset.gaussianSplatPrimitive;

  if (gaussianSplatPrimitive._rootTransform === undefined) {
    gaussianSplatPrimitive._rootTransform = Transforms.eastNorthUpToFixedFrame(
      tile.tileset.boundingSphere.center,
    );
  }
  const rootTransform = gaussianSplatPrimitive._rootTransform;

  const computedModelMatrix = Matrix4.multiplyTransformation(
    computedTransform,
    gaussianSplatPrimitive._axisCorrectionMatrix,
    scratchMatrix4A,
  );

  Matrix4.multiplyTransformation(
    computedModelMatrix,
    tile.content.worldTransform,
    computedModelMatrix,
  );

  const toGlobal = Matrix4.multiply(
    tile.tileset.modelMatrix,
    rootTransform,
    scratchMatrix4B,
  );
  const toLocal = Matrix4.inverse(toGlobal, scratchMatrix4C);
  const transform = Matrix4.multiplyTransformation(
    toLocal,
    computedModelMatrix,
    scratchMatrix4A,
  );
  const positions = tile.content.positions;
  const rotations = tile.content.rotations;
  const scales = tile.content.scales;
  const attributePositions = ModelUtility.getAttributeBySemantic(
    gltfPrimitive,
    VertexAttributeSemantic.POSITION,
  ).typedArray;

  const attributeRotations = ModelUtility.getAttributeBySemantic(
    gltfPrimitive,
    VertexAttributeSemantic.ROTATION,
  ).typedArray;

  const attributeScales = ModelUtility.getAttributeBySemantic(
    gltfPrimitive,
    VertexAttributeSemantic.SCALE,
  ).typedArray;

  const position = new Cartesian3();
  const rotation = new Quaternion();
  const scale = new Cartesian3();
  for (let i = 0; i < attributePositions.length / 3; ++i) {
    position.x = attributePositions[i * 3];
    position.y = attributePositions[i * 3 + 1];
    position.z = attributePositions[i * 3 + 2];

    rotation.x = attributeRotations[i * 4];
    rotation.y = attributeRotations[i * 4 + 1];
    rotation.z = attributeRotations[i * 4 + 2];
    rotation.w = attributeRotations[i * 4 + 3];

    scale.x = attributeScales[i * 3];
    scale.y = attributeScales[i * 3 + 1];
    scale.z = attributeScales[i * 3 + 2];

    Matrix4.fromTranslationQuaternionRotationScale(
      position,
      rotation,
      scale,
      scratchMatrix4C,
    );

    Matrix4.multiplyTransformation(transform, scratchMatrix4C, scratchMatrix4C);

    Matrix4.getTranslation(scratchMatrix4C, position);
    Matrix4.getRotation(scratchMatrix4C, rotation);
    Matrix4.getScale(scratchMatrix4C, scale);

    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    rotations[i * 4] = rotation.x;
    rotations[i * 4 + 1] = rotation.y;
    rotations[i * 4 + 2] = rotation.z;
    rotations[i * 4 + 3] = rotation.w;

    scales[i * 3] = scale.x;
    scales[i * 3 + 1] = scale.y;
    scales[i * 3 + 2] = scale.z;
  }
};

/**
 * Generates the Gaussian splat texture for the primitive.
 * This method creates a texture from the splat attributes (positions, scales, rotations, colors)
 * and updates the primitive's state accordingly.
 *
 * @see {@link GaussianSplatTextureGenerator}
 *
 * @param {GaussianSplatPrimitive} primitive
 * @param {FrameState} frameState
 * @private
 */
GaussianSplatPrimitive.generateSplatTexture = function (
  primitive,
  frameState,
  snapshot,
) {
  if (!defined(snapshot) || snapshot.state !== SnapshotState.BUILDING) {
    return;
  }
  snapshot.state = SnapshotState.TEXTURE_PENDING;
  const promise = GaussianSplatTextureGenerator.generateFromAttributes({
    attributes: {
      positions: new Float32Array(snapshot.positions),
      scales: new Float32Array(snapshot.scales),
      rotations: new Float32Array(snapshot.rotations),
      colors: new Uint8Array(snapshot.colors),
    },
    count: snapshot.numSplats,
  });
  if (!defined(promise)) {
    snapshot.state = SnapshotState.BUILDING;
    return;
  }
  promise
    .then((splatTextureData) => {
      if (primitive._pendingSnapshot !== snapshot) {
        snapshot.state = SnapshotState.BUILDING;
        return;
      }
      if (!defined(snapshot.gaussianSplatTexture)) {
        snapshot.gaussianSplatTexture = createGaussianSplatTexture(
          frameState.context,
          splatTextureData,
        );
      } else if (
        snapshot.lastTextureHeight !== splatTextureData.height ||
        snapshot.lastTextureWidth !== splatTextureData.width
      ) {
        const oldTex = snapshot.gaussianSplatTexture;
        snapshot.gaussianSplatTexture = createGaussianSplatTexture(
          frameState.context,
          splatTextureData,
        );
        oldTex.destroy();
      } else {
        snapshot.gaussianSplatTexture.copyFrom({
          source: {
            width: splatTextureData.width,
            height: splatTextureData.height,
            arrayBufferView: splatTextureData.data,
          },
        });
      }
      snapshot.lastTextureHeight = splatTextureData.height;
      snapshot.lastTextureWidth = splatTextureData.width;

      if (defined(snapshot.shData) && snapshot.sphericalHarmonicsDegree > 0) {
        const oldTex = snapshot.sphericalHarmonicsTexture;
        const width = ContextLimits.maximumTextureSize;
        const dims = snapshot.shCoefficientCount / 3;
        const splatsPerRow = Math.floor(width / dims);
        const floatsPerRow = splatsPerRow * (dims * 2);
        const texBuf = new Uint32Array(
          width * Math.ceil(snapshot.numSplats / splatsPerRow) * 2,
        );

        let dataIndex = 0;
        for (let i = 0; dataIndex < snapshot.shData.length; i += width * 2) {
          texBuf.set(
            snapshot.shData.subarray(dataIndex, dataIndex + floatsPerRow),
            i,
          );
          dataIndex += floatsPerRow;
        }
        snapshot.sphericalHarmonicsTexture = createSphericalHarmonicsTexture(
          frameState.context,
          {
            data: texBuf,
            width: width,
            height: Math.ceil(snapshot.numSplats / splatsPerRow),
          },
        );
        if (defined(oldTex)) {
          oldTex.destroy();
        }
      }

      snapshot.state = SnapshotState.TEXTURE_READY;
    })
    .catch((error) => {
      console.error("Error generating Gaussian splat texture:", error);
      snapshot.state = SnapshotState.BUILDING;
    });
};

/**
 * Builds the draw command for the Gaussian splat primitive.
 * This method sets up the shader program, render state, and vertex array for rendering the Gaussian splats.
 * It also configures the attributes and uniforms required for rendering.
 *
 * @param {GaussianSplatPrimitive} primitive
 * @param {FrameState} frameState
 *
 * @private
 */
GaussianSplatPrimitive.buildGSplatDrawCommand = function (
  primitive,
  frameState,
) {
  const tileset = primitive._tileset;
  const renderResources = new GaussianSplatRenderResources(primitive);
  const { shaderBuilder } = renderResources;
  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.cull.enabled = false;
  renderStateOptions.depthMask = false;
  renderStateOptions.depthTest.enabled = true;
  renderStateOptions.blending = BlendingState.PRE_MULTIPLIED_ALPHA_BLEND;
  renderResources.alphaOptions.pass = Pass.GAUSSIAN_SPLATS;

  shaderBuilder.addAttribute("vec2", "a_screenQuadPosition");
  shaderBuilder.addAttribute("float", "a_splatIndex");
  shaderBuilder.addVarying("vec4", "v_splatColor");
  shaderBuilder.addVarying("vec2", "v_vertPos");
  shaderBuilder.addUniform(
    "float",
    "u_splitDirection",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addVarying("float", "v_splitDirection");
  shaderBuilder.addUniform(
    "highp usampler2D",
    "u_splatAttributeTexture",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform(
    "float",
    "u_sphericalHarmonicsDegree",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform("float", "u_splatScale", ShaderDestination.VERTEX);

  shaderBuilder.addUniform(
    "vec3",
    "u_cameraPositionWC",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform(
    "mat3",
    "u_inverseModelRotation",
    ShaderDestination.VERTEX,
  );

  const uniformMap = renderResources.uniformMap;

  const textureCache = primitive.gaussianSplatTexture;
  uniformMap.u_splatAttributeTexture = function () {
    return textureCache;
  };

  if (primitive._sphericalHarmonicsDegree > 0) {
    shaderBuilder.addDefine(
      "HAS_SPHERICAL_HARMONICS",
      "1",
      ShaderDestination.VERTEX,
    );
    shaderBuilder.addUniform(
      "highp usampler2D",
      "u_sphericalHarmonicsTexture",
      ShaderDestination.VERTEX,
    );
    uniformMap.u_sphericalHarmonicsTexture = function () {
      return primitive.sphericalHarmonicsTexture;
    };
  }
  uniformMap.u_sphericalHarmonicsDegree = function () {
    return primitive._sphericalHarmonicsDegree;
  };

  uniformMap.u_cameraPositionWC = function () {
    return Cartesian3.clone(frameState.camera.positionWC);
  };

  uniformMap.u_inverseModelRotation = function () {
    const tileset = primitive._tileset;
    const modelMatrix = Matrix4.multiply(
      tileset.modelMatrix,
      primitive._rootTransform,
      scratchMatrix4A,
    );
    const inverseModelRotation = Matrix4.getRotation(
      Matrix4.inverse(modelMatrix, scratchMatrix4C),
      scratchMatrix4D,
    );
    return inverseModelRotation;
  };

  uniformMap.u_splitDirection = function () {
    return primitive.splitDirection;
  };

  renderResources.instanceCount = primitive._numSplats;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;
  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  let renderState = clone(
    RenderState.fromCache(renderResources.renderStateOptions),
    true,
  );

  renderState.cull.face = ModelUtility.getCullFace(
    tileset.modelMatrix,
    PrimitiveType.TRIANGLE_STRIP,
  );

  renderState = RenderState.fromCache(renderState);
  const splatQuadAttrLocations = {
    screenQuadPosition: 0,
    splatIndex: 2,
  };

  const idxAttr = new ModelComponents.Attribute();
  idxAttr.name = "_SPLAT_INDEXES";
  idxAttr.typedArray = primitive._indexes;
  idxAttr.componentDatatype = ComponentDatatype.UNSIGNED_INT;
  idxAttr.type = AttributeType.SCALAR;
  idxAttr.normalized = false;
  idxAttr.count = renderResources.instanceCount;
  idxAttr.constant = 0;
  idxAttr.instanceDivisor = 1;

  if (
    !defined(primitive._vertexArray) ||
    primitive._indexes.length > primitive._vertexArrayLen
  ) {
    const geometry = new Geometry({
      attributes: {
        screenQuadPosition: new GeometryAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: [-1, -1, 1, -1, 1, 1, -1, 1],
          name: "_SCREEN_QUAD_POS",
          variableName: "screenQuadPosition",
        }),
        splatIndex: { ...idxAttr, variableName: "splatIndex" },
      },
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
    });

    primitive._vertexArray = VertexArray.fromGeometry({
      context: frameState.context,
      geometry: geometry,
      attributeLocations: splatQuadAttrLocations,
      bufferUsage: BufferUsage.DYNAMIC_DRAW,
      interleave: false,
    });
  } else {
    primitive._vertexArray
      .getAttribute(1)
      .vertexBuffer.copyFromArrayView(primitive._indexes);
  }

  primitive._vertexArrayLen = primitive._indexes.length;

  const modelMatrix = Matrix4.multiply(
    tileset.modelMatrix,
    primitive._rootTransform,
    scratchMatrix4B,
  );

  const vertexArrayCache = primitive._vertexArray;
  const command = new DrawCommand({
    boundingVolume: tileset.boundingSphere,
    modelMatrix: modelMatrix,
    uniformMap: uniformMap,
    renderState: renderState,
    vertexArray: vertexArrayCache,
    shaderProgram: shaderProgram,
    cull: renderStateOptions.cull.enabled,
    pass: Pass.GAUSSIAN_SPLATS,
    count: renderResources.count,
    owner: primitive,
    instanceCount: renderResources.instanceCount,
    primitiveType: PrimitiveType.TRIANGLE_STRIP,
    debugShowBoundingVolume: tileset.debugShowBoundingVolume,
    castShadows: false,
    receiveShadows: false,
  });

  primitive._drawCommand = command;
};

/**
 * Updates the Gaussian splat primitive for the current frame.
 * This method checks if the primitive needs to be updated based on the current frame state,
 * and if so, it processes the selected tiles, aggregates their attributes,
 * and generates the Gaussian splat texture if necessary.
 * It also handles the sorting of splat indexes and builds the draw command for rendering.
 *
 * @param {FrameState} frameState
 * @private
 */
GaussianSplatPrimitive.prototype.update = function (frameState) {
  const tileset = this._tileset;

  releaseRetiredTextures(this, frameState.frameNumber);

  if (!tileset.show) {
    return;
  }

  if (this._drawCommand) {
    frameState.commandList.push(this._drawCommand);
  }

  if (tileset._modelMatrixChanged) {
    this._dirty = true;
    return;
  }
  const hasRootTransform = defined(this._rootTransform);

  if (frameState.passes.pick === true) {
    return;
  }

  if (this.splitDirection !== tileset.splitDirection) {
    this.splitDirection = tileset.splitDirection;
  }

  if (this._sorterState === GaussianSplatSortingState.IDLE) {
    const selectedTilesChanged =
      tileset._selectedTiles.length !== 0 &&
      haveSelectedTilesChanged(this, tileset._selectedTiles);
    const hasPendingWork =
      this._dirty ||
      selectedTilesChanged ||
      defined(this._pendingSnapshot) ||
      defined(this._pendingSortPromise) ||
      !defined(this._drawCommand);
    if (
      !hasPendingWork &&
      Matrix4.equals(frameState.camera.viewMatrix, this._prevViewMatrix)
    ) {
      return;
    }

    if (
      tileset._selectedTiles.length !== 0 &&
      (selectedTilesChanged || this._dirty)
    ) {
      this._splatDataGeneration++;
      this._activeSort = undefined;
      this._sorterPromise = undefined;
      this._sorterState = GaussianSplatSortingState.IDLE;
      this._pendingSortPromise = undefined;
      this._pendingSort = undefined;
      if (defined(this._pendingSnapshot)) {
        destroySnapshotTextures(this._pendingSnapshot);
      }

      const tiles = tileset._selectedTiles;
      const totalElements = tiles.reduce(
        (total, tile) => total + tile.content.pointsLength,
        0,
      );
      const aggregateAttributeValues = (
        componentDatatype,
        getAttributeCallback,
        numberOfComponents,
      ) => {
        let aggregate;
        let offset = 0;
        for (const tile of tiles) {
          const content = tile.content;
          const attribute = getAttributeCallback(content);
          const componentsPerAttribute = defined(numberOfComponents)
            ? numberOfComponents
            : AttributeType.getNumberOfComponents(attribute.type);
          const buffer = defined(attribute.typedArray)
            ? attribute.typedArray
            : attribute;
          if (!defined(aggregate)) {
            aggregate = ComponentDatatype.createTypedArray(
              componentDatatype,
              totalElements * componentsPerAttribute,
            );
          }
          aggregate.set(buffer, offset);
          offset += buffer.length;
        }
        return aggregate;
      };

      const aggregateShData = () => {
        let offset = 0;
        let aggregate;
        for (const tile of tiles) {
          const tileShData = tile.content.packedSphericalHarmonicsData;
          if (tile.content.sphericalHarmonicsDegree > 0) {
            if (!defined(aggregate)) {
              let coefs;
              switch (tile.content.sphericalHarmonicsDegree) {
                case 1:
                  coefs = 9;
                  break;
                case 2:
                  coefs = 24;
                  break;
                case 3:
                  coefs = 45;
              }
              aggregate = new Uint32Array(totalElements * (coefs * (2 / 3)));
            }
            aggregate.set(tileShData, offset);
            offset += tileShData.length;
          }
        }
        return aggregate;
      };

      const positions = aggregateAttributeValues(
        ComponentDatatype.FLOAT,
        (content) => content.positions,
        3,
      );

      const scales = aggregateAttributeValues(
        ComponentDatatype.FLOAT,
        (content) => content.scales,
        3,
      );

      const rotations = aggregateAttributeValues(
        ComponentDatatype.FLOAT,
        (content) => content.rotations,
        4,
      );

      const colors = aggregateAttributeValues(
        ComponentDatatype.UNSIGNED_BYTE,
        (content) =>
          ModelUtility.getAttributeBySemantic(
            content.gltfPrimitive,
            VertexAttributeSemantic.COLOR,
          ),
      );

      const sphericalHarmonicsDegree =
        tiles[0].content.sphericalHarmonicsDegree;
      const shCoefficientCount =
        sphericalHarmonicsDegree > 0
          ? tiles[0].content.sphericalHarmonicsCoefficientCount
          : 0;
      const shData = aggregateShData();

      this._pendingSnapshot = {
        generation: this._splatDataGeneration,
        positions: positions,
        rotations: rotations,
        scales: scales,
        colors: colors,
        shData: shData,
        sphericalHarmonicsDegree: sphericalHarmonicsDegree,
        shCoefficientCount: shCoefficientCount,
        numSplats: totalElements,
        indexes: undefined,
        gaussianSplatTexture: undefined,
        sphericalHarmonicsTexture: undefined,
        lastTextureWidth: 0,
        lastTextureHeight: 0,
        state: SnapshotState.BUILDING,
      };

      this.selectedTileLength = tileset._selectedTiles.length;
      this._selectedTileSet = new Set(tileset._selectedTiles);
      this._dirty = false;
    }

    if (defined(this._pendingSnapshot)) {
      const pending = this._pendingSnapshot;
      if (pending.state === SnapshotState.BUILDING) {
        GaussianSplatPrimitive.generateSplatTexture(this, frameState, pending);
        return;
      }
      if (pending.state === SnapshotState.TEXTURE_PENDING) {
        return;
      }
      if (
        pending.state === SnapshotState.TEXTURE_READY &&
        !defined(pending.gaussianSplatTexture)
      ) {
        return;
      }

      if (!hasRootTransform) {
        return;
      }

      Matrix4.clone(frameState.camera.viewMatrix, this._prevViewMatrix);
      Matrix4.multiply(
        frameState.camera.viewMatrix,
        this._rootTransform,
        scratchMatrix4A,
      );

      if (
        pending.state === SnapshotState.TEXTURE_READY &&
        !defined(this._pendingSortPromise)
      ) {
        const requestId = ++this._sortRequestId;
        const dataGeneration = this._splatDataGeneration;
        this._pendingSort = {
          requestId: requestId,
          dataGeneration: dataGeneration,
          expectedCount: pending.numSplats,
          snapshot: pending,
        };
        const sortPromise = GaussianSplatSorter.radixSortIndexes({
          primitive: {
            positions: new Float32Array(pending.positions),
            modelView: Float32Array.from(scratchMatrix4A),
            count: pending.numSplats,
          },
          sortType: "Index",
        });
        if (!defined(sortPromise)) {
          this._pendingSortPromise = undefined;
          this._pendingSort = undefined;
          pending.state = SnapshotState.TEXTURE_READY;
          return;
        }
        this._pendingSortPromise = sortPromise;
        pending.state = SnapshotState.SORTING;
      }

      if (!defined(this._pendingSortPromise)) {
        if (pending.state === SnapshotState.SORTING) {
          pending.state = SnapshotState.TEXTURE_READY;
        }
        return;
      }

      const pendingSort = this._pendingSort;
      this._pendingSortPromise
        .then((sortedData) => {
          if (
            !defined(pendingSort) ||
            pendingSort.snapshot !== this._pendingSnapshot
          ) {
            return;
          }
          const expectedCount = pendingSort.expectedCount;
          const currentCount = pending.numSplats;
          const sortedLen = sortedData?.length;
          if (expectedCount !== currentCount || sortedLen !== expectedCount) {
            this._pendingSortPromise = undefined;
            this._pendingSort = undefined;
            if (pending.state === SnapshotState.SORTING) {
              pending.state = SnapshotState.TEXTURE_READY;
            }
            return;
          }
          pending.indexes = sortedData;
          pending.state = SnapshotState.READY;
          this._pendingSortPromise = undefined;
          this._pendingSort = undefined;
          commitSnapshot(this, pending, frameState);
          this._pendingSnapshot = undefined;
          GaussianSplatPrimitive.buildGSplatDrawCommand(this, frameState);
        })
        .catch((err) => {
          if (
            !defined(pendingSort) ||
            pendingSort.snapshot !== this._pendingSnapshot
          ) {
            return;
          }
          this._pendingSortPromise = undefined;
          this._pendingSort = undefined;
          if (pending.state === SnapshotState.SORTING) {
            pending.state = SnapshotState.TEXTURE_READY;
          }
          this._sorterState = GaussianSplatSortingState.ERROR;
          this._sorterError = err;
        });
      return;
    }

    if (this._numSplats === 0) {
      return;
    }

    if (!hasRootTransform) {
      return;
    }

    Matrix4.clone(frameState.camera.viewMatrix, this._prevViewMatrix);
    Matrix4.multiply(
      frameState.camera.viewMatrix,
      this._rootTransform,
      scratchMatrix4A,
    );

    if (!defined(this._sorterPromise)) {
      const requestId = ++this._sortRequestId;
      const dataGeneration = this._splatDataGeneration;
      const expectedCount = this._numSplats;
      this._activeSort = {
        requestId: requestId,
        dataGeneration: dataGeneration,
        expectedCount: expectedCount,
      };
      const rawPromise = GaussianSplatSorter.radixSortIndexes({
        primitive: {
          positions: new Float32Array(this._positions),
          modelView: Float32Array.from(scratchMatrix4A),
          count: this._numSplats,
        },
        sortType: "Index",
      });
      this._sorterPromise = rawPromise;
    }

    if (!defined(this._sorterPromise)) {
      this._sorterState = GaussianSplatSortingState.WAITING;
      return;
    }
    const activeSort = this._activeSort;
    this._sorterPromise
      .then((sortedData) => {
        const isActive = isActiveSort(this, activeSort);
        const expectedCount = activeSort?.expectedCount;
        const currentCount = this._numSplats;
        const sortedLen = sortedData?.length;
        const isMismatch =
          expectedCount !== currentCount || sortedLen !== expectedCount;
        if (!isActive || isMismatch) {
          if (isActive) {
            this._sorterPromise = undefined;
            this._sorterState = GaussianSplatSortingState.IDLE;
          }
          return;
        }
        this._indexes = sortedData;
        this._sorterState = GaussianSplatSortingState.SORTED;
      })
      .catch((err) => {
        if (!isActiveSort(this, activeSort)) {
          return;
        }
        this._sorterState = GaussianSplatSortingState.ERROR;
        this._sorterError = err;
      });
  } else if (this._sorterState === GaussianSplatSortingState.WAITING) {
    if (!defined(this._sorterPromise)) {
      const requestId = ++this._sortRequestId;
      const dataGeneration = this._splatDataGeneration;
      const expectedCount = this._numSplats;
      this._activeSort = {
        requestId: requestId,
        dataGeneration: dataGeneration,
        expectedCount: expectedCount,
      };
      const rawPromise = GaussianSplatSorter.radixSortIndexes({
        primitive: {
          positions: new Float32Array(this._positions),
          modelView: Float32Array.from(scratchMatrix4A),
          count: this._numSplats,
        },
        sortType: "Index",
      });
      this._sorterPromise = rawPromise;
    }
    if (!defined(this._sorterPromise)) {
      this._sorterState = GaussianSplatSortingState.WAITING;
      return;
    }
    const activeSort = this._activeSort;
    this._sorterPromise
      .then((sortedData) => {
        const isActive = isActiveSort(this, activeSort);
        const expectedCount = activeSort?.expectedCount;
        const currentCount = this._numSplats;
        const sortedLen = sortedData?.length;
        const isMismatch =
          expectedCount !== currentCount || sortedLen !== expectedCount;
        if (!isActive || isMismatch) {
          if (isActive) {
            this._sorterPromise = undefined;
            this._sorterState = GaussianSplatSortingState.IDLE;
          }
          return;
        }
        this._indexes = sortedData;
        this._sorterState = GaussianSplatSortingState.SORTED;
      })
      .catch((err) => {
        if (!isActiveSort(this, activeSort)) {
          return;
        }
        this._sorterState = GaussianSplatSortingState.ERROR;
        this._sorterError = err;
      });

    this._sorterState = GaussianSplatSortingState.SORTING; // set state to sorting
  } else if (this._sorterState === GaussianSplatSortingState.SORTING) {
    return; //still sorting, wait for next frame
  } else if (this._sorterState === GaussianSplatSortingState.SORTED) {
    //update the draw command if sorted
    GaussianSplatPrimitive.buildGSplatDrawCommand(this, frameState);
    this._sorterState = GaussianSplatSortingState.IDLE; //reset state for next frame
    this._dirty = false;
    this._sorterPromise = undefined; //reset promise for next frame
    this._activeSort = undefined;
  } else if (this._sorterState === GaussianSplatSortingState.ERROR) {
    throw this._sorterError;
  }

  this._dirty = false;
};

export default GaussianSplatPrimitive;
