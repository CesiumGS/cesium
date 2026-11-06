import { Event } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import { EditorOutlinerViewModel } from "../../../index.js";

describe("Widgets/EditorOutliner/EditorOutlinerViewModel", function () {
  let editor;
  let provider;
  let viewModel;

  function item(label, children = [], mesh = undefined) {
    return { label, children, mesh };
  }

  // Items are plain objects holding their label, children and mesh, so specs
  // can change them and raise changed.
  function createProvider(roots) {
    return {
      roots,
      changed: new Event(),
      getChildren(item) {
        return item === undefined ? this.roots : item.children;
      },
      getLabel(item) {
        return item.label;
      },
      getMesh(item) {
        return item.mesh;
      },
    };
  }

  // Like MeshEditor, setMeshActive and setMeshInactive don't raise
  // meshActiveChanged, which the editor raises on the next frame. Specs raise
  // it to imitate a tool.
  function createEditor() {
    const meshes = [];
    const activeMeshes = new Set();
    return {
      meshActiveChanged: new Event(),
      get meshes() {
        return [...meshes];
      },
      addMesh(mesh) {
        meshes.push(mesh);
        return mesh;
      },
      hasMesh(mesh) {
        return meshes.includes(mesh);
      },
      isMeshActive(mesh) {
        if (!meshes.includes(mesh)) {
          throw new Error("The mesh isn't in this editor.");
        }
        return activeMeshes.has(mesh);
      },
      setMeshActive(mesh) {
        activeMeshes.add(mesh);
      },
      setMeshInactive(mesh) {
        activeMeshes.delete(mesh);
      },
    };
  }

  // The rows as labels, indented two spaces per level.
  function rowLabels() {
    return viewModel.rows.map((row) => `${"  ".repeat(row.depth)}${row.label}`);
  }

  function findRow(label) {
    return viewModel.rows.find((row) => row.label === label);
  }

  let a, b, c, d;

  beforeEach(function () {
    editor = createEditor();
    // a
    //   b
    //     c
    // d
    c = item("c");
    b = item("b", [c]);
    a = item("a", [b]);
    d = item("d");
    provider = createProvider([a, d]);
  });

  afterEach(function () {
    viewModel?.destroy();
    viewModel = undefined;
  });

  it("requires an editor", function () {
    expect(
      () => new EditorOutlinerViewModel(undefined, provider),
    ).toThrowDeveloperError();
  });

  it("requires a provider", function () {
    expect(() => new EditorOutlinerViewModel(editor)).toThrowDeveloperError();
  });

  it("exposes the editor and provider", function () {
    viewModel = new EditorOutlinerViewModel(editor, provider);

    expect(viewModel.editor).toBe(editor);
    expect(viewModel.provider).toBe(provider);
  });

  describe("rows", function () {
    it("start with the root items expanded and the others collapsed", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      expect(rowLabels()).toEqual(["a", "  b", "d"]);
      expect(findRow("a").expanded).toBe(true);
      expect(findRow("b").expanded).toBe(false);
    });

    it("describe their items", function () {
      const mesh = {};
      provider.roots = [item("leaf", [], mesh), a];
      viewModel = new EditorOutlinerViewModel(editor, provider);

      const leaf = viewModel.rows[0];
      expect(leaf.item).toBe(provider.roots[0]);
      expect(leaf.label).toBe("leaf");
      expect(leaf.depth).toBe(0);
      expect(leaf.expandable).toBe(false);
      expect(leaf.mesh).toBe(mesh);
      expect(leaf.selectable).toBe(true);
      expect(leaf.active).toBe(false);
      expect(findRow("a").expandable).toBe(true);
      expect(findRow("a").mesh).toBeUndefined();
      expect(findRow("a").selectable).toBe(false);
    });

    it("are empty for an empty tree", function () {
      provider.roots = [];
      viewModel = new EditorOutlinerViewModel(editor, provider);

      expect(viewModel.rows.length).toBe(0);
    });

    it("are observable, as are their properties", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const rowsChanged = jasmine.createSpy("rows");
      const expandedChanged = jasmine.createSpy("expanded");
      knockout.getObservable(viewModel, "rows").subscribe(rowsChanged);
      knockout
        .getObservable(findRow("b"), "expanded")
        .subscribe(expandedChanged);

      viewModel.toggleExpanded(findRow("b"));

      expect(rowsChanged).toHaveBeenCalled();
      expect(expandedChanged).toHaveBeenCalledWith(true);
    });
  });

  describe("toggleExpanded", function () {
    it("shows a collapsed row's children", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.toggleExpanded(findRow("b"));

      expect(findRow("b").expanded).toBe(true);
      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("hides an expanded row's descendants", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.toggleExpanded(findRow("b"));

      viewModel.toggleExpanded(findRow("a"));

      expect(findRow("a").expanded).toBe(false);
      expect(rowLabels()).toEqual(["a", "d"]);
    });

    it("keeps hidden rows expanded", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.toggleExpanded(findRow("b"));
      viewModel.toggleExpanded(findRow("a"));

      viewModel.toggleExpanded(findRow("a"));

      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("does nothing for a row without children", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const row = findRow("d");
      const expanded = row.expanded;

      viewModel.toggleExpanded(row);

      expect(row.expanded).toBe(expanded);
      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });

    it("reuses the rows that stay visible", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const [rowA, rowB, rowD] = viewModel.rows;

      viewModel.toggleExpanded(rowB);

      expect(viewModel.rows[0]).toBe(rowA);
      expect(viewModel.rows[1]).toBe(rowB);
      expect(viewModel.rows[3]).toBe(rowD);
    });
  });

  describe("expandAll and collapseAll", function () {
    it("expandAll shows every item", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.expandAll();

      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("collapseAll shows only the root items", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.expandAll();

      viewModel.collapseAll();

      expect(rowLabels()).toEqual(["a", "d"]);
    });

    it("collapseAll collapses hidden items too", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.expandAll();
      viewModel.collapseAll();

      viewModel.toggleExpanded(findRow("a"));

      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });
  });

  describe("when the provider changes", function () {
    it("re-reads the root items for undefined", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const e = item("e");

      provider.roots = [d, e];
      provider.changed.raiseEvent(undefined);

      expect(rowLabels()).toEqual(["d", "e"]);
    });

    it("re-reads every item for undefined", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      a.label = "A";
      b.children = [];
      provider.changed.raiseEvent(undefined);

      expect(rowLabels()).toEqual(["A", "  b", "d"]);
      expect(findRow("b").expandable).toBe(false);
    });

    it("re-reads an item's label, mesh and children", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const mesh = {};

      a.label = "A";
      a.mesh = mesh;
      a.children = [b, item("e")];
      provider.changed.raiseEvent(a);

      expect(rowLabels()).toEqual(["A", "  b", "  e", "d"]);
      expect(findRow("A").mesh).toBe(mesh);
    });

    it("re-reads the items beneath an item", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      b.label = "B";
      provider.changed.raiseEvent(a);

      expect(rowLabels()).toEqual(["a", "  B", "d"]);
    });

    it("doesn't re-read other items", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      spyOn(provider, "getLabel").and.callThrough();

      provider.changed.raiseEvent(b);

      const labeled = provider.getLabel.calls.allArgs().map(([item]) => item);
      expect(labeled).toContain(b);
      expect(labeled).not.toContain(a);
      expect(labeled).not.toContain(d);
    });

    it("updates whether an item is expandable", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.toggleExpanded(findRow("b"));

      c.children = [item("e")];
      provider.changed.raiseEvent(c);

      expect(findRow("c").expandable).toBe(true);
      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("ignores items it hasn't read yet", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      spyOn(provider, "getChildren").and.callThrough();

      provider.changed.raiseEvent(c);

      expect(provider.getChildren).not.toHaveBeenCalled();
    });

    it("forgets whether removed items were expanded", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.toggleExpanded(findRow("b"));

      a.children = [];
      provider.changed.raiseEvent(a);
      a.children = [b];
      provider.changed.raiseEvent(a);

      expect(findRow("b").expanded).toBe(false);
      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });

    it("keeps whether a moved item is expanded", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.toggleExpanded(findRow("b"));

      // Moves b from a to d: the new parent changes first, then the old one.
      // d is a root item, so it's expanded.
      d.children = [b];
      provider.changed.raiseEvent(d);
      a.children = [];
      provider.changed.raiseEvent(a);

      expect(findRow("b").expanded).toBe(true);
      expect(rowLabels()).toEqual(["a", "d", "  b", "    c"]);
    });

    it("reuses the rows of items still in the tree", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const rowA = findRow("a");

      provider.changed.raiseEvent(undefined);

      expect(findRow("a")).toBe(rowA);
    });
  });

  describe("selection", function () {
    let m0, m1, m2, m3, outside;
    let i0, group, i1, i2, i3;

    // i0 (m0)
    // group, with no mesh
    //   i1 (m1)
    //   i2 (m2)
    // i3 (m3)
    // The editor also has a mesh that isn't in the tree.
    beforeEach(function () {
      m0 = editor.addMesh({ name: "m0" });
      m1 = editor.addMesh({ name: "m1" });
      m2 = editor.addMesh({ name: "m2" });
      m3 = editor.addMesh({ name: "m3" });
      outside = editor.addMesh({ name: "outside" });
      i0 = item("i0", [], m0);
      i1 = item("i1", [], m1);
      i2 = item("i2", [], m2);
      group = item("group", [i1, i2]);
      i3 = item("i3", [], m3);
      provider = createProvider([i0, group, i3]);
    });

    function activeLabels() {
      return viewModel.rows.filter((row) => row.active).map((row) => row.label);
    }

    function activeMeshes() {
      return editor.meshes.filter((mesh) => editor.isMeshActive(mesh));
    }

    it("rows start showing whether their meshes are active", function () {
      editor.setMeshActive(m1);

      viewModel = new EditorOutlinerViewModel(editor, provider);

      expect(activeLabels()).toEqual(["i1"]);
    });

    it("rows are selectable when they have a mesh", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      expect(viewModel.rows.map((row) => row.selectable)).toEqual([
        true,
        false,
        true,
        true,
        true,
      ]);
    });

    it("rows follow changes to their mesh", function () {
      editor.setMeshActive(m2);
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const row = findRow("group");

      group.mesh = m2;
      provider.changed.raiseEvent(group);

      expect(row.selectable).toBe(true);
      expect(row.active).toBe(true);

      group.mesh = undefined;
      provider.changed.raiseEvent(group);

      expect(row.selectable).toBe(false);
      expect(row.active).toBe(false);
    });

    it("makes only the row's mesh active", function () {
      editor.setMeshActive(m0);
      editor.setMeshActive(outside);
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.select(findRow("i1"));

      expect(activeMeshes()).toEqual([m1]);
      expect(activeLabels()).toEqual(["i1"]);
    });

    it("toggles the row's mesh and keeps the others with toggle", function () {
      editor.setMeshActive(m0);
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.select(findRow("i1"), { toggle: true });

      expect(activeMeshes()).toEqual([m0, m1]);
      expect(activeLabels()).toEqual(["i0", "i1"]);

      viewModel.select(findRow("i0"), { toggle: true });

      expect(activeMeshes()).toEqual([m1]);
      expect(activeLabels()).toEqual(["i1"]);
    });

    it("makes only the meshes from the last selected row active with range", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.select(findRow("i1"));
      editor.setMeshActive(outside);

      viewModel.select(findRow("i3"), { range: true });

      expect(activeMeshes()).toEqual([m1, m2, m3]);
      expect(activeLabels()).toEqual(["i1", "i2", "i3"]);
    });

    it("selects ranges upward", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.select(findRow("i2"));

      viewModel.select(findRow("i0"), { range: true });

      expect(activeMeshes()).toEqual([m0, m1, m2]);
    });

    it("skips rows that can't be selected in a range", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.select(findRow("i0"));

      viewModel.select(findRow("i3"), { range: true });

      expect(activeMeshes()).toEqual([m0, m1, m2, m3]);
    });

    it("keeps where ranges start", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.select(findRow("i1"));
      viewModel.select(findRow("i3"), { range: true });

      viewModel.select(findRow("i0"), { range: true });

      expect(activeMeshes()).toEqual([m0, m1]);
    });

    it("starts ranges at rows selected with toggle", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.select(findRow("i0"));
      viewModel.select(findRow("i2"), { toggle: true });

      viewModel.select(findRow("i3"), { range: true });

      expect(activeMeshes()).toEqual([m2, m3]);
    });

    it("adds a range to the active meshes with toggle and range", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.select(findRow("i1"));
      editor.setMeshActive(outside);

      viewModel.select(findRow("i2"), { toggle: true });
      viewModel.select(findRow("i3"), { toggle: true, range: true });

      expect(activeMeshes()).toEqual([m1, m2, m3, outside]);
    });

    it("treats a range without a start as a plain selection", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.select(findRow("i2"), { range: true });

      expect(activeMeshes()).toEqual([m2]);
    });

    it("treats a range whose start is hidden as a plain selection", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      viewModel.select(findRow("i1"));
      viewModel.toggleExpanded(findRow("group"));

      viewModel.select(findRow("i3"), { range: true });

      expect(activeMeshes()).toEqual([m3]);
    });

    it("does nothing for a row that can't be selected", function () {
      editor.setMeshActive(m0);
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.select(findRow("group"));

      expect(activeMeshes()).toEqual([m0]);
    });

    it("does nothing for a row whose mesh isn't in the editor", function () {
      editor.setMeshActive(m0);
      provider.roots = [i0, item("stale", [], { name: "stale" })];
      viewModel = new EditorOutlinerViewModel(editor, provider);

      expect(() => viewModel.select(findRow("stale"))).not.toThrow();
      expect(activeMeshes()).toEqual([m0]);
    });

    it("updates every row showing a mesh", function () {
      group.mesh = m2;
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.select(findRow("i2"));

      expect(activeLabels()).toEqual(["group", "i2"]);
    });

    it("rows follow meshActiveChanged", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      editor.setMeshActive(m2);
      editor.meshActiveChanged.raiseEvent(m2, true);

      expect(activeLabels()).toEqual(["i2"]);

      editor.setMeshInactive(m2);
      editor.meshActiveChanged.raiseEvent(m2, false);

      expect(activeLabels()).toEqual([]);
    });

    it("updates hidden rows on meshActiveChanged", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);
      const row = findRow("i1");
      expect(row.active).toBe(false);
      viewModel.toggleExpanded(findRow("group"));

      editor.setMeshActive(m1);
      editor.meshActiveChanged.raiseEvent(m1, true);

      expect(row.active).toBe(true);
    });

    it("ignores meshActiveChanged for meshes not in the tree", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      expect(() =>
        editor.meshActiveChanged.raiseEvent(outside, true),
      ).not.toThrow();
      expect(activeLabels()).toEqual([]);
    });
  });

  describe("destroy", function () {
    it("stops listening to the provider and editor", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.destroy();

      expect(provider.changed.numberOfListeners).toBe(0);
      expect(editor.meshActiveChanged.numberOfListeners).toBe(0);
    });
  });
});
