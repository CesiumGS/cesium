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

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */
/** @import {TypedArray, TypedArrayConstructor} from "../Core/globalTypes.js"; */

/** @type {{positionHighAndShow: number, positionLowAndColor: number}} */
const BufferPolylineAttributeLocations = {
  /** @type {number} */
  positionHighAndShow: 0,
  /** @type {number} */
  positionLowAndColor: 1,
};

/**
 * @typedef {object} BufferPolylineRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<number, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {object} [uniformMap]
 * @property {boolean} [firstDrawTimed]
 * @ignore
 */

/**
 * @param {BufferPolylineCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPolylineRenderContext} [renderContext]
 * @returns {BufferPolylineRenderContext}
 * @ignore
 */
function renderBufferPolylineCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {};

  if (!renderContext.firstDrawTimed) {
    console.time("renderBufferPolylineCollection::init");
  }

  if (
    !defined(renderContext.attributeArrays) ||
    !defined(renderContext.indexArray)
  ) {
    const { vertexCountMax, primitiveCount } = collection;
    const positionHighAndShowArray = new Float32Array(vertexCountMax * 4);
    const positionLowAndColorArray = new Float32Array(vertexCountMax * 4);

    // gl.LINES requires `(vertexCount - primitiveCount) * 2` indices. Because
    // `primitiveCount` can only increase, and adding more features reduces the
    // number of gl.LINES that can fit within `vertexCountMax`, allocate the
    // index buffer based on `primitiveCount`, not `primitiveCountMax`.
    renderContext.indexArray = new Uint32Array(
      (vertexCountMax - primitiveCount) * 2,
    );

    renderContext.attributeArrays = {
      [BufferPolylineAttributeLocations.positionHighAndShow]:
        positionHighAndShowArray,
      [BufferPolylineAttributeLocations.positionLowAndColor]:
        positionLowAndColorArray,
    };
  }

  if (collection._dirtyCount > 0) {
    const { _dirtyOffset, _dirtyCount } = collection;

    const polyline = new BufferPolyline();
    const color = new Color();
    const cartesian = new Cartesian3();
    const encodedCartesian = new EncodedCartesian3();

    const positionHighAndShowArray =
      renderContext.attributeArrays[
        BufferPolylineAttributeLocations.positionHighAndShow
      ];

    const positionLowAndColorArray =
      renderContext.attributeArrays[
        BufferPolylineAttributeLocations.positionLowAndColor
      ];

    const indexArray = renderContext.indexArray;

    let vertexCountPerFeatureMax = 0;
    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polyline);
      vertexCountPerFeatureMax = Math.max(
        polyline.vertexCount,
        vertexCountPerFeatureMax,
      );
    }
    const cartesianArray = new Float64Array(vertexCountPerFeatureMax * 3);

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polyline);

      if (!polyline._dirty) {
        continue;
      }

      polyline.getPositions(cartesianArray);
      polyline.getColor(color);

      let vOffset = polyline._getUint32(
        BufferPolyline.Layout.POSITION_OFFSET_U32,
      );
      let iOffset = (vOffset - i) * 2;

      for (let j = 0, jl = polyline.vertexCount; j < jl; j++) {
        Cartesian3.fromArray(cartesianArray, j * 3, cartesian);
        EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

        positionHighAndShowArray[vOffset * 4] = encodedCartesian.high.x;
        positionHighAndShowArray[vOffset * 4 + 1] = encodedCartesian.high.y;
        positionHighAndShowArray[vOffset * 4 + 2] = encodedCartesian.high.z;
        positionHighAndShowArray[vOffset * 4 + 3] = polyline.show ? 1 : 0;

        positionLowAndColorArray[vOffset * 4] = encodedCartesian.low.x;
        positionLowAndColorArray[vOffset * 4 + 1] = encodedCartesian.low.y;
        positionLowAndColorArray[vOffset * 4 + 2] = encodedCartesian.low.z;
        positionLowAndColorArray[vOffset * 4 + 3] =
          AttributeCompression.encodeRGB8(color);

        // Each vertex, excluding the first and last, is repeated twice, as
        // the end of the previous line segment and the beginning of the next.
        indexArray[iOffset++] = vOffset;
        if (j > 0 && j + 1 < jl) {
          indexArray[iOffset++] = vOffset;
        }

        vOffset++;
      }
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const attributeArrays = renderContext.attributeArrays;

    const positionHighBuffer = Buffer.createVertexBuffer({
      typedArray:
        attributeArrays[BufferPolylineAttributeLocations.positionHighAndShow],
      context,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      usage: BufferUsage.STATIC_DRAW,
    });

    const positionLowBuffer = Buffer.createVertexBuffer({
      typedArray:
        attributeArrays[BufferPolylineAttributeLocations.positionLowAndColor],
      context,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      usage: BufferUsage.STATIC_DRAW,
    });

    const indexBuffer = Buffer.createIndexBuffer({
      context,
      typedArray: renderContext.indexArray,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      usage: BufferUsage.STATIC_DRAW,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      indexDatatype: IndexDatatype.UNSIGNED_INT,
    });

    renderContext.vertexArray = new VertexArray({
      context,
      indexBuffer,
      attributes: [
        {
          index: BufferPolylineAttributeLocations.positionHighAndShow,
          vertexBuffer: positionHighBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
        {
          index: BufferPolylineAttributeLocations.positionLowAndColor,
          vertexBuffer: positionLowBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    // TODO: Compute dirty vertex and index ranges.
    const { positionHighAndShow, positionLowAndColor } =
      BufferPolylineAttributeLocations;
    renderContext.vertexArray.copyAttributeFromRange(
      positionHighAndShow,
      renderContext.attributeArrays[positionHighAndShow],
      0,
      collection.vertexCount,
    );
    renderContext.vertexArray.copyAttributeFromRange(
      positionLowAndColor,
      renderContext.attributeArrays[positionLowAndColor],
      0,
      collection.vertexCount,
    );
    renderContext.vertexArray.copyIndexFromRange(
      renderContext.indexArray,
      0,
      (collection.vertexCount - collection.primitiveCount) * 2,
    );
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
      sources: [BufferPolylineCollectionVS],
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
    primitiveType: PrimitiveType.LINES,
    pass: Pass.OPAQUE,

    vertexArray: renderContext.vertexArray,

    renderState: renderContext.renderState,
    shaderProgram: renderContext.shaderProgram,
    uniformMap: renderContext.uniformMap,

    owner: collection,
    count: (collection.vertexCount - collection.primitiveCount) * 2,
    boundingVolume: collection.boundingVolume,
    debugShowBoundingVolume: collection.debugShowBoundingVolume,
  });

  frameState.commandList.push(command);

  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;

  if (!renderContext.firstDrawTimed) {
    console.timeEnd("renderBufferPolylineCollection::init");
    renderContext.firstDrawTimed = true;
  }

  return renderContext;
}

export default renderBufferPolylineCollection;
