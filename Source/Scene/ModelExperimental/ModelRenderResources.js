import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import ModelAlphaOptions from "./ModelAlphaOptions.js";
import RenderState from "../../Renderer/RenderState.js";
import ShaderBuilder from "../../Renderer/ShaderBuilder.js";

/**
 * Model render resources are for setting details that are consistent across
 * the entire model.
 *
 * @constructor
 * @param {ModelExperimental} model The model that will be rendered
 *
 * @private
 */
export default function ModelRenderResources(model) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  //>>includeEnd('debug');

  /**
   * An object used to build a shader incrementally. Each pipeline stage
   * may add lines of shader code to this object.
   *
   * @type {ShaderBuilder}
   * @readonly
   *
   * @private
   */
  this.shaderBuilder = new ShaderBuilder();
  /**
   * A reference to the model.
   *
   * @type {ModelExperimental}
   * @readonly
   *
   * @private
   */
  this.model = model;

  /**
   * A dictionary mapping uniform name to functions that return the uniform
   * values.
   *
   * @type {Object.<String, Function>}
   * @readonly
   *
   * @private
   */
  this.uniformMap = {};

  /**
   * Options for configuring the alpha stage such as pass and alpha cutoff.
   *
   * @type {ModelAlphaOptions}
   * @readonly
   *
   * @private
   */
  this.alphaOptions = new ModelAlphaOptions();

  /**
   * An object storing options for creating a {@link RenderState}.
   * The pipeline stages simply set the options, the render state is created
   * when the {@link DrawCommand} is constructed.
   *
   * @type {Object}
   * @readonly
   *
   * @private
   */
  this.renderStateOptions = clone(RenderState.fromCache(), true);
}
