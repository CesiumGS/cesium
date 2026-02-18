// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import BufferPoint from "./BufferPoint.js";
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
import BufferPointCollectionVS from "../Shaders/BufferPointCollectionVS.js";
import BufferPointCollectionFS from "../Shaders/BufferPointCollectionFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPointCollection from "./BufferPointCollection.js"; */
/** @import {TypedArray, TypedArrayConstructor} from "../Core/globalTypes.js"; */

/** @type {{positionHighAndShow: number, positionLowAndColor: number}} */
const BufferPointAttributeLocations = {
  /** @type {number} */
  positionHighAndShow: 0,
  /** @type {number} */
  positionLowAndColor: 1,
};

/**
 * @typedef {object} BufferPointRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<number, TypedArray>} [attributeArrays]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {object} [uniformMap]
 * @ignore
 */

/**
 * @param {BufferPointCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPointRenderContext} [renderContext]
 * @returns {BufferPointRenderContext}
 * @ignore
 */
function renderBufferPointCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {};

  if (!defined(renderContext.attributeArrays)) {
    const featureCountMax = collection.primitiveCountMax;
    const positionHighAndShowArray = new Float32Array(featureCountMax * 4);
    const positionLowAndColorArray = new Float32Array(featureCountMax * 4);

    renderContext.attributeArrays = {
      [BufferPointAttributeLocations.positionHighAndShow]:
        positionHighAndShowArray,
      [BufferPointAttributeLocations.positionLowAndColor]:
        positionLowAndColorArray,
    };
  }

  if (collection._dirtyCount > 0) {
    const point = new BufferPoint();
    const color = new Color();
    const cartesian = new Cartesian3();
    const encodedCartesian = new EncodedCartesian3();

    const positionHighAndShowArray =
      renderContext.attributeArrays[
        BufferPointAttributeLocations.positionHighAndShow
      ];
    const positionLowAndColorArray =
      renderContext.attributeArrays[
        BufferPointAttributeLocations.positionLowAndColor
      ];

    const { _dirtyOffset, _dirtyCount } = collection;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, point);

      if (!point._dirty) {
        continue;
      }

      point.getPosition(cartesian);
      EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

      point.getColor(color);

      positionHighAndShowArray[i * 4] = encodedCartesian.high.x;
      positionHighAndShowArray[i * 4 + 1] = encodedCartesian.high.y;
      positionHighAndShowArray[i * 4 + 2] = encodedCartesian.high.z;
      positionHighAndShowArray[i * 4 + 3] = point.show ? 1 : 0;

      positionLowAndColorArray[i * 4] = encodedCartesian.low.x;
      positionLowAndColorArray[i * 4 + 1] = encodedCartesian.low.y;
      positionLowAndColorArray[i * 4 + 2] = encodedCartesian.low.z;
      positionLowAndColorArray[i * 4 + 3] =
        AttributeCompression.encodeRGB8(color);

      point._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const attributeArrays = renderContext.attributeArrays;

    const positionHighBuffer = Buffer.createVertexBuffer({
      typedArray:
        attributeArrays[BufferPointAttributeLocations.positionHighAndShow],
      context,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      usage: BufferUsage.STATIC_DRAW,
    });

    const positionLowBuffer = Buffer.createVertexBuffer({
      typedArray:
        attributeArrays[BufferPointAttributeLocations.positionLowAndColor],
      context,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      usage: BufferUsage.STATIC_DRAW,
    });

    renderContext.vertexArray = new VertexArray({
      context,
      attributes: [
        {
          index: BufferPointAttributeLocations.positionHighAndShow,
          vertexBuffer: positionHighBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
        {
          index: BufferPointAttributeLocations.positionLowAndColor,
          vertexBuffer: positionLowBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    const { positionHighAndShow, positionLowAndColor } =
      BufferPointAttributeLocations;
    renderContext.vertexArray.copyAttributeFromRange(
      positionHighAndShow,
      renderContext.attributeArrays[positionHighAndShow],
      collection._dirtyOffset,
      collection._dirtyCount,
    );
    renderContext.vertexArray.copyAttributeFromRange(
      positionLowAndColor,
      renderContext.attributeArrays[positionLowAndColor],
      collection._dirtyOffset,
      collection._dirtyCount,
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
      sources: [BufferPointCollectionVS],
    });

    const fragmentShaderSource = new ShaderSource({
      sources: [BufferPointCollectionFS],
    });

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: BufferPointAttributeLocations,
    });
  }

  const command = new DrawCommand({
    primitiveType: PrimitiveType.POINTS,
    pass: Pass.OPAQUE,

    vertexArray: renderContext.vertexArray,
    renderState: renderContext.renderState,
    shaderProgram: renderContext.shaderProgram,
    uniformMap: renderContext.uniformMap,

    owner: collection,
    count: collection.primitiveCount,
    boundingVolume: collection.boundingVolume,
    debugShowBoundingVolume: collection.debugShowBoundingVolume,
  });

  frameState.commandList.push(command);

  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;

  return renderContext;
}

export default renderBufferPointCollection;
