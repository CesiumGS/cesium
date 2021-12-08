import BlendingState from "../BlendingState.js";
import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import ModelExperimentalFS from "../../Shaders/ModelExperimental/ModelExperimentalFS.js";
import ModelExperimentalVS from "../../Shaders/ModelExperimental/ModelExperimentalVS.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import RuntimeError from "../../Core/RuntimeError.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import VertexArray from "../../Renderer/VertexArray.js";

/**
 * Builds the DrawCommands for a {@link ModelExperimentalPrimitive} using its render resources.
 *
 * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for a primitive.
 * @param {FrameState} frameState The frame state for creating GPU resources.
 *
 * @returns {DrawCommand[]} The generated DrawCommands.
 *
 * @private
 */
export default function buildDrawCommands(
  primitiveRenderResources,
  frameState
) {
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
    debugShowBoundingVolume: true,
  });

  var styleCommandsNeeded = primitiveRenderResources.styleCommandsNeeded;

  var commandList = [];

  if (defined(styleCommandsNeeded)) {
    var derivedCommands = createDerivedCommands(command);

    if (pass !== Pass.TRANSLUCENT) {
      switch (styleCommandsNeeded) {
        case StyleCommandsNeeded.ALL_OPAQUE:
          commandList.push(command);
          break;
        case StyleCommandsNeeded.ALL_TRANSLUCENT:
          commandList.push(derivedCommands.translucent);
          break;
        case StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT:
          // Push both opaque and translucent commands. The rendering of features based on opacity is handled in the shaders.
          commandList.push(command, derivedCommands.translucent);
          break;
        //>>includeStart('debug', pragmas.debug);
        default:
          throw new RuntimeError("styleCommandsNeeded is not a valid value.");
        //>>includeEnd('debug');
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

/**
 * @private
 */
function createDerivedCommands(command) {
  var derivedCommands = {};
  derivedCommands.translucent = deriveTranslucentCommand(command);
  return derivedCommands;
}

/**
 * @private
 */
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
