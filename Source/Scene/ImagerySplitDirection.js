import SplitDirection from "./SplitDirection.js";
import deprecationWarning from "../Core/deprecationWarning.js";

/**
 * This enumeration is deprecated. Use {@link SplitPosition} instead.
 *
 * @enum {Number}
 *
 * @deprecated
 */
var ImagerySplitDirection = {};

function warnDeprecated() {
  deprecationWarning(
    "ImagerySplitDirection",
    "ImagerySplitDirection was deprecated in Cesium 1.88. It will be removed in 1.90. Use SplitDirection instead."
  );
}

Object.defineProperties(ImagerySplitDirection, {
  LEFT: {
    get: function () {
      warnDeprecated();
      return SplitDirection.LEFT;
    },
  },
  NONE: {
    get: function () {
      warnDeprecated();
      return SplitDirection.NONE;
    },
  },
  RIGHT: {
    get: function () {
      warnDeprecated();
      return SplitDirection.RIGHT;
    },
  },
});

export default Object.freeze(ImagerySplitDirection);
