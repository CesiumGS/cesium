import BoundingRectangle from "../Core/BoundingRectangle.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import ViewportQuadVS from "../Shaders/ViewportQuadVS.js";
import ClearCommand from "./ClearCommand.js";
import DrawCommand from "./DrawCommand.js";
import Framebuffer from "./Framebuffer.js";
import RenderState from "./RenderState.js";
import ShaderProgram from "./ShaderProgram.js";

/**
 * @private
 */
function ComputeEngine(context) {
  this._context = context;
}

var renderStateScratch;
var drawCommandScratch = new DrawCommand({
  primitiveType: PrimitiveType.TRIANGLES,
});
var clearCommandScratch = new ClearCommand({
  color: new Color(0.0, 0.0, 0.0, 0.0),
});

function createFramebuffer(context, outputTexture) {
  return new Framebuffer({
    context: context,
    colorTextures: [outputTexture],
    destroyAttachments: false,
  });
}

function createViewportQuadShader(context, fragmentShaderSource) {
  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: ViewportQuadVS,
    fragmentShaderSource: fragmentShaderSource,
    attributeLocations: {
      position: 0,
      textureCoordinates: 1,
    },
  });
}

function createRenderState(width, height) {
  if (
    !defined(renderStateScratch) ||
    renderStateScratch.viewport.width !== width ||
    renderStateScratch.viewport.height !== height
  ) {
    renderStateScratch = RenderState.fromCache({
      viewport: new BoundingRectangle(0, 0, width, height),
    });
  }
  return renderStateScratch;
}

ComputeEngine.prototype.execute = function (computeCommand) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("computeCommand", computeCommand);
  //>>includeEnd('debug');

  // This may modify the command's resources, so do error checking afterwards
  if (defined(computeCommand.preExecute)) {
    computeCommand.preExecute(computeCommand);
  }

  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(computeCommand.fragmentShaderSource) &&
    !defined(computeCommand.shaderProgram)
  ) {
    throw new DeveloperError(
      "computeCommand.fragmentShaderSource or computeCommand.shaderProgram is required."
    );
  }

  Check.defined("computeCommand.outputTexture", computeCommand.outputTexture);
  //>>includeEnd('debug');

  var outputTexture = computeCommand.outputTexture;
  var width = outputTexture.width;
  var height = outputTexture.height;

  var context = this._context;
  var vertexArray = defined(computeCommand.vertexArray)
    ? computeCommand.vertexArray
    : context.getViewportQuadVertexArray();
  var shaderProgram = defined(computeCommand.shaderProgram)
    ? computeCommand.shaderProgram
    : createViewportQuadShader(context, computeCommand.fragmentShaderSource);
  var framebuffer = createFramebuffer(context, outputTexture);
  var renderState = createRenderState(width, height);
  var uniformMap = computeCommand.uniformMap;

  var clearCommand = clearCommandScratch;
  clearCommand.framebuffer = framebuffer;
  clearCommand.renderState = renderState;
  clearCommand.execute(context);

  var drawCommand = drawCommandScratch;
  drawCommand.vertexArray = vertexArray;
  drawCommand.renderState = renderState;
  drawCommand.shaderProgram = shaderProgram;
  drawCommand.uniformMap = uniformMap;
  drawCommand.framebuffer = framebuffer;
  drawCommand.execute(context);

  framebuffer.destroy();

  if (!computeCommand.persists) {
    shaderProgram.destroy();
    if (defined(computeCommand.vertexArray)) {
      vertexArray.destroy();
    }
  }

  if (defined(computeCommand.postExecute)) {
    computeCommand.postExecute(outputTexture);
  }
};

ComputeEngine.prototype.isDestroyed = function () {
  return false;
};

ComputeEngine.prototype.destroy = function () {
  return destroyObject(this);
};
export default ComputeEngine;
