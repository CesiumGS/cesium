import Tool from "./Tool.js";
import { defined } from "@cesium/engine";

class SelectTool extends Tool {
  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftUp(event) {
    const pick = this._scene.pick(event.position);
    if (!this.#validPick(pick)) {
      return false;
    }
    const selection = this._activeMesh.selection;
    selection.toggle([pick.id]); // pick.id is the MeshComponent

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
