// @ts-check

import { Color } from "@cesium/core";

/**
 * <div class="notice">
 * Use {@link MeshEditor#style} to style an editor's meshes. Do not call the
 * constructor directly.
 * </div>
 *
 * How a {@link MeshEditor} draws its meshes' vertices, edges, faces and
 * outlines. Changes apply on the next frame. Sizes are in CSS pixels.
 *
 * @alias MeshEditorStyle
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * editor.style.outlineColor = Cesium.Color.YELLOW;
 * editor.style.pointSize = 8.0;
 */
class MeshEditorStyle {
  constructor() {
    /**
     * The diameter of each vertex in pixels.
     *
     * @type {number}
     * @default 6.0
     */
    this.pointSize = 6.0;

    /**
     * The color of unselected vertices.
     *
     * @type {Color}
     * @default Color.BLACK
     */
    this.pointColor = Color.clone(Color.BLACK);

    /**
     * The color of selected vertices.
     *
     * @type {Color}
     */
    this.selectedPointColor = new Color(1.0, 0.48, 0.0, 1.0);

    /**
     * The width of each edge in pixels.
     *
     * @type {number}
     * @default 2.0
     */
    this.edgeWidth = 2.0;

    /**
     * The color of unselected edges.
     *
     * @type {Color}
     * @default Color.BLACK
     */
    this.edgeColor = Color.clone(Color.BLACK);

    /**
     * The color of selected edges.
     *
     * @type {Color}
     */
    this.selectedEdgeColor = new Color(1.0, 1.0, 1.0, 1.0);

    /**
     * The color of unselected faces.
     *
     * @type {Color}
     */
    this.faceColor = new Color(0.8, 0.8, 0.8, 1.0);

    /**
     * The color of selected faces.
     *
     * @type {Color}
     */
    this.selectedFaceColor = new Color(0.86, 0.75, 0.56, 1.0);

    /**
     * The width of the outline around selected meshes, outside their
     * silhouettes.
     *
     * @type {number}
     * @default 2.0
     */
    this.outlineWidth = 3.0;

    /**
     * The color of the outline around selected meshes.
     *
     * @type {Color}
     */
    this.outlineColor = new Color(1.0, 0.63, 0.16, 1.0);
  }
}

export default MeshEditorStyle;
