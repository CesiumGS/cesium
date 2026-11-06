// The orbit's pivot marker (owner: "not sure where the center of rotation
// is"): a small ring with a crosshair at `viewer.orbitPivot` while the orbit
// is dragged, fading out after. HUD, as the globe's labels are: white with
// a dark ring, never taking the pointer; placed by `pivotPlacement`.
import type { Viewer } from "../../widgets/index.ts";
import { pivotPlacement } from "./orbit.ts";

export class PivotMarker {
  private readonly el: HTMLElement;

  constructor(
    private readonly viewer: Viewer,
    private readonly hud: HTMLElement,
  ) {
    this.el = document.createElement("div");
    this.el.className = "fx-pivot";
    this.el.setAttribute("aria-hidden", "true");
    hud.append(this.el);
  }

  /** Follows the orbit: shown at the pivot while dragging, fading once the drag ends. */
  update(): void {
    const pivot = this.viewer.orbitPivot;
    const at =
      pivot &&
      pivotPlacement(
        pivot,
        this.viewer.view.camera,
        this.hud.clientWidth,
        this.hud.clientHeight,
      );
    if (at) {
      this.el.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
    }
    this.el.classList.toggle(
      "fx-pivot-on",
      at !== undefined && this.viewer.orbitDragging,
    );
    if (!at) {
      // Gone (the globe controls, or off the view): no fade from a stale place.
      this.el.classList.add("fx-pivot-gone");
    } else {
      this.el.classList.remove("fx-pivot-gone");
    }
  }

  dispose(): void {
    this.el.remove();
  }
}
