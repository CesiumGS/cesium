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
import BufferPointMaterial from "./BufferPointMaterial.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPointCollection from "./BufferPointCollection.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * TODO(PR#13211): Need 'keyof' syntax to avoid duplicating attribute names.
 * @typedef {'positionHigh' | 'positionLow' | 'pickColor' | 'showSizeAndColor' | 'outlineWidthAndOutlineColor'} BufferPointAttribute
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
  showSizeAndColor: 3,
  outlineWidthAndOutlineColor: 4,
};

/**
 * Attribute locations when using <= 32-bit position precision.
 * @type {Record<string, number>}
 * @ignore
 */
const BufferPointAttributeLocations = {
  position: 0,
  pickColor: 1,
  showSizeAndColor: 2,
  outlineWidthAndOutlineColor: 3,
};

/**
 * @typedef {object} BufferPointRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<string, TypedArray>} [attributeArrays]
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
      showSizeAndColor: new Float32Array(featureCountMax * 3),
      outlineWidthAndOutlineColor: new Float32Array(featureCountMax * 2),
    };
  }

  if (collection._dirtyCount > 0) {
    const { attributeArrays } = renderContext;

    const pickColorArray = attributeArrays.pickColor;
    const showSizeAndColorArray = attributeArrays.showSizeAndColor;
    const outlineWidthAndOutlineColorArray =
      attributeArrays.outlineWidthAndOutlineColor;

    const { _dirtyOffset, _dirtyCount } = collection;

    for (let i = _dirtyOffset, il = _dirtyOffset + _dirtyCount; i < il; i++) {
      collection.get(i, point);

      if (!point._dirty) {
        continue;
      }

      if (useFloat64) {
        point.getPosition(cartesian);
        EncodedCartesian3.fromCartesian(cartesian, encodedCartesian);
        attributeArrays.positionHigh[i * 3] = encodedCartesian.high.x;
        attributeArrays.positionHigh[i * 3 + 1] = encodedCartesian.high.y;
        attributeArrays.positionHigh[i * 3 + 2] = encodedCartesian.high.z;
        attributeArrays.positionLow[i * 3] = encodedCartesian.low.x;
        attributeArrays.positionLow[i * 3 + 1] = encodedCartesian.low.y;
        attributeArrays.positionLow[i * 3 + 2] = encodedCartesian.low.z;
      }

      point.getMaterial(material);
      Color.fromRgba(point._pickId, pickColor);

      pickColorArray[i * 4] = Color.floatToByte(pickColor.red);
      pickColorArray[i * 4 + 1] = Color.floatToByte(pickColor.green);
      pickColorArray[i * 4 + 2] = Color.floatToByte(pickColor.blue);
      pickColorArray[i * 4 + 3] = Color.floatToByte(pickColor.alpha);

      showSizeAndColorArray[i * 3] = point.show ? 1 : 0;
      showSizeAndColorArray[i * 3 + 1] = material.size;
      showSizeAndColorArray[i * 3 + 2] = AttributeCompression.encodeRGB8(
        material.color,
      );

      outlineWidthAndOutlineColorArray[i * 2] = material.outlineWidth;
      outlineWidthAndOutlineColorArray[i * 2 + 1] =
        AttributeCompression.encodeRGB8(material.outlineColor);

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
                  usage: BufferUsage.DYNAMIC_DRAW,
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
          index: attributeLocations.showSizeAndColor,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.showSizeAndColor,
            context,
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
        {
          index: attributeLocations.outlineWidthAndOutlineColor,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          vertexBuffer: Buffer.createVertexBuffer({
            typedArray: attributeArrays.outlineWidthAndOutlineColor,
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

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending: BlendingState.ALPHA_BLEND,
      depthTest: { enabled: true },
    });
  }

  if (!defined(renderContext.shaderProgram)) {
    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: [BufferPointMaterialVS],
        defines: useFloat64 ? ["USE_FLOAT64"] : [],
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
      primitiveType: PrimitiveType.POINTS,
      pass: Pass.OPAQUE,
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

  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;

  return renderContext;
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
