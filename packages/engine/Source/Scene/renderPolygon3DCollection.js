// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Polygon3D from "./Polygon3D.js";
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
import Polygon3DCollectionVS from "../Shaders/Polygon3DCollectionVS.js";
import Polygon3DCollectionFS from "../Shaders/Polygon3DCollectionFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import IndexDatatype from "../Core/IndexDatatype.js";

/** @import FrameState from "./FrameState.js"; */
/** @import Polygon3DCollection from "./Polygon3DCollection.js"; */

/** @type {{positionHighAndShow: number, positionLowAndColor: number}} */
const Polygon3DAttributeLocations = {
  /** @type {number} */
  positionHighAndShow: 0,
  /** @type {number} */
  positionLowAndColor: 1,
};

/**
 * @typedef {object} Polygon3DRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {object} [uniformMap]
 * @property {boolean} [firstDrawTimed]
 */

/**
 * @param {Polygon3DCollection} collection
 * @param {FrameState} frameState
 * @param {Polygon3DRenderContext} [renderContext]
 * @returns {Polygon3DRenderContext}
 */
function renderPolygon3DCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {};

  if (!renderContext.firstDrawTimed) {
    console.time("renderPolygon3DCollection::init");
  }

  if (!defined(renderContext.vertexArray)) {
    const polygon = new Polygon3D();
    const color = new Color();
    const cartesian = new Cartesian3();
    const encodedCartesian = new EncodedCartesian3();

    const featureCount = collection._featureCount;
    const vertexCount = collection._positionCount;
    const triangleCount = collection._triangleCount;

    let vertexCountPerFeatureMax = 0;
    let triangleCountPerFeatureMax = 0;
    for (let i = 0, il = featureCount; i < il; i++) {
      Polygon3D.fromCollection(collection, i, polygon);
      vertexCountPerFeatureMax = Math.max(
        polygon.getPositionCount(),
        vertexCountPerFeatureMax,
      );
      triangleCountPerFeatureMax = Math.max(
        polygon.getTriangleCount(),
        triangleCountPerFeatureMax,
      );
    }

    const cartesianArray = new Float64Array(vertexCountPerFeatureMax * 3);
    const polygonIndexArray = new Uint32Array(triangleCountPerFeatureMax * 3);

    const positionHighAndShowArray = new Float32Array(vertexCount * 4);
    const positionLowAndColorArray = new Float32Array(vertexCount * 4);
    const indexArray = new Uint32Array(triangleCount * 3);

    let vOffset = 0;
    let iOffset = 0;

    for (let i = 0, il = featureCount; i < il; i++) {
      Polygon3D.fromCollection(collection, i, polygon);

      polygon.getTriangles(polygonIndexArray);
      polygon.getPositions(cartesianArray);
      polygon.getColor(color);

      for (let j = 0, jl = polygon.getTriangleCount(); j < jl; j++) {
        indexArray[iOffset] = polygonIndexArray[iOffset] + vOffset;
        indexArray[iOffset + 1] = polygonIndexArray[iOffset + 1] + vOffset;
        indexArray[iOffset + 2] = polygonIndexArray[iOffset + 2] + vOffset;

        iOffset += 3;
      }

      for (let j = 0, jl = polygon.getPositionCount(); j < jl; j++) {
        Cartesian3.fromArray(cartesianArray, j * 3, cartesian);
        EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

        positionHighAndShowArray[vOffset * 4] = encodedCartesian.high.x;
        positionHighAndShowArray[vOffset * 4 + 1] = encodedCartesian.high.y;
        positionHighAndShowArray[vOffset * 4 + 2] = encodedCartesian.high.z;
        positionHighAndShowArray[vOffset * 4 + 3] = polygon.show ? 1 : 0;

        positionLowAndColorArray[vOffset * 4] = encodedCartesian.low.x;
        positionLowAndColorArray[vOffset * 4 + 1] = encodedCartesian.low.y;
        positionLowAndColorArray[vOffset * 4 + 2] = encodedCartesian.low.z;
        positionLowAndColorArray[vOffset * 4 + 3] =
          AttributeCompression.encodeRGB8(color);

        vOffset++;
      }
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

    const indexBuffer = Buffer.createIndexBuffer({
      context,
      typedArray: indexArray,
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
          index: Polygon3DAttributeLocations.positionHighAndShow,
          vertexBuffer: positionHighBuffer,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
        },
        {
          index: Polygon3DAttributeLocations.positionLowAndColor,
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
      sources: [Polygon3DCollectionVS],
    });

    const fragmentShaderSource = new ShaderSource({
      sources: [Polygon3DCollectionFS],
    });

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource,
      fragmentShaderSource,
      attributeLocations: Polygon3DAttributeLocations,
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
    boundingVolume: collection._boundingVolume,
    debugShowBoundingVolume: collection.debugShowBoundingVolume,
  });

  frameState.commandList.push(command);

  if (!renderContext.firstDrawTimed) {
    console.timeEnd("renderPolygon3DCollection::init");
    renderContext.firstDrawTimed = true;
  }

  return renderContext;
}

export default renderPolygon3DCollection;
