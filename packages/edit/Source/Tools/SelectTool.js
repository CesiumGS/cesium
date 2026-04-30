import Tool from "./Tool.js";
import { defined } from "@cesium/engine";

class SelectTool extends Tool {
  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftUp(event) {
    const pick = this._scene.pick(event.position);
    const selection = this._activeMesh.selection;
    if (!this.#validPick(pick)) {
      selection.clear();
      return false;
    }

    selection.set([pick.id]); // pick.id is the MeshComponent
    return true;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onShiftLeftUp(event) {
    const pick = this._scene.pick(event.position);
    if (!this.#validPick(pick)) {
      return false;
    }

    this._activeMesh.selection.toggle([pick.id]);
    return true;
  }

  /**
   * Determines whether the given pick corresponds to a selectable mesh component in the active mesh.
   * @param {*} pick
   * @returns {boolean} Whether the pick corresponds to a selectable mesh component in the active mesh.
   */
  #validPick(pick) {
    return (
      defined(pick) &&
      defined(this._activeMesh) &&
      pick.primitive === this._activeMesh.topologyOverlay &&
      defined(pick.id)
    );
  }
}

export default SelectTool;
