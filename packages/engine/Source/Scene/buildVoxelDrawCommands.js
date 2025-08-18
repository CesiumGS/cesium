import BlendingState from "./BlendingState.js";
import Cartesian2 from "../Core/Cartesian2.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import CullFace from "./CullFace.js";
import defined from "../Core/defined.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import processVoxelProperties from "./processVoxelProperties.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import VoxelRenderResources from "./VoxelRenderResources.js";

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

  const { shaderBuilder, clippingPlanes, clippingPlanesLength } =
    renderResources;

  if (clippingPlanesLength > 0) {
    const functionId = "getClippingPlane";
    const functionSignature = `vec4 ${functionId}(highp sampler2D packedClippingPlanes, int clippingPlaneNumber, mat4 transform)`;
    const functionBody = getClippingPlaneFunctionBody(clippingPlanes, context);
    shaderBuilder.addFunction(
      functionId,
      functionSignature,
      ShaderDestination.FRAGMENT,
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
    ShaderDestination.FRAGMENT,
  );
  const shaderProgram = shaderBuilder.buildShaderProgram(context);
  const shaderProgramPick = shaderBuilderPick.buildShaderProgram(context);
  const shaderProgramPickVoxel =
    shaderBuilderPickVoxel.buildShaderProgram(context);
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
    new DrawCommand(),
  );
  drawCommandPick.shaderProgram = shaderProgramPick;
  drawCommandPick.pickOnly = true;

  // Create the pick voxels draw command
  const drawCommandPickVoxel = DrawCommand.shallowClone(
    drawCommand,
    new DrawCommand(),
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

const textureResolutionScratch = new Cartesian2();

function getClippingPlaneFunctionBody(clippingPlaneCollection, context) {
  const textureResolution = ClippingPlaneCollection.getTextureResolution(
    clippingPlaneCollection,
    context,
    textureResolutionScratch,
  );
  const width = textureResolution.x;
  const height = textureResolution.y;

  const pixelWidth = 1.0 / width;
  const pixelHeight = 1.0 / height;

  let pixelWidthString = `${pixelWidth}`;
  if (pixelWidthString.indexOf(".") === -1) {
    pixelWidthString += ".0";
  }
  let pixelHeightString = `${pixelHeight}`;
  if (pixelHeightString.indexOf(".") === -1) {
    pixelHeightString += ".0";
  }

  return `int pixY = clippingPlaneNumber / ${width};
    int pixX = clippingPlaneNumber - (pixY * ${width});
    // Sample from center of pixel
    float u = (float(pixX) + 0.5) * ${pixelWidthString};
    float v = (float(pixY) + 0.5) * ${pixelHeightString};
    vec4 plane = texture(packedClippingPlanes, vec2(u, v));
    return czm_transformPlane(plane, transform);`;
}

export default buildVoxelDrawCommands;
