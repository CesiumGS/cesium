import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import VertexArray from "../Renderer/VertexArray.js";
import RenderState from "../Renderer/RenderState.js";

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
  shaderBuilder.addVertexLines([
    "void main()",
    "{",
    "    vec3 position = a_position;",
    "    gl_Position = czm_modelViewProjection * vec4(position, 1.0);",
    "}",
  ]);
  shaderBuilder.addFragmentLines([
    "void main()",
    "{",
    "    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);",
    "    gl_FragColor = color;",
    "}",
  ]);

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
