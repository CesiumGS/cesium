// @ts-check
// TODO: Remove once implemented.
/* eslint-disable no-unused-private-class-members */

import { DeveloperError } from "@cesium/core";

/** @import { Matrix4 } from "@cesium/core"; */
/** @import { Context, FrameState } from "@cesium/engine"; */
/** @import { ComponentType, OverlayViews } from "@cesium/mesh-editor"; */
/** @import MeshEditorModule from "./MeshEditorModule.js"; */

/**
 * The object that scene.pick returns for a picked overlay component.
 *
 * @typedef {object} OverlayPickObject
 * @property {object} primitive The renderer's mesh.
 * @property {ComponentType} componentType The kind of component.
 * @property {number} index The component's index in its overlay buffer. For faces, the face index.
 * @private
 */

/**
 * What to upload and draw this frame.
 *
 * @typedef {object} OverlayUpdateOptions
 * @property {OverlayViews} [overlayViews] The mesh's overlay views.
 * @property {Matrix4} modelMatrix The mesh's local-to-world transform.
 * @property {boolean} showPoints Whether to draw vertices.
 * @property {boolean} showEdges Whether to draw edges.
 * @property {boolean} showFaces Whether to draw faces.
 * @private
 */

/**
 * Draws one mesh's topology overlay (vertices, edges and faces) and makes its
 * components pickable. Owns the GPU resources for that mesh.
 *
 * @private
 */
class OverlayRenderer {
  /**
   * @param {object} options
   * @param {MeshEditorModule} options.module The loaded module, for its shaders and memory.
   * @param {object} options.mesh The mesh whose overlay this draws. Pick objects return it as their primitive.
   */
  constructor(options) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Uploads the changed overlay views, if any, then adds the overlay's draw
   * commands to the frame. Draws nothing until overlay views are first passed.
   *
   * @param {FrameState} frameState The frame state.
   * @param {OverlayUpdateOptions} options What to upload and draw.
   */
  update(frameState, options) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Uploads each overlay buffer: all of it on a full refresh, otherwise its
   * dirty range, if any.
   *
   * @param {Context} context The context to create textures in.
   * @param {OverlayViews} overlayViews The mesh's overlay views.
   * @ignore
   */
  #upload(context, overlayViews) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @returns {boolean} True if this object was destroyed; otherwise, false.
   */
  isDestroyed() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Destroys the GPU resources. The object can't be used afterwards.
   */
  destroy() {
    throw new DeveloperError("Not implemented.");
  }
}

export default OverlayRenderer;
