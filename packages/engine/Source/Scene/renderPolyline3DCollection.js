// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Polyline3D from "./Polyline3D.js";
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
import Polyline3DCollectionVS from "../Shaders/Polyline3DCollectionVS.js";
import Polyline3DCollectionFS from "../Shaders/Polyline3DCollectionFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import IndexDatatype from "../Core/IndexDatatype.js";

/** @import FrameState from "./FrameState.js"; */
/** @import Polyline3DCollection from "./Polyline3DCollection.js"; */
/** @import {TypedArray, TypedArrayConstructor} from "../Core/globalTypes.js"; */

/** @type {{positionHighAndShow: number, positionLowAndColor: number}} */
const Polyline3DAttributeLocations = {
  /** @type {number} */
  positionHighAndShow: 0,
  /** @type {number} */
  positionLowAndColor: 1,
};

/**
 * @typedef {object} Polyline3DRenderContext
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
 * @param {Polyline3DCollection} collection
 * @param {FrameState} frameState
 * @param {Polyline3DRenderContext} [renderContext]
 * @returns {Polyline3DRenderContext}
 * @ignore
 */
function renderPolyline3DCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {};

  if (!renderContext.firstDrawTimed) {
    console.time("renderPolyline3DCollection::init");
  }

  if (
    !defined(renderContext.attributeArrays) ||
    !defined(renderContext.indexArray)
  ) {
    const { vertexCountMax, featureCount } = collection;
    const positionHighAndShowArray = new Float32Array(vertexCountMax * 4);
    const positionLowAndColorArray = new Float32Array(vertexCountMax * 4);

    // gl.LINES requires `(vertexCount - featureCount) * 2` indices. Because
    // `featureCount` can only increase, and adding more features reduces the
    // number of gl.LINES that can fit within `vertexCountMax`, allocate the
    // index buffer based on `featureCount`, not `featureCountMax`.
    const indexArray = new Uint32Array((vertexCountMax - featureCount) * 2);

    renderContext.attributeArrays = {
      [Polyline3DAttributeLocations.positionHighAndShow]:
        positionHighAndShowArray,
      [Polyline3DAttributeLocations.positionLowAndColor]:
        positionLowAndColorArray,
    };

    renderContext.indexArray = indexArray;
  }

  if (collection._dirtyCount > 0) {
    const { _dirtyOffset, _dirtyCount } = collection;

    const polyline = new Polyline3D();
    const color = new Color();
    const cartesian = new Cartesian3();
    const encodedCartesian = new EncodedCartesian3();

    const positionHighAndShowArray =
      renderContext.attributeArrays[
        Polyline3DAttributeLocations.positionHighAndShow
      ];

    const positionLowAndColorArray =
      renderContext.attributeArrays[
        Polyline3DAttributeLocations.positionLowAndColor
      ];

    const indexArray = renderContext.indexArray;

    let vertexCountPerFeatureMax = 0;
    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      Polyline3D.fromCollection(collection, i, polyline);
      vertexCountPerFeatureMax = Math.max(
        polyline.getPositionCount(),
        vertexCountPerFeatureMax,
      );
    }
    const cartesianArray = new Float64Array(vertexCountPerFeatureMax * 3);

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      Polyline3D.fromCollection(collection, i, polyline);

      polyline.getPositions(cartesianArray);
      polyline.getColor(color);

      let vOffset = polyline._getUint32(Polyline3D.Layout.POSITION_OFFSET_U32);
      let iOffset = (vOffset - i) * 2;

      for (let j = 0, jl = polyline.getPositionCount(); j < jl; j++) {
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
        attributeArrays[Polyline3DAttributeLocations.positionHighAndShow],
      context,
      // @ts-expect-error TODO(donmccurdy): BufferUsage types incorrect.
      usage: BufferUsage.STATIC_DRAW,
    });

    const positionLowBuffer = Buffer.createVertexBuffer({
      typedArray:
        attributeArrays[Polyline3DAttributeLocations.positionLowAndColor],
      context,
      // @ts-expect-error TODO(donmccurdy): BufferUsage types incorrect.
      usage: BufferUsage.STATIC_DRAW,
    });

    const indexBuffer = Buffer.createIndexBuffer({
      context,
      typedArray: renderContext.indexArray,
      // @ts-expect-error TODO(donmccurdy): BufferUsage types incorrect.
      usage: BufferUsage.STATIC_DRAW,
      // @ts-expect-error TODO(donmccurdy): IndexDatatype types incorrect.
      indexDatatype: IndexDatatype.UNSIGNED_INT,
    });

    renderContext.vertexArray = new VertexArray({
      context,
      indexBuffer,
      attributes: [
        {
          index: Polyline3DAttributeLocations.positionHighAndShow,
          vertexBuffer: positionHighBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
        {
          index: Polyline3DAttributeLocations.positionLowAndColor,
          vertexBuffer: positionLowBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    // TODO: Compute dirty vertex and index ranges.
    updateAttributeRange(
      renderContext,
      Polyline3DAttributeLocations.positionHighAndShow,
      0,
      collection.vertexCount,
    );
    updateAttributeRange(
      renderContext,
      Polyline3DAttributeLocations.positionLowAndColor,
      0,
      collection.vertexCount,
    );
    updateIndexRange(
      renderContext,
      0,
      (collection.vertexCount - collection.featureCount) * 2,
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
      sources: [Polyline3DCollectionVS],
    });

    const fragmentShaderSource = new ShaderSource({
      sources: [Polyline3DCollectionFS],
    });

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: Polyline3DAttributeLocations,
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
    count: (collection.vertexCount - collection.featureCount) * 2,
    boundingVolume: collection.boundingVolume,
    debugShowBoundingVolume: collection.debugShowBoundingVolume,
  });

  frameState.commandList.push(command);

  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;

  if (!renderContext.firstDrawTimed) {
    console.timeEnd("renderPolyline3DCollection::init");
    renderContext.firstDrawTimed = true;
  }

  return renderContext;
}

/**
 * @param {Polyline3DRenderContext} renderContext
 * @param {number} attributeIndex
 * @param {number} vertexOffset
 * @param {number} vertexCount
 */
function updateAttributeRange(
  renderContext,
  attributeIndex,
  vertexOffset,
  vertexCount,
) {
  const attribute = renderContext.vertexArray.getAttribute(attributeIndex);
  const buffer = /** @type {Buffer} */ (attribute.vertexBuffer);
  const array = renderContext.attributeArrays[attributeIndex];
  const elementsPerVertex = attribute.componentsPerAttribute;

  const ArrayConstructor = /** @type {TypedArrayConstructor} */ (
    array.constructor
  );

  const byteOffset =
    vertexOffset * elementsPerVertex * ArrayConstructor.BYTES_PER_ELEMENT;

  // Create a zero-copy ArrayView onto the 'dirty' range of the source array.
  const rangeArrayView = new ArrayConstructor(
    /** @type {ArrayBuffer} */ (array.buffer),
    array.byteOffset + byteOffset,
    vertexCount * elementsPerVertex,
  );

  buffer.copyFromArrayView(rangeArrayView, byteOffset);
}

/**
 * @param {Polyline3DRenderContext} renderContext
 * @param {number} indexOffset
 * @param {number} indexCount
 */
function updateIndexRange(renderContext, indexOffset, indexCount) {
  const buffer = /** @type {Buffer} */ (renderContext.vertexArray._indexBuffer);
  const array = renderContext.indexArray;

  const ArrayConstructor = /** @type {TypedArrayConstructor} */ (
    array.constructor
  );

  const byteOffset = indexOffset * ArrayConstructor.BYTES_PER_ELEMENT;

  // Create a zero-copy ArrayView onto the 'dirty' range of the source array.
  const rangeArrayView = new ArrayConstructor(
    /** @type {ArrayBuffer} */ (array.buffer),
    array.byteOffset + byteOffset,
    indexCount,
  );

  buffer.copyFromArrayView(rangeArrayView, byteOffset);
}

export default renderPolyline3DCollection;
