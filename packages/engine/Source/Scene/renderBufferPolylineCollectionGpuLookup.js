// @ts-check

import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import defined from "../Core/defined.js";
import IndexDatatype from "../Core/IndexDatatype.js";
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
  if (!defined(renderContext)) {
    renderContext = { destroy: () => {} };
  }

  // @ts-expect-error TODO
  const lookup = collection._vectorTileGpuLookup;

  if (!defined(renderContext.vertexArray)) {
    renderContext.lookup = lookup;
    const textures = createLookupTextures(context, lookup);
    renderContext.segmentTexture = textures.segmentTexture;
    renderContext.gridCellIndicesTexture = textures.gridCellIndicesTexture;
    renderContext.vertexArray = createVertexArray(context, lookup);
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

  if (!defined(renderContext.command)) {
    const lookup = renderContext.lookup;
    renderContext.command = new DrawCommand({
      vertexArray: renderContext.vertexArray,
      renderState: renderContext.renderState,
      shaderProgram: renderContext.shaderProgram,
      primitiveType: PrimitiveType.TRIANGLES,
      pass: Pass.OPAQUE,
      owner: collection,
      count: lookup.indices.length,
      modelMatrix: lookup.modelMatrix,
      boundingVolume: lookup.boundingVolume,
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
