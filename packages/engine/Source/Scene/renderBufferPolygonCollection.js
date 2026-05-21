// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import BufferPolygon from "./BufferPolygon.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import VertexArray from "../Renderer/VertexArray.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import BlendingState from "./BlendingState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import BufferPolygonMaterialVS from "../Shaders/BufferPolygonMaterialVS.js";
import BufferPolygonMaterialFS from "../Shaders/BufferPolygonMaterialFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import BufferPolygonMaterial from "./BufferPolygonMaterial.js";
import BlendOption from "./BlendOption.js";

/** @import {TypedArray} from "../Core/globalTypes.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolygonCollection from "./BufferPolygonCollection.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'pickColor' | 'showColorAlpha'} BufferPolygonAttribute
 * @ignore
 */

/**
 * Attribute locations when using 64-bit position precision.
 * @type {Record<BufferPolygonAttribute, number>}
 * @ignore
 */
const BufferPolygonAttributeLocationsFloat64 = {
  positionHigh: 0,
  positionLow: 1,
  pickColor: 2,
  showColorAlpha: 3,
};

/**
 * Attribute locations when using <= 32-bit position precision.
 * @type {Record<string, number>}
 * @ignore
 */
const BufferPolygonAttributeLocations = {
  position: 0,
  pickColor: 1,
  showColorAlpha: 2,
};

/**
 * @typedef {object} BufferPolygonRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<string, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {DrawCommand} [command]
 * @property {Function} destroy
 * @ignore
 */

// Scratch variables.
const polygon = new BufferPolygon();
const material = new BufferPolygonMaterial();
const pickColor = new Color();
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
  renderContext = renderContext || { destroy: destroyRenderContext };
  const useFloat64 = collection._positionDatatype === ComponentDatatype.DOUBLE;
  const attributeLocations = useFloat64
    ? BufferPolygonAttributeLocationsFloat64
    : BufferPolygonAttributeLocations;

  if (
    !defined(renderContext.attributeArrays) ||
    !defined(renderContext.indexArray)
  ) {
    const { vertexCountMax, triangleCountMax } = collection;

    // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
    renderContext.indexArray = IndexDatatype.createTypedArray(
      vertexCountMax,
      triangleCountMax * 3,
    );

    renderContext.attributeArrays = {
      ...(!useFloat64
        ? { position: collection._positionView }
        : {
            positionHigh: new Float32Array(vertexCountMax * 3),
            positionLow: new Float32Array(vertexCountMax * 3),
          }),
      pickColor: new Uint8Array(vertexCountMax * 4),
      showColorAlpha: new Float32Array(vertexCountMax * 3),
    };
  }

  if (collection._dirtyCount > 0) {
    const { attributeArrays } = renderContext;
    const { _dirtyOffset, _dirtyCount } = collection;

    const indexArray = renderContext.indexArray;
    const pickColorArray = attributeArrays.pickColor;
    const showColorAlphaArray = attributeArrays.showColorAlpha;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polygon);

      if (!polygon._dirty) {
        continue;
      }

      let tOffset = polygon.triangleOffset;
      let vOffset = polygon.vertexOffset;

      const polygonIndexArray = polygon.getTriangles();

      // Update index.
      for (let j = 0, jl = polygon.triangleCount; j < jl; j++) {
        indexArray[tOffset * 3] = vOffset + polygonIndexArray[j * 3];
        indexArray[tOffset * 3 + 1] = vOffset + polygonIndexArray[j * 3 + 1];
        indexArray[tOffset * 3 + 2] = vOffset + polygonIndexArray[j * 3 + 2];

        tOffset++;
      }

      const show = polygon.show;
      const cartesianArray = !useFloat64 ? null : polygon.getPositions();
      polygon.getMaterial(material);
      const encodedColor = AttributeCompression.encodeRGB8(material.color);
      Color.fromRgba(polygon._pickId, pickColor);

      // Update vertex arrays.
      for (let j = 0, jl = polygon.vertexCount; j < jl; j++) {
        if (useFloat64) {
          // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
          Cartesian3.fromArray(cartesianArray, j * 3, cartesian);
          EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

          attributeArrays.positionHigh[vOffset * 3] = encodedCartesian.high.x;
          attributeArrays.positionHigh[vOffset * 3 + 1] =
            encodedCartesian.high.y;
          attributeArrays.positionHigh[vOffset * 3 + 2] =
            encodedCartesian.high.z;

          attributeArrays.positionLow[vOffset * 3] = encodedCartesian.low.x;
          attributeArrays.positionLow[vOffset * 3 + 1] = encodedCartesian.low.y;
          attributeArrays.positionLow[vOffset * 3 + 2] = encodedCartesian.low.z;
        }

        pickColorArray[vOffset * 4] = Color.floatToByte(pickColor.red);
        pickColorArray[vOffset * 4 + 1] = Color.floatToByte(pickColor.green);
        pickColorArray[vOffset * 4 + 2] = Color.floatToByte(pickColor.blue);
        pickColorArray[vOffset * 4 + 3] = Color.floatToByte(pickColor.alpha);

        showColorAlphaArray[vOffset * 3] = show ? 1 : 0;
        showColorAlphaArray[vOffset * 3 + 1] = encodedColor;
        showColorAlphaArray[vOffset * 3 + 2] = material.color.alpha;

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
        usage: BufferUsage.STATIC_DRAW,
        // @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
        indexDatatype: IndexDatatype.fromTypedArray(renderContext.indexArray),
      }),

      attributes: [
        ...(!useFloat64
          ? [
              {
                index: BufferPolygonAttributeLocations.position,
                componentDatatype: collection._positionDatatype,
                componentsPerAttribute: 3,
                normalize: collection._positionNormalized,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.position,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
            ]
          : [
              {
                index: BufferPolygonAttributeLocationsFloat64.positionHigh,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.positionHigh,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
              {
                index: BufferPolygonAttributeLocationsFloat64.positionLow,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.positionLow,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
            ]),
        {
          index: attributeLocations.pickColor,
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.pickColor,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: attributeLocations.showColorAlpha,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showColorAlpha,
            context,
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

    for (const key in attributeLocations) {
      if (Object.hasOwn(attributeLocations, key)) {
        const attribute = /** @type {BufferPolygonAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          attributeLocations[attribute],
          renderContext.attributeArrays[attribute],
          vertexOffset,
          vertexCount,
        );
      }
    }
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending:
        collection._blendOption === BlendOption.OPAQUE
          ? BlendingState.DISABLED
          : BlendingState.ALPHA_BLEND,
      depthTest: { enabled: true },
    });
  }

  if (!defined(renderContext.shaderProgram)) {
    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [BufferPolygonMaterialVS],
        defines: useFloat64 ? ["USE_FLOAT64"] : [],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPolygonMaterialFS],
      }),
      attributeLocations,
    });
  }

  const drawCount = collection.triangleCount * 3;

  if (!defined(renderContext.command)) {
    renderContext.command = new DrawCommand({
      vertexArray: renderContext.vertexArray,
      renderState: renderContext.renderState,
      shaderProgram: renderContext.shaderProgram,
      primitiveType: PrimitiveType.TRIANGLES,
      pass:
        collection._blendOption === BlendOption.OPAQUE
          ? Pass.OPAQUE
          : Pass.TRANSLUCENT,
      pickId: collection._allowPicking ? "v_pickColor" : undefined,
      owner: collection,
      count: drawCount,
      modelMatrix: collection.modelMatrix, // shared reference
      boundingVolume: collection.boundingVolume, // shared reference
      debugShowBoundingVolume: collection.debugShowBoundingVolume,
    });
  }

  const command = renderContext.command;

  if (command.count !== drawCount) {
    command.count = drawCount;
  }

  if (command.debugShowBoundingVolume !== collection.debugShowBoundingVolume) {
    command.debugShowBoundingVolume = collection.debugShowBoundingVolume;
  }

  frameState.commandList.push(command);

  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;

  return renderContext;
}

/**
 * Computes dirty ranges for attribute and index buffers in a collection.
 * @param {BufferPolygonCollection} collection
 * @ignore
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

/**
 * Destroys render context resources. Deleting properties from the context
 * object isn't necessary, as collection.destroy() will discard the object.
 * @ignore
 */
function destroyRenderContext() {
  const context = /** @type {BufferPolygonRenderContext} */ (this);

  if (defined(context.vertexArray)) {
    context.vertexArray.destroy();
  }

  if (defined(context.shaderProgram)) {
    context.shaderProgram.destroy();
  }

  if (defined(context.renderState)) {
    RenderState.removeFromCache(context.renderState);
  }
}

export default renderBufferPolygonCollection;
