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
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * @typedef {'positionHigh' | 'positionLow' | 'showPixelSizeAndColor' | 'outlineWidthAndOutlineColor'} BufferPointAttribute
 * @ignore
 */

/**
 * @type {Record<BufferPointAttribute, number>}
 * @ignore
 */
const BufferPointAttributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  showPixelSizeAndColor: 2,
  outlineWidthAndOutlineColor: 3,
};

/**
 * @typedef {object} BufferPointRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<BufferPointAttribute, TypedArray>} [attributeArrays]
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

    renderContext.attributeArrays = {
      positionHigh: new Float32Array(featureCountMax * 3),
      positionLow: new Float32Array(featureCountMax * 3),
      showPixelSizeAndColor: new Float32Array(featureCountMax * 3),
      outlineWidthAndOutlineColor: new Float32Array(featureCountMax * 2),
    };
  }

  if (collection._dirtyCount > 0) {
    const { attributeArrays } = renderContext;

    const point = new BufferPoint();
    const color = new Color();
    const cartesian = new Cartesian3();
    const encodedCartesian = new EncodedCartesian3();

    const positionHighArray = attributeArrays.positionHigh;
    const positionLowArray = attributeArrays.positionLow;
    const showPixelSizeAndColorArray = attributeArrays.showPixelSizeAndColor;
    const outlineWidthAndOutlineColorArray =
      attributeArrays.outlineWidthAndOutlineColor;

    const { _dirtyOffset, _dirtyCount } = collection;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, point);

      if (!point._dirty) {
        continue;
      }

      point.getPosition(cartesian);
      EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

      positionHighArray[i * 3] = encodedCartesian.high.x;
      positionHighArray[i * 3 + 1] = encodedCartesian.high.y;
      positionHighArray[i * 3 + 2] = encodedCartesian.high.z;
      positionHighArray[i * 3 + 3] = point.show ? 1 : 0;

      positionLowArray[i * 3] = encodedCartesian.low.x;
      positionLowArray[i * 3 + 1] = encodedCartesian.low.y;
      positionLowArray[i * 3 + 2] = encodedCartesian.low.z;

      showPixelSizeAndColorArray[i * 3] = point.show ? 1 : 0;
      showPixelSizeAndColorArray[i * 3 + 1] = point.pixelSize;
      showPixelSizeAndColorArray[i * 3 + 2] = AttributeCompression.encodeRGB8(
        point.getColor(color),
      );

      outlineWidthAndOutlineColorArray[i * 2] = point.outlineWidth;
      outlineWidthAndOutlineColorArray[i * 2 + 1] =
        AttributeCompression.encodeRGB8(point.getOutlineColor(color));

      point._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const { attributeArrays } = renderContext;

    renderContext.vertexArray = new VertexArray({
      context,
      attributes: [
        {
          index: BufferPointAttributeLocations.positionHigh,
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
          index: BufferPointAttributeLocations.positionLow,
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
          index: BufferPointAttributeLocations.showPixelSizeAndColor,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showPixelSizeAndColor,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPointAttributeLocations.outlineWidthAndOutlineColor,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.outlineWidthAndOutlineColor,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    for (const key in BufferPointAttributeLocations) {
      if (Object.hasOwn(BufferPointAttributeLocations, key)) {
        const attribute = /** @type {BufferPointAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          BufferPointAttributeLocations[attribute],
          renderContext.attributeArrays[attribute],
          collection._dirtyOffset,
          collection._dirtyCount,
        );
      }
    }
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending: BlendingState.ALPHA_BLEND,
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
