import Frozen from "../Core/Frozen.js";
import Matrix4 from "../Core/Matrix4.js";
import defined from "../Core/defined.js";
import ModelUtility from "./Model/ModelUtility.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import GaussianSplatSorter from "./GaussianSplatSorter.js";
import GaussianSplatTextureGenerator from "./Model/GaussianSplatTextureGenerator.js";
import Cesium3DTilesetStatistics from "./Cesium3DTilesetStatistics.js";
import Check from "../Core/Check.js";
import ModelComponents from "./ModelComponents.js";
import AttributeType from "./AttributeType.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import GaussianSplatRenderResources from "./GaussianSplatRenderResources.js";
import BlendingState from "../Renderer/BlendingState.js";
import Pass from "../Renderer/Pass.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";
import PrimitiveType from "../Core/PrimitiveType.js";

const scratchSplatMatrix = new Matrix4();

function GaussianSplatPrimitive(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._positions = undefined;
  this._rotations = undefined;
  this._scales = undefined;
  this._colors = undefined;

  /**
   * @type {Cesium3DTilesetStatistics}
   * @private
   */
  this._statistics = new Cesium3DTilesetStatistics();

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
      positions: new Float32Array(
        ModelUtility.getAttributeBySemantic(
          primitive,
          VertexAttributeSemantic.POSITION,
        ).typedArray,
      ),
      scales: new Float32Array(
        ModelUtility.getAttributeBySemantic(
          primitive,
          VertexAttributeSemantic.SCALE,
        ).typedArray,
      ),
      rotations: new Float32Array(
        ModelUtility.getAttributeBySemantic(
          primitive,
          VertexAttributeSemantic.ROTATION,
        ).typedArray,
      ),
      colors: new Uint8Array(
        ModelUtility.getAttributeBySemantic(
          primitive,
          VertexAttributeSemantic.COLOR,
        ).typedArray,
      ),
    },
    count: primitive.attributes[0].count,
  });

  if (promise === undefined) {
    primitive.gaussianSplatTexturePending = false;
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
    const count = Math.floor(primitive.attributes[0].count);
    const attribute = new ModelComponents.Attribute();

    //index attribute for indexing into attribute texture
    attribute.name = "_SPLAT_INDEXES";
    attribute.typedArray = new Uint32Array([...Array(count).keys()]);
    attribute.componentDatatype = ComponentDatatype.UNSIGNED_INT;
    attribute.type = AttributeType.SCALAR;
    attribute.normalized = false;
    attribute.count = count;
    attribute.constant = 0;
    attribute.instanceDivisor = 1;

    primitive.attributes.push(attribute);
    primitive.gaussianSplatTexture = splatTex;
    primitive.hasGaussianSplatTexture = true;
    primitive.needsGaussianSplatTexture = false;
    primitive.gaussianSplatTexturePending = false;
  });
};

function buildGSplatDrawCommand(primitive, frameState) {
  //renderResource
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

  if (renderResources.model.content.tileset.debugShowBoundingVolume) {
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
  //build shader program

  //create geometry for indices

  //submit command
  frameState.commandList.push({});
}

//update and sorting
GaussianSplatPrimitive.prototype.update = function (frameState) {
  const primitive = frameState.gaussianSplatPrimitive;

  if (!defined(primitive)) {
    return;
  }

  if (primitive.needsGaussianSplatTexture) {
    if (!primitive.gaussianSplatTexturePending) {
      this.generateSplatTexture(primitive, frameState);
    }
    return;
  }

  Matrix4.multiply(
    frameState.camera.viewMatrix,
    model.modelMatrix,
    scratchSplatMatrix,
  );

  if (!primitive?.hasGaussianSplatTexture) {
    return;
  }

  const idxAttr = primitive.attributes.find((a) => a.name === "_SPLAT_INDEXES");
  const posAttr = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );

  const promise = GaussianSplatSorter.radixSortIndexes({
    primitive: {
      positions: new Float32Array(posAttr.typedArray),
      modelView: Float32Array.from(scratchSplatMatrix),
      count: idxAttr.count,
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
    idxAttr.typedArray = sortedData;

    frameState.commandList.push(buildGSplatDrawCommand(primitive, frameState));
  });
};

export default GaussianSplatPrimitive;
