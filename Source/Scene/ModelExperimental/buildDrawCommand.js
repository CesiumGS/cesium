import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import VertexArray from "../../Renderer/VertexArray.js";
import RenderState from "../../Renderer/RenderState.js";
import ModelExperimentalFS from "../../Shaders/ModelExperimental/ModelExperimentalFS.js";
import ModelExperimentalVS from "../../Shaders/ModelExperimental/ModelExperimentalVS.js";

/**
 * Builds a DrawCommand for a glTF mesh primitive using its render resources.
 *
 * @param {RenderResources.MeshRenderResources} meshPrimitiveRenderResources
 * @param {FrameState} frameState
 * @returns {DrawCommand} The generated DrawCommand.
 */
export default function buildDrawCommand(
  meshPrimitiveRenderResources,
  frameState
) {
  var shaderBuilder = meshPrimitiveRenderResources.shaderBuilder;
  shaderBuilder.addVertexLines([ModelExperimentalVS]);
  shaderBuilder.addFragmentLines([ModelExperimentalFS]);

  var vertexArray = new VertexArray({
    context: frameState.context,
    indexBuffer: meshPrimitiveRenderResources.indices.buffer,
    attributes: meshPrimitiveRenderResources.attributes,
  });

  var renderState = RenderState.fromCache(
    meshPrimitiveRenderResources.renderStateOptions
  );

  var shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);

  return new DrawCommand({
    boundingVolume: meshPrimitiveRenderResources.boundingSphere,
    modelMatrix: meshPrimitiveRenderResources.modelMatrix,
    uniformMap: meshPrimitiveRenderResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: false,
    pass: Pass.OPAQUE,
    count: meshPrimitiveRenderResources.count,
    pickId: undefined,
    instanceCount: 0,
    primitiveType: meshPrimitiveRenderResources.primitiveType,
  });
}
