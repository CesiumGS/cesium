// @ts-check

import { Check, DeveloperError, destroyObject } from "@cesium/core";
import OverlayRenderer from "./OverlayRenderer.js";
import WasmMeshAttributeTranslator from "./WasmMeshAttributeTranslator.js";

/** @import { OrientedBoundingBox } from "@cesium/core"; */
/** @import { FrameState, GeometryAttributeDescriptor, GeometrySource } from "@cesium/engine"; */
/** @import { MeshEditor as WasmMeshEditor, OverlayViews } from "@cesium/mesh-editor"; */
/** @import ComparisonOperator from "./ComparisonOperator.js"; */
/** @import { MeshComponentKeys } from "./ComponentKeys.js"; */
/** @import MeshEditorGroup from "./MeshEditorGroup.js"; */
/** @import MeshEditorStyle from "./MeshEditorStyle.js"; */

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
  /** @type {string|undefined} */
  #name;

  /** @type {MeshEditorGroup} */
  #parent;

  /** @type {WasmMeshEditor} */
  #wasmEditor;

  /**
   * Hides the source, if it has a <code>show</code> property, and creates the
   * mesh's overlay renderer.
   *
   * @param {object} options
   * @param {GeometrySource} options.source The geometry being edited.
   * @param {string} [options.name] The mesh's name.
   * @param {MeshEditorGroup} options.parent The group holding the mesh.
   * @param {*} options.wasmEditor The wasm editor holding the mesh.
   * @param {bigint} options.key The mesh's key in its editor's wasm.
   * @param {*} options.module The loaded wasm module.
   * @param {MeshEditorStyle} options.style The editor's style, shared by its meshes.
   */
  constructor(options) {
    /**
     * The geometry being edited.
     *
     * @type {GeometrySource}
     * @readonly
     */
    this.source = options.source;

    this.#name = options.name;
    this.#parent = options.parent;
    this.#wasmEditor = options.wasmEditor;

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
    this._renderer = new OverlayRenderer({
      module: options.module,
      mesh: this,
      style: options.style,
      modelMatrix: this.source.worldMatrix,
    });

    // TODO: consider an interface that guarantees the source can be shown/hidden.
    const { source } = this;
    if ("show" in source) {
      source.show = false;
    }
  }

  /**
   * The mesh's name, or <code>undefined</code> if it wasn't given one.
   *
   * @type {string|undefined}
   * @readonly
   */
  get name() {
    return this.#name;
  }

  /**
   * The group holding the mesh: the one it was added to, or the editor's
   * {@link MeshEditor#root} group.
   *
   * @type {MeshEditorGroup}
   * @readonly
   */
  get parent() {
    return this.#parent;
  }

  /**
   * Gets the list of attributes on the mesh, such as <code>POSITION</code>, or
   * any custom attributes added to the mesh.
   *
   * @returns {GeometryAttributeDescriptor[]} The attributes.
   */
  getAttributes() {
    return this.#wasmEditor
      .meshAttributes(this._key)
      .map(WasmMeshAttributeTranslator.toDescriptor);
  }

  /**
   * Gets a vertex's value of a per-vertex attribute.
   *
   * @param {bigint} vertexKey The vertex's key.
   * @param {string} name The attribute's name.
   * @returns {number|number[]|undefined} The value: a number for scalar attributes and an array for vector attributes. <code>undefined</code> if the mesh has no such vertex or per-vertex attribute.
   */
  getVertexAttributeValue(vertexKey, name) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.bigint("vertexKey", vertexKey);
    Check.typeOf.string("name", name);
    //>>includeEnd('debug');

    return this.#wasmEditor.vertexAttributeValue(this._key, vertexKey, name);
  }

  /**
   * Finds the vertices whose value of a per-vertex attribute compares to a
   * value. Includes hidden vertices, and works whether or not the mesh is
   * active.
   *
   * @param {string} name The attribute's name.
   * @param {ComparisonOperator} comparison How to compare each vertex's value to <code>value</code>.
   * @param {number|number[]} value A number for scalar attributes, or an array for vector attributes.
   * @returns {BigUint64Array} The matching vertices' keys.
   *
   * @exception {DeveloperError} The mesh has no per-vertex attribute with that name.
   * @exception {DeveloperError} The value doesn't fit the attribute's type.
   * @exception {DeveloperError} The comparison doesn't apply to the attribute's type.
   */
  queryVerticesByAttribute(name, comparison, value) {
    Mesh.#debugCheckAttributeQuery(name, comparison, value);

    const { status, verts } = this.#wasmEditor.queryVertsByAttribute(
      this._key,
      name,
      comparison,
      value,
    );

    WasmMeshAttributeTranslator.debugCheckVertsByAttributeResult(status, name);
    return verts;
  }

  /**
   * Adds the vertices whose value of a per-vertex attribute compares to a
   * value to the selection. Skips hidden vertices. Does nothing unless the
   * editor's mode includes {@link EditMode.VERTEX}.
   *
   * @param {string} name The attribute's name.
   * @param {ComparisonOperator} comparison How to compare each vertex's value to <code>value</code>.
   * @param {number|number[]} value A number for scalar attributes, or an array for vector attributes.
   *
   * @exception {DeveloperError} The mesh isn't active.
   * @exception {DeveloperError} The mesh has no per-vertex attribute with that name.
   * @exception {DeveloperError} The value doesn't fit the attribute's type.
   * @exception {DeveloperError} The comparison doesn't apply to the attribute's type.
   */
  selectVerticesByAttribute(name, comparison, value) {
    Mesh.#debugCheckAttributeQuery(name, comparison, value);

    const status = this.#wasmEditor.selectVertsByAttribute(
      this._key,
      name,
      comparison,
      value,
    );

    WasmMeshAttributeTranslator.debugCheckVertsByAttributeResult(status, name);
  }

  /**
   * Hides and deselects components. Ignores components of types that the
   * current edit mode excludes, and unknown keys.
   *
   * @param {MeshComponentKeys} componentKeys The components to hide.
   * @param {MeshVisibilityOptions} [options] The options.
   *
   * @exception {DeveloperError} The mesh isn't active.
   */
  hideComponents(componentKeys, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("componentKeys", componentKeys);
    //>>includeEnd('debug');

    const wasmEditor = this.#wasmEditor;
    const isActive = wasmEditor.hideComponents(
      this._key,
      componentKeys,
      options,
    );
    Mesh.#debugCheckActive(isActive);

    wasmEditor.deselectComponents(this._key, componentKeys);
  }

  /**
   * Shows hidden components. Ignores components of types that the current edit
   * mode excludes, and unknown keys.
   *
   * @param {MeshComponentKeys} componentKeys The components to show.
   * @param {MeshVisibilityOptions} [options] The options.
   *
   * @exception {DeveloperError} The mesh isn't active.
   */
  showComponents(componentKeys, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("componentKeys", componentKeys);
    //>>includeEnd('debug');

    const isActive = this.#wasmEditor.showComponents(
      this._key,
      componentKeys,
      options,
    );
    Mesh.#debugCheckActive(isActive);
  }

  /**
   * Deselects and hides the selected components of the types that the current edit
   * mode includes.
   *
   * @param {MeshVisibilityOptions} [options] The options.
   *
   * @exception {DeveloperError} The mesh isn't active.
   */
  hideSelected(options) {
    const isActive = this.#wasmEditor.hideSelected(this._key, options);
    Mesh.#debugCheckActive(isActive);
  }

  /**
   * Shows every hidden component, whatever the current edit mode.
   *
   * @exception {DeveloperError} The mesh isn't active.
   */
  showAllComponents() {
    const isActive = this.#wasmEditor.showAllComponents(this._key);
    Mesh.#debugCheckActive(isActive);
  }

  /**
   * Hides and deselects the vertices whose value of a per-vertex attribute
   * compares to a value. Does nothing if the current edit mode does not include
   * {@link EditMode.VERTEX}.
   *
   * @param {string} name The attribute's name.
   * @param {ComparisonOperator} comparison How to compare each vertex's value to <code>value</code>.
   * @param {number|number[]} value A number for scalar attributes, or an array for vector attributes.
   * @param {MeshVisibilityOptions} [options] The options.
   *
   * @exception {DeveloperError} The mesh isn't active.
   * @exception {DeveloperError} The mesh has no per-vertex attribute with that name.
   * @exception {DeveloperError} The value doesn't fit the attribute's type.
   * @exception {DeveloperError} The comparison doesn't apply to the attribute's type.
   */
  hideVerticesByAttribute(name, comparison, value, options) {
    const verts = this.queryVerticesByAttribute(name, comparison, value);
    this.hideComponents({ verts }, options);
  }

  /**
   * Shows the hidden vertices whose value of a per-vertex attribute compares
   * to a value. Does nothing if the current edit mode does not include
   * {@link EditMode.VERTEX}.
   *
   * @param {string} name The attribute's name.
   * @param {ComparisonOperator} comparison How to compare each vertex's value to <code>value</code>.
   * @param {number|number[]} value A number for scalar attributes, or an array for vector attributes.
   * @param {MeshVisibilityOptions} [options] The options.
   *
   * @exception {DeveloperError} The mesh isn't active.
   * @exception {DeveloperError} The mesh has no per-vertex attribute with that name.
   * @exception {DeveloperError} The value doesn't fit the attribute's type.
   * @exception {DeveloperError} The comparison doesn't apply to the attribute's type.
   */
  showVerticesByAttribute(name, comparison, value, options) {
    const verts = this.queryVerticesByAttribute(name, comparison, value);
    this.showComponents({ verts }, options);
  }

  /**
   * @param {boolean} isActive Whether wasm found the mesh active.
   * @ignore
   */
  static #debugCheckActive(isActive) {
    //>>includeStart('debug', pragmas.debug);
    if (!isActive) {
      throw new DeveloperError("The mesh isn't active.");
    }
    //>>includeEnd('debug');
  }

  /**
   * @param {string} name The attribute's name.
   * @param {ComparisonOperator} comparison The comparison.
   * @param {number|number[]} value The value to compare to.
   * @ignore
   */
  static #debugCheckAttributeQuery(name, comparison, value) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("name", name);
    Check.typeOf.number("comparison", comparison);
    Check.defined("value", value);
    //>>includeEnd('debug');
  }

  /**
   * The mesh's world-space oriented bounding box, or <code>undefined</code> if
   * it has no vertices. Don't modify it.
   *
   * @type {OrientedBoundingBox|undefined}
   * @readonly
   */
  get orientedBoundingBox() {
    return this._renderer.boundingVolume;
  }

  /**
   * Updates the renderer. Draws nothing when <code>show</code> is false, but
   * still uploads the overlay views.
   *
   * @param {FrameState} frameState The frame state.
   * @param {OverlayViews} [overlayViews] The mesh's overlay views, if the overlay changed. Read right before this call, with no calls into wasm in between.
   * @ignore
   */
  _update(frameState, overlayViews) {
    const renderer = this._renderer;
    renderer.show = this.show;
    renderer.update(frameState, overlayViews);
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
    this._renderer.destroy();

    const { source } = this;
    if ("show" in source) {
      source.show = true;
    }

    destroyObject(this);
  }
}

/**
 * Options for hiding and showing a {@link Mesh}'s components.
 *
 * @typedef {object} MeshVisibilityOptions
 * @property {boolean} [extendToConnectedFaces=false] Also hide or show faces that use any of the affected vertices or edges, even if the current edit mode excludes faces.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

export default Mesh;
