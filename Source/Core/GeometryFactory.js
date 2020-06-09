import DeveloperError from "../Core/DeveloperError.js";

/**
 * @constructor
 * @class
 * @abstract
 */
function GeometryFactory() {
  DeveloperError.throwInstantiationError();
}

/**
 * Returns a geometry.
 *
 * @param {GeometryFactory} geometryFactory A description of the circle.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
GeometryFactory.createGeometry = function (geometryFactory) {
  DeveloperError.throwInstantiationError();
};

export default GeometryFactory;
