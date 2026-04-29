/** @import { Cartesian3 } from "@cesium/engine"; */
/** @import HalfEdge from "./HalfEdge"; */
/** @import MeshComponent from "./MeshComponent"; */

/**
 * Face record for an EditableMesh.
 *
 * @implements MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Face {
  constructor() {
    /**
     * @type {HalfEdge | undefined}
     */
    this._halfEdge = undefined;
  }

  get halfEdge() {
    return this._halfEdge;
  }

  set halfEdge(halfEdge) {
    this._halfEdge = halfEdge;
  }
}

export default Face;
