// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Point3D from "./Point3D.js";
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
import Point3DCollectionVS from "../Shaders/Point3DCollectionVS.js";
import Point3DCollectionFS from "../Shaders/Point3DCollectionFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";

/** @import FrameState from "./FrameState.js"; */
/** @import Point3DCollection from "./Point3DCollection.js"; */

/** @type {{positionHighAndShow: number, positionLowAndColor: number}} */
const Point3DAttributeLocations = {
  /** @type {number} */
  positionHighAndShow: 0,
  /** @type {number} */
  positionLowAndColor: 1,
};

/**
 * @typedef {object} Point3DRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {object} [uniformMap]
 * @property {boolean} [firstDrawTimed]
 */

/**
 * @param {Point3DCollection} collection
 * @param {FrameState} frameState
 * @param {Point3DRenderContext} [renderContext]
 * @returns {Point3DRenderContext}
 */
function renderPoint3DCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {};

  if (!renderContext.firstDrawTimed) {
    console.time("renderPoint3DCollection::init");
  }

  if (!defined(renderContext.vertexArray)) {
    const point = new Point3D();
    const color = new Color();
    const cartesian = new Cartesian3();
    const encodedCartesian = new EncodedCartesian3();

    const vertexCount = collection._positionCount;
    const stride = 4;

    const positionHighAndShowArray = new Float32Array(vertexCount * stride);
    const positionLowAndColorArray = new Float32Array(vertexCount * stride);

    for (let i = 0, il = vertexCount; i < il; i++) {
      Point3D.fromCollection(collection, i, point);

      point.getPosition(cartesian);
      EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

      point.getColor(color);

      positionHighAndShowArray[i * stride] = encodedCartesian.high.x;
      positionHighAndShowArray[i * stride + 1] = encodedCartesian.high.y;
      positionHighAndShowArray[i * stride + 2] = encodedCartesian.high.z;
      positionHighAndShowArray[i * stride + 3] = point.show ? 1 : 0;

      positionLowAndColorArray[i * stride] = encodedCartesian.low.x;
      positionLowAndColorArray[i * stride + 1] = encodedCartesian.low.y;
      positionLowAndColorArray[i * stride + 2] = encodedCartesian.low.z;
      positionLowAndColorArray[i * stride + 3] =
        AttributeCompression.encodeRGB8(color);
    }

    const positionHighBuffer = Buffer.createVertexBuffer({
      typedArray: positionHighAndShowArray,
      context,
      // @ts-expect-error TODO(donmccurdy): BufferUsage types incorrect.
      usage: BufferUsage.STATIC_DRAW,
    });

    const positionLowBuffer = Buffer.createVertexBuffer({
      typedArray: positionLowAndColorArray,
      context,
      // @ts-expect-error TODO(donmccurdy): BufferUsage types incorrect.
      usage: BufferUsage.STATIC_DRAW,
    });

    renderContext.vertexArray = new VertexArray({
      context,
      attributes: [
        {
          index: Point3DAttributeLocations.positionHighAndShow,
          vertexBuffer: positionHighBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
        {
          index: Point3DAttributeLocations.positionLowAndColor,
          vertexBuffer: positionLowBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
      ],
    });

    collection.updateBoundingVolume();
  }

  if (!defined(renderContext.renderState)) {
    // @ts-expect-error TODO(donmccurdy): Will need to expose fromCache.
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
      sources: [Point3DCollectionVS],
    });

    const fragmentShaderSource = new ShaderSource({
      sources: [Point3DCollectionFS],
    });

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: Point3DAttributeLocations,
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
    boundingVolume: collection._boundingVolume,
    debugShowBoundingVolume: collection.debugShowBoundingVolume,
  });

  frameState.commandList.push(command);

  if (!renderContext.firstDrawTimed) {
    console.timeEnd("renderPoint3DCollection::init");
    renderContext.firstDrawTimed = true;
  }

  return renderContext;
}

export default renderPoint3DCollection;
