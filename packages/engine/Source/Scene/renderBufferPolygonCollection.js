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

/** @import {TypedArray} from "../Core/globalTypes.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolygonCollection from "./BufferPolygonCollection.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'pickColor' | 'showAndColor'} BufferPolygonAttribute
 * @ignore
 */

/**
 * @type {Record<BufferPolygonAttribute, number>}
 * @ignore
 */
const BufferPolygonAttributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  pickColor: 2,
  showAndColor: 3,
};

/**
 * Attribute locations for the GPU position path (float32 or normalized integer inputs).
 * A single vec3 position replaces the high/low float pair.
 * Material attributes retain their original indices.
 * @type {Record<string, number>}
 * @ignore
 */
const BufferPolygonLocalSpaceAttributeLocations = {
  position: 0,
  pickColor: 2,
  showAndColor: 3,
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
  const useLocalSpace = !useFloat64;

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

    renderContext.attributeArrays = useLocalSpace
      ? {
          pickColor: new Uint8Array(vertexCountMax * 4),
          showAndColor: new Float32Array(vertexCountMax * 2),
        }
      : {
          positionHigh: new Float32Array(vertexCountMax * 3),
          positionLow: new Float32Array(vertexCountMax * 3),
          pickColor: new Uint8Array(vertexCountMax * 4),
          showAndColor: new Float32Array(vertexCountMax * 2),
        };
  }

  if (collection._dirtyCount > 0) {
    const { attributeArrays } = renderContext;
    const { _dirtyOffset, _dirtyCount } = collection;

    const indexArray = renderContext.indexArray;
    const pickColorArray = attributeArrays.pickColor;
    const showAndColorArray = attributeArrays.showAndColor;

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
      const cartesianArray = useLocalSpace ? null : polygon.getPositions();
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

        showAndColorArray[vOffset * 2] = show ? 1 : 0;
        showAndColorArray[vOffset * 2 + 1] = encodedColor;

        vOffset++;
      }

      polygon._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const { attributeArrays } = renderContext;
    const locations = useLocalSpace
      ? BufferPolygonLocalSpaceAttributeLocations
      : BufferPolygonAttributeLocations;

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
        ...(useLocalSpace
          ? [
              {
                index: BufferPolygonLocalSpaceAttributeLocations.position,
                componentDatatype: collection._positionDatatype,
                componentsPerAttribute: 3,
                normalize: collection._positionNormalized,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: collection._positionView,
                  context,
                  usage: BufferUsage.DYNAMIC_DRAW,
                }),
              },
            ]
          : [
              {
                index: BufferPolygonAttributeLocations.positionHigh,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.positionHigh,
                  context,
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
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
            ]),
        {
          index: locations.pickColor,
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.pickColor,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: locations.showAndColor,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showAndColor,
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

    if (useLocalSpace) {
      renderContext.vertexArray.copyAttributeFromRange(
        0, // array index 0 = position
        collection._positionView,
        vertexOffset,
        vertexCount,
      );
      const materialKeys = ["pickColor", "showAndColor"];
      for (let ai = 0; ai < materialKeys.length; ai++) {
        renderContext.vertexArray.copyAttributeFromRange(
          ai + 1, // array indices 1, 2
          renderContext.attributeArrays[materialKeys[ai]],
          vertexOffset,
          vertexCount,
        );
      }
    } else {
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
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending: BlendingState.DISABLED,
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
      attributeLocations: useLocalSpace
        ? BufferPolygonLocalSpaceAttributeLocations
        : BufferPolygonAttributeLocations,
    });
  }

  const drawCount = collection.triangleCount * 3;

  if (!defined(renderContext.command)) {
    renderContext.command = new DrawCommand({
      vertexArray: renderContext.vertexArray,
      renderState: renderContext.renderState,
      shaderProgram: renderContext.shaderProgram,
      primitiveType: PrimitiveType.TRIANGLES,
      pass: Pass.OPAQUE,
      pickId: collection._allowPicking ? "v_pickColor" : undefined,
      owner: collection,
      count: drawCount,
      modelMatrix: collection.modelMatrix,
      boundingVolume: collection.boundingVolumeWC, // shared reference
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
