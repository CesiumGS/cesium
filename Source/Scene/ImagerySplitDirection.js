import SplitDirection from "./SplitDirection.js";
import deprecationWarning from "../Core/deprecationWarning.js";

/**
 * This enumeration is deprecated. Use {@link SplitPosition} instead.
 *
 * @enum {Number}
 *
 * @deprecated
 */
const ImagerySplitDirection = {};

function warnDeprecated() {
  deprecationWarning(
    "ImagerySplitDirection",
    "ImagerySplitDirection was deprecated in CesiumJS 1.92. It will be removed in 1.94. Use SplitDirection instead."
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
