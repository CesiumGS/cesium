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
import BoundingSphere from "../Core/BoundingSphere.js";
import Matrix4 from "../Core/Matrix4.js";
import BufferPolygonMaterial from "./BufferPolygonMaterial.js";

/** @import {Destroyable, TypedArray} from "../Core/globalTypes.js"; */
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
 * @typedef {object} BufferPolygonRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<BufferPolygonAttribute, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {DrawCommand} [command]
 * @property {Destroyable[]} [pickIds]
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
      positionHigh: new Float32Array(vertexCountMax * 3),
      positionLow: new Float32Array(vertexCountMax * 3),
      pickColor: new Uint8Array(vertexCountMax * 4),
      showAndColor: new Float32Array(vertexCountMax * 2),
    };
  }

  if (!defined(renderContext.pickIds)) {
    renderContext.pickIds = [];
  }

  if (collection._dirtyCount > 0) {
    const { attributeArrays, pickIds } = renderContext;
    const { _dirtyOffset, _dirtyCount } = collection;

    const indexArray = renderContext.indexArray;
    const positionHighArray = attributeArrays.positionHigh;
    const positionLowArray = attributeArrays.positionLow;
    const pickColorArray = attributeArrays.pickColor;
    const showAndColorArray = attributeArrays.showAndColor;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polygon);

      if (!polygon._dirty) {
        continue;
      }

      if (collection._allowPicking && polygon._pickId === 0) {
        const pickId = context.createPickId({
          collection,
          index: i,
          get primitive() {
            // Cannot reuse primitives; scene.drillPick() appends to a list.
            return collection.get(i, new BufferPolygon());
          },
        });
        polygon._pickId = pickId.key;
        pickIds.push(pickId);
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
      const cartesianArray = polygon.getPositions();
      polygon.getMaterial(material);
      const encodedColor = AttributeCompression.encodeRGB8(material.color);
      Color.fromRgba(polygon._pickId, pickColor);

      // Update vertex arrays.
      for (let j = 0, jl = polygon.vertexCount; j < jl; j++) {
        // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
        Cartesian3.fromArray(cartesianArray, j * 3, cartesian);
        EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);

        positionHighArray[vOffset * 3] = encodedCartesian.high.x;
        positionHighArray[vOffset * 3 + 1] = encodedCartesian.high.y;
        positionHighArray[vOffset * 3 + 2] = encodedCartesian.high.z;

        positionLowArray[vOffset * 3] = encodedCartesian.low.x;
        positionLowArray[vOffset * 3 + 1] = encodedCartesian.low.y;
        positionLowArray[vOffset * 3 + 2] = encodedCartesian.low.z;

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

    renderContext.vertexArray = new VertexArray({
      context,

      indexBuffer: Buffer.createIndexBuffer({
        context,
        typedArray: renderContext.indexArray,
        // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
        usage: BufferUsage.STATIC_DRAW,
        // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
        indexDatatype: IndexDatatype.fromTypedArray(renderContext.indexArray),
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
          index: BufferPolygonAttributeLocations.pickColor,
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.pickColor,
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
      depthTest: { enabled: true },
    });
  }

  if (!defined(renderContext.shaderProgram)) {
    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [BufferPolygonMaterialVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPolygonMaterialFS],
      }),
      attributeLocations: BufferPolygonAttributeLocations,
    });
  }

  if (
    !defined(renderContext.command) ||
    isCommandDirty(collection, renderContext.command)
  ) {
    renderContext.command = new DrawCommand({
      vertexArray: renderContext.vertexArray,
      renderState: renderContext.renderState,
      shaderProgram: renderContext.shaderProgram,
      primitiveType: PrimitiveType.TRIANGLES,
      pass: Pass.OPAQUE,
      pickId: "v_pickColor",
      owner: collection,
      count: collection.triangleCount * 3,
      modelMatrix: collection.modelMatrix,
      boundingVolume: collection.boundingVolumeWC,
      debugShowBoundingVolume: collection.debugShowBoundingVolume,
    });
  }

  frameState.commandList.push(renderContext.command);

  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;

  return renderContext;
}

/**
 * Returns true if DrawCommand is out of date for the given collection.
 * @param {BufferPolygonCollection} collection
 * @param {DrawCommand} command
 * @ignore
 */
function isCommandDirty(collection, command) {
  const isModelMatrixEqual = Matrix4.equals(
    collection.modelMatrix,
    command._modelMatrix,
  );

  const isBoundingVolumeEqual = BoundingSphere.equals(
    collection.boundingVolumeWC,
    command._boundingVolume,
  );

  return (
    collection.triangleCount * 3 !== command._count ||
    collection.debugShowBoundingVolume !== command.debugShowBoundingVolume ||
    !isModelMatrixEqual ||
    !isBoundingVolumeEqual
  );
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

  if (defined(context.pickIds)) {
    for (const pickId of context.pickIds) {
      pickId.destroy();
    }
  }
}

export default renderBufferPolygonCollection;
