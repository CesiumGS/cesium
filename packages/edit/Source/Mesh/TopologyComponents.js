/**
 * Bit flags identifying the three mesh-component types, plus
 * level-ordering helpers for the vertex - edge - face hierarchy.
 *
 * @enum {number}
 * @experimental This feature is not final and is subject to change without
 *   Cesium's standard deprecation policy.
 */
const TopologyComponents = /** @type {*} */ ({
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

/**
 * @type {readonly TopologyComponents[]}
 */
TopologyComponents.LEVELS = Object.freeze([
  TopologyComponents.VERTICES,
  TopologyComponents.EDGES,
  TopologyComponents.FACES,
]);

const LOWER_OF = {
  [TopologyComponents.EDGES]: TopologyComponents.VERTICES,
  [TopologyComponents.FACES]: TopologyComponents.EDGES,
};

const UPPER_OF = {
  [TopologyComponents.VERTICES]: TopologyComponents.EDGES,
  [TopologyComponents.EDGES]: TopologyComponents.FACES,
};

/**
 * The single-component bit one level below <code>level</code>, or
 * {@link TopologyComponents.NONE} for vertices (no lower level).
 * @param {TopologyComponents} level A single-component bit.
 * @returns {TopologyComponents}
 */
TopologyComponents.lowerOf = function (level) {
  return LOWER_OF[level] ?? TopologyComponents.NONE;
};

/**
 * The single-component bit one level above <code>level</code>, or
 * {@link TopologyComponents.NONE} for faces (no higher level).
 * @param {TopologyComponents} level A single-component bit.
 * @returns {TopologyComponents}
 */
TopologyComponents.upperOf = function (level) {
  return UPPER_OF[level] ?? TopologyComponents.NONE;
};

Object.freeze(TopologyComponents);

export default TopologyComponents;
