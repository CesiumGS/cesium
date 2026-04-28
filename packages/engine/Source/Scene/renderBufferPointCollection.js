// @ts-check

import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import BufferPoint from "./BufferPoint.js";
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
import BufferPointMaterialVS from "../Shaders/BufferPointMaterialVS.js";
import BufferPointMaterialFS from "../Shaders/BufferPointMaterialFS.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import Matrix4 from "../Core/Matrix4.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import BufferPointMaterial from "./BufferPointMaterial.js";
import BlendOption from "./BlendOption.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPointCollection from "./BufferPointCollection.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'pickColor' | 'showSizeColorAlpha' | 'outlineWidthColorAlpha'} BufferPointAttribute
 * @ignore
 */

/**
 * @type {Record<BufferPointAttribute, number>}
 * @ignore
 */
const BufferPointAttributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  pickColor: 2,
  showSizeColorAlpha: 3,
  outlineWidthColorAlpha: 4,
};

/**
 * @typedef {object} BufferPointRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<BufferPointAttribute, TypedArray>} [attributeArrays]
 * @property {RenderState} [renderState]
 * @property {ShaderProgram} [shaderProgram]
 * @property {DrawCommand} [command]
 * @property {Function} destroy
 * @ignore
 */

// Scratch variables.
const point = new BufferPoint();
const material = new BufferPointMaterial();
const pickColor = new Color();
const cartesian = new Cartesian3();
const encodedCartesian = new EncodedCartesian3();

/**
 * @param {BufferPointCollection} collection
 * @param {FrameState} frameState
 * @param {BufferPointRenderContext} [renderContext]
 * @returns {BufferPointRenderContext}
 * @ignore
 */
function renderBufferPointCollection(collection, frameState, renderContext) {
  const context = frameState.context;
  renderContext = renderContext || { destroy: destroyRenderContext };

  if (!defined(renderContext.attributeArrays)) {
    const featureCountMax = collection.primitiveCountMax;

    renderContext.attributeArrays = {
      positionHigh: new Float32Array(featureCountMax * 3),
      positionLow: new Float32Array(featureCountMax * 3),
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

      point.getPosition(cartesian);
      EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);
      point.getMaterial(material);
      Color.fromRgba(point._pickId, pickColor);

      positionHighArray[i * 3] = encodedCartesian.high.x;
      positionHighArray[i * 3 + 1] = encodedCartesian.high.y;
      positionHighArray[i * 3 + 2] = encodedCartesian.high.z;

      positionLowArray[i * 3] = encodedCartesian.low.x;
      positionLowArray[i * 3 + 1] = encodedCartesian.low.y;
      positionLowArray[i * 3 + 2] = encodedCartesian.low.z;

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
        material.outlineColor,
      );
      outlineWidthColorAlphaArray[i * 3 + 2] = material.outlineColor.alpha;

      point._dirty = false;
    }
  }

  if (!defined(renderContext.vertexArray)) {
    const { attributeArrays } = renderContext;

    renderContext.vertexArray = new VertexArray({
      context,
      attributes: [
        {
          index: BufferPointAttributeLocations.positionHigh,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.positionHigh,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPointAttributeLocations.positionLow,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.positionLow,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPointAttributeLocations.pickColor,
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.pickColor,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPointAttributeLocations.showSizeColorAlpha,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showSizeColorAlpha,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: BufferPointAttributeLocations.outlineWidthColorAlpha,
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
    for (const key in BufferPointAttributeLocations) {
      if (Object.hasOwn(BufferPointAttributeLocations, key)) {
        const attribute = /** @type {BufferPointAttribute} */ (key);
        renderContext.vertexArray.copyAttributeFromRange(
          BufferPointAttributeLocations[attribute],
          renderContext.attributeArrays[attribute],
          collection._dirtyOffset,
          collection._dirtyCount,
        );
      }
    }
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending:
        // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
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
        sources: [BufferPointMaterialVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPointMaterialFS],
      }),
      attributeLocations: BufferPointAttributeLocations,
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
      primitiveType: PrimitiveType.POINTS,
      pass: Pass.OPAQUE,
      pickId: collection._allowPicking ? "v_pickColor" : undefined,
      owner: collection,
      count: collection.primitiveCount,
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
 * @param {BufferPointCollection} collection
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
    collection.primitiveCount !== command._count ||
    collection.debugShowBoundingVolume !== command.debugShowBoundingVolume ||
    !isModelMatrixEqual ||
    !isBoundingVolumeEqual
  );
}

/**
 * Destroys render context resources. Deleting properties from the context
 * object isn't necessary, as collection.destroy() will discard the object.
 * @ignore
 */
function destroyRenderContext() {
  const context = /** @type {BufferPointRenderContext} */ (this);

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
