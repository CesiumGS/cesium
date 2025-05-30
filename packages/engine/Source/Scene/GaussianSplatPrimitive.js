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
import RenderState from "../Renderer/RenderState.js";
import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import Axis from "./Axis.js";
import Cartesian3 from "../Core/Cartesian3.js";
import GaussianSplat3DTilesContent from "./GaussianSplat3DTilesContent.js";

const scratchSplatMatrix = new Matrix4();

function GaussianSplatPrimitive(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._positions = undefined;
  this._rotations = undefined;
  this._scales = undefined;
  this._colors = undefined;
  this._indexes = undefined;
  this._numSplats = 0;
  this._debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;
  this._needsGaussianSplatTexture = true;
  this._splatScale = 1.0;

  this._tileset = options.tileset;
  this._baseTilesetUpdate = this._tileset.update.bind(this._tileset);
  this._tileset.update = (frameState) => {
    this._baseTilesetUpdate(frameState);
    this.update(frameState);
  };

  this._selectedTileLen = 0;

  this._drawCommand = undefined;

  this._rootTransform = undefined;
  this._axisCorrectionMatrix = ModelUtility.getAxisCorrectionMatrix(
    Axis.Y,
    Axis.X,
    new Matrix4(),
  );

  this._isDestroyed = false;
}

Object.defineProperties(GaussianSplatPrimitive.prototype, {
  /**
    * Gets a value indicating whether or not the primitive is ready for use.
    @memberof GaussianSplatPrimitive.prototype
    @type {boolean}
    @readonly
    */
  ready: {
    get: function () {
      return this._ready;
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

GaussianSplatPrimitive.prototype.onTileLoaded = function (tile) {};

GaussianSplatPrimitive.prototype.onTileUnloaded = function (tile) {};

GaussianSplatPrimitive.prototype.onLoadProgress = function (
  numberOfPendingRequests,
  numberOfTilesProcessing,
) {};

GaussianSplatPrimitive.prototype.onAllTilesLoaded = function () {};

GaussianSplatPrimitive.prototype.onInitialTilesLoaded = function () {};
GaussianSplatPrimitive.prototype.onTileFailed = function (error) {};

GaussianSplatPrimitive.prototype.onTileVisible = function (tile) {};

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

  this._isDestroyed = true;
};

GaussianSplatPrimitive.prototype.isDestroyed = function () {
  return this._isDestroyed;
};

GaussianSplatPrimitive.transformTile = function (tile) {
  const transform = tile.computedTransform;
  const splatPrimitive = tile.content.splatPrimitive;
  const gaussianSplatPrimitive = tile.tileset.gaussianSplatPrimitive;

  let modelMatrix = Matrix4.multiply(
    transform,
    gaussianSplatPrimitive._axisCorrectionMatrix,
    new Matrix4(),
  );

  modelMatrix = Matrix4.multiplyTransformation(
    modelMatrix,
    tile._content._worldTransform,
    new Matrix4(),
  );

  const inverseRoot = Matrix4.inverse(transform, new Matrix4());

  const positions = ModelUtility.getAttributeBySemantic(
    splatPrimitive,
    VertexAttributeSemantic.POSITION,
  ).typedArray;

  for (let i = 0; i < positions.length; i += 3) {
    const worldPosition = Matrix4.multiplyByPoint(
      modelMatrix,
      new Cartesian3(positions[i], positions[i + 1], positions[i + 2]),
      new Cartesian3(),
    );

    const position = Matrix4.multiplyByPoint(
      inverseRoot,
      worldPosition,
      new Cartesian3(),
    );
    positions[i] = position.x;
    positions[i + 1] = position.y;
    positions[i + 2] = position.z;
  }
};

GaussianSplatPrimitive.generateSplatTexture = function (primitive, frameState) {
  primitive._gaussianSplatTexturePending = true;
  const promise = GaussianSplatTextureGenerator.generateFromAttributes({
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
    bufferUsage: BufferUsage.DYNAMIC_DRAW,
    interleave: false,
  });

  let modelMatrix = Matrix4.multiply(
    tileset._root.computedTransform,
    primitive._axisCorrectionMatrix,
    new Matrix4(),
  );

  if (tileset._root._content instanceof GaussianSplat3DTilesContent) {
    modelMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      tileset._root._content._worldTransform,
      new Matrix4(),
    );
  }

  const command = new DrawCommand({
    boundingVolume: tileset.boundingSphere,
    modelMatrix: modelMatrix,
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

GaussianSplatPrimitive.prototype.update = function (frameState) {
  const tileset = this._tileset;

  if (this._rootTransform === undefined) {
    this._rootTransform = tileset.root.computedTransform;
  }

  if (
    tileset._selectedTiles.length > 0 &&
    tileset._selectedTiles.length !== this._selectedTileLen
  ) {
    this._numSplats = 0;
    this._positions = undefined;
    this._rotations = undefined;
    this._scales = undefined;
    this._colors = undefined;
    this._indexes = undefined;
    this._needsGaussianSplatTexture = true;
    this._gaussianSplatTexturePending = false;

    const tiles = tileset._selectedTiles;
    const totalElements = tiles.reduce(
      (total, tile) => total + tile.content.pointsLength,
      0,
    );
    const aggregateAttributeValues = (
      componentDatatype,
      getAttributeCallback,
    ) => {
      let aggregate;
      let offset = 0;
      for (const tile of tiles) {
        const primitive = tile.content.splatPrimitive;
        const attribute = getAttributeCallback(primitive);
        if (aggregate === undefined) {
          aggregate = ComponentDatatype.createTypedArray(
            componentDatatype,
            totalElements * AttributeType.getNumberOfComponents(attribute.type),
          );
        }
        aggregate.set(attribute.typedArray, offset);
        offset += attribute.typedArray.length;
      }
      return aggregate;
    };

    this._positions = aggregateAttributeValues(
      ComponentDatatype.FLOAT,
      (splatPrimitive) =>
        ModelUtility.getAttributeBySemantic(
          splatPrimitive,
          VertexAttributeSemantic.POSITION,
        ),
    );

    this._scales = aggregateAttributeValues(
      ComponentDatatype.FLOAT,
      (splatPrimitive) =>
        ModelUtility.getAttributeBySemantic(
          splatPrimitive,
          VertexAttributeSemantic.SCALE,
        ),
    );

    this._rotations = aggregateAttributeValues(
      ComponentDatatype.FLOAT,
      (splatPrimitive) =>
        ModelUtility.getAttributeBySemantic(
          splatPrimitive,
          VertexAttributeSemantic.ROTATION,
        ),
    );

    this._colors = aggregateAttributeValues(
      ComponentDatatype.UNSIGNED_BYTE,
      (splatPrimitive) =>
        ModelUtility.getAttributeBySemantic(
          splatPrimitive,
          VertexAttributeSemantic.COLOR,
        ),
    );

    this._numSplats = totalElements;
    this._selectedTileLen = tileset._selectedTiles.length;
  }

  if (this._numSplats === 0) {
    return;
  }

  if (this._needsGaussianSplatTexture) {
    if (!this._gaussianSplatTexturePending) {
      GaussianSplatPrimitive.generateSplatTexture(this, frameState);
    }
    return;
  }

  if (this._drawCommand) {
    frameState.commandList.push(this._drawCommand);
  }

  Matrix4.multiply(
    frameState.camera.viewMatrix,
    this._rootTransform,
    scratchSplatMatrix,
  );

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
