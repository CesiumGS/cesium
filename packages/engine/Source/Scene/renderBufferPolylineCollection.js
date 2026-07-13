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
import BlendOption from "./BlendOption.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolygonMaterial from "./BufferPolygonMaterial.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'prevPositionHigh' | 'prevPositionLow' | 'nextPositionHigh' | 'nextPositionLow' | 'pickColor' | 'showColorWidthAndTexCoord' | 'alpha'} BufferPolylineAttribute
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
  alpha: 8,
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
  alpha: 5,
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
const polylineMaterial = new BufferPolylineMaterial();

const polygon = new BufferPolygon();
const polygonMaterial = new BufferPolygonMaterial();

const pickColor = new Color();
const cartesian = new Cartesian3();
const prevCartesian = new Cartesian3();
const nextCartesian = new Cartesian3();
const encodedC = new EncodedCartesian3();
const encodedP = new EncodedCartesian3();
const encodedN = new EncodedCartesian3();

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
 * @param {BufferPolylineCollection|BufferPolygonCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPolylineRenderContext} [renderContext]
 * @returns {BufferPolylineRenderContext}
 * @ignore
 */
function renderBufferPolylineCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || { destroy: destroyRenderContext };

  const useFloat64 = collection._positionDatatype === ComponentDatatype.DOUBLE;
  const isPolygonStroke = collection instanceof BufferPolygonCollection;

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

    renderContext.attributeArrays = {
      ...(!useFloat64
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
          }
        : {
            positionHigh: new Float32Array(vertexCountMax * 3),
            positionLow: new Float32Array(vertexCountMax * 3),
            prevPositionHigh: new Float32Array(vertexCountMax * 3),
            prevPositionLow: new Float32Array(vertexCountMax * 3),
            nextPositionHigh: new Float32Array(vertexCountMax * 3),
            nextPositionLow: new Float32Array(vertexCountMax * 3),
          }),
      pickColor: new Uint8Array(vertexCountMax * 4),
      showColorWidthAndTexCoord: new Float32Array(vertexCountMax * 4),
      alpha: new Uint8Array(vertexCountMax),
    };
  }

  if (collection._dirtyCount > 0) {
    const { _dirtyOffset, _dirtyCount } = collection;

    const indexArray = renderContext.indexArray;

    const {
      // Common.
      pickColor: pickColorArray,
      showColorWidthAndTexCoord: showColorWidthAndTexCoordArray,
      alpha: alphaArray,

      // 8-32 bit.
      position,
      prevPosition,
      nextPosition,

      // 64 bit.
      positionHigh,
      positionLow,
      prevPositionHigh,
      prevPositionLow,
      nextPositionHigh,
      nextPositionLow,
    } = renderContext.attributeArrays;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      const primitive = /** @type {BufferPolyline|BufferPolygon} */ (
        collection.get(i, isPolygonStroke ? polygon : polyline)
      );

      if (!primitive._dirty) {
        continue;
      }

      primitive.getMaterial(
        isPolygonStroke ? polygonMaterial : polylineMaterial,
      );

      const encodedColor = AttributeCompression.encodeRGB8(
        isPolygonStroke ? polygonMaterial.outlineColor : polylineMaterial.color,
      );

      const colorAlpha = isPolygonStroke
        ? polygonMaterial.outlineColor.alpha
        : polylineMaterial.color.alpha;

      Color.fromRgba(primitive._pickId, pickColor);
      const show = primitive.show;

      let vOffset = primitive.vertexOffset * 2; // vertex offset
      let iOffset = (primitive.vertexOffset - i) * 6; // index offset

      const posView = collection._positionView;
      const posStart = primitive.vertexOffset * 3;

      // TODO(donmccurdy): For polygons, need to repeat 1st vertex.
      // TODO(donmccurdy): For polygons, need to break on holes.
      for (let j = 0, jl = primitive.vertexCount; j < jl; j++) {
        const isFirstSegment = j === 0;
        const isLastSegment = j === jl - 1;

        // c=current, p=previous, n=next

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

        if (useFloat64) {
          Cartesian3.fromElements(cx, cy, cz, cartesian);
          Cartesian3.fromElements(px, py, pz, prevCartesian);
          Cartesian3.fromElements(nx, ny, nz, nextCartesian);
          EncodedCartesian3.fromCartesian(cartesian, encodedC);
          EncodedCartesian3.fromCartesian(prevCartesian, encodedP);
          EncodedCartesian3.fromCartesian(nextCartesian, encodedN);
        }

        // TODO(donmccurdy): Diverging from PolylineCollection.js, which writes
        // internal vertices to buffer 4x, not 2x. Not sure that's needed?

        // Write each vertex twice for the quad.
        for (let k = 0; k < 2; k++) {
          if (!useFloat64) {
            position[vOffset * 3] = cx;
            position[vOffset * 3 + 1] = cy;
            position[vOffset * 3 + 2] = cz;

            prevPosition[vOffset * 3] = px;
            prevPosition[vOffset * 3 + 1] = py;
            prevPosition[vOffset * 3 + 2] = pz;

            nextPosition[vOffset * 3] = nx;
            nextPosition[vOffset * 3 + 1] = ny;
            nextPosition[vOffset * 3 + 2] = nz;
          } else {
            // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
            Cartesian3.pack(encodedC.high, positionHigh, vOffset * 3);
            // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
            Cartesian3.pack(encodedC.low, positionLow, vOffset * 3);

            // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
            Cartesian3.pack(encodedP.high, prevPositionHigh, vOffset * 3);
            // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
            Cartesian3.pack(encodedP.low, prevPositionLow, vOffset * 3);

            // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
            Cartesian3.pack(encodedN.high, nextPositionHigh, vOffset * 3);
            // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
            Cartesian3.pack(encodedN.low, nextPositionLow, vOffset * 3);
          }

          pickColorArray[vOffset * 4] = Color.floatToByte(pickColor.red);
          pickColorArray[vOffset * 4 + 1] = Color.floatToByte(pickColor.green);
          pickColorArray[vOffset * 4 + 2] = Color.floatToByte(pickColor.blue);
          pickColorArray[vOffset * 4 + 3] = Color.floatToByte(pickColor.alpha);

          showColorWidthAndTexCoordArray[vOffset * 4] = show ? 1 : 0;
          showColorWidthAndTexCoordArray[vOffset * 4 + 1] = encodedColor;
          showColorWidthAndTexCoordArray[vOffset * 4 + 2] = isPolygonStroke
            ? polygonMaterial.outlineWidth
            : polylineMaterial.width;
          showColorWidthAndTexCoordArray[vOffset * 4 + 3] = j / (jl - 1);

          alphaArray[vOffset] = colorAlpha * 255.0;

          vOffset++;
        }
      }

      primitive._dirty = false;
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
                  usage: BufferUsage.STATIC_DRAW,
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
                  usage: BufferUsage.STATIC_DRAW,
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
                  usage: BufferUsage.STATIC_DRAW,
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
        {
          index: attributeLocations.alpha,
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 1,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.alpha,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    const { indexOffset, indexCount, vertexOffset, vertexCount } =
      isPolygonStroke
        ? getPolygonDirtyRanges(collection)
        : getPolylineDirtyRanges(collection);

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
        sources: [PolylineCommon, BufferPolylineMaterialVS],
        defines: useFloat64 ? ["USE_FLOAT64"] : [],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPolylineMaterialFS],
      }),
      attributeLocations,
    });
  }

  const drawCount = isPolygonStroke
    ? getPolygonDrawIndexCount(collection)
    : getPolylineDrawIndexCount(collection);

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
 * Returns number of drawn (not allocated) indices for given collection.
 * @param {BufferPolylineCollection} collection
 * @ignore
 */
function getPolylineDrawIndexCount(collection) {
  return (collection.vertexCount - collection.primitiveCount) * 6;
}

/**
 * Returns number of drawn (not allocated) indices for given collection.
 * @param {BufferPolygonCollection} collection
 * @ignore
 */
function getPolygonDrawIndexCount(collection) {
  const loopCount = collection.primitiveCount - collection.holeCount;
  return (collection.vertexCount - loopCount) * 6;
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
 * Computes dirty ranges for attribute and index buffers in a collection.
 * @param {BufferPolygonCollection} collection
 * @ignore
 */
function getPolygonDirtyRanges(collection) {
  // TODO(donmccurdy): Must account for repeating 1st vertex, and for holes.
  return getPolylineDirtyRanges(/** @type {*} */ (collection));
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
