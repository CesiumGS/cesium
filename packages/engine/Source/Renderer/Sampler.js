import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import TextureMagnificationFilter from "./TextureMagnificationFilter.js";
import TextureMinificationFilter from "./TextureMinificationFilter.js";
import TextureWrap from "./TextureWrap.js";

/**
 * @private
 */
function Sampler(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  const {
    wrapR = TextureWrap.CLAMP_TO_EDGE,
    wrapS = TextureWrap.CLAMP_TO_EDGE,
    wrapT = TextureWrap.CLAMP_TO_EDGE,
    minificationFilter = TextureMinificationFilter.LINEAR,
    magnificationFilter = TextureMagnificationFilter.LINEAR,
    maximumAnisotropy = 1.0,
  } = options;

  //>>includeStart('debug', pragmas.debug);
  if (!TextureWrap.validate(wrapR)) {
    throw new DeveloperError("Invalid sampler.wrapR.");
  }

  if (!TextureWrap.validate(wrapS)) {
    throw new DeveloperError("Invalid sampler.wrapS.");
  }

  if (!TextureWrap.validate(wrapT)) {
    throw new DeveloperError("Invalid sampler.wrapT.");
  }

  if (!TextureMinificationFilter.validate(minificationFilter)) {
    throw new DeveloperError("Invalid sampler.minificationFilter.");
  }

  if (!TextureMagnificationFilter.validate(magnificationFilter)) {
    throw new DeveloperError("Invalid sampler.magnificationFilter.");
  }

  Check.typeOf.number.greaterThanOrEquals(
    "maximumAnisotropy",
    maximumAnisotropy,
    1.0,
  );
  //>>includeEnd('debug');

  this._wrapR = wrapR;
  this._wrapS = wrapS;
  this._wrapT = wrapT;
  this._minificationFilter = minificationFilter;
  this._magnificationFilter = magnificationFilter;
  this._maximumAnisotropy = maximumAnisotropy;
}

Object.defineProperties(Sampler.prototype, {
  wrapR: {
    get: function () {
      return this._wrapR;
    },
  },
  wrapS: {
    get: function () {
      return this._wrapS;
    },
  },
  wrapT: {
    get: function () {
      return this._wrapT;
    },
  },
  minificationFilter: {
    get: function () {
      return this._minificationFilter;
    },
  },
  magnificationFilter: {
    get: function () {
      return this._magnificationFilter;
    },
  },
  maximumAnisotropy: {
    get: function () {
      return this._maximumAnisotropy;
    },
  },
});

Sampler.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left._wrapR === right._wrapR &&
      left._wrapS === right._wrapS &&
      left._wrapT === right._wrapT &&
      left._minificationFilter === right._minificationFilter &&
      left._magnificationFilter === right._magnificationFilter &&
      left._maximumAnisotropy === right._maximumAnisotropy)
  );
};

Sampler.NEAREST = Object.freeze(
  new Sampler({
    wrapR: TextureWrap.CLAMP_TO_EDGE,
    wrapS: TextureWrap.CLAMP_TO_EDGE,
    wrapT: TextureWrap.CLAMP_TO_EDGE,
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  }),
);
export default Sampler;
