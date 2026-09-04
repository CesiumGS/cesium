// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import BufferPoint from "./BufferPoint.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import VertexArray from "../Renderer/VertexArray.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import BufferPointMaterialVS from "../Shaders/BufferPointMaterialVS.js";
import BufferPointMaterialFS from "../Shaders/BufferPointMaterialFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import BufferPointMaterial from "./BufferPointMaterial.js";
import buildBufferPrimitiveDrawCommand, {
  destroyBufferPrimitiveRenderContext,
} from "./buildBufferPrimitiveDrawCommand.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPointCollection from "./BufferPointCollection.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */
/** @import {BufferPrimitiveRenderContext} from "./buildBufferPrimitiveDrawCommand.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'pickColor' | 'showSizeColorAlpha' | 'outlineWidthColorAlpha'} BufferPointAttribute
 * @ignore
 */

/**
 * Attribute locations when using 64-bit position precision.
 * @type {Record<BufferPointAttribute, number>}
 * @ignore
 */
const BufferPointAttributeLocationsFloat64 = {
  positionHigh: 0,
  positionLow: 1,
  pickColor: 2,
  showSizeColorAlpha: 3,
  outlineWidthColorAlpha: 4,
};

/**
 * Attribute locations when using <= 32-bit position precision.
 * @type {Record<string, number>}
 * @ignore
 */
const BufferPointAttributeLocations = {
  position: 0,
  pickColor: 1,
  showSizeColorAlpha: 2,
  outlineWidthColorAlpha: 3,
};

// Scratch variables.
const point = new BufferPoint();
const material = new BufferPointMaterial();
const pickColor = new Color();
const cartesian = new Cartesian3();
const encodedCartesian = new EncodedCartesian3();

/**
 * @param {BufferPointCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPrimitiveRenderContext} [renderContext]
 * @returns {BufferPrimitiveRenderContext}
 * @ignore
 */
function renderBufferPointCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || {
    destroy: destroyBufferPrimitiveRenderContext,
  };
  const useFloat64 = collection._positionDatatype === ComponentDatatype.DOUBLE;
  const attributeLocations = useFloat64
    ? BufferPointAttributeLocationsFloat64
    : BufferPointAttributeLocations;

  if (!defined(renderContext.attributeArrays)) {
    const featureCountMax = collection.primitiveCountMax;

    renderContext.attributeArrays = {
      ...(useFloat64
        ? {
            positionHigh: new Float32Array(featureCountMax * 3),
            positionLow: new Float32Array(featureCountMax * 3),
          }
        : { position: collection._positionView }),
      pickColor: new Uint8Array(featureCountMax * 4),
      showSizeColorAlpha: new Float32Array(featureCountMax * 4),
      outlineWidthColorAlpha: new Float32Array(featureCountMax * 3),
    };
  }

  if (collection._dirtyCount > 0) {
    const { attributeArrays } = renderContext;

    const positionHighArray = attributeArrays.positionHigh;
    const positionLowArray = attributeArrays.positionLow;
    const pickColorArray = attributeArrays.pickColor;
    const showSizeColorAlphaArray = attributeArrays.showSizeColorAlpha;
    const outlineWidthColorAlphaArray = attributeArrays.outlineWidthColorAlpha;

    const { _dirtyOffset, _dirtyCount } = collection;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, point);

      if (!point._dirty) {
        continue;
      }

      if (useFloat64) {
        point.getPosition(cartesian);
        EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Cartesian3.pack(encodedCartesian.high, positionHighArray, i * 3);
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        Cartesian3.pack(encodedCartesian.low, positionLowArray, i * 3);
      }

      point.getMaterial(material);
      Color.fromRgba(point._pickId, pickColor);

      pickColorArray[i * 4] = Color.floatToByte(pickColor.red);
      pickColorArray[i * 4 + 1] = Color.floatToByte(pickColor.green);
      pickColorArray[i * 4 + 2] = Color.floatToByte(pickColor.blue);
      pickColorArray[i * 4 + 3] = Color.floatToByte(pickColor.alpha);

      showSizeColorAlphaArray[i * 4] = point.show ? 1 : 0;
      showSizeColorAlphaArray[i * 4 + 1] = material.size;
      showSizeColorAlphaArray[i * 4 + 2] = AttributeCompression.encodeRGB8(
        material.color,
      );
      showSizeColorAlphaArray[i * 4 + 3] = material.color.alpha;

      outlineWidthColorAlphaArray[i * 3] = material.outlineWidth;
      outlineWidthColorAlphaArray[i * 3 + 1] = AttributeCompression.encodeRGB8(
        // When outlineWidth=0, overwrite outlineColor to prevent subpixel bleeding.
        material.outlineWidth > 0 ? material.outlineColor : material.color,
      );
      outlineWidthColorAlphaArray[i * 3 + 2] =
        // When outlineWidth=0, overwrite outlineAlpha to prevent subpixel bleeding.
        material.outlineWidth > 0
          ? material.outlineColor.alpha
          : material.color.alpha;

      point._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const { attributeArrays } = renderContext;

    renderContext.vertexArray = new VertexArray({
      context,
      attributes: [
        ...(!useFloat64
          ? [
              {
                index: BufferPointAttributeLocations.position,
                componentDatatype: collection._positionDatatype,
                componentsPerAttribute: 3,
                normalize: collection._positionNormalized,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: collection._positionView,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
            ]
          : [
              {
                index: BufferPointAttributeLocationsFloat64.positionHigh,
                componentDatatype: ComponentDatatype.FLOAT,
                componentsPerAttribute: 3,
                vertexBuffer: Buffer.createVertexBuffer({
                  typedArray: attributeArrays.positionHigh,
                  context,
                  usage: BufferUsage.STATIC_DRAW,
                }),
              },
              {
                index: BufferPointAttributeLocationsFloat64.positionLow,
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
          index: attributeLocations.showSizeColorAlpha,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showSizeColorAlpha,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: attributeLocations.outlineWidthColorAlpha,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.outlineWidthColorAlpha,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });
  } else if (collection._dirtyCount > 0) {
    for (const key in attributeLocations) {
      if (Object.hasOwn(attributeLocations, key)) {
        const attribute = /** @type {BufferPointAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          attributeLocations[attribute],
          renderContext.attributeArrays[attribute],
          collection._dirtyOffset,
          collection._dirtyCount,
        );
      }
    }
  }

  buildBufferPrimitiveDrawCommand(collection, frameState, renderContext, {
    primitiveType: PrimitiveType.POINTS,
    attributeLocations,
    vertexShaderSources: [BufferPointMaterialVS],
    fragmentShaderSources: [BufferPointMaterialFS],
    useFloat64,
    drawCount: collection.primitiveCount,
  });

  collection._makeClean();

  return renderContext;
}

export default renderBufferPointCollection;
