import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * Represents a command to the renderer for clearing a framebuffer.
 *
 * @private
 * @constructor
 */
function ClearCommand(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The value to clear the color buffer to.  When <code>undefined</code>, the color buffer is not cleared.
   *
   * @type {Color}
   *
   * @default undefined
   */
  this.color = options.color;

  /**
   * The value to clear the depth buffer to.  When <code>undefined</code>, the depth buffer is not cleared.
   *
   * @type {number}
   *
   * @default undefined
   */
  this.depth = options.depth;

  /**
   * The value to clear the stencil buffer to.  When <code>undefined</code>, the stencil buffer is not cleared.
   *
   * @type {number}
   *
   * @default undefined
   */
  this.stencil = options.stencil;

  /**
   * The render state to apply when executing the clear command.  The following states affect clearing:
   * scissor test, color mask, depth mask, and stencil mask.  When the render state is
   * <code>undefined</code>, the default render state is used.
   *
   * @type {RenderState}
   *
   * @default undefined
   */
  this.renderState = options.renderState;

  /**
   * The framebuffer to clear.
   *
   * @type {Framebuffer}
   *
   * @default undefined
   */
  this.framebuffer = options.framebuffer;

  /**
   * The object who created this command.  This is useful for debugging command
   * execution; it allows you to see who created a command when you only have a
   * reference to the command, and can be used to selectively execute commands
   * with {@link Scene#debugCommandFilter}.
   *
   * @type {object}
   *
   * @default undefined
   *
   * @see Scene#debugCommandFilter
   */
  this.owner = options.owner;

  /**
   * The pass in which to run this command.
   *
   * @type {Pass}
   *
   * @default undefined
   */
  this.pass = options.pass;
}

/**
 * Clears color to (0.0, 0.0, 0.0, 0.0); depth to 1.0; and stencil to 0.
 *
 * @type {ClearCommand}
 *
 * @constant
 */
ClearCommand.ALL = Object.freeze(
  new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    stencil: 0.0,
  })
);

ClearCommand.prototype.execute = function (context, passState) {
  context.clear(this, passState);
};
export default ClearCommand;
