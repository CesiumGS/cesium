import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import VertexArray from "../Renderer/VertexArray.js";
import ShadowVolumeFS from "../Shaders/ShadowVolumeFS.js";
import VectorTileVS from "../Shaders/VectorTileVS.js";
import BlendingState from "./BlendingState.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import ClassificationType from "./ClassificationType.js";
import DepthFunction from "./DepthFunction.js";
import Expression from "./Expression.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";
import Vector3DTileBatch from "./Vector3DTileBatch.js";

/**
 * Creates a batch of classification meshes.
 *
 * @alias Vector3DTilePrimitive
 * @constructor
 *
 * @param {object} options An object with following properties:
 * @param {Float32Array} options.positions The positions of the meshes.
 * @param {Uint16Array|Uint32Array} options.indices The indices of the triangulated meshes. The indices must be contiguous so that
 * the indices for mesh n are in [i, i + indexCounts[n]] where i = sum{indexCounts[0], indexCounts[n - 1]}.
 * @param {Uint32Array} options.indexCounts The number of indices for each mesh.
 * @param {Uint32Array} options.indexOffsets The offset into the index buffer for each mesh.
 * @param {Vector3DTileBatch[]} options.batchedIndices The index offset and count for each batch with the same color.
 * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
 * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched meshes.
 * @param {Uint16Array} options.batchIds The batch ids for each mesh.
 * @param {Uint16Array} options.vertexBatchIds The batch id for each vertex.
 * @param {BoundingSphere} options.boundingVolume The bounding volume for the entire batch of meshes.
 * @param {BoundingSphere[]} options.boundingVolumes The bounding volume for each mesh.
 * @param {ClassificationType} [options.classificationType] What this tile will classify.
 *
 * @private
 */
function Vector3DTilePrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._batchTable = options.batchTable;
  this._batchIds = options.batchIds;

  // These arrays are released after VAO creation.
  this._positions = options.positions;
  this._vertexBatchIds = options.vertexBatchIds;

  // These arrays are kept for re-batching indices based on colors.
  // If WebGL 2 is supported, indices will be released and re-batching uses buffer-to-buffer copies.
  this._indices = options.indices;
  this._indexCounts = options.indexCounts;
  this._indexOffsets = options.indexOffsets;
  this._batchedIndices = options.batchedIndices;

  this._boundingVolume = options.boundingVolume;
  this._boundingVolumes = options.boundingVolumes;

  this._center = defaultValue(options.center, Cartesian3.ZERO);

  this._va = undefined;
  this._sp = undefined;
  this._spStencil = undefined;
  this._spPick = undefined;
  this._uniformMap = undefined;

  // Only used with WebGL 2 to ping-pong ibos after copy.
  this._vaSwap = undefined;

  this._rsStencilDepthPass = undefined;
  this._rsStencilDepthPass3DTiles = undefined;
  this._rsColorPass = undefined;
  this._rsPickPass = undefined;
  this._rsWireframe = undefined;

  this._commands = [];
  this._commandsIgnoreShow = [];
  this._pickCommands = [];

  this._constantColor = Color.clone(Color.WHITE);
  this._highlightColor = this._constantColor;

  this._batchDirty = true;
  this._pickCommandsDirty = true;
  this._framesSinceLastRebatch = 0;

  this._updatingAllCommands = false;

  this._trianglesLength = this._indices.length / 3;
  this._geometryByteLength =
    this._indices.byteLength +
    this._positions.byteLength +
    this._vertexBatchIds.byteLength;

  /**
   * Draw the wireframe of the classification meshes.
   * @type {boolean}
   * @default false
   */
  this.debugWireframe = false;
  this._debugWireframe = this.debugWireframe;
  this._wireframeDirty = false;

  /**
   * Forces a re-batch instead of waiting after a number of frames have been rendered. For testing only.
   * @type {boolean}
   * @default false
   */
  this.forceRebatch = false;

  /**
   * What this tile will classify.
   * @type {ClassificationType}
   * @default ClassificationType.BOTH
   */
  this.classificationType = defaultValue(
    options.classificationType,
    ClassificationType.BOTH
  );

  // Hidden options
  this._vertexShaderSource = options._vertexShaderSource;
  this._fragmentShaderSource = options._fragmentShaderSource;
  this._attributeLocations = options._attributeLocations;
  this._uniformMap = options._uniformMap;
  this._pickId = options._pickId;
  this._modelMatrix = options._modelMatrix;
  this._boundingSphere = options._boundingSphere;

  this._batchIdLookUp = {};

  const length = this._batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = this._batchIds[i];
    this._batchIdLookUp[batchId] = i;
  }
}

Object.defineProperties(Vector3DTilePrimitive.prototype, {
  /**
   * Gets the number of triangles.
   *
   * @memberof Vector3DTilePrimitive.prototype
   *
   * @type {number}
   * @readonly
   */
  trianglesLength: {
    get: function () {
      return this._trianglesLength;
    },
  },

  /**
   * Gets the geometry memory in bytes.
   *
   * @memberof Vector3DTilePrimitive.prototype
   *
   * @type {number}
   * @readonly
   */
  geometryByteLength: {
    get: function () {
      return this._geometryByteLength;
    },
  },
});

const defaultAttributeLocations = {
  position: 0,
  a_batchId: 1,
};

function createVertexArray(primitive, context) {
  if (defined(primitive._va)) {
    return;
  }

  const positionBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: primitive._positions,
    usage: BufferUsage.STATIC_DRAW,
  });
  const idBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: primitive._vertexBatchIds,
    usage: BufferUsage.STATIC_DRAW,
  });
  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: primitive._indices,
    usage: BufferUsage.DYNAMIC_DRAW,
    indexDatatype:
      primitive._indices.BYTES_PER_ELEMENT === 2
        ? IndexDatatype.UNSIGNED_SHORT
        : IndexDatatype.UNSIGNED_INT,
  });

  const vertexAttributes = [
    {
      index: 0,
      vertexBuffer: positionBuffer,
      componentDatatype: ComponentDatatype.fromTypedArray(primitive._positions),
      componentsPerAttribute: 3,
    },
    {
      index: 1,
      vertexBuffer: idBuffer,
      componentDatatype: ComponentDatatype.fromTypedArray(
        primitive._vertexBatchIds
      ),
      componentsPerAttribute: 1,
    },
  ];

  primitive._va = new VertexArray({
    context: context,
    attributes: vertexAttributes,
    indexBuffer: indexBuffer,
  });

  if (context.webgl2) {
    primitive._vaSwap = new VertexArray({
      context: context,
      attributes: vertexAttributes,
      indexBuffer: Buffer.createIndexBuffer({
        context: context,
        sizeInBytes: indexBuffer.sizeInBytes,
        usage: BufferUsage.DYNAMIC_DRAW,
        indexDatatype: indexBuffer.indexDatatype,
      }),
    });
  }

  primitive._batchedPositions = undefined;
  primitive._transferrableBatchIds = undefined;
  primitive._vertexBatchIds = undefined;
}

function createShaders(primitive, context) {
  if (defined(primitive._sp)) {
    return;
  }

  const batchTable = primitive._batchTable;
  const attributeLocations = defaultValue(
    primitive._attributeLocations,
    defaultAttributeLocations
  );

  let pickId = primitive._pickId;
  const vertexShaderSource = primitive._vertexShaderSource;
  let fragmentShaderSource = primitive._fragmentShaderSource;
  if (defined(vertexShaderSource)) {
    primitive._sp = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vertexShaderSource,
      fragmentShaderSource: fragmentShaderSource,
      attributeLocations: attributeLocations,
    });
    primitive._spStencil = primitive._sp;

    fragmentShaderSource = ShaderSource.replaceMain(
      fragmentShaderSource,
      "czm_non_pick_main"
    );
    fragmentShaderSource =
      `${fragmentShaderSource}void main() \n` +
      `{ \n` +
      `    czm_non_pick_main(); \n` +
      `    out_FragColor = ${pickId}; \n` +
      `} \n`;
    primitive._spPick = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vertexShaderSource,
      fragmentShaderSource: fragmentShaderSource,
      attributeLocations: attributeLocations,
    });
    return;
  }

  const vsSource = batchTable.getVertexShaderCallback(
    false,
    "a_batchId",
    undefined
  )(VectorTileVS);
  let fsSource = batchTable.getFragmentShaderCallback(
    false,
    undefined,
    true
  )(ShadowVolumeFS);

  pickId = batchTable.getPickId();

  let vs = new ShaderSource({
    sources: [vsSource],
  });
  let fs = new ShaderSource({
    defines: ["VECTOR_TILE"],
    sources: [fsSource],
  });

  primitive._sp = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });

  vs = new ShaderSource({
    sources: [VectorTileVS],
  });
  fs = new ShaderSource({
    defines: ["VECTOR_TILE"],
    sources: [ShadowVolumeFS],
  });

  primitive._spStencil = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });

  fsSource = ShaderSource.replaceMain(fsSource, "czm_non_pick_main");
  fsSource =
    `${fsSource}\n` +
    `void main() \n` +
    `{ \n` +
    `    czm_non_pick_main(); \n` +
    `    out_FragColor = ${pickId}; \n` +
    `} \n`;

  const pickVS = new ShaderSource({
    sources: [vsSource],
  });
  const pickFS = new ShaderSource({
    defines: ["VECTOR_TILE"],
    sources: [fsSource],
  });
  primitive._spPick = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: pickVS,
    fragmentShaderSource: pickFS,
    attributeLocations: attributeLocations,
  });
}

function getStencilDepthRenderState(mask3DTiles) {
  const stencilFunction = mask3DTiles
    ? StencilFunction.EQUAL
    : StencilFunction.ALWAYS;
  return {
    colorMask: {
      red: false,
      green: false,
      blue: false,
      alpha: false,
    },
    stencilTest: {
      enabled: true,
      frontFunction: stencilFunction,
      frontOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.DECREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      backFunction: stencilFunction,
      backOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.INCREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      reference: StencilConstants.CESIUM_3D_TILE_MASK,
      mask: StencilConstants.CESIUM_3D_TILE_MASK,
    },
    stencilMask: StencilConstants.CLASSIFICATION_MASK,
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
    depthMask: false,
  };
}

const colorRenderState = {
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.NOT_EQUAL,
    frontOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    backFunction: StencilFunction.NOT_EQUAL,
    backOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    reference: 0,
    mask: StencilConstants.CLASSIFICATION_MASK,
  },
  stencilMask: StencilConstants.CLASSIFICATION_MASK,
  depthTest: {
    enabled: false,
  },
  depthMask: false,
  blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
};

const pickRenderState = {
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.NOT_EQUAL,
    frontOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    backFunction: StencilFunction.NOT_EQUAL,
    backOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    reference: 0,
    mask: StencilConstants.CLASSIFICATION_MASK,
  },
  stencilMask: StencilConstants.CLASSIFICATION_MASK,
  depthTest: {
    enabled: false,
  },
  depthMask: false,
};

function createRenderStates(primitive) {
  if (defined(primitive._rsStencilDepthPass)) {
    return;
  }

  primitive._rsStencilDepthPass = RenderState.fromCache(
    getStencilDepthRenderState(false)
  );
  primitive._rsStencilDepthPass3DTiles = RenderState.fromCache(
    getStencilDepthRenderState(true)
  );
  primitive._rsColorPass = RenderState.fromCache(colorRenderState);
  primitive._rsPickPass = RenderState.fromCache(pickRenderState);
}

const modifiedModelViewScratch = new Matrix4();
const rtcScratch = new Cartesian3();

function createUniformMap(primitive, context) {
  if (defined(primitive._uniformMap)) {
    return;
  }

  const uniformMap = {
    u_modifiedModelViewProjection: function () {
      const viewMatrix = context.uniformState.view;
      const projectionMatrix = context.uniformState.projection;
      Matrix4.clone(viewMatrix, modifiedModelViewScratch);
      Matrix4.multiplyByPoint(
        modifiedModelViewScratch,
        primitive._center,
        rtcScratch
      );
      Matrix4.setTranslation(
        modifiedModelViewScratch,
        rtcScratch,
        modifiedModelViewScratch
      );
      Matrix4.multiply(
        projectionMatrix,
        modifiedModelViewScratch,
        modifiedModelViewScratch
      );
      return modifiedModelViewScratch;
    },
    u_highlightColor: function () {
      return primitive._highlightColor;
    },
  };

  primitive._uniformMap = primitive._batchTable.getUniformMapCallback()(
    uniformMap
  );
}

function copyIndicesCPU(
  indices,
  newIndices,
  currentOffset,
  offsets,
  counts,
  batchIds,
  batchIdLookUp
) {
  const sizeInBytes = indices.constructor.BYTES_PER_ELEMENT;

  const batchedIdsLength = batchIds.length;
  for (let j = 0; j < batchedIdsLength; ++j) {
    const batchedId = batchIds[j];
    const index = batchIdLookUp[batchedId];
    const offset = offsets[index];
    const count = counts[index];

    const subarray = new indices.constructor(
      indices.buffer,
      sizeInBytes * offset,
      count
    );
    newIndices.set(subarray, currentOffset);

    offsets[index] = currentOffset;
    currentOffset += count;
  }

  return currentOffset;
}

function rebatchCPU(primitive, batchedIndices) {
  const indices = primitive._indices;
  const indexOffsets = primitive._indexOffsets;
  const indexCounts = primitive._indexCounts;
  const batchIdLookUp = primitive._batchIdLookUp;

  const newIndices = new indices.constructor(indices.length);

  let current = batchedIndices.pop();
  const newBatchedIndices = [current];

  let currentOffset = copyIndicesCPU(
    indices,
    newIndices,
    0,
    indexOffsets,
    indexCounts,
    current.batchIds,
    batchIdLookUp
  );

  current.offset = 0;
  current.count = currentOffset;

  while (batchedIndices.length > 0) {
    const next = batchedIndices.pop();
    if (Color.equals(next.color, current.color)) {
      currentOffset = copyIndicesCPU(
        indices,
        newIndices,
        currentOffset,
        indexOffsets,
        indexCounts,
        next.batchIds,
        batchIdLookUp
      );
      current.batchIds = current.batchIds.concat(next.batchIds);
      current.count = currentOffset - current.offset;
    } else {
      const offset = currentOffset;
      currentOffset = copyIndicesCPU(
        indices,
        newIndices,
        currentOffset,
        indexOffsets,
        indexCounts,
        next.batchIds,
        batchIdLookUp
      );

      next.offset = offset;
      next.count = currentOffset - offset;
      newBatchedIndices.push(next);
      current = next;
    }
  }

  primitive._va.indexBuffer.copyFromArrayView(newIndices);

  primitive._indices = newIndices;
  primitive._batchedIndices = newBatchedIndices;
}

function copyIndicesGPU(
  readBuffer,
  writeBuffer,
  currentOffset,
  offsets,
  counts,
  batchIds,
  batchIdLookUp
) {
  const sizeInBytes = readBuffer.bytesPerIndex;

  const batchedIdsLength = batchIds.length;
  for (let j = 0; j < batchedIdsLength; ++j) {
    const batchedId = batchIds[j];
    const index = batchIdLookUp[batchedId];
    const offset = offsets[index];
    const count = counts[index];

    writeBuffer.copyFromBuffer(
      readBuffer,
      offset * sizeInBytes,
      currentOffset * sizeInBytes,
      count * sizeInBytes
    );

    offsets[index] = currentOffset;
    currentOffset += count;
  }

  return currentOffset;
}

function rebatchGPU(primitive, batchedIndices) {
  const indexOffsets = primitive._indexOffsets;
  const indexCounts = primitive._indexCounts;
  const batchIdLookUp = primitive._batchIdLookUp;

  let current = batchedIndices.pop();
  const newBatchedIndices = [current];

  const readBuffer = primitive._va.indexBuffer;
  const writeBuffer = primitive._vaSwap.indexBuffer;

  let currentOffset = copyIndicesGPU(
    readBuffer,
    writeBuffer,
    0,
    indexOffsets,
    indexCounts,
    current.batchIds,
    batchIdLookUp
  );

  current.offset = 0;
  current.count = currentOffset;

  while (batchedIndices.length > 0) {
    const next = batchedIndices.pop();
    if (Color.equals(next.color, current.color)) {
      currentOffset = copyIndicesGPU(
        readBuffer,
        writeBuffer,
        currentOffset,
        indexOffsets,
        indexCounts,
        next.batchIds,
        batchIdLookUp
      );
      current.batchIds = current.batchIds.concat(next.batchIds);
      current.count = currentOffset - current.offset;
    } else {
      const offset = currentOffset;
      currentOffset = copyIndicesGPU(
        readBuffer,
        writeBuffer,
        currentOffset,
        indexOffsets,
        indexCounts,
        next.batchIds,
        batchIdLookUp
      );
      next.offset = offset;
      next.count = currentOffset - offset;
      newBatchedIndices.push(next);
      current = next;
    }
  }

  const temp = primitive._va;
  primitive._va = primitive._vaSwap;
  primitive._vaSwap = temp;

  primitive._batchedIndices = newBatchedIndices;
}

function compareColors(a, b) {
  return b.color.toRgba() - a.color.toRgba();
}

// PERFORMANCE_IDEA: For WebGL 2, we can use copyBufferSubData for buffer-to-buffer copies.
// PERFORMANCE_IDEA: Not supported, but we could use glMultiDrawElements here.
function rebatchCommands(primitive, context) {
  if (!primitive._batchDirty) {
    return false;
  }

  const batchedIndices = primitive._batchedIndices;
  const length = batchedIndices.length;

  let needToRebatch = false;
  const colorCounts = {};

  for (let i = 0; i < length; ++i) {
    const color = batchedIndices[i].color;
    const rgba = color.toRgba();
    if (defined(colorCounts[rgba])) {
      needToRebatch = true;
      break;
    } else {
      colorCounts[rgba] = true;
    }
  }

  if (!needToRebatch) {
    primitive._batchDirty = false;
    return false;
  }

  if (
    needToRebatch &&
    !primitive.forceRebatch &&
    primitive._framesSinceLastRebatch < 120
  ) {
    ++primitive._framesSinceLastRebatch;
    return;
  }

  batchedIndices.sort(compareColors);

  if (context.webgl2) {
    rebatchGPU(primitive, batchedIndices);
  } else {
    rebatchCPU(primitive, batchedIndices);
  }

  primitive._framesSinceLastRebatch = 0;
  primitive._batchDirty = false;
  primitive._pickCommandsDirty = true;
  primitive._wireframeDirty = true;
  return true;
}

function createColorCommands(primitive, context) {
  const needsRebatch = rebatchCommands(primitive, context);

  const commands = primitive._commands;
  const batchedIndices = primitive._batchedIndices;
  const length = batchedIndices.length;
  const commandsLength = length * 2;

  if (
    defined(commands) &&
    !needsRebatch &&
    commands.length === commandsLength
  ) {
    return;
  }

  commands.length = commandsLength;

  const vertexArray = primitive._va;
  const sp = primitive._sp;
  const modelMatrix = defaultValue(primitive._modelMatrix, Matrix4.IDENTITY);
  const uniformMap = primitive._uniformMap;
  const bv = primitive._boundingVolume;

  for (let j = 0; j < length; ++j) {
    const offset = batchedIndices[j].offset;
    const count = batchedIndices[j].count;

    let stencilDepthCommand = commands[j * 2];
    if (!defined(stencilDepthCommand)) {
      stencilDepthCommand = commands[j * 2] = new DrawCommand({
        owner: primitive,
      });
    }

    stencilDepthCommand.vertexArray = vertexArray;
    stencilDepthCommand.modelMatrix = modelMatrix;
    stencilDepthCommand.offset = offset;
    stencilDepthCommand.count = count;
    stencilDepthCommand.renderState = primitive._rsStencilDepthPass;
    stencilDepthCommand.shaderProgram = sp;
    stencilDepthCommand.uniformMap = uniformMap;
    stencilDepthCommand.boundingVolume = bv;
    stencilDepthCommand.cull = false;
    stencilDepthCommand.pass = Pass.TERRAIN_CLASSIFICATION;

    const stencilDepthDerivedCommand = DrawCommand.shallowClone(
      stencilDepthCommand,
      stencilDepthCommand.derivedCommands.tileset
    );
    stencilDepthDerivedCommand.renderState =
      primitive._rsStencilDepthPass3DTiles;
    stencilDepthDerivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    stencilDepthCommand.derivedCommands.tileset = stencilDepthDerivedCommand;

    let colorCommand = commands[j * 2 + 1];
    if (!defined(colorCommand)) {
      colorCommand = commands[j * 2 + 1] = new DrawCommand({
        owner: primitive,
      });
    }

    colorCommand.vertexArray = vertexArray;
    colorCommand.modelMatrix = modelMatrix;
    colorCommand.offset = offset;
    colorCommand.count = count;
    colorCommand.renderState = primitive._rsColorPass;
    colorCommand.shaderProgram = sp;
    colorCommand.uniformMap = uniformMap;
    colorCommand.boundingVolume = bv;
    colorCommand.cull = false;
    colorCommand.pass = Pass.TERRAIN_CLASSIFICATION;

    const colorDerivedCommand = DrawCommand.shallowClone(
      colorCommand,
      colorCommand.derivedCommands.tileset
    );
    colorDerivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    colorCommand.derivedCommands.tileset = colorDerivedCommand;
  }

  primitive._commandsDirty = true;
}

function createColorCommandsIgnoreShow(primitive, frameState) {
  if (
    primitive.classificationType === ClassificationType.TERRAIN ||
    !frameState.invertClassification ||
    (defined(primitive._commandsIgnoreShow) && !primitive._commandsDirty)
  ) {
    return;
  }

  const commands = primitive._commands;
  const commandsIgnoreShow = primitive._commandsIgnoreShow;
  const spStencil = primitive._spStencil;

  const commandsLength = commands.length;
  const length = (commandsIgnoreShow.length = commandsLength / 2);

  let commandIndex = 0;
  for (let j = 0; j < length; ++j) {
    const commandIgnoreShow = (commandsIgnoreShow[j] = DrawCommand.shallowClone(
      commands[commandIndex],
      commandsIgnoreShow[j]
    ));
    commandIgnoreShow.shaderProgram = spStencil;
    commandIgnoreShow.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW;

    commandIndex += 2;
  }

  primitive._commandsDirty = false;
}

function createPickCommands(primitive) {
  if (!primitive._pickCommandsDirty) {
    return;
  }

  const length = primitive._indexOffsets.length;
  const pickCommands = primitive._pickCommands;
  pickCommands.length = length * 2;

  const vertexArray = primitive._va;
  const spStencil = primitive._spStencil;
  const spPick = primitive._spPick;
  const modelMatrix = defaultValue(primitive._modelMatrix, Matrix4.IDENTITY);
  const uniformMap = primitive._uniformMap;

  for (let j = 0; j < length; ++j) {
    const offset = primitive._indexOffsets[j];
    const count = primitive._indexCounts[j];
    const bv = defined(primitive._boundingVolumes)
      ? primitive._boundingVolumes[j]
      : primitive.boundingVolume;

    let stencilDepthCommand = pickCommands[j * 2];
    if (!defined(stencilDepthCommand)) {
      stencilDepthCommand = pickCommands[j * 2] = new DrawCommand({
        owner: primitive,
        pickOnly: true,
      });
    }

    stencilDepthCommand.vertexArray = vertexArray;
    stencilDepthCommand.modelMatrix = modelMatrix;
    stencilDepthCommand.offset = offset;
    stencilDepthCommand.count = count;
    stencilDepthCommand.renderState = primitive._rsStencilDepthPass;
    stencilDepthCommand.shaderProgram = spStencil;
    stencilDepthCommand.uniformMap = uniformMap;
    stencilDepthCommand.boundingVolume = bv;
    stencilDepthCommand.pass = Pass.TERRAIN_CLASSIFICATION;

    const stencilDepthDerivedCommand = DrawCommand.shallowClone(
      stencilDepthCommand,
      stencilDepthCommand.derivedCommands.tileset
    );
    stencilDepthDerivedCommand.renderState =
      primitive._rsStencilDepthPass3DTiles;
    stencilDepthDerivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    stencilDepthCommand.derivedCommands.tileset = stencilDepthDerivedCommand;

    let colorCommand = pickCommands[j * 2 + 1];
    if (!defined(colorCommand)) {
      colorCommand = pickCommands[j * 2 + 1] = new DrawCommand({
        owner: primitive,
        pickOnly: true,
      });
    }

    colorCommand.vertexArray = vertexArray;
    colorCommand.modelMatrix = modelMatrix;
    colorCommand.offset = offset;
    colorCommand.count = count;
    colorCommand.renderState = primitive._rsPickPass;
    colorCommand.shaderProgram = spPick;
    colorCommand.uniformMap = uniformMap;
    colorCommand.boundingVolume = bv;
    colorCommand.pass = Pass.TERRAIN_CLASSIFICATION;

    const colorDerivedCommand = DrawCommand.shallowClone(
      colorCommand,
      colorCommand.derivedCommands.tileset
    );
    colorDerivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    colorCommand.derivedCommands.tileset = colorDerivedCommand;
  }

  primitive._pickCommandsDirty = false;
}

/**
 * Creates features for each mesh and places it at the batch id index of features.
 *
 * @param {Vector3DTileContent} content The vector tile content.
 * @param {Cesium3DTileFeature[]} features An array of features where the polygon features will be placed.
 */
Vector3DTilePrimitive.prototype.createFeatures = function (content, features) {
  const batchIds = this._batchIds;
  const length = batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    features[batchId] = new Cesium3DTileFeature(content, batchId);
  }
};

/**
 * Colors the entire tile when enabled is true. The resulting color will be (mesh batch table color * color).
 *
 * @param {boolean} enabled Whether to enable debug coloring.
 * @param {Color} color The debug color.
 */
Vector3DTilePrimitive.prototype.applyDebugSettings = function (enabled, color) {
  this._highlightColor = enabled ? color : this._constantColor;
};

function clearStyle(polygons, features) {
  polygons._updatingAllCommands = true;

  const batchIds = polygons._batchIds;
  let length = batchIds.length;
  let i;

  for (i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    const feature = features[batchId];

    feature.show = true;
    feature.color = Color.WHITE;
  }

  const batchedIndices = polygons._batchedIndices;
  length = batchedIndices.length;

  for (i = 0; i < length; ++i) {
    batchedIndices[i].color = Color.clone(Color.WHITE);
  }

  polygons._updatingAllCommands = false;
  polygons._batchDirty = true;
}

const scratchColor = new Color();

const DEFAULT_COLOR_VALUE = Color.WHITE;
const DEFAULT_SHOW_VALUE = true;

const complexExpressionReg = /\$/;

/**
 * Apply a style to the content.
 *
 * @param {Cesium3DTileStyle} style The style.
 * @param {Cesium3DTileFeature[]} features The array of features.
 */
Vector3DTilePrimitive.prototype.applyStyle = function (style, features) {
  if (!defined(style)) {
    clearStyle(this, features);
    return;
  }

  const colorExpression = style.color;
  const isSimpleStyle =
    colorExpression instanceof Expression &&
    !complexExpressionReg.test(colorExpression.expression);
  this._updatingAllCommands = isSimpleStyle;

  const batchIds = this._batchIds;
  let length = batchIds.length;
  let i;

  for (i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    const feature = features[batchId];

    feature.color = defined(style.color)
      ? style.color.evaluateColor(feature, scratchColor)
      : DEFAULT_COLOR_VALUE;
    feature.show = defined(style.show)
      ? style.show.evaluate(feature)
      : DEFAULT_SHOW_VALUE;
  }

  if (isSimpleStyle) {
    const batchedIndices = this._batchedIndices;
    length = batchedIndices.length;

    for (i = 0; i < length; ++i) {
      batchedIndices[i].color = Color.clone(Color.WHITE);
    }

    this._updatingAllCommands = false;
    this._batchDirty = true;
  }
};

/**
 * Call when updating the color of a mesh with batchId changes color. The meshes will need to be re-batched
 * on the next update.
 *
 * @param {number} batchId The batch id of the meshes whose color has changed.
 * @param {Color} color The new polygon color.
 */
Vector3DTilePrimitive.prototype.updateCommands = function (batchId, color) {
  if (this._updatingAllCommands) {
    return;
  }

  const batchIdLookUp = this._batchIdLookUp;
  const index = batchIdLookUp[batchId];
  if (!defined(index)) {
    return;
  }

  const indexOffsets = this._indexOffsets;
  const indexCounts = this._indexCounts;

  const offset = indexOffsets[index];
  const count = indexCounts[index];

  const batchedIndices = this._batchedIndices;
  const length = batchedIndices.length;

  let i;
  for (i = 0; i < length; ++i) {
    const batchedOffset = batchedIndices[i].offset;
    const batchedCount = batchedIndices[i].count;

    if (offset >= batchedOffset && offset < batchedOffset + batchedCount) {
      break;
    }
  }

  batchedIndices.push(
    new Vector3DTileBatch({
      color: Color.clone(color),
      offset: offset,
      count: count,
      batchIds: [batchId],
    })
  );

  const startIds = [];
  const endIds = [];

  const batchIds = batchedIndices[i].batchIds;
  const batchIdsLength = batchIds.length;

  for (let j = 0; j < batchIdsLength; ++j) {
    const id = batchIds[j];
    if (id === batchId) {
      continue;
    }

    const offsetIndex = batchIdLookUp[id];
    if (indexOffsets[offsetIndex] < offset) {
      startIds.push(id);
    } else {
      endIds.push(id);
    }
  }

  if (endIds.length !== 0) {
    batchedIndices.push(
      new Vector3DTileBatch({
        color: Color.clone(batchedIndices[i].color),
        offset: offset + count,
        count:
          batchedIndices[i].offset + batchedIndices[i].count - (offset + count),
        batchIds: endIds,
      })
    );
  }

  if (startIds.length !== 0) {
    batchedIndices[i].count = offset - batchedIndices[i].offset;
    batchedIndices[i].batchIds = startIds;
  } else {
    batchedIndices.splice(i, 1);
  }

  this._batchDirty = true;
};

function queueCommands(primitive, frameState, commands, commandsIgnoreShow) {
  const classificationType = primitive.classificationType;
  const queueTerrainCommands =
    classificationType !== ClassificationType.CESIUM_3D_TILE;
  const queue3DTilesCommands =
    classificationType !== ClassificationType.TERRAIN;

  const commandList = frameState.commandList;
  let commandLength = commands.length;
  let command;
  let i;
  for (i = 0; i < commandLength; ++i) {
    if (queueTerrainCommands) {
      command = commands[i];
      command.pass = Pass.TERRAIN_CLASSIFICATION;
      commandList.push(command);
    }
    if (queue3DTilesCommands) {
      command = commands[i].derivedCommands.tileset;
      command.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
      commandList.push(command);
    }
  }

  if (!frameState.invertClassification || !defined(commandsIgnoreShow)) {
    return;
  }

  commandLength = commandsIgnoreShow.length;
  for (i = 0; i < commandLength; ++i) {
    commandList.push(commandsIgnoreShow[i]);
  }
}

function queueWireframeCommands(frameState, commands) {
  const commandList = frameState.commandList;
  const commandLength = commands.length;
  for (let i = 0; i < commandLength; i += 2) {
    const command = commands[i + 1];
    command.pass = Pass.OPAQUE;
    commandList.push(command);
  }
}

function updateWireframe(primitive) {
  let earlyExit = primitive.debugWireframe === primitive._debugWireframe;
  earlyExit =
    earlyExit && !(primitive.debugWireframe && primitive._wireframeDirty);
  if (earlyExit) {
    return;
  }

  if (!defined(primitive._rsWireframe)) {
    primitive._rsWireframe = RenderState.fromCache({});
  }

  let rs;
  let type;

  if (primitive.debugWireframe) {
    rs = primitive._rsWireframe;
    type = PrimitiveType.LINES;
  } else {
    rs = primitive._rsColorPass;
    type = PrimitiveType.TRIANGLES;
  }

  const commands = primitive._commands;
  const commandLength = commands.length;
  for (let i = 0; i < commandLength; i += 2) {
    const command = commands[i + 1];
    command.renderState = rs;
    command.primitiveType = type;
  }

  primitive._debugWireframe = primitive.debugWireframe;
  primitive._wireframeDirty = false;
}

/**
 * Updates the batches and queues the commands for rendering.
 *
 * @param {FrameState} frameState The current frame state.
 */
Vector3DTilePrimitive.prototype.update = function (frameState) {
  const context = frameState.context;

  createVertexArray(this, context);
  createShaders(this, context);
  createRenderStates(this);
  createUniformMap(this, context);

  const passes = frameState.passes;
  if (passes.render) {
    createColorCommands(this, context);
    createColorCommandsIgnoreShow(this, frameState);
    updateWireframe(this);

    if (this._debugWireframe) {
      queueWireframeCommands(frameState, this._commands);
    } else {
      queueCommands(this, frameState, this._commands, this._commandsIgnoreShow);
    }
  }

  if (passes.pick) {
    createPickCommands(this);
    queueCommands(this, frameState, this._pickCommands);
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
Vector3DTilePrimitive.prototype.isDestroyed = function () {
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
 */
Vector3DTilePrimitive.prototype.destroy = function () {
  this._va = this._va && this._va.destroy();
  this._sp = this._sp && this._sp.destroy();
  this._spPick = this._spPick && this._spPick.destroy();
  this._vaSwap = this._vaSwap && this._vaSwap.destroy();
  return destroyObject(this);
};
export default Vector3DTilePrimitive;
