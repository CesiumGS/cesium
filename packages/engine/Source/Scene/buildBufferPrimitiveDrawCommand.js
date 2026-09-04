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
/** @import FrameState from "./FrameState.js"; */
/** @import VertexArray from "../Renderer/VertexArray.js"; */
/** @import {TypedArray} from "../Core/globalTypes.js"; */

/**
 * GPU resources backing a single {@link BufferPrimitiveCollection}, cached across frames.
 * The render state, shader program, and command arrays are parallel to the blend option's
 * command variants.
 * @typedef {object} BufferPrimitiveRenderContext
 * @property {VertexArray} [vertexArray]
 * @property {Record<string, TypedArray>} [attributeArrays]
 * @property {TypedArray} [indexArray]
 * @property {Record<string, unknown>} [uniformMap]
 * @property {BlendOption} [blendOption] Blend option the cached resources were built for.
 * @property {RenderState[]} [renderStates]
 * @property {ShaderProgram[]} [shaderPrograms]
 * @property {DrawCommand[]} [commands]
 * @property {Function} destroy
 * @ignore
 */

/**
 * @typedef {object} BufferPrimitiveCommandVariant
 * @property {Pass} pass
 * @property {string} [define] Fragment shader define selecting the fragments to keep.
 * @property {boolean} [depthMask=true]
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
 * The commands each blend option draws, in submission order.
 * {@link BlendOption.OPAQUE_AND_TRANSLUCENT} draws the collection twice, once per pass;
 * the fragment shader defines make each pass discard the fragments belonging to the
 * other, and only the opaque half writes depth.
 *
 * @type {Record<number, BufferPrimitiveCommandVariant[]>}
 * @ignore
 */
const commandVariants = {
  [BlendOption.OPAQUE]: [{ pass: Pass.OPAQUE }],
  [BlendOption.TRANSLUCENT]: [{ pass: Pass.TRANSLUCENT }],
  [BlendOption.OPAQUE_AND_TRANSLUCENT]: [
    { pass: Pass.OPAQUE, define: "OPAQUE" },
    { pass: Pass.TRANSLUCENT, define: "TRANSLUCENT", depthMask: false },
  ],
};

/**
 * Builds the render states, shader programs, and draw commands shared by every buffer
 * primitive collection, caches them on <code>renderContext</code>, and submits them for
 * the current frame. They are released and rebuilt when the collection's blend option
 * changes.
 *
 * @param {BufferPrimitiveCollection<*>} collection
 * @param {FrameState} frameState
 * @param {BufferPrimitiveRenderContext} renderContext
 * @param {BufferPrimitiveDrawCommandOptions} options
 * @ignore
 */
function buildBufferPrimitiveDrawCommand(
  collection,
  frameState,
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

  const blendOption = collection._blendOption;

  if (renderContext.blendOption !== blendOption) {
    releaseShaderResources(renderContext);
    renderContext.blendOption = blendOption;
  }

  const zIndex = collection._zIndex;

  if (!defined(renderContext.uniformMap)) {
    renderContext.uniformMap = {};

    if (zIndex !== 0) {
      const polygonOffset = new Cartesian2(-zIndex, -zIndex);
      renderContext.uniformMap.u_polygonOffset = () => polygonOffset;
    }
  }

  const variants = commandVariants[blendOption];

  if (!defined(renderContext.renderStates)) {
    // Fixed-function polygon offset applies to triangles only. The u_polygonOffset
    // uniform offsets the logarithmic depth the fragment shader writes instead.
    const depthOffset =
      zIndex !== 0 && primitiveType === PrimitiveType.TRIANGLES ? -zIndex : 0;

    renderContext.renderStates = variants.map((variant) =>
      RenderState.fromCache({
        blending:
          variant.pass === Pass.OPAQUE
            ? BlendingState.DISABLED
            : BlendingState.ALPHA_BLEND,
        depthTest: { enabled: true },
        depthMask: variant.depthMask ?? true,
        polygonOffset: {
          enabled: depthOffset !== 0,
          factor: depthOffset,
          units: depthOffset,
        },
      }),
    );
  }

  if (!defined(renderContext.shaderPrograms)) {
    const vertexDefines = useFloat64 ? ["USE_FLOAT64"] : [];
    const fragmentDefines = zIndex !== 0 ? ["POLYGON_OFFSET"] : [];

    renderContext.shaderPrograms = variants.map((variant) =>
      ShaderProgram.fromCache({
        context: frameState.context,
        vertexShaderSource: new ShaderSource({
          sources: vertexShaderSources,
          defines: vertexDefines,
        }),
        fragmentShaderSource: new ShaderSource({
          sources: fragmentShaderSources,
          defines: defined(variant.define)
            ? fragmentDefines.concat(variant.define)
            : fragmentDefines,
        }),
        attributeLocations,
      }),
    );
  }

  if (!defined(renderContext.commands)) {
    renderContext.commands = variants.map(
      (variant, index) =>
        new DrawCommand({
          vertexArray: renderContext.vertexArray,
          renderState: renderContext.renderStates[index],
          shaderProgram: renderContext.shaderPrograms[index],
          uniformMap: renderContext.uniformMap,
          primitiveType,
          pass: variant.pass,
          pickId: collection._allowPicking ? "v_pickColor" : undefined,
          owner: collection,
          count: drawCount,
          modelMatrix: collection.modelMatrix, // shared reference
          boundingVolume: collection.boundingVolume, // shared reference
          debugShowBoundingVolume: collection.debugShowBoundingVolume,
        }),
    );
  }

  const commands = renderContext.commands;
  const debugShowBoundingVolume = collection.debugShowBoundingVolume;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];

    if (command.count !== drawCount) {
      command.count = drawCount;
    }

    if (command.debugShowBoundingVolume !== debugShowBoundingVolume) {
      command.debugShowBoundingVolume = debugShowBoundingVolume;
    }

    frameState.commandList.push(command);
  }
}

/**
 * Releases the resources that depend on the blend option, leaving the vertex array and
 * attribute arrays intact.
 * @param {BufferPrimitiveRenderContext} renderContext
 * @ignore
 */
function releaseShaderResources(renderContext) {
  renderContext.renderStates?.forEach(RenderState.removeFromCache);
  renderContext.shaderPrograms?.forEach((shaderProgram) =>
    shaderProgram.destroy(),
  );

  renderContext.renderStates = undefined;
  renderContext.shaderPrograms = undefined;
  renderContext.commands = undefined;
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

  releaseShaderResources(context);
}

export default buildBufferPrimitiveDrawCommand;
