import Frozen from "../Core/Frozen.js";
import Matrix4 from "../Core/Matrix4.js";
import ModelUtility from "./Model/ModelUtility.js";
import GaussianSplatSorter from "./GaussianSplatSorter.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
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
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import Axis from "./Axis.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Quaternion from "../Core/Quaternion.js";
import SplitDirection from "./SplitDirection.js";
import destroyObject from "../Core/destroyObject.js";
import GaussianSplatMegatexture from "./GaussianSplatMegatexture.js";

import ContextLimits from "../Renderer/ContextLimits.js";
import Transforms from "../Core/Transforms.js";
import GaussianSplatTileProvider from "./GaussianSplatTileProvider.js";

const scratchMatrix4A = new Matrix4();
const scratchMatrix4B = new Matrix4();
const scratchMatrix4C = new Matrix4();
const scratchMatrix4D = new Matrix4();

const GaussianSplatSortingState = {
  IDLE: 0,
  SORTING: 1,
  SORTED: 2,
  ERROR: 3,
};

/** A primitive that renders Gaussian splats.
 * <p>
 * This primitive is used to render Gaussian splats in a 3D Tileset.
 * It is designed to work with the KHR_gaussian_splatting and KHR_gaussian_splatting_compression_spz_2 extensions.
 * </p>
 * @alias GaussianSplatPrimitive
 * @constructor
 * @param {Object} options An object with the following properties:
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
  //this._sorterState = GaussianSplatSortingState.IDLE;
  /**
   * A promise that resolves when the Gaussian splat sorting operation is complete.
   * This is used to track the progress of the sorting operation.
   * @type {undefined|Promise}
   * @private
   */
  this._sorterPromise = undefined;

  /**
   * An error that occurred during the Gaussian splat sorting operation.
   * Thrown when state is ERROR.
   * @type {undefined|Error}
   * @private
   */
  this._sorterError = undefined;

  this._selKeyStable = 0;

  this._needsRepack = false;
  this._needsResort = false;
  this._sortInFlight = false;
  this._sorterPrimed = false;

  this._active = { positions: null, count: 0, indexes: null, shDegree: 0 };
  this._staged = null; // { positions, count, shDegree, modelViewSnap }
  this._buildVersion = 0;
  this._pending = null; // { version, type: 'RESORT'|'REPACK', promise }
  this._sorterState = GaussianSplatSortingState.IDLE;
  this._prevViewMatrixSnap = Matrix4.clone(Matrix4.IDENTITY);
  this._tileProvider = new GaussianSplatTileProvider();
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

GaussianSplatPrimitive.prototype.initMegaTextures = function (
  context,
  shDegree,
) {
  this.positionMegaTexture = new GaussianSplatMegatexture({
    context: context,
    width: ContextLimits.maximumTextureSize,
    height: 1024,
    pixelFormat: PixelFormat.RGB, //RG_INTEGER,
    pixelDatatype: PixelDatatype.FLOAT,
  });
  this.colorMegaTexture = new GaussianSplatMegatexture({
    context: context,
    width: ContextLimits.maximumTextureSize,
    height: 1024,
    pixelFormat: PixelFormat.RED_INTEGER,
    pixelDatatype: PixelDatatype.UNSIGNED_INT,
  });
  this.covarianceMegaTexture = new GaussianSplatMegatexture({
    context: context,
    width: ContextLimits.maximumTextureSize,
    height: 1024,
    pixelFormat: PixelFormat.RGBA_INTEGER,
    pixelDatatype: PixelDatatype.UNSIGNED_INT,
  });

  if (shDegree > 0) {
    this.sh1MegaTexture = new GaussianSplatMegatexture({
      context: context,
      width: ContextLimits.maximumTextureSize,
      height: 1024,
      pixelFormat: PixelFormat.RGBA_INTEGER,
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
    });
  }

  if (shDegree > 1) {
    this.sh2MegaTexture = new GaussianSplatMegatexture({
      context: context,
      width: ContextLimits.maximumTextureSize,
      height: 1024,
      pixelFormat: PixelFormat.RGBA_INTEGER,
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
    });
  }

  if (shDegree > 2) {
    this.sh3MegaTexture = new GaussianSplatMegatexture({
      context: context,
      width: ContextLimits.maximumTextureSize,
      height: 1024,
      pixelFormat: PixelFormat.RGBA_INTEGER,
      pixelDatatype: PixelDatatype.UNSIGNED_INT,
    });
  }
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
  if (defined(this.gaussianSplatTexture)) {
    this.gaussianSplatTexture.destroy();
    this.gaussianSplatTexture = undefined;
  }

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
    Matrix4.fromArray(rootTransform),
    scratchMatrix4B,
  );
  const toLocal = Matrix4.inverse(toGlobal, scratchMatrix4C);
  const transform = Matrix4.multiplyTransformation(
    toLocal,
    computedModelMatrix,
    scratchMatrix4A,
  );
  const positions = tile.content._originalPositions;
  const rotations = tile.content._originalRotations;
  const scales = tile.content._originalScales;
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
    "highp sampler2D",
    "u_splatPositionTexture",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addUniform(
    "highp usampler2D",
    "u_splatColorTexture",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addUniform(
    "highp usampler2D",
    "u_splatCovarianceTexture",
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
  const posTexCache = primitive.positionMegaTexture;
  uniformMap.u_splatPositionTexture = function () {
    return posTexCache.texture;
  };

  const covTexCache = primitive.covarianceMegaTexture;
  uniformMap.u_splatCovarianceTexture = function () {
    return covTexCache.texture;
  };

  const colorTexCache = primitive.colorMegaTexture;
  uniformMap.u_splatColorTexture = function () {
    return colorTexCache.texture;
  };

  if (primitive._active.shDegree > 0) {
    shaderBuilder.addDefine("SH1_ENABLED", "1");
    shaderBuilder.addUniform(
      "highp usampler2D",
      "u_splatSh1Texture",
      ShaderDestination.VERTEX,
    );

    const sh1TexCache = primitive.sh1MegaTexture;
    uniformMap.u_splatSh1Texture = function () {
      return sh1TexCache.texture;
    };
  }

  if (primitive._active.shDegree > 1) {
    shaderBuilder.addDefine("SH2_ENABLED", "1");
    shaderBuilder.addUniform(
      "highp usampler2D",
      "u_splatSh2Texture",
      ShaderDestination.VERTEX,
    );

    const sh2TexCache = primitive.sh2MegaTexture;
    uniformMap.u_splatSh2Texture = function () {
      return sh2TexCache.texture;
    };
  }

  if (primitive._active.shDegree > 2) {
    shaderBuilder.addDefine("SH3_ENABLED", "1");
    shaderBuilder.addUniform(
      "highp usampler2D",
      "u_splatSh3Texture",
      ShaderDestination.VERTEX,
    );

    const sh3TexCache = primitive.sh3MegaTexture;
    uniformMap.u_splatSh3Texture = function () {
      return sh3TexCache.texture;
    };
  }

  uniformMap.u_cameraPositionWC = function () {
    return Cartesian3.clone(frameState.camera.positionWC);
  };

  uniformMap.u_inverseModelRotation = function () {
    const tileset = primitive._tileset;
    const modelMatrix = Matrix4.multiply(
      tileset.modelMatrix,
      Matrix4.fromArray(tileset.root.transform),
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

  renderResources.instanceCount = primitive._active.count;
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
  idxAttr.typedArray = primitive._active.indexes;
  idxAttr.componentDatatype = ComponentDatatype.UNSIGNED_INT;
  idxAttr.type = AttributeType.SCALAR;
  idxAttr.normalized = false;
  idxAttr.count = renderResources.instanceCount;
  idxAttr.constant = 0;
  idxAttr.instanceDivisor = 1;

  if (
    !defined(primitive._vertexArray) ||
    primitive._active.indexes.length > primitive._vertexArrayLen
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
      .vertexBuffer.copyFromArrayView(primitive._active.indexes);
  }

  primitive._vertexArrayLen = primitive._active.indexes.length;

  const modelMatrix = Matrix4.multiply(
    tileset.modelMatrix,
    Matrix4.fromArray(primitive._rootTransform),
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
    owner: this,
    instanceCount: renderResources.instanceCount,
    primitiveType: PrimitiveType.TRIANGLE_STRIP,
    debugShowBoundingVolume: tileset.debugShowBoundingVolume,
    castShadows: false,
    receiveShadows: false,
  });

  primitive._drawCommand = command;
};

const scratchPositionRefs = [];
const scratchColorRefs = [];

const scratchCovarianceRefs = [];

const scratchSh1Refs = [];
const scratchSh2Refs = [];
const scratchSh3Refs = [];

GaussianSplatPrimitive.prototype._stageLayoutFromTiles = function (
  tiles,
  frameState,
) {
  let total = 0;
  for (const t of tiles) {
    total += t.content.pointsLength;
  }
  if (!this._positions || this._positions.length < total * 3) {
    this._positions = ComponentDatatype.createTypedArray(
      ComponentDatatype.FLOAT,
      total * 3,
    );
  }
  let dst = 0;
  const shDeg =
    tiles[0].content.sphericalHarmonicsDegree ?? tiles[0].content.shDegree ?? 0;
  scratchPositionRefs.length =
    scratchCovarianceRefs.length =
    scratchColorRefs.length =
      0;
  scratchSh1Refs.length = scratchSh2Refs.length = scratchSh3Refs.length = 0;

  for (const tile of tiles) {
    const pos = tile.content._originalPositions;
    this._positions.set(pos, dst);
    dst += pos.length;
    scratchPositionRefs.push(pos);
    scratchCovarianceRefs.push(tile.content.covarianceTextureData);
    scratchColorRefs.push(tile.content.colorTextureData);
    if (shDeg > 0) {
      scratchSh1Refs.push(tile.content.sh1TextureData);
    }
    if (shDeg > 1) {
      scratchSh2Refs.push(tile.content.sh2TextureData);
    }
    if (shDeg > 2) {
      scratchSh3Refs.push(tile.content.sh3TextureData);
    }
  }

  Matrix4.multiply(
    frameState.camera.viewMatrix,
    this._rootTransform,
    scratchMatrix4A,
  );
  const modelViewSnap = Float32Array.from(scratchMatrix4A);

  this._staged = {
    positions: new Float32Array(this._positions.subarray(0, total * 3)),
    count: total,
    shDegree: shDeg,
    tilesKey: this._stableSelKey,
    modelViewSnap,
  };
};

GaussianSplatPrimitive.prototype._commitIfReady = function (frameState) {
  const pc = this._pendingCommit;
  if (!pc) {
    return;
  }

  if (pc.kind === "REPACK") {
    this.positionMegaTexture.insertTextureDataMultiple(scratchPositionRefs);
    this.covarianceMegaTexture.insertTextureDataMultiple(scratchCovarianceRefs);
    this.colorMegaTexture.insertTextureDataMultiple(scratchColorRefs);
    if (scratchSh1Refs.length) {
      this.sh1MegaTexture.insertTextureDataMultiple(scratchSh1Refs);
    }
    if (scratchSh2Refs.length) {
      this.sh2MegaTexture.insertTextureDataMultiple(scratchSh2Refs);
    }
    if (scratchSh3Refs.length) {
      this.sh3MegaTexture.insertTextureDataMultiple(scratchSh3Refs);
    }

    this._active.shDegree = pc.staged.shDegree;
    this._active.positions = pc.staged.positions;
    this._active.indexes = pc.indexes;
    this._active.count = pc.staged.count;
  } else {
    this._active.indexes = pc.indexes;
    this._active.count = pc.count;
  }

  GaussianSplatPrimitive.buildGSplatDrawCommand(this, frameState);

  this._pendingCommit = null;
  this._sorterState = GaussianSplatSortingState.IDLE;
  this._dirty = false;
  this._sortInFlight = false;
};

GaussianSplatPrimitive.prototype._startSort = function (
  kind,
  positions,
  modelView,
  count,
  frameState,
) {
  this._sorterState = GaussianSplatSortingState.SORTING;

  const promise = GaussianSplatSorter.radixSortIndexes({
    primitive: { positions, modelView, count },
    sortType: "Index",
  });

  promise
    .then((sorted) => {
      if (kind === "REPACK") {
        this._pendingCommit = {
          kind: "REPACK",
          indexes: sorted,
          staged: {
            positions: this._staged.positions,
            count: this._staged.count,
            shDegree: this._staged.shDegree,
          },
        };
      } else {
        this._pendingCommit = { kind: "RESORT", indexes: sorted, count };
      }
      this._sortInFlight = false;
      this._sorterState = GaussianSplatSortingState.SORTED;
    })
    .catch((err) => {
      this._sorterState = GaussianSplatSortingState.ERROR;
      this._sorterError = err;
      this._sortInFlight = false;
    });
};

GaussianSplatPrimitive.prototype.update = function (frameState) {
  const tileset = this._tileset;
  if (!tileset.show || tileset._selectedTiles.length === 0) {
    return;
  }
  if (frameState.passes.pick) {
    return;
  }

  if (this._hasGaussianSplatTexture === false) {
    const deg = defined(tileset.root?.content?._sphericalHarmonicsDegree)
      ? tileset.root.content._sphericalHarmonicsDegree
      : tileset.root?.children[0]?.content?._sphericalHarmonicsDegree;
    if (!defined(deg)) {
      return;
    }
    this.initMegaTextures(frameState.context, deg);
    this._hasGaussianSplatTexture = true;
  }

  if (!this._sorterPrimed) {
    const promise = GaussianSplatSorter.radixSortIndexes({
      primitive: {
        positions: new Float32Array(1),
        modelView: Float32Array.from(Matrix4.IDENTITY),
        count: 1,
      },
      sortType: "Index",
    });

    if (defined(promise)) {
      this._sorterPrimed = true;
    }

    return;
  }

  const viewChanged = !Matrix4.equals(
    frameState.camera.viewMatrix,
    this._prevViewMatrixSnap,
  );

  if (tileset._modelMatrixChanged) {
    this._needsResort = true;
  }

  const now = performance.now();
  const {
    tiles: desired,
    tilesKey,
    changed,
  } = this._tileProvider.update(tileset._selectedTiles, now);

  if (changed && desired.length > 0) {
    this._selKeyStable = tilesKey;
    this._needsRepack = true;
    this._stageLayoutFromTiles(desired, frameState);
  } else if (viewChanged && this._tileProvider.shouldResort(now)) {
    this._needsResort = true;
    this._prevViewMatrixSnap = Matrix4.clone(
      frameState.camera.viewMatrix,
      this._prevViewMatrixSnap,
    );
  }

  this._commitIfReady(frameState);

  if (!this._sortInFlight && !this._pendingCommit) {
    if (this._needsRepack && this._staged) {
      this._needsRepack = false;
      this._sortInFlight = true;
      this._sorterState = GaussianSplatSortingState.SORTING;
      this._startSort(
        "REPACK",
        this._staged.positions,
        this._staged.modelViewSnap,
        this._staged.count,
      );
    } else if (
      this._needsResort &&
      this._active.count > 0 &&
      this._active.positions
    ) {
      this._needsResort = false;
      this._sortInFlight = true;
      this._sorterState = GaussianSplatSortingState.SORTING;
      Matrix4.multiply(
        frameState.camera.viewMatrix,
        this._rootTransform,
        scratchMatrix4A,
      );
      const mvSnap = Float32Array.from(scratchMatrix4A);
      this._startSort(
        "RESORT",
        this._active.positions,
        mvSnap,
        this._active.count,
      );
    }
  }

  if (this._drawCommand) {
    frameState.commandList.push(this._drawCommand);
  }
};

export default GaussianSplatPrimitive;
