import { DeveloperError } from "@cesium/core";
import { Mesh, MeshEditor, addModelToEditor } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import createGeometrySource, { square } from "../createGeometrySource.js";

describe(
  "Editor/addModelToEditor",
  function () {
    let scene;
    let editor;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(async function () {
      editor = await MeshEditor.addToScene(scene);
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    function createNode(options) {
      return {
        id: options.id,
        name: options.name,
        primitives: options.primitives ?? [],
        children: options.children ?? [],
      };
    }

    function createModel(rootNodes) {
      return { ready: true, rootNodes };
    }

    it("throws without an editor", function () {
      expect(() => addModelToEditor(undefined, createModel([]))).toThrowError(
        DeveloperError,
      );
    });

    it("throws without a model", function () {
      expect(() => addModelToEditor(editor, undefined)).toThrowError(
        DeveloperError,
      );
    });

    it("throws without adding a group if the model's nodes can't be read", function () {
      const model = {
        get rootNodes() {
          throw new DeveloperError("The model is not loaded.");
        },
      };

      expect(() => addModelToEditor(editor, model)).toThrowError(
        DeveloperError,
      );
      expect(editor.root.children.length).toBe(0);
    });

    it("adds a group with the given name and parent", function () {
      const parent = editor.addGroup({ name: "Parent" });

      const group = addModelToEditor(editor, createModel([]), {
        name: "Model",
        parent,
      });

      expect(group.name).toBe("Model");
      expect(group.parent).toBe(parent);
      expect(parent.children).toEqual([group]);
    });

    it("defaults the parent to the editor's root", function () {
      const group = addModelToEditor(editor, createModel([]));

      expect(group.parent).toBe(editor.root);
    });

    it("mirrors the node hierarchy, adding each primitive as a mesh", function () {
      const first = createGeometrySource(square);
      const second = createGeometrySource(square);
      const third = createGeometrySource(square);
      const model = createModel([
        createNode({
          id: 0,
          name: "Body",
          primitives: [first, second],
          children: [createNode({ id: 1, name: "Wheel", primitives: [third] })],
        }),
      ]);

      const group = addModelToEditor(editor, model);

      expect(group.children.length).toBe(1);
      const body = group.children[0];
      expect(body.name).toBe("Body");
      expect(body.children.length).toBe(3);

      const [firstMesh, secondMesh, wheel] = body.children;
      expect(firstMesh).toBeInstanceOf(Mesh);
      expect(firstMesh.source).toBe(first);
      expect(firstMesh.name).toBe("Primitive 0");
      expect(secondMesh.source).toBe(second);
      expect(secondMesh.name).toBe("Primitive 1");

      expect(wheel.name).toBe("Wheel");
      expect(wheel.children.length).toBe(1);
      expect(wheel.children[0].source).toBe(third);
      expect(editor.meshes.length).toBe(3);
    });

    it("names unnamed nodes by their ID", function () {
      const model = createModel([
        createNode({ id: 4, primitives: [createGeometrySource(square)] }),
        createNode({
          id: 7,
          name: "",
          primitives: [createGeometrySource(square)],
        }),
      ]);

      const group = addModelToEditor(editor, model);

      expect(group.children.map((child) => child.name)).toEqual([
        "Node 4",
        "Node 7",
      ]);
    });

    it("leaves out nodes with no primitives beneath them", function () {
      const source = createGeometrySource(square);
      const model = createModel([
        createNode({ id: 0, name: "Empty" }),
        createNode({
          id: 1,
          name: "Parent",
          children: [
            createNode({ id: 2, name: "Empty child" }),
            createNode({ id: 3, name: "Child", primitives: [source] }),
          ],
        }),
      ]);

      const group = addModelToEditor(editor, model);

      expect(group.children.length).toBe(1);
      const parent = group.children[0];
      expect(parent.name).toBe("Parent");
      expect(parent.children.length).toBe(1);
      expect(parent.children[0].name).toBe("Child");
      expect(parent.children[0].children[0].source).toBe(source);
    });

    it("keeps the model's group even if the model has no primitives", function () {
      const model = createModel([createNode({ id: 0, name: "Empty" })]);

      const group = addModelToEditor(editor, model);

      expect(editor.root.children).toEqual([group]);
      expect(group.children.length).toBe(0);
    });
  },
  "WebGL",
);
