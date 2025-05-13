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
import GaussianSplatVS from "../Shaders/PrimitiveGaussianSplatVS.js";
import GaussianSplatFS from "../Shaders/PrimitiveGaussianSplatFS.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Geometry from "../Core/Geometry.js";
import GeometryAttribute from "../Core/GeometryAttribute.js";
import VertexArray from "../Renderer/VertexArray.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import Cesium3DTileset from "./Cesium3DTileset.js";
import RenderState from "../Renderer/RenderState.js";
import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";

const scratchSplatMatrix = new Matrix4();

function GaussianSplatPrimitive(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._positions = undefined;
  this._rotations = undefined;
  this._scales = undefined;
  this._colors = undefined;
  this._indexes = undefined;
  this._numSplats = 0;

  this._needsGaussianSplatTexture = true;

  this._debugShowBoundingVolume = false;
  this._splatScale = 1.0;

  this._tileset = options.tileset;
  this._tileset._hasSpzContent = true;

  this._tileset.tileLoad.addEventListener(this.onTileLoaded, this);
  this._tileset.tileUnload.addEventListener(this.onTileUnloaded, this);

  /**
   * @type {boolean}
   * @private
   */
  this._calculateStatistics = options.calculateStatistics ?? false;

  this._drawCommand = undefined;

  this._useLogDepth = undefined;

  this._modelMatrix = new Matrix4();
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

  boundingSphere: {
    get: function () {
      return this._tileset.boundingSphere;
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
      return this.modelMatrix;
    },
    set: function (modelMatrix) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("modelMatrix", modelMatrix);
      //>>includeEnd('debug');

      this._modelMatrix = Matrix4.clone(modelMatrix, this.modelMatrix);
    },
  },

  debugShowBoundingVolume: {
    get: function () {
      return this._debugShowBoundingVolume;
    },
    set: function (debugShowBoundingVolume) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("debugShowBoundingVolume", debugShowBoundingVolume);
      //>>includeEnd('debug');

      this._debugShowBoundingVolume = debugShowBoundingVolume;
    },
  },

  splatScale: {
    get: function () {
      return this._splatScale;
    },
    set: function (splatScale) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("splatScale", splatScale);
      //>>includeEnd('debug');

      this._splatScale = splatScale;
    },
  },
});

GaussianSplatPrimitive.prototype.onTileLoaded = function (tile) {
  console.log(`Tile loaded: ${tile._contentResource.url}`);
  const gsplatData = tile.content._gsplatData;

  this.pushSplats({
    positions: new Float32Array(
      ModelUtility.getAttributeBySemantic(
        gsplatData,
        VertexAttributeSemantic.POSITION,
      ).typedArray,
    ),
    scales: new Float32Array(
      ModelUtility.getAttributeBySemantic(
        gsplatData,
        VertexAttributeSemantic.SCALE,
      ).typedArray,
    ),
    rotations: new Float32Array(
      ModelUtility.getAttributeBySemantic(
        gsplatData,
        VertexAttributeSemantic.ROTATION,
      ).typedArray,
    ),
    colors: new Uint8Array(
      ModelUtility.getAttributeBySemantic(
        gsplatData,
        VertexAttributeSemantic.COLOR,
      ).typedArray,
    ),
  });

  this._numSplats += gsplatData.attributes[0].count;
};

GaussianSplatPrimitive.prototype.onTileUnloaded = function (tile) {
  console.log(`Tile unloaded: ${tile._contentResource.url}`);
};

GaussianSplatPrimitive.fromIonAssetId = async function (assetId, options) {
  return new GaussianSplatPrimitive({
    tileset: await Cesium3DTileset.fromIonAssetId(assetId, options),
  });
};

GaussianSplatPrimitive.prototype.prePassesUpdate = function (frameState) {
  this._tileset.prePassesUpdate(frameState);
};

GaussianSplatPrimitive.prototype.updateForPass = function (
  frameState,
  passState,
) {
  this._tileset.updateForPass(frameState, passState);
};

GaussianSplatPrimitive.prototype.postPassesUpdate = function (frameState) {
  this._tileset.postPassesUpdate(frameState);
};

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
};

GaussianSplatPrimitive.prototype.isDestroyed = function () {
  return false;
};

GaussianSplatPrimitive.prototype.pushSplats = function (attributes) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("attributes", attributes);
  //>>includeEnd('debug');
  if (this._positions === undefined) {
    this._positions = attributes.positions;
  } else {
    const newPositions = new Float32Array(
      this._positions.length + attributes.positions.length,
    );
    newPositions.set(this._positions);
    newPositions.set(attributes.positions, this._positions.length);
    this._positions = newPositions;
  }

  if (this._scales === undefined) {
    this._scales = attributes.scales;
  } else {
    const newScales = new Float32Array(
      this._scales.length + attributes.scales.length,
    );
    newScales.set(this._scales);
    newScales.set(attributes.scales, this._scales.length);
    this._scales = newScales;
  }

  if (this._rotations === undefined) {
    this._rotations = attributes.rotations;
  } else {
    const newRotations = new Float32Array(
      this._rotations.length + attributes.rotations.length,
    );
    newRotations.set(this._rotations);
    newRotations.set(attributes.rotations, this._rotations.length);
    this._rotations = newRotations;
  }

  if (this._colors === undefined) {
    this._colors = attributes.colors;
  } else {
    const newColors = new Uint8Array(
      this._colors.length + attributes.colors.length,
    );
    newColors.set(this._colors);
    newColors.set(attributes.colors, this._colors.length);
    this._colors = newColors;
  }
};

GaussianSplatPrimitive.generateSplatTexture = function (primitive, frameState) {
  primitive._gaussianSplatTexturePending = true;
  const promise = GaussianSplatTextureGenerator.generateFromAttrs({
    attributes: {
      positions: new Float32Array(primitive._positions),
      scales: new Float32Array(primitive._scales),
      rotations: new Float32Array(primitive._rotations),
      colors: new Uint8Array(primitive._colors),
    },
    count: primitive._numSplats,
  });

  if (promise === undefined) {
    primitive._gaussianSplatTexturePending = false;
    return;
  }

  promise
    .then((splatTextureData) => {
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

      primitive._gaussianSplatTexture = splatTex;
      primitive._hasGaussianSplatTexture = true;
      primitive._needsGaussianSplatTexture = false;
      primitive._gaussianSplatTexturePending = false;

      primitive._indexes = new Uint32Array([
        ...Array(primitive._numSplats).keys(),
      ]);
    })
    .catch((error) => {
      console.error("Error generating Gaussian splat texture:", error);
      primitive._gaussianSplatTexturePending = false;
    });
};

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
  renderStateOptions.depthTest.enabled = false;
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

  if (primitive.debugShowBoundingVolume) {
    shaderBuilder.addDefine(
      "DEBUG_BOUNDING_VOLUMES",
      undefined,
      ShaderDestination.BOTH,
    );
  }

  shaderBuilder.addAttribute("vec2", "a_screenQuadPosition");
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
    return primitive.splatScale;
  };

  uniformMap.u_splatAttributeTexture = function () {
    return primitive._gaussianSplatTexture;
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

  //index attribute for indexing into attribute texture
  idxAttr.name = "_SPLAT_INDEXES";
  idxAttr.typedArray = primitive._indexes;
  idxAttr.componentDatatype = ComponentDatatype.UNSIGNED_INT;
  idxAttr.type = AttributeType.SCALAR;
  idxAttr.normalized = false;
  idxAttr.count = renderResources.instanceCount;
  idxAttr.constant = 0;
  idxAttr.instanceDivisor = 1;

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

  const vertexArray = VertexArray.fromGeometry({
    context: frameState.context,
    geometry: geometry,
    attributeLocations: splatQuadAttrLocations,
    bufferUsage: BufferUsage.STATIC_DRAW,
    interleave: false,
  });

  const command = new DrawCommand({
    boundingVolume: tileset.boundingSphere,
    modelMatrix: primitive._modelMatrix,
    uniformMap: uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
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

GaussianSplatPrimitive.prototype.gatherSplats = function () {
  this._numSplats = 0;
  const tileset = this._tileset;
  if (
    tileset.root === undefined ||
    tileset.ready === false ||
    tileset.root.content === undefined
  ) {
    return;
  }
  function gatherChildSplats(node) {
    if (!defined(node) || !defined(node.content)) {
      return;
    }

    const content = node.content;
    if (defined(content._gsplatData)) {
      const gsplatData = content._gsplatData;

      this.pushSplats({
        positions: new Float32Array(
          ModelUtility.getAttributeBySemantic(
            gsplatData,
            VertexAttributeSemantic.POSITION,
          ).typedArray,
        ),
        scales: new Float32Array(
          ModelUtility.getAttributeBySemantic(
            gsplatData,
            VertexAttributeSemantic.SCALE,
          ).typedArray,
        ),
        rotations: new Float32Array(
          ModelUtility.getAttributeBySemantic(
            gsplatData,
            VertexAttributeSemantic.ROTATION,
          ).typedArray,
        ),
        colors: new Uint8Array(
          ModelUtility.getAttributeBySemantic(
            gsplatData,
            VertexAttributeSemantic.COLOR,
          ).typedArray,
        ),
      });

      this._numSplats += gsplatData.attributes[0].count;
    }

    if (defined(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        gatherChildSplats.call(this, node.children[i]);
      }
    }
  }

  gatherChildSplats.call(this, tileset.root);
};

GaussianSplatPrimitive.prototype.update = function (frameState) {
  const tileset = this._tileset;

  if (this._useLogDepth !== frameState.useLogDepth) {
    this._useLogDepth = frameState.useLogDepth;
  }

  tileset.update(frameState);

  if (this._drawCommand) {
    frameState.commandList.push(this._drawCommand);
    this._drawCommand = undefined;
  }

  //this.gatherSplats();

  if (this._numSplats === 0) {
    return;
  }

  const rootTransform = tileset.root.content._tile.computedTransform;
  const transform =
    tileset._root._content._tile._content._loader._components.scene.nodes[0]
      .matrix;

  Matrix4.multiply(rootTransform, transform, this._modelMatrix);

  if (this._needsGaussianSplatTexture) {
    if (!this._gaussianSplatTexturePending) {
      GaussianSplatPrimitive.generateSplatTexture(this, frameState);
    }
    return;
  }

  Matrix4.multiply(
    frameState.camera.viewMatrix,
    this._modelMatrix,
    scratchSplatMatrix,
  );

  if (!this._hasGaussianSplatTexture) {
    return;
  }

  const promise = GaussianSplatSorter.radixSortIndexes({
    primitive: {
      positions: new Float32Array(this._positions),
      modelView: Float32Array.from(scratchSplatMatrix),
      count: this._numSplats,
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
    this._indexes = sortedData;
    GaussianSplatPrimitive.buildGSplatDrawCommand(this, frameState);
  });
};

export default GaussianSplatPrimitive;
