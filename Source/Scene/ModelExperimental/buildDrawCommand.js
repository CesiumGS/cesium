import BlendingState from "../BlendingState.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import ModelExperimentalFS from "../../Shaders/ModelExperimental/ModelExperimentalFS.js";
import ModelExperimentalVS from "../../Shaders/ModelExperimental/ModelExperimentalVS.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import VertexArray from "../../Renderer/VertexArray.js";

/**
 * Builds a DrawCommand for a {@link ModelExperimentalPrimitive} using its render resources.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 *
 * @returns {[DrawCommand]} The generated DrawCommand.
 *
 * @private
 */
export default function buildDrawCommand(primitiveRenderResources, frameState) {
  var shaderBuilder = primitiveRenderResources.shaderBuilder;
  shaderBuilder.addVertexLines([ModelExperimentalVS]);
  shaderBuilder.addFragmentLines([ModelExperimentalFS]);

  var indexBuffer = defined(primitiveRenderResources.indices)
    ? primitiveRenderResources.indices.buffer
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

  var pass = primitiveRenderResources.alphaOptions.pass;

  var command = new DrawCommand({
    boundingVolume: primitiveRenderResources.boundingSphere,
    modelMatrix: primitiveRenderResources.modelMatrix,
    uniformMap: primitiveRenderResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: model.cull,
    pass: pass,
    count: primitiveRenderResources.count,
    pickId: primitiveRenderResources.pickId,
    instanceCount: primitiveRenderResources.instanceCount,
    primitiveType: primitiveRenderResources.primitiveType,
    debugShowBoundingVolume: model.debugShowBoundingVolume,
  });

  var styleCommandsNeeded = primitiveRenderResources.styleCommandsNeeded;

  var commandList = [];

  if (defined(styleCommandsNeeded)) {
    var derivedCommands = createDerivedCommands(command);

    if (command.pass !== Pass.TRANSLUCENT) {
      if (styleCommandsNeeded === StyleCommandsNeeded.ALL_OPAQUE) {
        commandList.push(command);
      }
      if (styleCommandsNeeded === StyleCommandsNeeded.ALL_TRANSLUCENT) {
        commandList.push(derivedCommands.translucent);
      }
      if (styleCommandsNeeded === StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT) {
        commandList.push(command, derivedCommands.translucent);
      }
    } else {
      // Command was originally translucent so no need to derive new commands;
      // as of now, a style can't change an originally translucent feature to
      // opaque since the style's alpha is modulated, not a replacement.  When
      // this changes, we need to derive new opaque commands here.
      commandList.push(command);
    }
  } else {
    commandList.push(command);
  }

  return commandList;
}

function createDerivedCommands(command) {
  var derivedCommands = {};
  derivedCommands.translucent = deriveTranslucentCommand(command);
  return derivedCommands;
}

function deriveTranslucentCommand(command) {
  var derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.pass = Pass.TRANSLUCENT;
  var rs = clone(command.renderState, true);
  rs.cull.enabled = false;
  rs.depthTest.enabled = true;
  rs.depthMask = false;
  rs.blending = BlendingState.ALPHA_BLEND;
  derivedCommand.renderState = RenderState.fromCache(rs);
  return derivedCommand;
}
