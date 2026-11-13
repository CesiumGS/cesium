import DeveloperError from "./DeveloperError.js";

/**
 * Base class for all geometry creation utility classes that can be passed to {@link GeometryInstance}
 * for asynchronous geometry creation.
 *
 * @class
 * @abstract
 */
class GeometryFactory {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns a geometry.
   *
   * @param {GeometryFactory} geometryFactory A description of the circle.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  static createGeometry(geometryFactory) {
    DeveloperError.throwInstantiationError();
  }
}

export default GeometryFactory;
