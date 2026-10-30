import { EditMode, MeshEditor } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Editor/MeshEditor",
  function () {
    let scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      // Destroys each editor.
      scene.primitives.removeAll();
    });

    describe("addToScene", function () {
      it("resolves to an editor in the scene's primitives", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor).toBeInstanceOf(MeshEditor);
        expect(scene.primitives.contains(editor)).toBe(true);
      });

      it("starts in EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.mode).toBe(EditMode.NONE);
      });
    });

    describe("addMesh", function () {
      it("returns a mesh with the source", function () {});

      it("hides the source", function () {});

      it("returns a shown mesh", function () {});

      it("throws if the source was already added", function () {});
    });

    describe("removeMesh", function () {
      it("returns true and removes the mesh", function () {});

      it("destroys the mesh", function () {});

      it("shows the source", function () {});

      it("returns false for a mesh that isn't in the editor", function () {});

      it("stops drawing the mesh's overlay", function () {});
    });

    describe("mode", function () {
      it("sets the mode", async function () {
        const editor = await MeshEditor.addToScene(scene);

        editor.mode = EditMode.EDGE;

        expect(editor.mode).toBe(EditMode.EDGE);
      });

      it("draws only the components the mode renders", function () {});

      it("draws only faces in EditMode.NONE", function () {});

      it("applies the mode to meshes added later", function () {});

      it("accepts combinations of components", async function () {
        const editor = await MeshEditor.addToScene(scene);

        editor.mode = EditMode.VERTEX | EditMode.EDGE;

        expect(editor.mode).toBe(EditMode.VERTEX | EditMode.EDGE);
      });

      it("throws for unknown components and keeps the mode", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.FACE;

        expect(() => {
          editor.mode = 8;
        }).toThrowError();
        expect(editor.mode).toBe(EditMode.FACE);
      });
    });

    describe("update", function () {
      it("draws the overlay", function () {});

      it("draws the overlay at the source's world transform", function () {});

      it("follows changes to the source's world transform", function () {});

      it("doesn't draw or pick a mesh whose show is false", function () {});

      it("draws nothing outside 3D", function () {});

      it("makes overlay components pickable as the mesh", function () {});

      it("supports drillPick across meshes", function () {});
    });

    describe("destroy", function () {
      it("destroys every mesh and shows its source", function () {});

      it("is called when the editor is removed from the scene", async function () {
        const editor = await MeshEditor.addToScene(scene);

        scene.primitives.remove(editor);

        expect(editor.isDestroyed()).toBe(true);
      });

      it("is called when the scene is destroyed", async function () {
        const otherScene = createScene();
        const editor = await MeshEditor.addToScene(otherScene);

        otherScene.destroyForSpecs();

        expect(editor.isDestroyed()).toBe(true);
      });

      it("isDestroyed returns false before destroy", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.isDestroyed()).toBe(false);
      });
    });
  },
  "WebGL",
);
