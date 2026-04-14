// @ts-check

/**
 * Interface for reading and updating mesh geometry, agnostic of the underlying rendering representation.
 * Must be implemented by render-side geometry classes to be compatible with EditableMesh.
 *
 * @abstract
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class GeometryAccessor {}

export default GeometryAccessor;
