define(['exports'], (function (exports) { 'use strict';

  /**
   * Represents which vertices should have a value of `true` for the `applyOffset` attribute
   * @private
   */
  const GeometryOffsetAttribute = {
    NONE: 0,
    TOP: 1,
    ALL: 2,
  };
  var GeometryOffsetAttribute$1 = Object.freeze(GeometryOffsetAttribute);

  exports.GeometryOffsetAttribute = GeometryOffsetAttribute$1;

}));
