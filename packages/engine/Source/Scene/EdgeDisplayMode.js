/**
 * Defines how edges contributed by the EXT_mesh_primitive_edge_visibility
 * glTF extension are rendered relative to surface geometry.
 * <p>
 * Primitives that do not include the extension are unaffected by this setting
 * and always render normally.
 * </p>
 *
 * @enum {number}
 *
 * @experimental
 *
 * @see Model#edgeDisplayMode
 * @see Cesium3DTileset#edgeDisplayMode
 */
const EdgeDisplayMode = {
  /**
   * Render surfaces only. Edges contributed by the EXT_mesh_primitive_edge_visibility extension are hidden.
   *
   * @type {number}
   * @constant
   */
  SURFACES_ONLY: 0,

  /**
   * Render both surfaces and edges. Edges contributed by the EXT_mesh_primitive_edge_visibility
   * extension are composited on top of the surface geometry.
   *
   * @type {number}
   * @constant
   */
  SURFACES_AND_EDGES: 1,

  /**
   * Render edges only. Surface geometry is hidden for primitives that have edge visibility data,
   * approximating CAD-style wireframe rendering. Primitives without the extension are unaffected.
   *
   * @type {number}
   * @constant
   */
  EDGES_ONLY: 2,
};

export default Object.freeze(EdgeDisplayMode);
