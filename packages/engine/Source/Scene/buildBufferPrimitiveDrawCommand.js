// @ts-check

import defined from "../Core/defined.js";
import Cartesian2 from "../Core/Cartesian2.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import BlendingState from "./BlendingState.js";
import BlendOption from "./BlendOption.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";

/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import Context from "../Renderer/Context.js"; */
/** @import VertexArray from "../Renderer/VertexArray.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * GPU resources backing a single {@link BufferPrimitiveCollection}, cached across frames.
 * @typedef {object} BufferPrimitiveRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<string, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {RenderState} [renderState]
 * @property {Record<string, unknown>} [uniformMap]
 * @property {ShaderProgram} [shaderProgram]
 * @property {DrawCommand} [command]
 * @property {Function} destroy
 * @ignore
 */

/**
 * @typedef {object} BufferPrimitiveDrawCommandOptions
 * @property {PrimitiveType} primitiveType Topology of the collection's vertex data.
 * @property {Record<string, number>} attributeLocations
 * @property {string[]} vertexShaderSources
 * @property {string[]} fragmentShaderSources
 * @property {boolean} useFloat64 Whether positions are encoded at 64-bit precision.
 * @property {number} drawCount Number of vertices or indices to draw.
 * @ignore
 */

/**
 * Builds the render state, shader program, and draw command shared by every buffer
 * primitive collection, and caches them on <code>renderContext</code>. The render state
 * and command are rebuilt when the collection's blend option selects a different pass.
 *
 * @param {BufferPrimitiveCollection<*>} collection
 * @param {Context} context
 * @param {BufferPrimitiveRenderContext} renderContext
 * @param {BufferPrimitiveDrawCommandOptions} options
 * @ignore
 */
function buildBufferPrimitiveDrawCommand(
  collection,
  context,
  renderContext,
  options,
) {
  const {
    primitiveType,
    attributeLocations,
    vertexShaderSources,
    fragmentShaderSources,
    useFloat64,
    drawCount,
  } = options;

  const zIndex = collection._zIndex;

  const pass =
    collection._blendOption === BlendOption.OPAQUE
      ? Pass.OPAQUE
      : Pass.TRANSLUCENT;

  if (defined(renderContext.command) && renderContext.command.pass !== pass) {
    RenderState.removeFromCache(renderContext.renderState);
    renderContext.renderState = undefined;
    renderContext.command = undefined;
  }

  if (!defined(renderContext.uniformMap)) {
    renderContext.uniformMap = {};

    if (zIndex !== 0) {
      const polygonOffset = new Cartesian2(-zIndex, -zIndex);
      renderContext.uniformMap.u_polygonOffset = () => polygonOffset;
    }
  }

  if (!defined(renderContext.renderState)) {
    // Fixed-function polygon offset applies to triangles only. The u_polygonOffset
    // uniform offsets the logarithmic depth the fragment shader writes instead.
    const depthOffset =
      zIndex !== 0 && primitiveType === PrimitiveType.TRIANGLES ? -zIndex : 0;

    renderContext.renderState = RenderState.fromCache({
      blending:
        pass === Pass.OPAQUE
          ? BlendingState.DISABLED
          : BlendingState.ALPHA_BLEND,
      depthTest: { enabled: true },
      polygonOffset: {
        enabled: depthOffset !== 0,
        factor: depthOffset,
        units: depthOffset,
      },
    });
  }

  if (!defined(renderContext.shaderProgram)) {
    const vertexDefines = [];
    const fragmentDefines = [];

    if (useFloat64) {
      vertexDefines.push("USE_FLOAT64");
    }

    if (zIndex !== 0) {
      fragmentDefines.push("POLYGON_OFFSET");
    }

    renderContext.shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: new ShaderSource({
        sources: vertexShaderSources,
        defines: vertexDefines,
      }),
      fragmentShaderSource: new ShaderSource({
        sources: fragmentShaderSources,
        defines: fragmentDefines,
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
      primitiveType,
      pass,
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
}

/**
 * Destroys render context resources. Deleting properties from the context
 * object isn't necessary, as collection.destroy() will discard the object.
 * @ignore
 */
export function destroyBufferPrimitiveRenderContext() {
  const context = /** @type {BufferPrimitiveRenderContext} */ (this);

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

export default buildBufferPrimitiveDrawCommand;
