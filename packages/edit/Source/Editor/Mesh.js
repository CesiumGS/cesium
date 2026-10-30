// @ts-check

import { DeveloperError } from "@cesium/core";

/** @import { FrameState, GeometrySource } from "@cesium/engine"; */
/** @import { OverlayViews } from "@cesium/mesh-editor"; */
/** @import OverlayRenderer from "./OverlayRenderer.js"; */

/**
 * <div class="notice">
 * Use {@link MeshEditor#addMesh} to create a mesh. Do not call the constructor
 * directly.
 * </div>
 *
 * A mesh in a {@link MeshEditor}. Picking one of its vertices, edges or faces
 * returns it as the pick result's <code>primitive</code>. A mesh belongs to
 * one editor, and is destroyed when removed from it.
 *
 * @alias Mesh
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Mesh {
  /**
   * Hides the source, if it has a <code>show</code> property, and creates the
   * mesh's overlay renderer.
   *
   * @param {object} options
   * @param {GeometrySource} options.source The geometry being edited.
   * @param {bigint} options.key The mesh's key in its editor's wasm.
   * @param {object} options.module The loaded wasm module.
   */
  constructor(options) {
    /**
     * The geometry being edited.
     *
     * @type {GeometrySource}
     * @readonly
     */
    this.source = options.source;

    /**
     * Whether to draw the mesh's vertices, edges and faces.
     *
     * @type {boolean}
     * @default true
     */
    this.show = true;

    /**
     * The mesh's key in its editor's wasm.
     *
     * @type {bigint}
     * @ignore
     */
    this._key = options.key;

    /**
     * Draws the mesh's overlay.
     *
     * @type {OverlayRenderer}
     * @ignore
     */
    this._renderer = undefined;

    throw new DeveloperError("Not implemented.");
  }

  /**
   * Places the overlay at the source's world matrix and updates the renderer.
   * Draws nothing when <code>show</code> is false, but still uploads the
   * overlay views.
   *
   * @param {FrameState} frameState The frame state.
   * @param {OverlayViews} [overlayViews] The mesh's overlay views, if the overlay changed. Read right before this call, with no calls into wasm in between.
   * @ignore
   */
  _update(frameState, overlayViews) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @returns {boolean} <code>true</code> if the mesh was removed from its editor; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys the overlay renderer and shows the source, if it has a
   * <code>show</code> property. Called by the editor when it removes the mesh.
   *
   * @ignore
   */
  _destroy() {
    throw new DeveloperError("Not implemented.");
  }
}

export default Mesh;
