// @ts-check

import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import defined from "../Core/defined.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import Pass from "../Renderer/Pass.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import VertexArray from "../Renderer/VertexArray.js";
import BlendingState from "./BlendingState.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";
import { buildPolylineCollectionGpuLookup } from "./buildBufferCollectionGpuLookup.js";
import BufferCollectionGpuLookupVS from "../Shaders/BufferCollectionGpuLookupVS.js";
import BufferPolylineCollectionGpuLookupFS from "../Shaders/BufferPolylineCollectionGpuLookupFS.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */

// This renderer draws the tile surface patch and lets the fragment shader
// resolve line coverage from the packed segment lookup textures.

const attributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  texCoord: 2,
};

const polylineScratch = new BufferPolyline();
const materialScratch = new BufferPolylineMaterial();
const colorScratch = new Color();
const encodedScratch = new EncodedCartesian3();
const cartesianScratch = new Cartesian3();
const defaultQuadTexCoords = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

/**
 * @param {BufferPolylineCollection} collection
 * @param {BufferPolyline} result
 * @returns {BufferPolyline|undefined}
 */
function getFirstVisiblePolyline(collection, result) {
  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, result);
    if (result.show) {
      return result;
    }
  }
  return undefined;
}

/**
 * @param {*} context
 * @param {*} lookup
 * @returns {*}
 */
function createLookupTextures(context, lookup) {
  const sampler = new Sampler({
    wrapS: TextureWrap.CLAMP_TO_EDGE,
    wrapT: TextureWrap.CLAMP_TO_EDGE,
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  });

  return {
    // @ts-expect-error Private in TS declarations, used internally by renderer code.
    segmentTexture: Texture.create({
      context: context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: lookup.segmentTextureWidth,
        height: lookup.segmentTextureHeight,
        arrayBufferView: lookup.segmentTexels,
      },
      sampler: sampler,
      flipY: false,
    }),
    // @ts-expect-error Private in TS declarations, used internally by renderer code.
    gridCellIndicesTexture: Texture.create({
      context: context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: lookup.gridCellIndices.length,
        height: 1,
        arrayBufferView: new Float32Array(lookup.gridCellIndices),
      },
      sampler: sampler,
      flipY: false,
    }),
  };
}

/**
 * @param {*} context
 * @param {*} lookup
 * @returns {VertexArray}
 */
function createVertexArray(context, lookup) {
  const positions = defined(lookup.positions)
    ? lookup.positions
    : lookup.quadPositions;
  const texCoords = defined(lookup.texCoords)
    ? lookup.texCoords
    : defaultQuadTexCoords;
  const indices = defined(lookup.indices)
    ? lookup.indices
    : new Uint16Array([0, 1, 2, 0, 2, 3]);
  const vertexCount = positions.length / 3;
  const positionsHigh = new Float32Array(vertexCount * 3);
  const positionsLow = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    EncodedCartesian3.fromCartesian(
      Cartesian3.fromArray(positions, i * 3, cartesianScratch),
      encodedScratch,
    );

    positionsHigh[i * 3] = encodedScratch.high.x;
    positionsHigh[i * 3 + 1] = encodedScratch.high.y;
    positionsHigh[i * 3 + 2] = encodedScratch.high.z;

    positionsLow[i * 3] = encodedScratch.low.x;
    positionsLow[i * 3 + 1] = encodedScratch.low.y;
    positionsLow[i * 3 + 2] = encodedScratch.low.z;
  }

  return new VertexArray({
    context: context,
    indexBuffer: Buffer.createIndexBuffer({
      context: context,
      typedArray: indices,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      usage: BufferUsage.STATIC_DRAW,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      indexDatatype: IndexDatatype.fromTypedArray(indices),
    }),
    attributes: [
      {
        index: attributeLocations.positionHigh,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        vertexBuffer: Buffer.createVertexBuffer({
          context: context,
          typedArray: positionsHigh,
          // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
          usage: BufferUsage.STATIC_DRAW,
        }),
      },
      {
        index: attributeLocations.positionLow,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        vertexBuffer: Buffer.createVertexBuffer({
          context: context,
          typedArray: positionsLow,
          // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
          usage: BufferUsage.STATIC_DRAW,
        }),
      },
      {
        index: attributeLocations.texCoord,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        vertexBuffer: Buffer.createVertexBuffer({
          context: context,
          typedArray: texCoords,
          // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
          usage: BufferUsage.STATIC_DRAW,
        }),
      },
    ],
  });
}

/**
 * @this {*}
 */
function destroyRenderContext() {
  if (defined(this.vertexArray) && !this.vertexArray.isDestroyed()) {
    this.vertexArray.destroy();
  }
  this.vertexArray = undefined;

  if (defined(this.shaderProgram) && !this.shaderProgram.isDestroyed()) {
    this.shaderProgram.destroy();
  }
  this.shaderProgram = undefined;

  if (defined(this.segmentTexture) && !this.segmentTexture.isDestroyed()) {
    this.segmentTexture.destroy();
  }
  this.segmentTexture = undefined;

  if (
    defined(this.gridCellIndicesTexture) &&
    !this.gridCellIndicesTexture.isDestroyed()
  ) {
    this.gridCellIndicesTexture.destroy();
  }
  this.gridCellIndicesTexture = undefined;
  if (defined(this.renderState)) {
    RenderState.removeFromCache(this.renderState);
  }
  this.renderState = undefined;
  this.command = undefined;
  this.lookup = undefined;
}

/**
 * @param {BufferPolylineCollection} collection
 * @param {*} lookup
 * @returns {Matrix4}
 */
function getLookupModelMatrix(collection, lookup) {
  return defined(lookup.modelMatrix)
    ? lookup.modelMatrix
    : collection.modelMatrix;
}

/**
 * @param {BufferPolylineCollection} collection
 * @param {*} lookup
 * @returns {BoundingSphere}
 */
function getLookupBoundingVolume(collection, lookup) {
  return defined(lookup.boundingVolume)
    ? lookup.boundingVolume
    : collection.boundingVolumeWC;
}

/**
 * @param {*} lookup
 * @returns {number}
 */
function getLookupIndexCount(lookup) {
  return defined(lookup.indices) ? lookup.indices.length : 6;
}

/**
 * @param {BufferPolylineCollection} collection
 * @param {DrawCommand} command
 * @param {*} lookup
 * @returns {boolean}
 */
function isCommandDirty(collection, command, lookup) {
  return (
    getLookupIndexCount(lookup) !== command._count ||
    !Matrix4.equals(
      getLookupModelMatrix(collection, lookup),
      command._modelMatrix,
    ) ||
    !BoundingSphere.equals(
      getLookupBoundingVolume(collection, lookup),
      command._boundingVolume,
    )
  );
}

/**
 * @param {BufferPolylineCollection} collection
 * @param {FrameState} frameState
 * @param {*} [renderContext]
 * @returns {*}
 */
export default function renderBufferPolylineCollectionGpuLookup(
  collection,
  frameState,
  renderContext,
) {
  const context = frameState.context;
  if (!defined(renderContext) || renderContext.type !== "gpuLookup") {
    renderContext = { destroy: destroyRenderContext, type: "gpuLookup" };
  }

  // @ts-expect-error Temporary internal collection extension for tile-shared gpu lookup.
  const sharedLookup = collection._vectorTileGpuLookup;
  if (defined(sharedLookup) && sharedLookup.ownerCollection !== collection) {
    if (renderContext.lookup !== sharedLookup) {
      renderContext.destroy();
      renderContext.lookup = sharedLookup;
    }
    collection._dirtyCount = 0;
    collection._dirtyOffset = 0;
    return renderContext;
  }

  const needsSharedRebuild =
    defined(sharedLookup) &&
    (renderContext.lookup !== sharedLookup ||
      !defined(renderContext.vertexArray));
  const needsCollectionRebuild =
    !defined(sharedLookup) &&
    (!defined(renderContext.lookup) ||
      collection._dirtyCount > 0 ||
      !defined(renderContext.vertexArray));
  if (needsSharedRebuild || needsCollectionRebuild) {
    renderContext.destroy();

    const lookup = defined(sharedLookup)
      ? sharedLookup
      : buildPolylineCollectionGpuLookup(collection);
    if (!defined(lookup)) {
      return undefined;
    }

    renderContext.lookup = lookup;
    const textures = createLookupTextures(context, lookup);
    renderContext.segmentTexture = textures.segmentTexture;
    renderContext.gridCellIndicesTexture = textures.gridCellIndicesTexture;
    renderContext.vertexArray = createVertexArray(context, lookup);
    renderContext.command = undefined;
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending: BlendingState.DISABLED,
      depthTest: { enabled: true },
    });
  }

  if (!defined(renderContext.shaderProgram)) {
    renderContext.shaderProgram = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: new ShaderSource({
        sources: [BufferCollectionGpuLookupVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPolylineCollectionGpuLookupFS],
      }),
      attributeLocations: attributeLocations,
    });
  }

  if (
    !defined(renderContext.command) ||
    isCommandDirty(collection, renderContext.command, renderContext.lookup)
  ) {
    const lookup = renderContext.lookup;
    renderContext.command = new DrawCommand({
      vertexArray: renderContext.vertexArray,
      renderState: renderContext.renderState,
      shaderProgram: renderContext.shaderProgram,
      primitiveType: PrimitiveType.TRIANGLES,
      pass: Pass.OPAQUE,
      owner: collection,
      count: getLookupIndexCount(lookup),
      modelMatrix: getLookupModelMatrix(collection, lookup),
      boundingVolume: getLookupBoundingVolume(collection, lookup),
      debugShowBoundingVolume: collection.debugShowBoundingVolume,
      uniformMap: {
        u_segmentTexture: function () {
          return renderContext.segmentTexture;
        },
        u_gridCellIndicesTexture: function () {
          return renderContext.gridCellIndicesTexture;
        },
        u_color: function () {
          if (!defined(getFirstVisiblePolyline(collection, polylineScratch))) {
            return Color.WHITE;
          }
          polylineScratch.getMaterial(materialScratch);
          return Color.clone(materialScratch.color, colorScratch);
        },
        u_lineWidth: function () {
          if (!defined(getFirstVisiblePolyline(collection, polylineScratch))) {
            return 1.0;
          }
          polylineScratch.getMaterial(materialScratch);
          return materialScratch.width;
        },
      },
    });
  }

  frameState.commandList.push(renderContext.command);
  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;
  return renderContext;
}
