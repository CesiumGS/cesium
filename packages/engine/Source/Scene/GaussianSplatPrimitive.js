import Frozen from "../Core/Frozen.js";
import Matrix4 from "../Core/Matrix4.js";
import ModelUtility from "./Model/ModelUtility.js";
import GaussianSplatSorter from "./GaussianSplatSorter.js";
import GaussianSplatTextureGenerator from "./Model/GaussianSplatTextureGenerator.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import GaussianSplatRenderResources from "./GaussianSplatRenderResources.js";
import BlendingState from "./BlendingState.js";
import Pass from "../Renderer/Pass.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../Shaders/Model/GaussianSplatFS.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Geometry from "../Core/Geometry.js";
import GeometryAttribute from "../Core/GeometryAttribute.js";
import VertexArray from "../Renderer/VertexArray.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import Cesium3DTileset from "./Cesium3DTileset.js";
import RenderState from "../Renderer/RenderState.js";
import clone from "../Core/clone.js";

const scratchSplatMatrix = new Matrix4();

function GaussianSplatPrimitive(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._positions = new Float32Array();
  this._rotations = new Float32Array();
  this._scales = new Float32Array();
  this._colors = new Uint8Array();
  this._indexes = new Uint32Array();
  this._numSplats = 0;

  this._needsGaussianSplatTexture = true;

  this._tileset = options.tileset;

  /**
   * @type {boolean}
   * @private
   */
  this._calculateStatistics = options.calculateStatistics ?? false;

  this._drawCommand = undefined;

  /**
   * @type {boolean}
   * @private
   */
  this._depthTest = options.depthTest ?? true;
}

Object.defineProperties(GaussianSplatPrimitive.prototype, {
  /**
   * Gets a value indicating whether or not the primitive is ready for use.
   *
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
   * Gets the bounding sphere.
   *
   * @memberof GaussianSplatPrimitive.prototype
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      return this._shape.boundingSphere;
    },
  },

  /**
   * Gets the oriented bounding box.
   *
   * @memberof GaussianSplatPrimitive.prototype
   * @type {OrientedBoundingBox}
   * @readonly
   */
  orientedBoundingBox: {
    get: function () {
      return this._shape.orientedBoundingBox;
    },
  },

  /**
   * Gets the model matrix.
   *
   * @memberof GaussianSplatPrimitive.prototype
   * @type {Matrix4}
   * @readonly
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (modelMatrix) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("modelMatrix", modelMatrix);
      //>>includeEnd('debug');

      this._modelMatrix = Matrix4.clone(modelMatrix, this._modelMatrix);
    },
  },
});

GaussianSplatPrimitive.fromIonAssetId = async function (assetId, options) {
  return new GaussianSplatPrimitive({
    tileset: await Cesium3DTileset.fromIonAssetId(assetId, options),
  });
};

GaussianSplatPrimitive.prototype.destroy = function () {
  return false;
};

GaussianSplatPrimitive.prototype.pushSplats = function (attributes) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("attributes", attributes);
  //>>includeEnd('debug');

  this._positions.push(attributes.positions);
  this._rotations.push(attributes.rotations);
  this._scales.push(attributes.scales);
  this._colors.push(attributes.colors);
};

//texture gen

GaussianSplatPrimitive.generateSplatTexture = function (primitive, frameState) {
  primitive.gaussianSplatTexturePending = true;
  const promise = GaussianSplatTextureGenerator.generateFromAttrs({
    attributes: {
      positions: new Float32Array(primitive._positions),
      scales: new Float32Array(primitive._scales),
      rotations: new Float32Array(primitive._rotations),
      colors: new Uint8Array(primitive._colors),
    },
    count: primitive._nmSplats,
  });

  if (promise === undefined) {
    primitive._gaussianSplatTexturePending = false;
    return;
  }

  promise.then((splatTextureData) => {
    const splatTex = new Texture({
      context: frameState.context,
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

    primitive.gaussianSplatTexture = splatTex;
    primitive.hasGaussianSplatTexture = true;
    primitive.needsGaussianSplatTexture = false;
    primitive.gaussianSplatTexturePending = false;
  });
};

function buildGSplatDrawCommand(primitive, frameState) {
  //renderResource
  //build shader program

  const renderResources = new GaussianSplatRenderResources(primitive);
  const { shaderBuilder } = renderResources;

  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.cull.enabled = false;
  renderStateOptions.depthMask = true;
  renderStateOptions.depthTest.enabled = true;
  renderStateOptions.blending = BlendingState.PRE_MULTIPLIED_ALPHA_BLEND;

  renderResources.alphaOptions.pass = Pass.GAUSSIAN_SPLATS;

  shaderBuilder.addDefine(
    "HAS_GAUSSIAN_SPLATS",
    undefined,
    ShaderDestination.BOTH,
  );

  shaderBuilder.addDefine(
    "HAS_SPLAT_TEXTURE",
    undefined,
    ShaderDestination.BOTH,
  );

  if (renderResources.debugShowBoundingVolume) {
    shaderBuilder.addDefine(
      "DEBUG_BOUNDING_VOLUMES",
      undefined,
      ShaderDestination.BOTH,
    );
  }

  shaderBuilder.addAttribute("float", "a_splatIndex");

  shaderBuilder.addVarying("vec4", "v_splatColor");
  shaderBuilder.addVarying("vec2", "v_vertPos");

  shaderBuilder.addUniform(
    "highp usampler2D",
    "u_splatAttributeTexture",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addUniform("float", "u_splatScale", ShaderDestination.VERTEX);
  const uniformMap = renderResources.uniformMap;

  uniformMap.u_splatScale = function () {
    return renderResources.model?.style?.splatScale ?? 1.0;
  };

  uniformMap.u_splatAttributeTexture = function () {
    return primitive.gaussianSplatTexture;
  };

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);

  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  //create geometry for indices

  // const count = primitive.numSplats;
  // const attribute = new ModelComponents.Attribute();

  // //index attribute for indexing into attribute texture
  // attribute.name = "_SPLAT_INDEXES";
  // attribute.typedArray = new Uint32Array([...Array(count).keys()]);
  // attribute.componentDatatype = ComponentDatatype.UNSIGNED_INT;
  // attribute.type = AttributeType.SCALAR;
  // attribute.normalized = false;
  // attribute.count = count;
  // attribute.constant = 0;
  // attribute.instanceDivisor = 1;

  // primitive.attributes.push(attribute);

  let renderState = clone(
    RenderState.fromCache(renderResources.renderStateOptions),
    true,
  );

  renderState.cull.face = ModelUtility.getCullFace(
    primitive._tileset.modelMatrix,
    PrimitiveType.TRIANGLE_STRIP,
  );
  renderState = RenderState.fromCache(renderState);

  const splatQuadAttrLocations = {
    splatIndex: 5,
  };
  const geometry = new Geometry({
    attributes: {
      screenQuadPosition: new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: [-1, -1, 1, -1, 1, 1, -1, 1],
        name: "_SCREEN_QUAD_POS",
        variableName: "screenQuadPosition",
      }),
      splatIndex: {
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 1,
        values: primitive._indexes,
        name: "_SPLAT_INDEXES",
        variableName: "splatIndex",
      },
    },
    primitiveType: PrimitiveType.TRIANGLE_STRIP,
  });

  const vertexArray = VertexArray.fromGeometry({
    context: frameState.context,
    geometry: geometry,
    attributeLocations: splatQuadAttrLocations,
    bufferUsage: BufferUsage.STATIC_DRAW,
    interleave: false,
  });

  //submit command
  const command = new DrawCommand({
    boundingVolume: primitive._tileset.boundingSphere,
    modelMatrix: primitive._tileset.modelMatrix,
    uniformMap: uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: renderResources.depthTest.enabled,
    pass: Pass.GAUSSIAN_SPLATS,
    count: renderResources.count,
    owner: this,
    instanceCount: renderResources.instanceCount,
    primitiveType: PrimitiveType.TRIANGLE_STRIP,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
    castShadows: false,
    receiveShadows: false,
  });

  frameState.commandList.push(command);
}

//update and sorting
GaussianSplatPrimitive.prototype.update = function (frameState) {
  this._tileset.update(frameState);

  if (this._needsGaussianSplatTexture) {
    if (!this._gaussianSplatTexturePending) {
      GaussianSplatPrimitive.generateSplatTexture(this, frameState);
    }
    return;
  }

  Matrix4.multiply(
    frameState.camera.viewMatrix,
    model.modelMatrix,
    scratchSplatMatrix,
  );

  if (!this._hasGaussianSplatTexture) {
    return;
  }

  const promise = GaussianSplatSorter.radixSortIndexes({
    primitive: {
      positions: new Float32Array(this._positions.typedArray),
      modelView: Float32Array.from(scratchSplatMatrix),
      count: this.numSplats,
    },
    sortType: "Index",
  });

  if (promise === undefined) {
    return;
  }

  promise.catch((err) => {
    throw err;
  });
  promise.then((sortedData) => {
    this._indexes.typedArray = sortedData;

    frameState.commandList.push(buildGSplatDrawCommand(this, frameState));
  });
};

export default GaussianSplatPrimitive;
