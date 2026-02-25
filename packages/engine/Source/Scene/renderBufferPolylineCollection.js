// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import BufferPolyline from "./BufferPolyline.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import VertexArray from "../Renderer/VertexArray.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import BlendingState from "./BlendingState.js";
import Color from "../Core/Color.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import BufferPolylineCollectionVS from "../Shaders/BufferPolylineCollectionVS.js";
import BufferPolylineCollectionFS from "../Shaders/BufferPolylineCollectionFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import PolylineCommon from "../Shaders/PolylineCommon.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * @typedef {'positionHigh' | 'positionLow' | 'prevPositionHigh' | 'prevPositionLow' | 'nextPositionHigh' | 'nextPositionLow' | 'showColorWidthAndTexCoord'} BufferPolylineAttribute
 * @ignore
 */

/**
 * @type {Record<BufferPolylineAttribute, number>}
 * @ignore
 */
const BufferPolylineAttributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  prevPositionHigh: 2,
  prevPositionLow: 3,
  nextPositionHigh: 4,
  nextPositionLow: 5,
  showColorWidthAndTexCoord: 6,
};

/**
 * @typedef {object} BufferPolylineRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<BufferPolylineAttribute, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {object} [uniformMap]
 * @ignore
 */

// Scratch variables.
const polyline = new BufferPolyline();
const color = new Color();
const cartesian = new Cartesian3();
const prevCartesian = new Cartesian3();
const nextCartesian = new Cartesian3();
const encodedCartesian = new EncodedCartesian3();
const prevEncodedCartesian = new EncodedCartesian3();
const nextEncodedCartesian = new EncodedCartesian3();

/**
 * Renders line segments as quads, each composed of two triangles. Writes each
 * vertex twice, extruding the pairs in opposing directions outward.
 *
 * Tips:
 * - Number of segments in a polyline primitive = `vertexCount - 1`
 * - Number of segments in a collection = `vertexCount - primitiveCount`
 * - Number of rendered vertices = `vertexCount * 2`
 * - Number of indices = `segmentCount * 6`
 *
 * 0 - 1 - 4 - 6 - 8
 * | \ | \ | \ | \ | ...
 * 3 - 2 - 5 - 7 - 9
 *
 * @param {BufferPolylineCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPolylineRenderContext} [renderContext]
 * @returns {BufferPolylineRenderContext}
 * @ignore
 */
function renderBufferPolylineCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {};

  if (
    !defined(renderContext.attributeArrays) ||
    !defined(renderContext.indexArray)
  ) {
    // Number of primitives can only increase, which _decreases_ remaining
    // segment capacity: use `primitiveCount` here, not `primitiveCountMax`.
    const segmentCountMax =
      collection.vertexCountMax - collection.primitiveCount;
    const vertexCountMax = collection.vertexCountMax * 2;

    renderContext.indexArray = new Uint32Array(segmentCountMax * 6);
    renderContext.attributeArrays = {
      positionHigh: new Float32Array(vertexCountMax * 3),
      positionLow: new Float32Array(vertexCountMax * 3),
      prevPositionHigh: new Float32Array(vertexCountMax * 3),
      prevPositionLow: new Float32Array(vertexCountMax * 3),
      nextPositionHigh: new Float32Array(vertexCountMax * 3),
      nextPositionLow: new Float32Array(vertexCountMax * 3),
      showColorWidthAndTexCoord: new Float32Array(vertexCountMax * 4),
    };
  }

  if (collection._dirtyCount > 0) {
    const { _dirtyOffset, _dirtyCount } = collection;
    const { attributeArrays } = renderContext;

    const indexArray = renderContext.indexArray;
    const positionHighArray = attributeArrays.positionHigh;
    const positionLowArray = attributeArrays.positionLow;
    const prevPositionHighArray = attributeArrays.prevPositionHigh;
    const prevPositionLowArray = attributeArrays.prevPositionLow;
    const nextPositionHighArray = attributeArrays.nextPositionHigh;
    const nextPositionLowArray = attributeArrays.nextPositionLow;
    const showColorWidthAndTexCoordArray =
      attributeArrays.showColorWidthAndTexCoord;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polyline);

      if (!polyline._dirty) {
        continue;
      }

      const cartesianArray = polyline.getPositions();
      polyline.getColor(color);
      const show = polyline.show;
      const width = polyline.width;

      let vOffset = polyline.vertexOffset * 2; // vertex offset
      let iOffset = (polyline.vertexOffset - i) * 6; // index offset

      for (let j = 0, jl = polyline.vertexCount; j < jl; j++) {
        const isFirstSegment = j === 0;
        const isLastSegment = j === jl - 1;

        // For first/last vertices, infer missing vertices by mirroring the segment.
        Cartesian3.fromArray(cartesianArray, j * 3, cartesian);
        if (isFirstSegment) {
          Cartesian3.fromArray(cartesianArray, (j + 1) * 3, nextCartesian);
          Cartesian3.subtract(cartesian, nextCartesian, prevCartesian);
          Cartesian3.add(cartesian, prevCartesian, prevCartesian);
        } else if (isLastSegment) {
          Cartesian3.fromArray(cartesianArray, (j - 1) * 3, prevCartesian);
          Cartesian3.subtract(cartesian, prevCartesian, nextCartesian);
          Cartesian3.add(cartesian, nextCartesian, nextCartesian);
        } else {
          Cartesian3.fromArray(cartesianArray, (j - 1) * 3, prevCartesian);
          Cartesian3.fromArray(cartesianArray, (j + 1) * 3, nextCartesian);
        }

        // For each segment, draw two triangles.
        if (!isLastSegment) {
          indexArray[iOffset] = vOffset;
          indexArray[iOffset + 1] = vOffset + 1;
          indexArray[iOffset + 2] = vOffset + 2;

          indexArray[iOffset + 3] = vOffset + 2;
          indexArray[iOffset + 4] = vOffset + 1;
          indexArray[iOffset + 5] = vOffset + 3;

          iOffset += 6;
        }

        EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);
        EncodedCartesian3.fromCartesian(prevCartesian, prevEncodedCartesian);
        EncodedCartesian3.fromCartesian(nextCartesian, nextEncodedCartesian);

        // TODO(donmccurdy): Diverging from PolylineCollection.js, which writes
        // internal vertices to buffer 4x, not 2x. Not sure that's needed?
        for (let k = 0; k < 2; k++) {
          // Position.
          positionHighArray[vOffset * 3] = encodedCartesian.high.x;
          positionHighArray[vOffset * 3 + 1] = encodedCartesian.high.y;
          positionHighArray[vOffset * 3 + 2] = encodedCartesian.high.z;

          positionLowArray[vOffset * 3] = encodedCartesian.low.x;
          positionLowArray[vOffset * 3 + 1] = encodedCartesian.low.y;
          positionLowArray[vOffset * 3 + 2] = encodedCartesian.low.z;

          // Previous position.
          prevPositionHighArray[vOffset * 3] = prevEncodedCartesian.high.x;
          prevPositionHighArray[vOffset * 3 + 1] = prevEncodedCartesian.high.y;
          prevPositionHighArray[vOffset * 3 + 2] = prevEncodedCartesian.high.z;

          prevPositionLowArray[vOffset * 3] = prevEncodedCartesian.low.x;
          prevPositionLowArray[vOffset * 3 + 1] = prevEncodedCartesian.low.y;
          prevPositionLowArray[vOffset * 3 + 2] = prevEncodedCartesian.low.z;

          // Next position.
          nextPositionHighArray[vOffset * 3] = nextEncodedCartesian.high.x;
          nextPositionHighArray[vOffset * 3 + 1] = nextEncodedCartesian.high.y;
          nextPositionHighArray[vOffset * 3 + 2] = nextEncodedCartesian.high.z;

          nextPositionLowArray[vOffset * 3] = nextEncodedCartesian.low.x;
          nextPositionLowArray[vOffset * 3 + 1] = nextEncodedCartesian.low.y;
          nextPositionLowArray[vOffset * 3 + 2] = nextEncodedCartesian.low.z;

          // Properties.
          showColorWidthAndTexCoordArray[vOffset * 4] = show ? 1 : 0;
          showColorWidthAndTexCoordArray[vOffset * 4 + 1] =
            AttributeCompression.encodeRGB8(color);
          showColorWidthAndTexCoordArray[vOffset * 4 + 2] = width;
          showColorWidthAndTexCoordArray[vOffset * 4 + 3] = j / (jl - 1); // texcoord.s

          vOffset++;
        }
      }

      polyline._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const attributeArrays = renderContext.attributeArrays;

    renderContext.vertexArray = new VertexArray({
      context,

      indexBuffer: Buffer.createIndexBuffer({
        context,
        typedArray: renderContext.indexArray,
        // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
        usage: BufferUsage.STATIC_DRAW,
        // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
        indexDatatype: IndexDatatype.UNSIGNED_INT,
      }),

      attributes: [
        {
          index: BufferPolylineAttributeLocations.positionHigh,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.positionHigh,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPolylineAttributeLocations.positionLow,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.positionLow,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },

        {
          index: BufferPolylineAttributeLocations.prevPositionHigh,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.prevPositionHigh,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPolylineAttributeLocations.prevPositionLow,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.prevPositionLow,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },

        {
          index: BufferPolylineAttributeLocations.nextPositionHigh,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.nextPositionHigh,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPolylineAttributeLocations.nextPositionLow,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.nextPositionLow,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },

        {
          index: BufferPolylineAttributeLocations.showColorWidthAndTexCoord,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showColorWidthAndTexCoord,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    const { indexOffset, indexCount, vertexOffset, vertexCount } =
      getPolylineDirtyRanges(collection);

    renderContext.vertexArray.copyIndexFromRange(
      renderContext.indexArray,
      indexOffset,
      indexCount,
    );

    for (const key in BufferPolylineAttributeLocations) {
      if (Object.hasOwn(BufferPolylineAttributeLocations, key)) {
        const attribute = /** @type {BufferPolylineAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          BufferPolylineAttributeLocations[attribute],
          renderContext.attributeArrays[attribute],
          vertexOffset,
          vertexCount,
        );
      }
    }
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending: BlendingState.DISABLED,
      depthMask: false,
      depthTest: { enabled: true },
      polygonOffset: { enabled: false },
    });
  }

  if (!defined(renderContext.uniformMap)) {
    renderContext.uniformMap = {};
  }

  if (!defined(renderContext.shaderProgram)) {
    const vertexShaderSource = new ShaderSource({
      sources: [PolylineCommon, BufferPolylineCollectionVS],
    });

    const fragmentShaderSource = new ShaderSource({
      sources: [BufferPolylineCollectionFS],
    });

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: BufferPolylineAttributeLocations,
    });
  }

  const command = new DrawCommand({
    primitiveType: PrimitiveType.TRIANGLES,
    pass: Pass.OPAQUE,

    vertexArray: renderContext.vertexArray,

    renderState: renderContext.renderState,
    shaderProgram: renderContext.shaderProgram,
    uniformMap: renderContext.uniformMap,

    owner: collection,
    count: (collection.vertexCount - collection.primitiveCount) * 6,
    boundingVolume: collection.boundingVolume,
    debugShowBoundingVolume: collection.debugShowBoundingVolume,
  });

  frameState.commandList.push(command);

  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;

  return renderContext;
}

/**
 * Computes dirty ranges for attribute and index buffers in a collection.
 * @param {BufferPolylineCollection} collection
 * @returns {{indexOffset: number, indexCount: number, vertexOffset: number, vertexCount: number}}
 */
function getPolylineDirtyRanges(collection) {
  const { _dirtyOffset, _dirtyCount } = collection;

  collection.get(_dirtyOffset, polyline);
  const vertexOffset = polyline.vertexOffset * 2;
  const segmentOffset = vertexOffset - _dirtyOffset;
  const indexOffset = segmentOffset * 6;

  collection.get(_dirtyOffset + _dirtyCount - 1, polyline);
  const vertexCount =
    (polyline.vertexOffset + polyline.vertexCount) * 2 - vertexOffset;
  const segmentCount = vertexCount / 2 - _dirtyCount;
  const indexCount = segmentCount * 6;

  return { indexOffset, indexCount, vertexOffset, vertexCount };
}

export default renderBufferPolylineCollection;
