import { Event } from "@cesium/core";
import { Model, ModelNode, ModelPrimitive } from "@cesium/engine";
import { ModelMeshTreeProvider } from "../../../index.js";

describe("Widgets/EditorOutliner/ModelMeshTreeProvider", function () {
  let editor;
  let provider;

  // Fakes with the engine's prototypes, so instanceof checks pass, and own
  // properties in place of the getters, which need a loaded glTF.
  function createNode(id, name) {
    return Object.create(ModelNode.prototype, {
      id: { value: id },
      name: { value: name },
      parent: { value: undefined, writable: true },
      children: { value: [] },
      primitives: { value: [] },
    });
  }

  function addChild(parent, child) {
    child.parent = parent;
    parent.children.push(child);
    return child;
  }

  function addPrimitive(node) {
    const primitive = Object.create(ModelPrimitive.prototype, {
      node: { value: node },
      _model: { value: undefined, writable: true },
    });
    node.primitives.push(primitive);
    return primitive;
  }

  function createModel(rootNodes, nodes, ready = true) {
    const model = Object.create(Model.prototype, {
      ready: { value: ready },
      rootNodes: { value: rootNodes },
      nodes: { value: nodes },
    });
    for (const node of nodes) {
      for (const primitive of node?.primitives ?? []) {
        primitive._model = model;
      }
    }
    return model;
  }

  // model
  //   root (p0)
  //     a (pa0, pa1)
  //     b, unnamed
  //       c (pc0)
  //     e, with no primitives or children
  //     f, with no primitives
  //       g, with no primitives or children
  function createTestModel() {
    const root = createNode(0, "root");
    const a = addChild(root, createNode(1, "a"));
    const b = addChild(root, createNode(2, undefined));
    const c = addChild(b, createNode(3, "c"));
    const e = addChild(root, createNode(4, "e"));
    const f = addChild(root, createNode(5, "f"));
    const g = addChild(f, createNode(6, "g"));
    const p0 = addPrimitive(root);
    const pa0 = addPrimitive(a);
    const pa1 = addPrimitive(a);
    const pc0 = addPrimitive(c);
    // An unreachable glTF node leaves a gap in Model#nodes.
    const model = createModel([root], [root, a, b, c, e, f, g, undefined]);
    return { model, root, a, b, c, e, f, g, p0, pa0, pa1, pc0 };
  }

  function createEditor() {
    const meshes = new Map();
    return {
      meshAdded: new Event(),
      meshRemoved: new Event(),
      addMesh(source) {
        const mesh = { source };
        meshes.set(source, mesh);
        this.meshAdded.raiseEvent(mesh);
        return mesh;
      },
      removeMesh(mesh) {
        meshes.delete(mesh.source);
        this.meshRemoved.raiseEvent(mesh);
      },
      getMesh(source) {
        return meshes.get(source);
      },
    };
  }

  beforeEach(function () {
    editor = createEditor();
    // The fakes have no enumerable properties, so compare them by identity.
    jasmine.addCustomEqualityTester((first, second) => {
      const isFake = (value) =>
        value instanceof Model ||
        value instanceof ModelNode ||
        value instanceof ModelPrimitive;
      return isFake(first) || isFake(second) ? first === second : undefined;
    });
  });

  afterEach(function () {
    if (provider && !provider.isDestroyed()) {
      provider.destroy();
    }
    provider = undefined;
  });

  it("requires an editor", function () {
    expect(() => new ModelMeshTreeProvider()).toThrowDeveloperError();
  });

  it("exposes the editor", function () {
    provider = new ModelMeshTreeProvider(editor);

    expect(provider.editor).toBe(editor);
  });

  describe("addModel", function () {
    it("adds models to the root items in order", function () {
      provider = new ModelMeshTreeProvider(editor);
      const first = createTestModel().model;
      const second = createTestModel().model;

      provider.addModel(first);
      provider.addModel(second);

      expect(provider.getChildren()).toEqual([first, second]);
    });

    it("raises changed with undefined", function () {
      provider = new ModelMeshTreeProvider(editor);
      const listener = jasmine.createSpy("changed");
      provider.changed.addEventListener(listener);

      provider.addModel(createTestModel().model);

      expect(listener).toHaveBeenCalledOnceWith(undefined);
    });

    it("doesn't change root items returned earlier", function () {
      provider = new ModelMeshTreeProvider(editor);
      const roots = provider.getChildren();

      provider.addModel(createTestModel().model);

      expect(roots).toEqual([]);
    });

    it("throws if the model was already added", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model } = createTestModel();
      provider.addModel(model);

      expect(() => provider.addModel(model)).toThrowDeveloperError();
    });

    it("throws if the model isn't ready", function () {
      provider = new ModelMeshTreeProvider(editor);
      const model = createModel([], [], false);

      expect(() => provider.addModel(model)).toThrowDeveloperError();
    });
  });

  describe("removeModel", function () {
    it("removes the model from the root items", function () {
      provider = new ModelMeshTreeProvider(editor);
      const first = createTestModel().model;
      const second = createTestModel().model;
      provider.addModel(first);
      provider.addModel(second);

      expect(provider.removeModel(first)).toBe(true);
      expect(provider.getChildren()).toEqual([second]);
    });

    it("forgets the model's nodes", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model, root, b } = createTestModel();
      provider.addModel(model);

      provider.removeModel(model);

      expect(provider.getChildren(model)).toEqual([]);
      expect(provider.getChildren(root)).toEqual([]);
      expect(provider.getChildren(b)).toEqual([]);
    });

    it("raises changed with undefined", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model } = createTestModel();
      provider.addModel(model);
      const listener = jasmine.createSpy("changed");
      provider.changed.addEventListener(listener);

      provider.removeModel(model);

      expect(listener).toHaveBeenCalledOnceWith(undefined);
    });

    it("returns false for a model that wasn't added", function () {
      provider = new ModelMeshTreeProvider(editor);
      const listener = jasmine.createSpy("changed");
      provider.changed.addEventListener(listener);

      expect(provider.removeModel(createTestModel().model)).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    });

    it("stops raising changed for the model's meshes", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model, pa0 } = createTestModel();
      provider.addModel(model);
      provider.removeModel(model);
      const listener = jasmine.createSpy("changed");
      provider.changed.addEventListener(listener);

      editor.addMesh(pa0);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("getChildren", function () {
    it("lists every primitive, whether or not it's in the editor", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model, root, a, b, c, p0, pa0, pa1, pc0 } = createTestModel();
      editor.addMesh(pc0);
      provider.addModel(model);

      expect(provider.getChildren(model)).toEqual([root]);
      expect(provider.getChildren(root)).toEqual([p0, a, b]);
      expect(provider.getChildren(a)).toEqual([pa0, pa1]);
      expect(provider.getChildren(b)).toEqual([c]);
      expect(provider.getChildren(c)).toEqual([pc0]);
      expect(provider.getChildren(pc0)).toEqual([]);
    });

    it("leaves out nodes with no primitives beneath them", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model, root, e, f, g } = createTestModel();
      provider.addModel(model);

      expect(provider.getChildren(root)).not.toContain(e);
      expect(provider.getChildren(root)).not.toContain(f);
      expect(provider.getChildren(f)).toEqual([]);
      expect(provider.getChildren(g)).toEqual([]);
    });

    it("shows no nodes for a model with no primitives", function () {
      provider = new ModelMeshTreeProvider(editor);
      const root = createNode(0, "root");
      addChild(root, createNode(1, "child"));
      const model = createModel([root], [root, root.children[0]]);
      provider.addModel(model);

      expect(provider.getChildren(model)).toEqual([]);
    });

    it("returns the same array each time", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model, root } = createTestModel();
      provider.addModel(model);

      expect(provider.getChildren(model)).toBe(provider.getChildren(model));
      expect(provider.getChildren(root)).toBe(provider.getChildren(root));
    });

    it("doesn't change when meshes are added or removed", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model, a, pa0, pa1 } = createTestModel();
      provider.addModel(model);

      const mesh = editor.addMesh(pa0);
      editor.removeMesh(mesh);

      expect(provider.getChildren(a)).toEqual([pa0, pa1]);
    });

    it("returns no children for an unknown item", function () {
      provider = new ModelMeshTreeProvider(editor);

      expect(provider.getChildren({})).toEqual([]);
    });
  });

  describe("getLabel", function () {
    it("numbers models without a label in the order they were added", function () {
      provider = new ModelMeshTreeProvider(editor);
      const first = createTestModel().model;
      const second = createTestModel().model;
      const third = createTestModel().model;
      provider.addModel(first);
      provider.addModel(second, "Truck");
      provider.addModel(third);

      expect(provider.getLabel(first)).toBe("Model 1");
      expect(provider.getLabel(second)).toBe("Truck");
      expect(provider.getLabel(third)).toBe("Model 3");
    });

    it("labels a node with its name, or its index if it has none", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { root, b } = createTestModel();
      const blank = createNode(7, "");

      expect(provider.getLabel(root)).toBe("root");
      expect(provider.getLabel(b)).toBe("Node 2");
      expect(provider.getLabel(blank)).toBe("Node 7");
    });

    it("labels a primitive with its index in its node", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { pa0, pa1 } = createTestModel();

      expect(provider.getLabel(pa0)).toBe("Primitive 0");
      expect(provider.getLabel(pa1)).toBe("Primitive 1");
    });
  });

  describe("getMesh", function () {
    it("returns the mesh that edits a primitive", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { pa0 } = createTestModel();
      const mesh = editor.addMesh(pa0);

      expect(provider.getMesh(pa0)).toBe(mesh);
    });

    it("returns undefined for a primitive that isn't in the editor", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { pa0 } = createTestModel();

      expect(provider.getMesh(pa0)).toBeUndefined();
    });

    it("returns undefined for models and nodes", function () {
      provider = new ModelMeshTreeProvider(editor);
      const { model, root } = createTestModel();

      expect(provider.getMesh(model)).toBeUndefined();
      expect(provider.getMesh(root)).toBeUndefined();
    });
  });

  describe("changed for meshes", function () {
    let listener;
    let parts;

    beforeEach(function () {
      provider = new ModelMeshTreeProvider(editor);
      parts = createTestModel();
      provider.addModel(parts.model);
      listener = jasmine.createSpy("changed");
      provider.changed.addEventListener(listener);
    });

    it("is raised for the primitive when its mesh is added", function () {
      editor.addMesh(parts.pc0);

      expect(listener).toHaveBeenCalledOnceWith(parts.pc0);
    });

    it("is raised for the primitive when its mesh is removed", function () {
      const mesh = editor.addMesh(parts.pc0);
      listener.calls.reset();

      editor.removeMesh(mesh);

      expect(listener).toHaveBeenCalledOnceWith(parts.pc0);
    });

    it("is raised after the primitive's mesh is up to date", function () {
      listener.and.callFake(() => {
        expect(provider.getMesh(parts.pa0)).toBeDefined();
      });

      editor.addMesh(parts.pa0);

      expect(listener).toHaveBeenCalled();
    });

    it("is not raised for a primitive of a model that wasn't added", function () {
      editor.addMesh(createTestModel().pa0);

      expect(listener).not.toHaveBeenCalled();
    });

    it("is not raised for a source that isn't a primitive", function () {
      editor.addMesh({});

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("destroy", function () {
    it("stops listening to the editor", function () {
      provider = new ModelMeshTreeProvider(editor);

      provider.destroy();

      expect(editor.meshAdded.numberOfListeners).toBe(0);
      expect(editor.meshRemoved.numberOfListeners).toBe(0);
    });

    it("isDestroyed returns false before destroy", function () {
      provider = new ModelMeshTreeProvider(editor);

      expect(provider.isDestroyed()).toBe(false);
    });

    it("isDestroyed returns true after destroy", function () {
      provider = new ModelMeshTreeProvider(editor);

      provider.destroy();

      expect(provider.isDestroyed()).toBe(true);
    });
  });
});
