// @ts-check

import {
  AttributeCompression,
  Cartesian3,
  Color,
  ComponentDatatype,
  EncodedCartesian3,
  PrimitiveType,
  defined,
} from "@cesium/core";
import BufferPoint from "./BufferPoint.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import VertexArray from "../Renderer/VertexArray.js";
import RenderState from "../Renderer/RenderState.js";
import BlendingState from "./BlendingState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import BufferPointMaterialVS from "../Shaders/BufferPointMaterialVS.js";
import BufferPointMaterialFS from "../Shaders/BufferPointMaterialFS.js";
import BufferPointMaterial from "./BufferPointMaterial.js";
import BlendOption from "./BlendOption.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPointCollection from "./BufferPointCollection.js"; */
/** @import { BufferPrimitiveChangeTracker } from "./BufferPrimitiveCollection.js"; */
/** @import {TypedArray} from "@cesium/core"; */

/**
 * Style applied to the points of a collection, in place of per-point materials.
 * Global values are passed as uniforms; when any property is a callback, every
 * property is evaluated per point and stored as vertex attributes.
 *
 * @typedef {object} BufferPointStyle
 * @property {number|function(BufferPoint): number} radius Radius of the fill, in pixels.
 * @property {Color|function(BufferPoint): Color} color
 * @property {Color|function(BufferPoint): Color} outlineColor
 * @property {number|function(BufferPoint): number} outlineWidth Width of the outline, in pixels.
 * @property {BlendOption} blendOption
 * @property {boolean} _hasStyleCallbacks
 * @property {number} _styleVersion
 * @property {function(BufferPoint, BufferPointStyleResult): BufferPointStyleResult} _evaluatePoint
 * @ignore
 */

/**
 * @typedef {object} BufferPointStyleResult
 * @property {boolean} show
 * @property {number} radius
 * @property {Color} color
 * @property {Color} outlineColor
 * @property {number} outlineWidth
 * @ignore
 */

const { DirtyFlags } = BufferPrimitiveCollection;

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'position' | 'positionHigh' | 'positionLow' | 'pickColor' | 'showSizeColorAlpha' | 'outlineWidthColorAlpha'} BufferPointAttribute
 * @ignore
 */

/**
 * Attribute locations when using 64-bit position precision.
 * @type {Partial<Record<BufferPointAttribute, number>>}
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
 * @type {Partial<Record<BufferPointAttribute, number>>}
 * @ignore
 */
const BufferPointAttributeLocations = {
  position: 0,
  pickColor: 1,
  showSizeColorAlpha: 2,
  outlineWidthColorAlpha: 3,
};

/**
 * @typedef {object} BufferPointRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<string, TypedArray>} [attributeArrays]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {Record<string, function(): *>} [uniformMap]
 * @property {boolean} [useStyleUniforms]
 * @property {number} [styleVersion]
 * @property {DrawCommand} [command]
 * @property {BufferPointCollection} [collection]
 * @property {BufferPrimitiveChangeTracker} [changeTracker]
 * @property {Function} destroy
 * @ignore
 */

// Scratch variables.
const point = new BufferPoint();
const material = new BufferPointMaterial();
const pointStyle = {
  show: true,
  radius: 0,
  color: Color.WHITE,
  outlineColor: Color.WHITE,
  outlineWidth: 0,
};
const pickColor = new Color();
const cartesian = new Cartesian3();
const encodedCartesian = new EncodedCartesian3();

/**
 * @param {BufferPointCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPointRenderContext} [renderContext]
 * @param {BufferPointStyle} [style] Must be the same object on every call with a given render context.
 * @returns {BufferPointRenderContext}
 * @ignore
 */
function renderBufferPointCollection(
  collection,
  frameState,
  renderContext,
  style,
) {
  const context = frameState.context;
  renderContext = renderContext || {
    destroy: destroyRenderContext,
    collection,
    changeTracker: collection._addChangeTracker(),
  };
  const tracker = renderContext.changeTracker;
  const useFloat64 = collection._positionDatatype === ComponentDatatype.DOUBLE;
  const attributeLocations = useFloat64
    ? BufferPointAttributeLocationsFloat64
    : BufferPointAttributeLocations;
  const useStyleUniforms = defined(style) && !style._hasStyleCallbacks;
  const useStyleAttributes = defined(style) && style._hasStyleCallbacks;

  // Re-evaluates every point for this render context only; other consumers of
  // the collection keep their own change trackers.
  const styleModeChanged =
    defined(renderContext.useStyleUniforms) &&
    renderContext.useStyleUniforms !== useStyleUniforms;
  const styleChanged =
    useStyleAttributes && renderContext.styleVersion !== style._styleVersion;
  if (styleModeChanged || styleChanged) {
    tracker.offset = 0;
    tracker.count = collection.primitiveCount;
    tracker.flags |= DirtyFlags.PROPERTIES;
    tracker.full = true;
  }
  renderContext.styleVersion = style?._styleVersion;

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

  if (tracker.count > 0 && tracker.flags & DirtyFlags.PROPERTIES) {
    const { attributeArrays } = renderContext;

    const pickColorArray = attributeArrays.pickColor;
    const showSizeColorAlphaArray = attributeArrays.showSizeColorAlpha;
    const outlineWidthColorAlphaArray = attributeArrays.outlineWidthColorAlpha;

    const { offset, count, full } = tracker;

    for (let i = offset, il = offset + count; i < il; i++) {
      collection.get(i, point);

      if (!full && !point._dirty) {
        continue;
      }

      Color.fromRgba(point._pickId, pickColor);

      pickColorArray[i * 4] = Color.floatToByte(pickColor.red);
      pickColorArray[i * 4 + 1] = Color.floatToByte(pickColor.green);
      pickColorArray[i * 4 + 2] = Color.floatToByte(pickColor.blue);
      pickColorArray[i * 4 + 3] = Color.floatToByte(pickColor.alpha);

      // Global style values are uniforms, so only visibility is stored per point.
      if (useStyleUniforms) {
        showSizeColorAlphaArray[i * 4] = point.show ? 1 : 0;
        continue;
      }

      let show, size, color, outlineColor, outlineWidth;
      if (useStyleAttributes) {
        style._evaluatePoint(point, pointStyle);
        show = pointStyle.show;
        size = 2.0 * pointStyle.radius;
        color = pointStyle.color;
        outlineColor = pointStyle.outlineColor;
        outlineWidth = pointStyle.outlineWidth;
      } else {
        point.getMaterial(material);
        show = point.show;
        size = material.size;
        color = material.color;
        outlineColor = material.outlineColor;
        outlineWidth = material.outlineWidth;
      }

      // When outlineWidth=0, use the fill color to prevent subpixel bleeding.
      if (outlineWidth <= 0) {
        outlineColor = color;
      }

      showSizeColorAlphaArray[i * 4] = show ? 1 : 0;
      showSizeColorAlphaArray[i * 4 + 1] = size;
      showSizeColorAlphaArray[i * 4 + 2] =
        AttributeCompression.encodeRGB8(color);
      showSizeColorAlphaArray[i * 4 + 3] = color.alpha;

      outlineWidthColorAlphaArray[i * 3] = outlineWidth;
      outlineWidthColorAlphaArray[i * 3 + 1] =
        AttributeCompression.encodeRGB8(outlineColor);
      outlineWidthColorAlphaArray[i * 3 + 2] = outlineColor.alpha;
    }
  }

  // Fast path for position-only updates.
  if (tracker.count > 0 && tracker.flags & DirtyFlags.GEOMETRY && useFloat64) {
    const { attributeArrays } = renderContext;
    const { offset, count, full } = tracker;

    for (let i = offset, il = offset + count; i < il; i++) {
      collection.get(i, point);

      if (!full && !point._dirty) {
        continue;
      }

      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      Cartesian3.fromArray(collection._positionView, i * 3, cartesian);
      EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);
      Cartesian3.pack(
        encodedCartesian.high,
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        attributeArrays.positionHigh,
        i * 3,
      );
      // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
      Cartesian3.pack(encodedCartesian.low, attributeArrays.positionLow, i * 3);
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
  } else if (tracker.count > 0 && tracker.flags & DirtyFlags.PROPERTIES) {
    // Update all vertex attributes.
    for (const key in attributeLocations) {
      if (Object.hasOwn(attributeLocations, key)) {
        const attribute = /** @type {BufferPointAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          attributeLocations[attribute],
          renderContext.attributeArrays[attribute],
          tracker.offset,
          tracker.count,
        );
      }
    }
  } else if (tracker.count > 0 && tracker.flags & DirtyFlags.GEOMETRY) {
    // Fast path for geometry-only updates.

    /** @type {BufferPointAttribute[]} */
    const positionAttributeLocations = useFloat64
      ? ["positionHigh", "positionLow"]
      : ["position"];

    for (const attribute of positionAttributeLocations) {
      renderContext.vertexArray.copyAttributeFromRange(
        attributeLocations[attribute],
        renderContext.attributeArrays[attribute],
        tracker.offset,
        tracker.count,
      );
    }
  }

  const blendOption = defined(style)
    ? style.blendOption
    : collection._blendOption;
  const pass =
    blendOption === BlendOption.OPAQUE ? Pass.OPAQUE : Pass.TRANSLUCENT;

  if (defined(renderContext.command) && renderContext.command.pass !== pass) {
    RenderState.removeFromCache(renderContext.renderState);
    renderContext.renderState = undefined;
    renderContext.command = undefined;
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending:
        pass === Pass.OPAQUE
          ? BlendingState.DISABLED
          : BlendingState.ALPHA_BLEND,
      depthTest: { enabled: true },
    });
  }

  if (
    defined(renderContext.shaderProgram) &&
    renderContext.useStyleUniforms !== useStyleUniforms
  ) {
    renderContext.shaderProgram.destroy();
    renderContext.shaderProgram = undefined;
    renderContext.uniformMap = undefined;
    renderContext.command = undefined;
  }

  if (!defined(renderContext.shaderProgram)) {
    const vertexDefines = [];
    if (useFloat64) {
      vertexDefines.push("USE_FLOAT64");
    }
    if (useStyleUniforms) {
      vertexDefines.push("USE_STYLE");
      renderContext.uniformMap = {
        u_color: () => style.color,
        u_outlineColor: () => style.outlineColor,
        u_pixelSize: () => 2.0 * /** @type {number} */ (style.radius),
        u_outlineWidth: () => style.outlineWidth,
      };
    }
    renderContext.useStyleUniforms = useStyleUniforms;

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [BufferPointMaterialVS],
        defines: vertexDefines,
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPointMaterialFS],
      }),
      attributeLocations,
    });
  }

  if (!defined(renderContext.command)) {
    renderContext.command = new DrawCommand({
      vertexArray: renderContext.vertexArray,
      renderState: renderContext.renderState,
      shaderProgram: renderContext.shaderProgram,
      uniformMap: renderContext.uniformMap,
      primitiveType: PrimitiveType.POINTS,
      pass,
      pickId: collection._allowPicking ? "v_pickColor" : undefined,
      owner: collection,
      count: collection.primitiveCount,
      modelMatrix: collection.modelMatrix, // shared reference
      boundingVolume: collection.boundingVolume, // shared reference
      debugShowBoundingVolume: collection.debugShowBoundingVolume,
    });
  }

  const command = renderContext.command;

  if (command.count !== collection.primitiveCount) {
    command.count = collection.primitiveCount;
  }

  if (command.debugShowBoundingVolume !== collection.debugShowBoundingVolume) {
    command.debugShowBoundingVolume = collection.debugShowBoundingVolume;
  }

  frameState.commandList.push(command);

  collection._makeClean(tracker);

  return renderContext;
}

/**
 * Destroys render context resources. Deleting properties from the context
 * object isn't necessary, as collection.destroy() will discard the object.
 * @ignore
 */
function destroyRenderContext() {
  const context = /** @type {BufferPointRenderContext} */ (this);

  context.collection._removeChangeTracker(context.changeTracker);

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

export default renderBufferPointCollection;
