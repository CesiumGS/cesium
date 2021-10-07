import defined from "../../Core/defined.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import ModelExperimentalFS from "../../Shaders/ModelExperimental/ModelExperimentalFS.js";
import ModelExperimentalVS from "../../Shaders/ModelExperimental/ModelExperimentalVS.js";
import RenderState from "../../Renderer/RenderState.js";
import VertexArray from "../../Renderer/VertexArray.js";

/**
 * Builds a DrawCommand for a {@link ModelExperimentalPrimitive} using its render resources.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 *
 * @returns {DrawCommand} The generated DrawCommand.
 *
 * @private
 */
export default function buildDrawCommand(primitiveRenderResources, frameState) {
  var shaderBuilder = primitiveRenderResources.shaderBuilder;
  shaderBuilder.addVertexLines([ModelExperimentalVS]);
  shaderBuilder.addFragmentLines([ModelExperimentalFS]);

  var indexBuffer = defined(primitiveRenderResources.indices)
    ? primitiveRenderResources.indices.indexBuffer
    : undefined;

  var vertexArray = new VertexArray({
    context: frameState.context,
    indexBuffer: indexBuffer,
    attributes: primitiveRenderResources.attributes,
  });

  var model = primitiveRenderResources.model;
  model._resources.push(vertexArray);

  var renderState = RenderState.fromCache(
    primitiveRenderResources.renderStateOptions
  );

  var shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  model._resources.push(shaderProgram);

  return new DrawCommand({
    boundingVolume: primitiveRenderResources.boundingSphere,
    modelMatrix: primitiveRenderResources.modelMatrix,
    uniformMap: primitiveRenderResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: model.cull,
    pass: primitiveRenderResources.alphaOptions.pass,
    count: primitiveRenderResources.count,
    pickId: primitiveRenderResources.pickId,
    instanceCount: primitiveRenderResources.instanceCount,
    primitiveType: primitiveRenderResources.primitiveType,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
  });
}
