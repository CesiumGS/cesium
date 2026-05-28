import Tool from "./Tool.js";
import { defined } from "@cesium/engine";
/** @import EditableMesh from "../Mesh/EditableMesh.js"; */
/** @import MeshComponent from "../Mesh/MeshComponent.js"; */

/**
 * Tool that selects mesh components under the cursor.
 *
 * The selection pipeline is split into protected hooks that subclasses can
 * override independently:
 * <ol>
 *   <li>{@link SelectTool#_pickItems} - acquire raw pick results under the
 *       event position. Override to change <em>how</em> picking happens
 *       (e.g., {@link Scene#drillPick}, a custom ray cast).</li>
 *   <li>{@link SelectTool#_resolveItems} - resolve raw picks into the mesh
 *       components to select, grouped by owning mesh. Override to expand the
 *       selection (e.g., to include related components); call
 *       <code>super._resolveItems(picks)</code> first to start from the
 *       default mapping.</li>
 *   <li>{@link SelectTool#_applySelectionOnLeftClick} and
 *       {@link SelectTool#_applySelectionOnShiftLeftClick} - apply the resolved
 *       items to each mesh's selection.</li>
 * </ol>
 *
 * @extends Tool
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class SelectTool extends Tool {
  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftClick(event) {
    const resolved = this._resolveItems(this._pickItems(event));
    this._applySelectionOnLeftClick(resolved);
    return resolved.size > 0;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onShiftLeftClick(event) {
    const resolved = this._resolveItems(this._pickItems(event));
    this._applySelectionOnShiftLeftClick(resolved);
    return resolved.size > 0;
  }

  /**
   * Acquire raw pick results under the event position. Override to change the
   * picking strategy (e.g., {@link Scene#drillPick} for area selection, or a
   * custom ray cast against an acceleration structure).
   *
   * The default implementation performs a single {@link Scene#pick}, returning
   * an empty array on a miss.
   *
   * @protected
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {Array<*>} Raw pick results to be resolved.
   */
  _pickItems(event) {
    const pick = this._scene.pick(event.position);
    return defined(pick) ? [pick] : [];
  }

  /**
   * Resolve raw pick results into the mesh components to select, grouped by
   * their owning mesh. The default implementation keeps picks whose
   * <code>primitive</code> matches an active mesh's
   * <code>topologyOverlay</code> and uses <code>pick.id</code> as the
   * component.
   *
   * @protected
   * @param {Array<*>} picks Raw pick results from {@link SelectTool#_pickItems}.
   * @returns {Map<EditableMesh, MeshComponent[]>} Components to select, keyed by owning mesh.
   */
  _resolveItems(picks) {
    const meshByOverlay = new Map();
    for (const mesh of this._getMeshes()) {
      meshByOverlay.set(mesh.topologyOverlay, mesh);
    }

    const meshComponentsByMesh = new Map();
    for (const pick of picks) {
      if (!defined(pick) || !defined(pick.id)) {
        continue;
      }

      const mesh = meshByOverlay.get(pick.primitive);
      if (!defined(mesh)) {
        continue;
      }

      const items = meshComponentsByMesh.get(mesh) ?? [];
      meshComponentsByMesh.set(mesh, items);
      items.push(pick.id);
    }

    return meshComponentsByMesh;
  }

  /**
   * Apply the resolved items in response to a plain left-click gesture.
   *
   * Default behavior:
   * <ul>
   *   <li>Hit: replace the selection of each mesh present in
   *       <code>resolved</code>; meshes not present are left unchanged.</li>
   *   <li>Miss: clear every active mesh's selection.</li>
   * </ul>
   *
   * @protected
   * @param {Map<EditableMesh, MeshComponent[]>} resolved
   */
  _applySelectionOnLeftClick(resolved) {
    if (resolved.size === 0) {
      for (const mesh of this._getMeshes()) {
        mesh.selection.clear();
      }
      return;
    }

    for (const [mesh, items] of resolved) {
      mesh.selection.set(items);
    }
  }

  /**
   * Apply the resolved items in response to a shift + left-click gesture.
   *
   * Default behavior: toggle each item on its mesh's selection. A miss is a
   * no-op so the existing selection is preserved.
   *
   * @protected
   * @param {Map<EditableMesh, MeshComponent[]>} resolved
   */
  _applySelectionOnShiftLeftClick(resolved) {
    for (const [mesh, items] of resolved) {
      mesh.selection.toggle(items);
    }
  }
}

export default SelectTool;
