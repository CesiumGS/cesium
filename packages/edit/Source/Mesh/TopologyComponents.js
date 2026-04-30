/**
 * Bit flags identifying the three mesh-component types
 *
 * @enum {number}
 * @experimental This feature is not final and is subject to change without
 *   Cesium's standard deprecation policy.
 */
const TopologyComponents = Object.freeze({
  /** Empty set. */
  NONE: 0,
  /** {@link Vertex} components. */
  VERTICES: 1 << 0,
  /** {@link Edge} components. */
  EDGES: 1 << 1,
  /** {@link Face} components. */
  FACES: 1 << 2,
  /** Convenience type for all three component types. */
  ALL: (1 << 0) | (1 << 1) | (1 << 2),
});

export default TopologyComponents;
