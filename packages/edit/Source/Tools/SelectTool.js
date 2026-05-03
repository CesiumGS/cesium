import Tool from "./Tool.js";
import { defined } from "@cesium/engine";
/** @import EditableMesh from "../Mesh/EditableMesh.js"; */

class SelectTool extends Tool {
  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftUp(event) {
    const pick = this._scene.pick(event.position);
    const activeMeshes = this._getMeshes();

    const meshSelections = [];
    for (const mesh of activeMeshes) {
      meshSelections.push(mesh.selection);
    }

    if (meshSelections.length === 0) {
      return false;
    }

    const owner = this.#owningMesh(pick, activeMeshes);
    if (!defined(owner)) {
      for (const selection of meshSelections) {
        selection.clear();
      }
      return false;
    }

    owner.selection.set([pick.id]); // pick.id is the MeshComponent
    return true;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onShiftLeftUp(event) {
    const pick = this._scene.pick(event.position);
    const activeMeshes = this._getMeshes();
    const meshSelections = [];
    for (const mesh of activeMeshes) {
      meshSelections.push(mesh.selection);
    }

    if (meshSelections.length === 0) {
      return false;
    }

    const owner = this.#owningMesh(pick, activeMeshes);
    if (!defined(owner)) {
      return false;
    }

    owner.selection.toggle([pick.id]); // pick.id is the MeshComponent
    return true;
  }

  /**
   * Finds the owning mesh of a pick result, if it corresponds to any of the active meshes.
   * @param {*} pick The pick result from a scene pick.
   * @param {Iterable<EditableMesh>} activeMeshes The active meshes.
   * @returns {EditableMesh | undefined} The owning mesh, or undefined if the pick is not valid or does not correspond to any mesh.
   */
  #owningMesh(pick, activeMeshes) {
    const pickDefined = defined(pick) && defined(pick.id);

    if (!pickDefined) {
      return undefined;
    }

    for (const mesh of activeMeshes) {
      if (pick.primitive === mesh.topologyOverlay) {
        return mesh;
      }
    }

    return undefined;
  }
}

export default SelectTool;
