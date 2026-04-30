import TopologyComponents from "../Mesh/TopologyComponents.js";

/**
 * An EditMode is more than an enum. It's a policy - determining things like which mesh components are rendered and pickable.
 *
 * Built-in modes are exposed as singletons:
 * {@link EditMode.NONE}, {@link EditMode.VERTEX}, {@link EditMode.EDGE},
 * {@link EditMode.FACE}. Applications that need a different policy can
 * subclass {@link EditMode}
 *
 * @experimental This feature is not final and is subject to change without
 *   Cesium's standard deprecation policy.
 */
class EditMode {
  /**
   * Bitmask of {@link TopologyComponents} that the topology overlay should
   * draw in the regular render pass for this mode. Default: nothing.
   *
   * @returns {number}
   */
  get renderableComponents() {
    return TopologyComponents.NONE;
  }

  /**
   * Bitmask of {@link TopologyComponents} that the topology overlay should
   * emit pick commands for in this mode. Default: nothing pickable.
   *
   * @returns {number}
   */
  get pickableComponents() {
    return TopologyComponents.NONE;
  }
}

class NoneEditMode extends EditMode {}

class VertexEditMode extends EditMode {
  get renderableComponents() {
    return TopologyComponents.VERTICES | TopologyComponents.EDGES;
  }
  get pickableComponents() {
    return TopologyComponents.VERTICES;
  }
}

class EdgeEditMode extends EditMode {
  get renderableComponents() {
    return TopologyComponents.EDGES;
  }
  get pickableComponents() {
    return TopologyComponents.EDGES;
  }
}

class FaceEditMode extends EditMode {
  get renderableComponents() {
    return TopologyComponents.EDGES;
  }
  get pickableComponents() {
    return TopologyComponents.FACES;
  }
}

/** Editor is idle. Topology overlay does not render or pick anything. */
EditMode.NONE = new NoneEditMode();
/** Vertex selection. Renders points and edges; picks vertices. */
EditMode.VERTEX = new VertexEditMode();
/** Edge selection. Renders edges; picks edges. */
EditMode.EDGE = new EdgeEditMode();
/** Face selection. Renders edges; picks faces. */
EditMode.FACE = new FaceEditMode();

export default EditMode;
