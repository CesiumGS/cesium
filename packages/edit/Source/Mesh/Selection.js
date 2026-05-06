/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import MeshComponent from "./MeshComponent"; */

import { Cartesian3, DeveloperError, Event, defined } from "@cesium/engine";
import TopologyComponents from "./TopologyComponents.js";

const { VERTICES, EDGES, FACES, LEVELS } = TopologyComponents;

/**
 * Per-level added/removed arrays describing a single mutation of a
 * {@link Selection}. Keyed by {@link MeshComponent#level} bit.
 *
 * @typedef {Record<TopologyComponents, { added: MeshComponent[], removed: MeshComponent[] }>} SelectionDelta
 */

/**
 * A selection of mesh components organized into vertex, edge, and
 * faces, and that follow two rules whenever the selection changes:
 *
 * <ul>
 *   <li><b>Down-cascade.</b> A selected super-component pulls in its
 *       full lower closure (a face lights up its edges and vertices).</li>
 *   <li><b>Up-bubble.</b> Directly selecting a sub-component pulls in
 *       any super-component whose remaining sub-components are already
 *       selected (selecting all three vertices of a triangle selects
 *       its edges and the face, but selecting two of the triangle's
 *       edges does not select the third — its vertices are present,
 *       but not by direct selection).</li>
 * </ul>
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Selection {
  /**
   * @param {object} [options]
   * @param {TopologyComponents} [options.selectionLevel=TopologyComponents.VERTICES] Initial selection-level bitmask.
   */
  constructor(options) {
    /** @type {TopologyComponents} */
    this._selectionLevel = options?.selectionLevel ?? VERTICES;

    /** @type {Record<TopologyComponents, Set<MeshComponent>>} */
    this._views = {
      [VERTICES]: new Set(),
      [EDGES]: new Set(),
      [FACES]: new Set(),
    };

    /** @type {Event<(delta: SelectionDelta) => void>} */
    this._changed = new Event();

    // Reusable scratch state for #mutate and its helpers. delta is
    // not pooled because it's handed to listeners via #notify.
    this._scratchSeen = new Set();
    this._scratchCandidates = new Set();
    this._scratchTopology = /** @type {MeshComponent[]} */ ([]);
    this._scratchDirectAdds = newPerLevelArrays();
    this._scratchDirectRemovals = newPerLevelArrays();
  }

  /** @type {Event<(delta: SelectionDelta) => void>} */
  get changed() {
    return this._changed;
  }

  /**
   * {@link TopologyComponents} bitmask of levels that accept direct input.
   * @type {TopologyComponents}
   */
  get selectionLevel() {
    return this._selectionLevel;
  }

  /**
   * Change which components can be directly selected. Components of other
   * levels may still be indirectly selected by up-bubbling or down-cascading.
   *
   * @param {TopologyComponents} selectionLevel
   */
  setSelectionLevel(selectionLevel) {
    if (this._selectionLevel === selectionLevel) {
      return;
    }

    /** @type {MeshComponent[]} */
    const survivors = [];
    for (const level of LEVELS) {
      if (!(selectionLevel & level)) {
        continue;
      }
      for (const component of this._views[level]) {
        survivors.push(component);
      }
    }

    this._selectionLevel = selectionLevel;
    this.set(survivors);
  }

  /** @type {ReadonlySet<Vertex>} */
  get vertices() {
    return /** @type {*} */ (this._views[VERTICES]);
  }

  /** @type {ReadonlySet<Edge>} */
  get edges() {
    return /** @type {*} */ (this._views[EDGES]);
  }

  /** @type {ReadonlySet<Face>} */
  get faces() {
    return /** @type {*} */ (this._views[FACES]);
  }

  /**
   * Total number of components across all level views.
   * @type {number}
   */
  get size() {
    return (
      this._views[VERTICES].size +
      this._views[EDGES].size +
      this._views[FACES].size
    );
  }

  /**
   * Whether <code>component</code> is in the view for its level.
   * @param {MeshComponent} component
   * @returns {boolean}
   */
  has(component) {
    return this._views[component.level()].has(component);
  }

  /**
   * Mean of {@link Vertex#position} over the selected vertices, in
   * model space.
   *
   * @param {Cartesian3} result
   * @returns {Cartesian3 | undefined} The centroid, or <code>undefined</code> if no vertices are selected.
   */
  localCentroid(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(result)) {
      throw new DeveloperError("result is required");
    }
    //>>includeEnd('debug');

    const vertices = this._views[VERTICES];
    const closureSize = vertices.size;
    if (closureSize === 0) {
      return undefined;
    }

    Cartesian3.clone(Cartesian3.ZERO, result);
    for (const vertex of vertices) {
      Cartesian3.add(result, /** @type {Vertex} */ (vertex).position, result);
    }
    return Cartesian3.divideByScalar(result, closureSize, result);
  }

  /**
   * Add components to the selection.
   * @param {Iterable<MeshComponent>} components
   */
  add(components) {
    this.#mutate(components, applyAdd);
  }

  /**
   * Remove components from the selection.
   * @param {Iterable<MeshComponent>} components
   */
  remove(components) {
    this.#mutate(components, applyRemove);
  }

  /**
   * Toggle components against the state at the start of the call.
   * @param {Iterable<MeshComponent>} components
   */
  toggle(components) {
    this.#mutate(components, applyToggle);
  }

  /**
   * Dispatch each component to <code>apply</code> at its
   * own level, then run the down-cascade and up-bubble passes over
   * the resulting per-level delta.
   *
   * @param {Iterable<MeshComponent>} components
   * @param {(component: MeshComponent, view: Set<MeshComponent>, levelDelta: { added: MeshComponent[], removed: MeshComponent[] }, directAdds: MeshComponent[], directRemovals: MeshComponent[]) => void} apply
   */
  #mutate(components, apply) {
    const delta = newDelta();
    const directAdds = this._scratchDirectAdds;
    const directRemovals = this._scratchDirectRemovals;
    const seen = this._scratchSeen;
    clearPerLevelArrays(directAdds);
    clearPerLevelArrays(directRemovals);
    seen.clear();

    for (const component of components) {
      if (seen.has(component)) {
        continue;
      }
      seen.add(component);

      const level = component.level();
      if (!(this._selectionLevel & level)) {
        continue;
      }

      apply(
        component,
        this._views[level],
        delta[level],
        directAdds[level],
        directRemovals[level],
      );
    }

    this.#applyRemovals(directRemovals, delta);
    this.#applyAdds(directAdds, delta);

    seen.clear();
    this.#notify(delta);
  }

  /**
   * Replace the selection with <code>components</code> and their
   * topological closure. Implemented as clear + add, so listeners
   * observe two events.
   * @param {Iterable<MeshComponent>} components
   */
  set(components) {
    this.clear();
    this.add(components);
  }

  /**
   * Empty every level view, regardless of mode.
   */
  clear() {
    const delta = newDelta();

    for (const level of LEVELS) {
      const view = this._views[level];
      if (view.size === 0) {
        continue;
      }

      const removed = delta[level].removed;
      for (const component of view) {
        removed.push(component);
      }
      view.clear();
    }

    this.#notify(delta);
  }

  /**
   * Down-cascade (top level to bottom) then up-bubble (bottom to top).
   * Each promotion is appended to <code>directAdds</code> at its
   * level so the next iteration treats it as a direct action and can
   * chain a further promotion above.
   *
   * @param {Record<TopologyComponents, MeshComponent[]>} directAdds
   * @param {SelectionDelta} delta
   */
  #applyAdds(directAdds, delta) {
    for (let i = LEVELS.length - 1; i > 0; i--) {
      this.#addSubComponents(LEVELS[i - 1], delta[LEVELS[i]].added, delta);
    }

    for (let i = 1; i < LEVELS.length; i++) {
      const lower = LEVELS[i - 1];
      const upper = LEVELS[i];
      this.#promoteSuperComponents(
        upper,
        directAdds[lower],
        delta,
        directAdds[upper],
      );
    }
  }

  /**
   * Mirror of {@link Selection#applyAdds} for removals: drop
   * orphaned sub-components, then drop super-components whose lower
   * set is no longer complete. Up-pass chains drops through
   * <code>directRemovals</code> the same way.
   *
   * @param {Record<TopologyComponents, MeshComponent[]>} directRemovals
   * @param {SelectionDelta} delta
   */
  #applyRemovals(directRemovals, delta) {
    for (let i = LEVELS.length - 1; i > 0; i--) {
      this.#dropOrphanedSubComponents(
        LEVELS[i - 1],
        delta[LEVELS[i]].removed,
        delta,
      );
    }

    for (let i = 1; i < LEVELS.length; i++) {
      const lower = LEVELS[i - 1];
      const upper = LEVELS[i];
      this.#dropIncompleteSuperComponents(
        upper,
        directRemovals[lower],
        delta,
        directRemovals[upper],
      );
    }
  }

  /**
   * Down-cascade: pull every sub-component of <code>addedAbove</code>
   * into the <code>level</code> view.
   * @param {TopologyComponents} level
   * @param {MeshComponent[]} addedAbove
   * @param {SelectionDelta} delta
   */
  #addSubComponents(level, addedAbove, delta) {
    if (addedAbove.length === 0) {
      return;
    }

    const view = this._views[level];
    const recordedAdds = delta[level].added;
    const scratch = this._scratchTopology;

    for (const component of addedAbove) {
      scratch.length = 0;
      for (const sub of component.lower(scratch)) {
        if (view.has(sub)) {
          continue;
        }

        view.add(sub);
        recordedAdds.push(sub);
      }
    }
  }

  /**
   * Up-bubble: admit super-components above <code>lowerDirect</code>
   * whose full lower set is already present. Each promotion is
   * appended to <code>upperDirect</code> so it counts as a direct
   * action when the caller chains the next level.
   *
   * PERFORMANCE_IDEA: This step is likely the source of any performance issues.
   * It could possibly be avoided using a Map<candidate, count> from the addSubComponents step,
   * but would require MeshComponent to have more state to indicate how many sub-components it has.
   * Same idea for the dropIncompleteSuperComponents step. Memory-for-speed tradeoff.
   *
   * @param {TopologyComponents} upperLevel
   * @param {MeshComponent[]} lowerDirect
   * @param {SelectionDelta} delta
   * @param {MeshComponent[]} upperDirect
   */
  #promoteSuperComponents(upperLevel, lowerDirect, delta, upperDirect) {
    if (lowerDirect.length === 0) {
      return;
    }

    const view = this._views[upperLevel];
    const lowerView = this._views[TopologyComponents.lowerOf(upperLevel)];
    const recordedAdds = delta[upperLevel].added;
    const scratch = this._scratchTopology;

    const candidates = this._scratchCandidates;
    candidates.clear();
    for (const component of lowerDirect) {
      scratch.length = 0;
      for (const sup of component.upper(scratch)) {
        if (!view.has(sup)) {
          candidates.add(sup);
        }
      }
    }

    for (const candidate of candidates) {
      if (!hasAllLowerIn(candidate, lowerView, scratch)) {
        continue;
      }

      view.add(candidate);
      recordedAdds.push(candidate);
      upperDirect.push(candidate);
    }
  }

  /**
   * Down-cascade for removal: drop sub-components of
   * <code>removedAbove</code> that no surviving super-component still
   * references. The upper view must already be updated.
   * @param {TopologyComponents} level
   * @param {MeshComponent[]} removedAbove
   * @param {SelectionDelta} delta
   */
  #dropOrphanedSubComponents(level, removedAbove, delta) {
    if (removedAbove.length === 0) {
      return;
    }

    const view = this._views[level];
    const upperView = this._views[TopologyComponents.upperOf(level)];
    const recordedRemovals = delta[level].removed;
    const scratch = this._scratchTopology;

    const candidates = this._scratchCandidates;
    candidates.clear();
    for (const component of removedAbove) {
      scratch.length = 0;
      for (const sub of component.lower(scratch)) {
        if (view.has(sub)) {
          candidates.add(sub);
        }
      }
    }

    for (const candidate of candidates) {
      if (hasAnyUpperIn(candidate, upperView, scratch)) {
        continue;
      }

      view.delete(candidate);
      recordedRemovals.push(candidate);
    }
  }

  /**
   * Up-bubble for removal: drop super-components above
   * <code>lowerDirect</code> whose lower set is no longer complete.
   * Each drop is appended to <code>upperDirect</code> to chain to
   * the next level.
   *
   * @param {TopologyComponents} upperLevel
   * @param {MeshComponent[]} lowerDirect
   * @param {SelectionDelta} delta
   * @param {MeshComponent[]} upperDirect
   */
  #dropIncompleteSuperComponents(upperLevel, lowerDirect, delta, upperDirect) {
    if (lowerDirect.length === 0) {
      return;
    }

    const view = this._views[upperLevel];
    const lowerView = this._views[TopologyComponents.lowerOf(upperLevel)];
    const recordedRemovals = delta[upperLevel].removed;
    const scratch = this._scratchTopology;

    const candidates = this._scratchCandidates;
    candidates.clear();
    for (const component of lowerDirect) {
      scratch.length = 0;
      for (const sup of component.upper(scratch)) {
        if (view.has(sup)) {
          candidates.add(sup);
        }
      }
    }

    for (const candidate of candidates) {
      if (hasAllLowerIn(candidate, lowerView, scratch)) {
        continue;
      }

      view.delete(candidate);
      recordedRemovals.push(candidate);
      upperDirect.push(candidate);
    }
  }

  /**
   * Raise {@link Selection#changed} iff <code>delta</code> is non-empty.
   * @param {SelectionDelta} delta
   */
  #notify(delta) {
    for (const level of LEVELS) {
      if (delta[level].added.length || delta[level].removed.length) {
        this._changed.raiseEvent(delta);
        return;
      }
    }
  }
}

// Per-action appliers used by Selection#mutate. Each updates the
// level's view, the level's delta entry, and the appropriate
// direct-action array, or no-ops if the view already matches the
// desired state.

/**
 * @param {MeshComponent} component
 * @param {Set<MeshComponent>} view
 * @param {{ added: MeshComponent[], removed: MeshComponent[] }} levelDelta
 * @param {MeshComponent[]} directAdds
 * @param {MeshComponent[]} _directRemovals
 */
function applyAdd(component, view, levelDelta, directAdds, _directRemovals) {
  if (view.has(component)) {
    return;
  }

  view.add(component);
  levelDelta.added.push(component);
  directAdds.push(component);
}

/**
 * @param {MeshComponent} component
 * @param {Set<MeshComponent>} view
 * @param {{ added: MeshComponent[], removed: MeshComponent[] }} levelDelta
 * @param {MeshComponent[]} _directAdds
 * @param {MeshComponent[]} directRemovals
 */
function applyRemove(component, view, levelDelta, _directAdds, directRemovals) {
  if (!view.has(component)) {
    return;
  }

  view.delete(component);
  levelDelta.removed.push(component);
  directRemovals.push(component);
}

/**
 * @param {MeshComponent} component
 * @param {Set<MeshComponent>} view
 * @param {{ added: MeshComponent[], removed: MeshComponent[] }} levelDelta
 * @param {MeshComponent[]} directAdds
 * @param {MeshComponent[]} directRemovals
 */
function applyToggle(component, view, levelDelta, directAdds, directRemovals) {
  if (view.has(component)) {
    view.delete(component);
    levelDelta.removed.push(component);
    directRemovals.push(component);
    return;
  }

  view.add(component);
  levelDelta.added.push(component);
  directAdds.push(component);
}

/**
 * @param {MeshComponent} component
 * @param {Set<MeshComponent>} view
 * @param {MeshComponent[]} scratch
 * @returns {boolean} <code>true</code> if every <code>lower()</code> of <code>component</code> is in <code>view</code>.
 * @private
 */
function hasAllLowerIn(component, view, scratch) {
  scratch.length = 0;
  for (const sub of component.lower(scratch)) {
    if (!view.has(sub)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {MeshComponent} component
 * @param {Set<MeshComponent>} view
 * @param {MeshComponent[]} scratch
 * @returns {boolean} <code>true</code> if any <code>upper()</code> of <code>component</code> is in <code>view</code>.
 * @private
 */
function hasAnyUpperIn(component, view, scratch) {
  scratch.length = 0;
  for (const sup of component.upper(scratch)) {
    if (view.has(sup)) {
      return true;
    }
  }
  return false;
}

/** @returns {SelectionDelta} */
function newDelta() {
  return {
    [VERTICES]: { added: [], removed: [] },
    [EDGES]: { added: [], removed: [] },
    [FACES]: { added: [], removed: [] },
  };
}

/** @returns {Record<TopologyComponents, MeshComponent[]>} */
function newPerLevelArrays() {
  return {
    [VERTICES]: [],
    [EDGES]: [],
    [FACES]: [],
  };
}

/** @param {Record<TopologyComponents, MeshComponent[]>} arrays */
function clearPerLevelArrays(arrays) {
  arrays[VERTICES].length = 0;
  arrays[EDGES].length = 0;
  arrays[FACES].length = 0;
}

export default Selection;
