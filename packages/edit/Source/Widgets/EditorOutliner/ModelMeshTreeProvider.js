// @ts-check

import {
  Check,
  DeveloperError,
  Event,
  EventHelper,
  defined,
  destroyObject,
} from "@cesium/core";
import { Model, ModelNode, ModelPrimitive } from "@cesium/engine";

/** @import Mesh from "../../Editor/Mesh.js"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshTreeProvider from "./MeshTreeProvider.js"; */

/**
 * A {@link MeshTreeProvider} that shows the node hierarchy of each added
 * {@link Model}. The root items are the models, in the order they were added.
 * Below each is its glTF node tree, starting at {@link Model#rootNodes}. A
 * node's children are its primitives, then its child nodes. Nodes with no
 * primitives beneath them are left out.
 * <p>
 * Every primitive is listed, whether or not it's registered the editor. If registered,
 * selecting the given primitive will select the corresponding mesh in the editor.
 * </p>
 * <p>
 * Nodes are labeled by their glTF name, or "Node" and their index if they
 * don't have one. Primitives are labeled "Primitive" and their index in the
 * node.
 * </p>
 *
 * @alias ModelMeshTreeProvider
 * @constructor
 * @implements {MeshTreeProvider}
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {MeshEditor} editor The editor whose meshes the primitives select.
 *
 * @example
 * const provider = new Cesium.ModelMeshTreeProvider(editor);
 * for (const node of model.nodes) {
 *   for (const primitive of node.primitives) {
 *     editor.addMesh(primitive);
 *   }
 * }
 * provider.addModel(model, "Milk truck");
 */
class ModelMeshTreeProvider {
  /** @type {MeshEditor} */
  #editor;

  /** @type {Event<function(*): void>} */
  #changed = new Event();

  #eventHelper = new EventHelper();

  /**
   * Replaced rather than modified, so arrays getChildren returned don't change.
   *
   * @type {Model[]}
   */
  #models = [];

  /** @type {Map<Model, string>} */
  #labels = new Map();

  #nextModelNumber = 1;

  /**
   * The children of each added model and each node shown beneath one. A
   * model's node hierarchy doesn't change once it's loaded, so they're found
   * once, when the model is added.
   *
   * @type {Map<Model|ModelNode, ReadonlyArray<ModelNode|ModelPrimitive>>}
   */
  #children = new Map();

  /**
   * @param {MeshEditor} editor The editor whose meshes the primitives select.
   */
  constructor(editor) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#editor = editor;

    this.#eventHelper.add(editor.meshAdded, (mesh) => {
      this.#onMeshAddedOrRemoved(mesh);
    });

    this.#eventHelper.add(editor.meshRemoved, (mesh) => {
      this.#onMeshAddedOrRemoved(mesh);
    });
  }

  /**
   * The editor whose meshes the primitives select.
   *
   * @type {MeshEditor}
   * @readonly
   */
  get editor() {
    return this.#editor;
  }

  /**
   * Raised with <code>undefined</code> when a model is added or removed, and
   * with a primitive of an added model when its mesh is added to or removed
   * from the editor.
   *
   * @type {Event<function(*): void>}
   * @readonly
   */
  get changed() {
    return this.#changed;
  }

  /**
   * Adds a model's node hierarchy to the end of the root items. Its primitives
   * can be added to the editor before or after.
   *
   * @param {Model} model The model. It must be ready.
   * @param {string} [label] The model's label. Defaults to "Model" and a number, counting the models added to this provider.
   *
   * @exception {DeveloperError} The model was already added.
   * @exception {DeveloperError} The model isn't ready. Use Model.readyEvent or wait for Model.ready to be true.
   */
  addModel(model, label) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("model", model);
    if (this.#labels.has(model)) {
      throw new DeveloperError("The model was already added.");
    }
    if (!model.ready) {
      throw new DeveloperError(
        "The model isn't ready. Use Model.readyEvent or wait for Model.ready to be true.",
      );
    }
    //>>includeEnd('debug');

    const number = this.#nextModelNumber++;
    this.#labels.set(model, label ?? `Model ${number}`);
    this.#models = [...this.#models, model];

    this.#children.set(
      model,
      // Filters out nodes with no primitives beneath them.
      model.rootNodes.filter((node) => this.#addNode(node)),
    );

    this.#changed.raiseEvent(undefined);
  }

  /**
   * Removes a model's node hierarchy from the root items.
   *
   * @param {Model} model The model.
   * @returns {boolean} <code>true</code> if the model was removed, <code>false</code> if it wasn't added.
   */
  removeModel(model) {
    if (!this.#labels.delete(model)) {
      return false;
    }

    this.#models = this.#models.filter((added) => added !== model);
    this.#removeChildren(model);

    this.#changed.raiseEvent(undefined);
    return true;
  }

  /**
   * @param {*} [item] A model, node or primitive, or <code>undefined</code> for the root items.
   * @returns {ReadonlyArray<*>} The models for the root, a model's root nodes, a node's primitives followed by its child nodes, or an empty array for a primitive.
   */
  getChildren(item) {
    if (!defined(item)) {
      return this.#models;
    }
    return this.#children.get(item) ?? [];
  }

  /**
   * @param {*} item A model, node or primitive.
   * @returns {string} The item's label.
   */
  getLabel(item) {
    if (item instanceof Model) {
      return this.#labels.get(item) ?? "";
    }

    if (item instanceof ModelNode) {
      const name = item.name;
      return defined(name) && name !== "" ? name : `Node ${item.id}`;
    }

    if (item instanceof ModelPrimitive) {
      return `Primitive ${item.node.primitives.indexOf(item)}`;
    }

    return "";
  }

  /**
   * @param {*} item A model, node or primitive.
   * @returns {Mesh|undefined} The mesh that edits a primitive, or <code>undefined</code> for a model, a node or a primitive that isn't in the editor.
   */
  getMesh(item) {
    return item instanceof ModelPrimitive
      ? this.#editor.getMesh(item)
      : undefined;
  }

  /**
   * Stores the children of a node and of the nodes beneath it, leaving out
   * nodes with no primitives beneath them.
   *
   * @param {ModelNode} node The node.
   * @returns {boolean} Whether the node has primitives beneath it, and so is shown.
   * @ignore
   */
  #addNode(node) {
    const children = [
      ...node.primitives,
      ...node.children.filter((child) => this.#addNode(child)),
    ];

    if (children.length === 0) {
      return false;
    }

    this.#children.set(node, children);
    return true;
  }

  /**
   * Forgets the children of an item and of the nodes beneath it.
   *
   * @param {Model|ModelNode} item The item.
   * @ignore
   */
  #removeChildren(item) {
    const children = this.#children.get(item);
    if (!defined(children)) {
      return;
    }

    this.#children.delete(item);
    for (const child of children) {
      if (child instanceof ModelNode) {
        this.#removeChildren(child);
      }
    }
  }

  /**
   * Raises changed for the mesh's source, if it's a primitive of an added
   * model, since whether it can be selected changed.
   *
   * @param {Mesh} mesh The mesh that was added or removed.
   * @ignore
   */
  #onMeshAddedOrRemoved(mesh) {
    const source = mesh.source;
    if (!(source instanceof ModelPrimitive)) {
      return;
    }

    // ModelPrimitive and ModelNode don't expose their model publicly.
    const model = /** @type {*} */ (source)._model;
    if (this.#labels.has(model)) {
      this.#changed.raiseEvent(source);
    }
  }

  /**
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Stops listening to the editor. The provider can't be used afterwards.
   */
  destroy() {
    this.#eventHelper.removeAll();
    destroyObject(this);
  }
}

export default ModelMeshTreeProvider;
