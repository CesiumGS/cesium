import defined from "../Core/defined.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import BlendingState from "./BlendingState.js";
import CullFace from "./CullFace.js";
import getClippingFunction from "./getClippingFunction.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import VoxelRenderResources from "./VoxelRenderResources.js";
import processVoxelProperties from "./processVoxelProperties.js";

/**
 * @function
 *
 * @param {VoxelPrimitive} primitive
 * @param {Context} context
 *
 * @private
 */
function buildVoxelDrawCommands(primitive, context) {
  const renderResources = new VoxelRenderResources(primitive);

  processVoxelProperties(renderResources, primitive);

  const {
    shaderBuilder,
    clippingPlanes,
    clippingPlanesLength,
  } = renderResources;

  if (clippingPlanesLength > 0) {
    // Extract the getClippingPlane function from the getClippingFunction string.
    // This is a bit of a hack.
    const functionId = "getClippingPlane";
    const entireFunction = getClippingFunction(clippingPlanes, context);
    const functionSignatureBegin = 0;
    const functionSignatureEnd = entireFunction.indexOf(")") + 1;
    const functionBodyBegin =
      entireFunction.indexOf("{", functionSignatureEnd) + 1;
    const functionBodyEnd = entireFunction.indexOf("}", functionBodyBegin);
    const functionSignature = entireFunction.slice(
      functionSignatureBegin,
      functionSignatureEnd
    );
    const functionBody = entireFunction.slice(
      functionBodyBegin,
      functionBodyEnd
    );
    shaderBuilder.addFunction(
      functionId,
      functionSignature,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [functionBody]);
  }

  // Compile shaders
  const shaderBuilderPick = shaderBuilder.clone();
  shaderBuilderPick.addDefine("PICKING", undefined, ShaderDestination.FRAGMENT);
  const shaderBuilderPickVoxel = shaderBuilder.clone();
  shaderBuilderPickVoxel.addDefine(
    "PICKING_VOXEL",
    undefined,
    ShaderDestination.FRAGMENT
  );
  const shaderProgram = shaderBuilder.buildShaderProgram(context);
  const shaderProgramPick = shaderBuilderPick.buildShaderProgram(context);
  const shaderProgramPickVoxel = shaderBuilderPickVoxel.buildShaderProgram(
    context
  );
  const renderState = RenderState.fromCache({
    cull: {
      enabled: true,
      face: CullFace.BACK,
    },
    depthTest: {
      enabled: false,
    },
    depthMask: false,
    // internally the shader does premultiplied alpha, so it makes sense to blend that way too
    blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
  });

  // Create the draw commands
  const viewportQuadVertexArray = context.getViewportQuadVertexArray();
  const depthTest = primitive._depthTest;
  const drawCommand = new DrawCommand({
    vertexArray: viewportQuadVertexArray,
    primitiveType: PrimitiveType.TRIANGLES,
    renderState: renderState,
    shaderProgram: shaderProgram,
    uniformMap: renderResources.uniformMap,
    modelMatrix: primitive._compoundModelMatrix,
    pass: Pass.VOXELS,
    executeInClosestFrustum: true,
    owner: this,
    cull: depthTest, // don't cull or occlude if depth testing is off
    occlude: depthTest, // don't cull or occlude if depth testing is off
  });

  // Create the pick draw command
  const drawCommandPick = DrawCommand.shallowClone(
    drawCommand,
    new DrawCommand()
  );
  drawCommandPick.shaderProgram = shaderProgramPick;
  drawCommandPick.pickOnly = true;

  // Create the pick voxels draw command
  const drawCommandPickVoxel = DrawCommand.shallowClone(
    drawCommand,
    new DrawCommand()
  );
  drawCommandPickVoxel.shaderProgram = shaderProgramPickVoxel;
  drawCommandPickVoxel.pickOnly = true;

  // Delete the old shader programs
  if (defined(primitive._drawCommand)) {
    const command = primitive._drawCommand;
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }
  if (defined(primitive._drawCommandPick)) {
    const command = primitive._drawCommandPick;
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }
  if (defined(primitive._drawCommandPickVoxel)) {
    const command = primitive._drawCommandPickVoxel;
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }

  primitive._drawCommand = drawCommand;
  primitive._drawCommandPick = drawCommandPick;
  primitive._drawCommandPickVoxel = drawCommandPickVoxel;
}

export default buildVoxelDrawCommands;
