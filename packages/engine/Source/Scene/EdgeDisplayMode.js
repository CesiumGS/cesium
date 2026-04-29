/**
 * Defines how edges from the `EXT_mesh_primitive_edge_visibility` extension are displayed
 * relative to surface geometry.
 *
 * @enum {number}
 *
 * @private
 */
const EdgeDisplayMode = {
  /**
   * Render surfaces only. Edges from the EXT_mesh_primitive_edge_visibility
   * extension are hidden.
   *
   * @type {number}
   * @constant
   */
  SURFACES_ONLY: 0,

  /**
   * Render both surfaces and edges. Edges from the EXT_mesh_primitive_edge_visibility
   * extension are composited on top of the surface geometry.
   *
   * @type {number}
   * @constant
   */
  SURFACES_AND_EDGES: 1,

  /**
   * Render edges only. Surface geometry is hidden for primitives that have
   * edge visibility data. Primitives without the extension are unaffected.
   * This approximates CAD-style wireframe rendering.
   *
   * @type {number}
   * @constant
   */
  EDGES_ONLY: 2,
};

Object.freeze(EdgeDisplayMode);

export default EdgeDisplayMode;
