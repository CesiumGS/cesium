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
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'prevPositionHigh' | 'prevPositionLow' | 'nextPositionHigh' | 'nextPositionLow' | 'pickColor' | 'showColorWidthAndTexCoord'} BufferPolylineAttribute
 * @ignore
 */

/**
 * Attribute locations when using 64-bit position precision.
 * @type {Record<BufferPolylineAttribute, number>}
 * @ignore
 */
const BufferPolylineAttributeLocationsFloat64 = {
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
 * Attribute locations when using <= 32-bit position precision.
 * @type {Record<string, number>}
 * @ignore
 */
const BufferPolylineAttributeLocations = {
  position: 0,
  prevPosition: 1,
  nextPosition: 2,
  pickColor: 3,
  showColorWidthAndTexCoord: 4,
};

/**
 * @typedef {object} BufferPolylineRenderContext
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
  const useFloat64 = collection._positionDatatype === ComponentDatatype.DOUBLE;
  const attributeLocations = useFloat64
    ? BufferPolylineAttributeLocationsFloat64
    : BufferPolylineAttributeLocations;

  if (
    !defined(renderContext.attributeArrays) ||
    !defined(renderContext.indexArray)
  ) {
    // Number of primitives can only increase, which _decreases_ remaining
    // segment capacity: use `primitiveCount` here, not `primitiveCountMax`.
    const segmentCountMax =
      collection.vertexCountMax - collection.primitiveCount;
    const vertexCountMax = collection.vertexCountMax * 2;

    // @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
    renderContext.indexArray = IndexDatatype.createTypedArray(
      vertexCountMax,
      segmentCountMax * 6,
    );

    renderContext.attributeArrays = !useFloat64
      ? {
          // @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
          position: ComponentDatatype.createTypedArray(
            collection._positionDatatype,
            vertexCountMax * 3,
          ),
          // @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
          prevPosition: ComponentDatatype.createTypedArray(
            collection._positionDatatype,
            vertexCountMax * 3,
          ),
          // @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
          nextPosition: ComponentDatatype.createTypedArray(
            collection._positionDatatype,
            vertexCountMax * 3,
          ),
          pickColor: new Uint8Array(vertexCountMax * 4),
          showColorWidthAndTexCoord: new Float32Array(vertexCountMax * 4),
        }
      : {
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

  if (collection._dirtyCount > 0) {
    const { _dirtyOffset, _dirtyCount } = collection;
    const { attributeArrays } = renderContext;

    const indexArray = renderContext.indexArray;
    const pickColorArray = attributeArrays.pickColor;
    const showColorWidthAndTexCoordArray =
      attributeArrays.showColorWidthAndTexCoord;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, polyline);

      if (!polyline._dirty) {
        continue;
      }

      polyline.getMaterial(material);
      const encodedColor = AttributeCompression.encodeRGB8(material.color);
      Color.fromRgba(polyline._pickId, pickColor);
      const show = polyline.show;

      let vOffset = polyline.vertexOffset * 2; // vertex offset
      let iOffset = (polyline.vertexOffset - i) * 6; // index offset

      const jl = polyline.vertexCount;

      if (!useFloat64) {
        const posView = collection._positionView;
        const posStart = polyline.vertexOffset * 3;
        const posArray = attributeArrays.position;
        const prevPosArray = attributeArrays.prevPosition;
        const nextPosArray = attributeArrays.nextPosition;

        for (let j = 0; j < jl; j++) {
          const isFirstSegment = j === 0;
          const isLastSegment = j === jl - 1;

          const cx = posView[posStart + j * 3];
          const cy = posView[posStart + j * 3 + 1];
          const cz = posView[posStart + j * 3 + 2];

          let px, py, pz, nx, ny, nz;

          if (isFirstSegment) {
            nx = posView[posStart + 1 * 3];
            ny = posView[posStart + 1 * 3 + 1];
            nz = posView[posStart + 1 * 3 + 2];
            // Mirror current over next to get synthetic prev.
            px = 2 * cx - nx;
            py = 2 * cy - ny;
            pz = 2 * cz - nz;
          } else if (isLastSegment) {
            px = posView[posStart + (j - 1) * 3];
            py = posView[posStart + (j - 1) * 3 + 1];
            pz = posView[posStart + (j - 1) * 3 + 2];
            // Mirror current over prev to get synthetic next.
            nx = 2 * cx - px;
            ny = 2 * cy - py;
            nz = 2 * cz - pz;
          } else {
            px = posView[posStart + (j - 1) * 3];
            py = posView[posStart + (j - 1) * 3 + 1];
            pz = posView[posStart + (j - 1) * 3 + 2];
            nx = posView[posStart + (j + 1) * 3];
            ny = posView[posStart + (j + 1) * 3 + 1];
            nz = posView[posStart + (j + 1) * 3 + 2];
          }

          if (!isLastSegment) {
            indexArray[iOffset] = vOffset;
            indexArray[iOffset + 1] = vOffset + 1;
            indexArray[iOffset + 2] = vOffset + 2;
            indexArray[iOffset + 3] = vOffset + 2;
            indexArray[iOffset + 4] = vOffset + 1;
            indexArray[iOffset + 5] = vOffset + 3;
            iOffset += 6;
          }

          // Write each vertex twice for the quad.
          for (let k = 0; k < 2; k++) {
            posArray[vOffset * 3] = cx;
            posArray[vOffset * 3 + 1] = cy;
            posArray[vOffset * 3 + 2] = cz;

            prevPosArray[vOffset * 3] = px;
            prevPosArray[vOffset * 3 + 1] = py;
            prevPosArray[vOffset * 3 + 2] = pz;

            nextPosArray[vOffset * 3] = nx;
            nextPosArray[vOffset * 3 + 1] = ny;
            nextPosArray[vOffset * 3 + 2] = nz;

            pickColorArray[vOffset * 4] = Color.floatToByte(pickColor.red);
            pickColorArray[vOffset * 4 + 1] = Color.floatToByte(
              pickColor.green,
            );
            pickColorArray[vOffset * 4 + 2] = Color.floatToByte(pickColor.blue);
            pickColorArray[vOffset * 4 + 3] = Color.floatToByte(
              pickColor.alpha,
            );

            showColorWidthAndTexCoordArray[vOffset * 4] = show ? 1 : 0;
            showColorWidthAndTexCoordArray[vOffset * 4 + 1] = encodedColor;
            showColorWidthAndTexCoordArray[vOffset * 4 + 2] = material.width;
            showColorWidthAndTexCoordArray[vOffset * 4 + 3] = j / (jl - 1);

            vOffset++;
          }
        }
      } else {
        const cartesianArray = polyline.getPositions();

        for (let j = 0; j < jl; j++) {
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
            attributeArrays.positionHigh[vOffset * 3] = cartesianEnc.high.x;
            attributeArrays.positionHigh[vOffset * 3 + 1] = cartesianEnc.high.y;
            attributeArrays.positionHigh[vOffset * 3 + 2] = cartesianEnc.high.z;

            attributeArrays.positionLow[vOffset * 3] = cartesianEnc.low.x;
            attributeArrays.positionLow[vOffset * 3 + 1] = cartesianEnc.low.y;
            attributeArrays.positionLow[vOffset * 3 + 2] = cartesianEnc.low.z;

            // Previous position.
            attributeArrays.prevPositionHigh[vOffset * 3] =
              prevCartesianEnc.high.x;
            attributeArrays.prevPositionHigh[vOffset * 3 + 1] =
              prevCartesianEnc.high.y;
            attributeArrays.prevPositionHigh[vOffset * 3 + 2] =
              prevCartesianEnc.high.z;

            attributeArrays.prevPositionLow[vOffset * 3] =
              prevCartesianEnc.low.x;
            attributeArrays.prevPositionLow[vOffset * 3 + 1] =
              prevCartesianEnc.low.y;
            attributeArrays.prevPositionLow[vOffset * 3 + 2] =
              prevCartesianEnc.low.z;

            // Next position.
            attributeArrays.nextPositionHigh[vOffset * 3] =
              nextCartesianEnc.high.x;
            attributeArrays.nextPositionHigh[vOffset * 3 + 1] =
              nextCartesianEnc.high.y;
            attributeArrays.nextPositionHigh[vOffset * 3 + 2] =
              nextCartesianEnc.high.z;

            attributeArrays.nextPositionLow[vOffset * 3] =
              nextCartesianEnc.low.x;
            attributeArrays.nextPositionLow[vOffset * 3 + 1] =
              nextCartesianEnc.low.y;
            attributeArrays.nextPositionLow[vOffset * 3 + 2] =
              nextCartesianEnc.low.z;

            // Pick ID.
            pickColorArray[vOffset * 4] = Color.floatToByte(pickColor.red);
            pickColorArray[vOffset * 4 + 1] = Color.floatToByte(
              pickColor.green,
            );
            pickColorArray[vOffset * 4 + 2] = Color.floatToByte(pickColor.blue);
            pickColorArray[vOffset * 4 + 3] = Color.floatToByte(
              pickColor.alpha,
            );

            // Properties.
            showColorWidthAndTexCoordArray[vOffset * 4] = show ? 1 : 0;
            showColorWidthAndTexCoordArray[vOffset * 4 + 1] = encodedColor;
            showColorWidthAndTexCoordArray[vOffset * 4 + 2] = material.width;
            showColorWidthAndTexCoordArray[vOffset * 4 + 3] = j / (jl - 1); // texcoord.s

            vOffset++;
          }
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
        usage: BufferUsage.STATIC_DRAW,
        // @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
        indexDatatype: IndexDatatype.fromTypedArray(renderContext.indexArray),
      }),

      attributes: [
        ...(!useFloat64
          ? [
              {
                index: BufferPolylineAttributeLocations.position,
                componentDatatype: collection._positionDatatype,
                componentsPerAttribute: 3,
                normalize: collection._positionNormalized,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.position,
                  context,
                  usage: BufferUsage.DYNAMIC_DRAW,
                }),
              },
              {
                index: BufferPolylineAttributeLocations.prevPosition,
                componentDatatype: collection._positionDatatype,
                componentsPerAttribute: 3,
                normalize: collection._positionNormalized,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.prevPosition,
                  context,
                  usage: BufferUsage.DYNAMIC_DRAW,
                }),
              },
              {
                index: BufferPolylineAttributeLocations.nextPosition,
                componentDatatype: collection._positionDatatype,
                componentsPerAttribute: 3,
                normalize: collection._positionNormalized,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.nextPosition,
                  context,
                  usage: BufferUsage.DYNAMIC_DRAW,
                }),
              },
            ]
          : [
              {
                index: BufferPolylineAttributeLocationsFloat64.positionHigh,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.positionHigh,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
              {
                index: BufferPolylineAttributeLocationsFloat64.positionLow,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.positionLow,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
              {
                index: BufferPolylineAttributeLocationsFloat64.prevPositionHigh,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.prevPositionHigh,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
              {
                index: BufferPolylineAttributeLocationsFloat64.prevPositionLow,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.prevPositionLow,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
              {
                index: BufferPolylineAttributeLocationsFloat64.nextPositionHigh,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.nextPositionHigh,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
              {
                index: BufferPolylineAttributeLocationsFloat64.nextPositionLow,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.nextPositionLow,
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
          index: attributeLocations.showColorWidthAndTexCoord,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showColorWidthAndTexCoord,
            context,
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

    for (const key in attributeLocations) {
      if (Object.hasOwn(attributeLocations, key)) {
        const attribute = /** @type {BufferPolylineAttribute} */ (key);
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
      blending: BlendingState.DISABLED,
      depthTest: { enabled: true },
    });
  }

  if (!defined(renderContext.shaderProgram)) {
    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [PolylineCommon, BufferPolylineMaterialVS],
        defines: useFloat64 ? ["USE_FLOAT64"] : [],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPolylineMaterialFS],
      }),
      attributeLocations,
    });
  }

  const drawCount = getDrawIndexCount(collection);

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
}

export default renderBufferPolylineCollection;
