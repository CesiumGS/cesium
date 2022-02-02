import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import ContextLimits from "./ContextLimits.js";
import RenderbufferFormat from "./RenderbufferFormat.js";

/**
 * @private
 */
function Renderbuffer(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  const context = options.context;
  const gl = context._gl;
  const maximumRenderbufferSize = ContextLimits.maximumRenderbufferSize;

  const format = defaultValue(options.format, RenderbufferFormat.RGBA4);
  const width = defined(options.width) ? options.width : gl.drawingBufferWidth;
  const height = defined(options.height)
    ? options.height
    : gl.drawingBufferHeight;

  //>>includeStart('debug', pragmas.debug);
  if (!RenderbufferFormat.validate(format)) {
    throw new DeveloperError("Invalid format.");
  }

  Check.typeOf.number.greaterThan("width", width, 0);

  if (width > maximumRenderbufferSize) {
    throw new DeveloperError(
      "Width must be less than or equal to the maximum renderbuffer size (" +
        maximumRenderbufferSize +
        ").  Check maximumRenderbufferSize."
    );
  }

  Check.typeOf.number.greaterThan("height", height, 0);

  if (height > maximumRenderbufferSize) {
    throw new DeveloperError(
      "Height must be less than or equal to the maximum renderbuffer size (" +
        maximumRenderbufferSize +
        ").  Check maximumRenderbufferSize."
    );
  }
  //>>includeEnd('debug');

  this._gl = gl;
  this._format = format;
  this._width = width;
  this._height = height;
  this._renderbuffer = this._gl.createRenderbuffer();

  gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, format, width, height);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}

Object.defineProperties(Renderbuffer.prototype, {
  format: {
    get: function () {
      return this._format;
    },
  },
  width: {
    get: function () {
      return this._width;
    },
  },
  height: {
    get: function () {
      return this._height;
    },
  },
});

Renderbuffer.prototype._getRenderbuffer = function () {
  return this._renderbuffer;
};

Renderbuffer.prototype.isDestroyed = function () {
  return false;
};

Renderbuffer.prototype.destroy = function () {
  this._gl.deleteRenderbuffer(this._renderbuffer);
  return destroyObject(this);
};
export default Renderbuffer;
