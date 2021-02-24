import defaultValue from "../Core/defaultValue.js";
import Pass from "./Pass.js";

/**
 * Represents a command to the renderer for GPU Compute (using old-school GPGPU).
 *
 * @private
 * @constructor
 */
function ComputeCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The vertex array. If none is provided, a viewport quad will be used.
   *
   * @type {VertexArray}
   * @default undefined
   */
  this.vertexArray = options.vertexArray;

  /**
   * The fragment shader source. The default vertex shader is ViewportQuadVS.
   *
   * @type {ShaderSource}
   * @default undefined
   */
  this.fragmentShaderSource = options.fragmentShaderSource;

  /**
   * The shader program to apply.
   *
   * @type {ShaderProgram}
   * @default undefined
   */
  this.shaderProgram = options.shaderProgram;

  /**
   * An object with functions whose names match the uniforms in the shader program
   * and return values to set those uniforms.
   *
   * @type {Object}
   * @default undefined
   */
  this.uniformMap = options.uniformMap;

  /**
   * Texture to use for offscreen rendering.
   *
   * @type {Texture}
   * @default undefined
   */
  this.outputTexture = options.outputTexture;

  /**
   * Function that is called immediately before the ComputeCommand is executed. Used to
   * update any renderer resources. Takes the ComputeCommand as its single argument.
   *
   * @type {Function}
   * @default undefined
   */
  this.preExecute = options.preExecute;

  /**
   * Function that is called after the ComputeCommand is executed. Takes the output
   * texture as its single argument.
   *
   * @type {Function}
   * @default undefined
   */
  this.postExecute = options.postExecute;

  /**
   * Function that is called when the command is canceled
   *
   * @type {Function}
   * @default undefined
   */
  this.canceled = options.canceled;

  /**
   * Whether the renderer resources will persist beyond this call. If not, they
   * will be destroyed after completion.
   *
   * @type {Boolean}
   * @default false
   */
  this.persists = defaultValue(options.persists, false);

  /**
   * The pass when to render. Always compute pass.
   *
   * @type {Pass}
   * @default Pass.COMPUTE;
   */
  this.pass = Pass.COMPUTE;

  /**
   * The object who created this command.  This is useful for debugging command
   * execution; it allows us to see who created a command when we only have a
   * reference to the command, and can be used to selectively execute commands
   * with {@link Scene#debugCommandFilter}.
   *
   * @type {Object}
   * @default undefined
   *
   * @see Scene#debugCommandFilter
   */
  this.owner = options.owner;
}

/**
 * Executes the compute command.
 *
 * @param {ComputeEngine} computeEngine The context that processes the compute command.
 */
ComputeCommand.prototype.execute = function (computeEngine) {
  computeEngine.execute(this);
};
export default ComputeCommand;
