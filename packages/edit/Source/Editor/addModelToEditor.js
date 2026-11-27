// @ts-check

import { Check } from "@cesium/core";

/** @import { Model, ModelNode } from "@cesium/engine"; */
/** @import MeshEditor from "./MeshEditor.js"; */
/** @import MeshEditorGroup from "./MeshEditorGroup.js"; */

/**
 * Convenience function for adding a model's primitives to an editor, in groups that mirror the
 * model's node hierarchy. Each node with primitives beneath it gets a group of
 * its own, and each primitive is added as a mesh.
 *
 * @function addModelToEditor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {MeshEditor} editor The editor to add the model to.
 * @param {Model} model The model to add. It must be ready.
 * @param {object} [options] Object with the following properties:
 * @param {string} [options.name] The model's group's name.
 * @param {MeshEditorGroup} [options.parent] The group to add the model's group to. Defaults to {@link MeshEditor#root}.
 * @returns {MeshEditorGroup} The group holding the model's nodes.
 *
 * @exception {DeveloperError} The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true.
 *
 * @example
 * const model = scene.primitives.add(await Cesium.Model.fromGltfAsync({ url }));
 * model.readyEvent.addEventListener(() => {
 *   Cesium.addModelToEditor(editor, model, { name: "Model" });
 * });
 */
function addModelToEditor(editor, model, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("editor", editor);
  Check.typeOf.object("model", model);
  //>>includeEnd('debug');

  // Throws if the model isn't ready, before any group is added.
  const rootNodes = model.rootNodes;
  const group = editor.addGroup(options);
  addNodes(editor, rootNodes, group);
  return group;
}

/**
 * Adds a group for each node to a parent group, holding the node's primitives
 * and its children's groups. Leaves out nodes with no primitives beneath them.
 *
 * @param {MeshEditor} editor The editor to add the nodes to.
 * @param {ModelNode[]} nodes The nodes to add.
 * @param {MeshEditorGroup} parent The group to add the nodes' groups to.
 * @ignore
 */
function addNodes(editor, nodes, parent) {
  for (const node of nodes) {
    const group = editor.addGroup({
      name: node.name || `Node ${node.id}`,
      parent,
    });

    node.primitives.forEach((primitive, index) => {
      editor.addMesh(primitive, {
        name: `Primitive ${index}`,
        parent: group,
      });
    });

    addNodes(editor, node.children, group);
    if (group.children.length === 0) {
      editor.removeGroup(group);
    }
  }
}

export default addModelToEditor;
