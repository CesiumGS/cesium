// @ts-check

import { ComponentType } from "@cesium/mesh-editor";

/**
 * The property for each component type in the wasm mesh editor's component
 * keys and flags, which group their arrays by type.
 *
 * @type {Record<ComponentType, "verts" | "edges" | "faces">}
 * @ignore
 */
const NAMES = Object.freeze({
  [ComponentType.Vertex]: "verts",
  [ComponentType.Edge]: "edges",
  [ComponentType.Face]: "faces",
});

/**
 * Functions for the wasm mesh editor's component keys grouped by type, such
 * as <code>OverlayViews.componentKeys</code> and
 * <code>PickHit.componentKeys</code>.
 *
 * @namespace ComponentKeys
 * @private
 */
const ComponentKeys = {};

/**
 * Gets the property that holds a component type's array, in component keys
 * and other objects grouped the same way, such as
 * <code>OverlayViews.flags</code>.
 *
 * @param {ComponentType} componentType The component type.
 * @returns {"verts" | "edges" | "faces"} The property name.
 */
ComponentKeys.getName = function (componentType) {
  return NAMES[componentType];
};

/**
 * Keys of a {@link Mesh}'s components, grouped by type. A type that's
 * omitted has no keys.
 *
 * @typedef {object} MeshComponentKeys
 * @property {BigUint64Array} [verts] The vertices' keys.
 * @property {BigUint64Array} [edges] The edges' keys.
 * @property {BigUint64Array} [faces] The faces' keys.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

export default Object.freeze(ComponentKeys);
