// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import BufferPolygon from "./BufferPolygon.js";
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
import BufferPolygonCollectionVS from "../Shaders/BufferPolygonCollectionVS.js";
import BufferPolygonCollectionFS from "../Shaders/BufferPolygonCollectionFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import IndexDatatype from "../Core/IndexDatatype.js";

/** @import {TypedArray} from "../Core/globalTypes.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolygonCollection from "./BufferPolygonCollection.js"; */

/**
 * @typedef {'positionHigh' | 'positionLow' | 'showAndColor'} BufferPolygonAttribute
 * @ignore
 */

/**
 * @type {Record<BufferPolygonAttribute, number>}
 * @ignore
 */
const BufferPolygonAttributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  showAndColor: 2,
};

/**
 * @typedef {object} BufferPolygonRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<BufferPolygonAttribute, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {object} [uniformMap]
 * @ignore
 */

// Scratch variables.
const polygon = new BufferPolygon();
const color = new Color();
const cartesian = new Cartesian3();
const encodedCartesian = new EncodedCartesian3();

/**
 * @param {BufferPolygonCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPolygonRenderContext} [renderContext]
 * @returns {BufferPolygonRenderContext}
 * @ignore
 */
function renderBufferPolygonCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {};

  if (
    !defined(renderContext.attributeArrays) ||
    !defined(renderContext.indexArray)
  ) {
    const { vertexCountMax, triangleCountMax } = collection;

    renderContext.indexArray = new Uint32Array(triangleCountMax * 3);
    renderContext.attributeArrays = {
      positionHigh: new Float32Array(vertexCountMax * 3),
      positionLow: new Float32Array(vertexCountMax * 3),
      showAndColor: new Float32Array(vertexCountMax * 2),
    };
  }

  if (collection._dirtyCount > 0) {
    const { attributeArrays } = renderContext;
    const { _dirtyOffset, _dirtyCount } = collection;

    const indexArray = renderContext.indexArray;
    const positionHighArray = attributeArrays.positionHigh;
    const positionLowArray = attributeArrays.positionLow;
    const showAndColorArray = attributeArrays.showAndColor;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polygon);

      if (!polygon._dirty) {
        continue;
      }

      const show = polygon.show;
      const polygonIndexArray = polygon.getTriangles();
      const cartesianArray = polygon.getPositions();
      const encodedColor = AttributeCompression.encodeRGB8(
        polygon.getColor(color),
      );

      let vOffset = polygon._getUint32(
        BufferPolygon.Layout.POSITION_OFFSET_U32,
      );
      let iOffset = polygon._getUint32(
        BufferPolygon.Layout.TRIANGLE_OFFSET_U32,
      );

      for (let j = 0, jl = polygon.triangleCount; j < jl; j++) {
        indexArray[iOffset * 3] = polygonIndexArray[j * 3] + vOffset;
        indexArray[iOffset * 3 + 1] = polygonIndexArray[j * 3 + 1] + vOffset;
        indexArray[iOffset * 3 + 2] = polygonIndexArray[j * 3 + 2] + vOffset;

        iOffset++;
      }

      for (let j = 0, jl = polygon.vertexCount; j < jl; j++) {
        Cartesian3.fromArray(cartesianArray, j * 3, cartesian);
        EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

        positionHighArray[vOffset * 3] = encodedCartesian.high.x;
        positionHighArray[vOffset * 3 + 1] = encodedCartesian.high.y;
        positionHighArray[vOffset * 3 + 2] = encodedCartesian.high.z;

        positionLowArray[vOffset * 3] = encodedCartesian.low.x;
        positionLowArray[vOffset * 3 + 1] = encodedCartesian.low.y;
        positionLowArray[vOffset * 3 + 2] = encodedCartesian.low.z;

        showAndColorArray[vOffset * 2] = show ? 1 : 0;
        showAndColorArray[vOffset * 2 + 1] = encodedColor;

        vOffset++;
      }

      polygon._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const { attributeArrays } = renderContext;

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
          index: BufferPolygonAttributeLocations.positionHigh,
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
          index: BufferPolygonAttributeLocations.positionLow,
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
          index: BufferPolygonAttributeLocations.showAndColor,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showAndColor,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    const { indexOffset, indexCount, vertexOffset, vertexCount } =
      getPolygonDirtyRanges(collection);

    renderContext.vertexArray.copyIndexFromRange(
      renderContext.indexArray,
      indexOffset,
      indexCount,
    );

    for (const key in BufferPolygonAttributeLocations) {
      if (Object.hasOwn(BufferPolygonAttributeLocations, key)) {
        const attribute = /** @type {BufferPolygonAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          BufferPolygonAttributeLocations[attribute],
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
      sources: [BufferPolygonCollectionVS],
    });

    const fragmentShaderSource = new ShaderSource({
      sources: [BufferPolygonCollectionFS],
    });

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: BufferPolygonAttributeLocations,
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
    count: collection.triangleCount * 3,
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
 * @param {BufferPolygonCollection} collection
 * @returns {{indexOffset: number, indexCount: number, vertexOffset: number, vertexCount: number}}
 */
function getPolygonDirtyRanges(collection) {
  const { _dirtyOffset, _dirtyCount } = collection;

  collection.get(_dirtyOffset, polygon);
  const vertexOffset = polygon.vertexOffset;
  const indexOffset = polygon.triangleOffset * 3;

  collection.get(_dirtyOffset + _dirtyCount - 1, polygon);
  const vertexCount = polygon.vertexOffset + polygon.vertexCount - vertexOffset;
  const indexCount =
    (polygon.triangleOffset + polygon.triangleCount) * 3 - indexOffset;

  return { indexOffset, indexCount, vertexOffset, vertexCount };
}

export default renderBufferPolygonCollection;
