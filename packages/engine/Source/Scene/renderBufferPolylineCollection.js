// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import BufferPolyline from "./BufferPolyline.js";
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
import BufferPolylineMaterialVS from "../Shaders/BufferPolylineMaterialVS.js";
import BufferPolylineMaterialFS from "../Shaders/BufferPolylineMaterialFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import PolylineCommon from "../Shaders/PolylineCommon.js";
import Matrix4 from "../Core/Matrix4.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */
/** @import {Destroyable, TypedArray} from "../Core/globalTypes.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'prevPositionHigh' | 'prevPositionLow' | 'nextPositionHigh' | 'nextPositionLow' | 'pickColor' | 'showColorWidthAndTexCoord'} BufferPolylineAttribute
 * @ignore
 */

/**
 * @type {Record<BufferPolylineAttribute, number>}
 * @ignore
 */
const BufferPolylineAttributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  prevPositionHigh: 2,
  prevPositionLow: 3,
  nextPositionHigh: 4,
  nextPositionLow: 5,
  pickColor: 6,
  showColorWidthAndTexCoord: 7,
};

/**
 * @typedef {object} BufferPolylineRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<BufferPolylineAttribute, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {DrawCommand} [command]
 * @property {Destroyable[]} [pickIds]
 * @property {Function} destroy
 * @ignore
 */

// Scratch variables.
const polyline = new BufferPolyline();
const material = new BufferPolylineMaterial();
const pickColor = new Color();
const cartesian = new Cartesian3();
const prevCartesian = new Cartesian3();
const nextCartesian = new Cartesian3();
const cartesianEnc = new EncodedCartesian3();
const prevCartesianEnc = new EncodedCartesian3();
const nextCartesianEnc = new EncodedCartesian3();

/**
 * Renders line segments as quads, each composed of two triangles. Writes each
 * vertex twice, extruding the pairs in opposing directions outward.
 *
 * Tips:
 * - # segments in polyline primitive = vertexCount - 1
 * - # segments in collection = vertexCount - primitiveCount
 * - # vertices rendered = vertexCount * 2
 * - # indices = segmentCount * 6
 *
 * 0 - 2 - 4 - 6 - 8
 * | \ | \ | \ | \ | ...
 * 1 - 3 - 5 - 7 - 9
 *
 * @param {BufferPolylineCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPolylineRenderContext} [renderContext]
 * @returns {BufferPolylineRenderContext}
 * @ignore
 */
function renderBufferPolylineCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || { destroy: destroyRenderContext };

  if (
    !defined(renderContext.attributeArrays) ||
    !defined(renderContext.indexArray)
  ) {
    // Number of primitives can only increase, which _decreases_ remaining
    // segment capacity: use `primitiveCount` here, not `primitiveCountMax`.
    const segmentCountMax =
      collection.vertexCountMax - collection.primitiveCount;
    const vertexCountMax = collection.vertexCountMax * 2;

    // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
    renderContext.indexArray = IndexDatatype.createTypedArray(
      vertexCountMax,
      segmentCountMax * 6,
    );

    renderContext.attributeArrays = {
      positionHigh: new Float32Array(vertexCountMax * 3),
      positionLow: new Float32Array(vertexCountMax * 3),
      prevPositionHigh: new Float32Array(vertexCountMax * 3),
      prevPositionLow: new Float32Array(vertexCountMax * 3),
      nextPositionHigh: new Float32Array(vertexCountMax * 3),
      nextPositionLow: new Float32Array(vertexCountMax * 3),
      pickColor: new Uint8Array(vertexCountMax * 4),
      showColorWidthAndTexCoord: new Float32Array(vertexCountMax * 4),
    };
  }

  if (!defined(renderContext.pickIds)) {
    renderContext.pickIds = [];
  }

  if (collection._dirtyCount > 0) {
    const { _dirtyOffset, _dirtyCount } = collection;
    const { attributeArrays, pickIds } = renderContext;

    const indexArray = renderContext.indexArray;
    const positionHighArray = attributeArrays.positionHigh;
    const positionLowArray = attributeArrays.positionLow;
    const prevPositionHighArray = attributeArrays.prevPositionHigh;
    const prevPositionLowArray = attributeArrays.prevPositionLow;
    const nextPositionHighArray = attributeArrays.nextPositionHigh;
    const nextPositionLowArray = attributeArrays.nextPositionLow;
    const pickColorArray = attributeArrays.pickColor;
    const showColorWidthAndTexCoordArray =
      attributeArrays.showColorWidthAndTexCoord;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polyline);

      if (!polyline._dirty) {
        continue;
      }

      if (collection._allowPicking && polyline._pickId === 0) {
        const pickId = context.createPickId({
          collection,
          index: i,
          get primitive() {
            // Cannot reuse primitives; scene.drillPick() appends to a list.
            return collection.get(i, new BufferPolyline());
          },
        });
        polyline._pickId = pickId.key;
        pickIds.push(pickId);
      }

      const cartesianArray = polyline.getPositions();
      polyline.getMaterial(material);
      const encodedColor = AttributeCompression.encodeRGB8(material.color);
      Color.fromRgba(polyline._pickId, pickColor);
      const show = polyline.show;

      let vOffset = polyline.vertexOffset * 2; // vertex offset
      let iOffset = (polyline.vertexOffset - i) * 6; // index offset

      for (let j = 0, jl = polyline.vertexCount; j < jl; j++) {
        const isFirstSegment = j === 0;
        const isLastSegment = j === jl - 1;

        // For first/last vertices, infer missing vertices by mirroring the segment.
        // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
        Cartesian3.fromArray(cartesianArray, j * 3, cartesian);
        if (isFirstSegment) {
          // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
          Cartesian3.fromArray(cartesianArray, (j + 1) * 3, nextCartesian);
          Cartesian3.subtract(cartesian, nextCartesian, prevCartesian);
          Cartesian3.add(cartesian, prevCartesian, prevCartesian);
        } else if (isLastSegment) {
          // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
          Cartesian3.fromArray(cartesianArray, (j - 1) * 3, prevCartesian);
          Cartesian3.subtract(cartesian, prevCartesian, nextCartesian);
          Cartesian3.add(cartesian, nextCartesian, nextCartesian);
        } else {
          // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
          Cartesian3.fromArray(cartesianArray, (j - 1) * 3, prevCartesian);
          // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
          Cartesian3.fromArray(cartesianArray, (j + 1) * 3, nextCartesian);
        }

        // For each segment, draw two triangles.
        if (!isLastSegment) {
          indexArray[iOffset] = vOffset;
          indexArray[iOffset + 1] = vOffset + 1;
          indexArray[iOffset + 2] = vOffset + 2;

          indexArray[iOffset + 3] = vOffset + 2;
          indexArray[iOffset + 4] = vOffset + 1;
          indexArray[iOffset + 5] = vOffset + 3;

          iOffset += 6;
        }

        EncodedCartesian3.fromCartesian(cartesian, cartesianEnc);
        EncodedCartesian3.fromCartesian(prevCartesian, prevCartesianEnc);
        EncodedCartesian3.fromCartesian(nextCartesian, nextCartesianEnc);

        // TODO(donmccurdy): Diverging from PolylineCollection.js, which writes
        // internal vertices to buffer 4x, not 2x. Not sure that's needed?
        for (let k = 0; k < 2; k++) {
          // Position.
          positionHighArray[vOffset * 3] = cartesianEnc.high.x;
          positionHighArray[vOffset * 3 + 1] = cartesianEnc.high.y;
          positionHighArray[vOffset * 3 + 2] = cartesianEnc.high.z;

          positionLowArray[vOffset * 3] = cartesianEnc.low.x;
          positionLowArray[vOffset * 3 + 1] = cartesianEnc.low.y;
          positionLowArray[vOffset * 3 + 2] = cartesianEnc.low.z;

          // Previous position.
          prevPositionHighArray[vOffset * 3] = prevCartesianEnc.high.x;
          prevPositionHighArray[vOffset * 3 + 1] = prevCartesianEnc.high.y;
          prevPositionHighArray[vOffset * 3 + 2] = prevCartesianEnc.high.z;

          prevPositionLowArray[vOffset * 3] = prevCartesianEnc.low.x;
          prevPositionLowArray[vOffset * 3 + 1] = prevCartesianEnc.low.y;
          prevPositionLowArray[vOffset * 3 + 2] = prevCartesianEnc.low.z;

          // Next position.
          nextPositionHighArray[vOffset * 3] = nextCartesianEnc.high.x;
          nextPositionHighArray[vOffset * 3 + 1] = nextCartesianEnc.high.y;
          nextPositionHighArray[vOffset * 3 + 2] = nextCartesianEnc.high.z;

          nextPositionLowArray[vOffset * 3] = nextCartesianEnc.low.x;
          nextPositionLowArray[vOffset * 3 + 1] = nextCartesianEnc.low.y;
          nextPositionLowArray[vOffset * 3 + 2] = nextCartesianEnc.low.z;

          // Pick ID.
          pickColorArray[vOffset * 4] = Color.floatToByte(pickColor.red);
          pickColorArray[vOffset * 4 + 1] = Color.floatToByte(pickColor.green);
          pickColorArray[vOffset * 4 + 2] = Color.floatToByte(pickColor.blue);
          pickColorArray[vOffset * 4 + 3] = Color.floatToByte(pickColor.alpha);

          // Properties.
          showColorWidthAndTexCoordArray[vOffset * 4] = show ? 1 : 0;
          showColorWidthAndTexCoordArray[vOffset * 4 + 1] = encodedColor;
          showColorWidthAndTexCoordArray[vOffset * 4 + 2] = material.width;
          showColorWidthAndTexCoordArray[vOffset * 4 + 3] = j / (jl - 1); // texcoord.s

          vOffset++;
        }
      }

      polyline._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const attributeArrays = renderContext.attributeArrays;

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
          index: BufferPolylineAttributeLocations.positionHigh,
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
          index: BufferPolylineAttributeLocations.positionLow,
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
          index: BufferPolylineAttributeLocations.prevPositionHigh,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.prevPositionHigh,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPolylineAttributeLocations.prevPositionLow,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.prevPositionLow,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },

        {
          index: BufferPolylineAttributeLocations.nextPositionHigh,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.nextPositionHigh,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPolylineAttributeLocations.nextPositionLow,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.nextPositionLow,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPolylineAttributeLocations.pickColor,
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
          index: BufferPolylineAttributeLocations.showColorWidthAndTexCoord,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showColorWidthAndTexCoord,
            context,
            // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    const { indexOffset, indexCount, vertexOffset, vertexCount } =
      getPolylineDirtyRanges(collection);

    renderContext.vertexArray.copyIndexFromRange(
      renderContext.indexArray,
      indexOffset,
      indexCount,
    );

    for (const key in BufferPolylineAttributeLocations) {
      if (Object.hasOwn(BufferPolylineAttributeLocations, key)) {
        const attribute = /** @type {BufferPolylineAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          BufferPolylineAttributeLocations[attribute],
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
        sources: [PolylineCommon, BufferPolylineMaterialVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPolylineMaterialFS],
      }),
      attributeLocations: BufferPolylineAttributeLocations,
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
      count: getDrawIndexCount(collection),
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
 * Returns true if DrawCommand is out of date for given collection.
 * @param {BufferPolylineCollection} collection
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
    getDrawIndexCount(collection) !== command._count ||
    collection.debugShowBoundingVolume !== command.debugShowBoundingVolume ||
    !isModelMatrixEqual ||
    !isBoundingVolumeEqual
  );
}

/**
 * Returns number of drawn (not allocated) indices for given collection.
 * @param {BufferPolylineCollection} collection
 * @ignore
 */
function getDrawIndexCount(collection) {
  return (collection.vertexCount - collection.primitiveCount) * 6;
}

/**
 * Computes dirty ranges for attribute and index buffers in a collection.
 * @param {BufferPolylineCollection} collection
 * @ignore
 */
function getPolylineDirtyRanges(collection) {
  const { _dirtyOffset, _dirtyCount } = collection;

  collection.get(_dirtyOffset, polyline);
  const vertexOffset = polyline.vertexOffset * 2;
  const segmentOffset = polyline.vertexOffset - _dirtyOffset;
  const indexOffset = segmentOffset * 6;

  collection.get(_dirtyOffset + _dirtyCount - 1, polyline);
  const vertexCount =
    (polyline.vertexOffset + polyline.vertexCount) * 2 - vertexOffset;
  const segmentCount = vertexCount / 2 - _dirtyCount;
  const indexCount = segmentCount * 6;

  return { indexOffset, indexCount, vertexOffset, vertexCount };
}

/**
 * Destroys render context resources. Deleting properties from the context
 * object isn't necessary, as collection.destroy() will discard the object.
 * @ignore
 */
function destroyRenderContext() {
  const context = /** @type {BufferPolylineRenderContext} */ (this);

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

export default renderBufferPolylineCollection;
