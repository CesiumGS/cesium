import { Event } from "@cesium/core";
import { EditorMeshTreeProvider } from "../../../index.js";

describe("Widgets/EditorOutliner/EditorMeshTreeProvider", function () {
  let editor;
  let provider;

  function createEditor(initialMeshes = []) {
    const meshes = [...initialMeshes];
    return {
      meshAdded: new Event(),
      meshRemoved: new Event(),
      get meshes() {
        return [...meshes];
      },
      addMesh(mesh) {
        meshes.push(mesh);
        this.meshAdded.raiseEvent(mesh);
      },
      removeMesh(mesh) {
        meshes.splice(meshes.indexOf(mesh), 1);
        this.meshRemoved.raiseEvent(mesh);
      },
    };
  }

  beforeEach(function () {
    editor = createEditor();
  });

  afterEach(function () {
    if (provider && !provider.isDestroyed()) {
      provider.destroy();
    }
    provider = undefined;
  });

  it("requires an editor", function () {
    expect(() => new EditorMeshTreeProvider()).toThrowDeveloperError();
  });

  it("exposes the editor", function () {
    provider = new EditorMeshTreeProvider(editor);

    expect(provider.editor).toBe(editor);
  });

  describe("getChildren", function () {
    it("returns the editor's meshes as the root items", function () {
      const first = {};
      const second = {};
      editor.addMesh(first);
      editor.addMesh(second);
      provider = new EditorMeshTreeProvider(editor);

      expect(provider.getChildren()).toEqual([first, second]);
    });

    it("includes meshes added later", function () {
      provider = new EditorMeshTreeProvider(editor);
      const mesh = {};

      editor.addMesh(mesh);

      expect(provider.getChildren()).toEqual([mesh]);
    });

    it("excludes removed meshes", function () {
      const first = {};
      const second = {};
      editor.addMesh(first);
      editor.addMesh(second);
      provider = new EditorMeshTreeProvider(editor);

      editor.removeMesh(first);

      expect(provider.getChildren()).toEqual([second]);
    });

    it("returns no children for a mesh", function () {
      const mesh = {};
      editor.addMesh(mesh);
      provider = new EditorMeshTreeProvider(editor);

      expect(provider.getChildren(mesh)).toEqual([]);
    });
  });

  describe("getLabel", function () {
    it("numbers meshes in the order they were added", function () {
      const first = {};
      const second = {};
      editor = createEditor([first, second]);
      provider = new EditorMeshTreeProvider(editor);
      const third = {};
      editor.addMesh(third);

      expect(provider.getLabel(first)).toBe("Mesh 1");
      expect(provider.getLabel(second)).toBe("Mesh 2");
      expect(provider.getLabel(third)).toBe("Mesh 3");
    });

    it("keeps each mesh's number when others are removed", function () {
      const first = {};
      const second = {};
      editor = createEditor([first, second]);
      provider = new EditorMeshTreeProvider(editor);

      editor.removeMesh(first);
      const third = {};
      editor.addMesh(third);

      expect(provider.getLabel(second)).toBe("Mesh 2");
      expect(provider.getLabel(third)).toBe("Mesh 3");
    });
  });

  describe("getMesh", function () {
    it("returns the mesh itself", function () {
      const mesh = {};
      editor.addMesh(mesh);
      provider = new EditorMeshTreeProvider(editor);

      expect(provider.getMesh(mesh)).toBe(mesh);
    });
  });

  describe("changed", function () {
    it("is raised with undefined when a mesh is added", function () {
      provider = new EditorMeshTreeProvider(editor);
      const listener = jasmine.createSpy("changed");
      provider.changed.addEventListener(listener);

      editor.addMesh({});

      expect(listener).toHaveBeenCalledOnceWith(undefined);
    });

    it("is raised with undefined when a mesh is removed", function () {
      const mesh = {};
      editor.addMesh(mesh);
      provider = new EditorMeshTreeProvider(editor);
      const listener = jasmine.createSpy("changed");
      provider.changed.addEventListener(listener);

      editor.removeMesh(mesh);

      expect(listener).toHaveBeenCalledOnceWith(undefined);
    });

    it("is raised after the meshes are up to date", function () {
      provider = new EditorMeshTreeProvider(editor);
      const mesh = {};
      const listener = jasmine.createSpy("changed").and.callFake(() => {
        expect(provider.getChildren()).toEqual([mesh]);
        expect(provider.getLabel(mesh)).toBe("Mesh 1");
      });
      provider.changed.addEventListener(listener);

      editor.addMesh(mesh);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe("destroy", function () {
    it("stops listening to the editor", function () {
      provider = new EditorMeshTreeProvider(editor);
      const changed = provider.changed;
      const listener = jasmine.createSpy("changed");
      changed.addEventListener(listener);

      provider.destroy();
      editor.addMesh({});

      expect(listener).not.toHaveBeenCalled();
      expect(editor.meshAdded.numberOfListeners).toBe(0);
      expect(editor.meshRemoved.numberOfListeners).toBe(0);
    });

    it("isDestroyed returns false before destroy", function () {
      provider = new EditorMeshTreeProvider(editor);

      expect(provider.isDestroyed()).toBe(false);
    });

    it("isDestroyed returns true after destroy", function () {
      provider = new EditorMeshTreeProvider(editor);

      provider.destroy();

      expect(provider.isDestroyed()).toBe(true);
    });
  });
});
