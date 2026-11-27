import { Event } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import { EditorOutlinerViewModel, Mesh } from "../../../index.js";

describe("Widgets/EditorOutliner/EditorOutlinerViewModel", function () {
  let editor;
  let viewModel;

  // Groups are plain objects, so specs can change their names and children,
  // then raise meshGroupChanged.
  function group(name, children = []) {
    return { name, children };
  }

  // The view model recognizes meshes by their type.
  function mesh(name) {
    return Object.create(Mesh.prototype, {
      name: { value: name, writable: true },
    });
  }

  // Like MeshEditor, setMeshActive and setMeshInactive don't raise
  // meshActiveChanged, which the editor raises on the next frame. Specs raise
  // it to imitate a tool.
  function createEditor() {
    const meshes = [];
    const activeMeshes = new Set();
    return {
      root: group(undefined),
      meshGroupChanged: new Event(),
      meshActiveChanged: new Event(),
      get meshes() {
        return [...meshes];
      },
      addMesh(name) {
        const added = mesh(name);
        meshes.push(added);
        return added;
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
    c = group("c");
    b = group("b", [c]);
    a = group("a", [b]);
    d = group("d");
    editor.root.children = [a, d];
  });

  afterEach(function () {
    viewModel?.destroy();
    viewModel = undefined;
  });

  it("requires an editor", function () {
    expect(() => new EditorOutlinerViewModel()).toThrowDeveloperError();
  });

  it("exposes the editor", function () {
    viewModel = new EditorOutlinerViewModel(editor);

    expect(viewModel.editor).toBe(editor);
  });

  describe("rows", function () {
    it("start with the root group's items expanded and the others collapsed", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      expect(rowLabels()).toEqual(["a", "  b", "d"]);
      expect(findRow("a").expanded).toBe(true);
      expect(findRow("b").expanded).toBe(false);
    });

    it("describe their items", function () {
      const leaf = mesh("leaf");
      editor.root.children = [leaf, a];
      viewModel = new EditorOutlinerViewModel(editor);

      const leafRow = viewModel.rows[0];
      expect(leafRow.item).toBe(leaf);
      expect(leafRow.label).toBe("leaf");
      expect(leafRow.depth).toBe(0);
      expect(leafRow.expandable).toBe(false);
      expect(leafRow.mesh).toBe(leaf);
      expect(leafRow.selectable).toBe(true);
      expect(leafRow.active).toBe(false);
      expect(findRow("a").item).toBe(a);
      expect(findRow("a").expandable).toBe(true);
      expect(findRow("a").mesh).toBeUndefined();
      expect(findRow("a").selectable).toBe(false);
    });

    it("label unnamed meshes and groups with numbers that don't change", function () {
      const unnamedMeshes = [mesh(), mesh()];
      const unnamedGroup = group(undefined, [unnamedMeshes[1]]);
      editor.root.children = [unnamedMeshes[0], unnamedGroup, group()];
      viewModel = new EditorOutlinerViewModel(editor);

      expect(rowLabels()).toEqual(["Mesh 1", "Group 1", "  Mesh 2", "Group 2"]);

      editor.root.children = [unnamedGroup, mesh()];
      editor.meshGroupChanged.raiseEvent(editor.root);

      expect(rowLabels()).toEqual(["Group 1", "  Mesh 2", "Mesh 3"]);
    });

    it("are empty for an empty tree", function () {
      editor.root.children = [];
      viewModel = new EditorOutlinerViewModel(editor);

      expect(viewModel.rows.length).toBe(0);
    });

    it("are observable, as are their properties", function () {
      viewModel = new EditorOutlinerViewModel(editor);
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
      viewModel = new EditorOutlinerViewModel(editor);

      viewModel.toggleExpanded(findRow("b"));

      expect(findRow("b").expanded).toBe(true);
      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("hides an expanded row's descendants", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.toggleExpanded(findRow("b"));

      viewModel.toggleExpanded(findRow("a"));

      expect(findRow("a").expanded).toBe(false);
      expect(rowLabels()).toEqual(["a", "d"]);
    });

    it("keeps hidden rows expanded", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.toggleExpanded(findRow("b"));
      viewModel.toggleExpanded(findRow("a"));

      viewModel.toggleExpanded(findRow("a"));

      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("does nothing for a row without children", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      const row = findRow("d");
      const expanded = row.expanded;

      viewModel.toggleExpanded(row);

      expect(row.expanded).toBe(expanded);
      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });

    it("reuses the rows that stay visible", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      const [rowA, rowB, rowD] = viewModel.rows;

      viewModel.toggleExpanded(rowB);

      expect(viewModel.rows[0]).toBe(rowA);
      expect(viewModel.rows[1]).toBe(rowB);
      expect(viewModel.rows[3]).toBe(rowD);
    });
  });

  describe("expandAll and collapseAll", function () {
    it("expandAll shows every item", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      viewModel.expandAll();

      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("collapseAll shows only the root items", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.expandAll();

      viewModel.collapseAll();

      expect(rowLabels()).toEqual(["a", "d"]);
    });

    it("collapseAll collapses hidden items too", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.expandAll();
      viewModel.collapseAll();

      viewModel.toggleExpanded(findRow("a"));

      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });
  });

  describe("when the hierarchy changes", function () {
    function raiseGroupChanged(changedGroup) {
      editor.meshGroupChanged.raiseEvent(changedGroup);
    }

    it("re-reads the root group's items when it changes", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      const e = group("e");

      editor.root.children = [d, e];
      raiseGroupChanged(editor.root);

      expect(rowLabels()).toEqual(["d", "e"]);
    });

    it("re-reads every item when the root group changes", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      a.name = "A";
      b.children = [];
      raiseGroupChanged(editor.root);

      expect(rowLabels()).toEqual(["A", "  b", "d"]);
      expect(findRow("b").expandable).toBe(false);
    });

    it("re-reads a group's name and children", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      const added = mesh("e");

      a.name = "A";
      a.children = [b, added];
      raiseGroupChanged(a);

      expect(rowLabels()).toEqual(["A", "  b", "  e", "d"]);
      expect(findRow("e").mesh).toBe(added);
    });

    it("re-reads the items beneath a group", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      b.name = "B";
      raiseGroupChanged(a);

      expect(rowLabels()).toEqual(["a", "  B", "d"]);
    });

    it("doesn't re-read other items", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      a.name = "A";
      d.name = "D";
      b.name = "B";
      raiseGroupChanged(b);

      expect(rowLabels()).toEqual(["a", "  B", "d"]);
    });

    it("updates whether a group is expandable", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.toggleExpanded(findRow("b"));

      c.children = [group("e")];
      raiseGroupChanged(c);

      expect(findRow("c").expandable).toBe(true);
      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
    });

    it("ignores groups it hasn't read yet", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      const children = jasmine.createSpy("children").and.returnValue([]);
      Object.defineProperty(c, "children", { get: children });

      raiseGroupChanged(c);

      expect(children).not.toHaveBeenCalled();
    });

    it("forgets whether removed groups were expanded", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.toggleExpanded(findRow("b"));

      a.children = [];
      raiseGroupChanged(a);
      a.children = [b];
      raiseGroupChanged(a);

      expect(findRow("b").expanded).toBe(false);
      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });

    it("keeps whether a moved group is expanded", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.toggleExpanded(findRow("b"));

      // Moves b from a to d: the new parent changes first, then the old one.
      // d is in the root group, so it's expanded.
      d.children = [b];
      raiseGroupChanged(d);
      a.children = [];
      raiseGroupChanged(a);

      expect(findRow("b").expanded).toBe(true);
      expect(rowLabels()).toEqual(["a", "d", "  b", "    c"]);
    });

    it("reuses the rows of items still in the tree", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      const rowA = findRow("a");

      raiseGroupChanged(editor.root);

      expect(findRow("a")).toBe(rowA);
    });
  });

  describe("selection", function () {
    let m0, m1, m2, m3, outside;
    let meshGroup;

    // m0
    // group
    //   m1
    //   m2
    // m3
    // The editor also has a mesh that isn't in the tree.
    beforeEach(function () {
      m0 = editor.addMesh("m0");
      m1 = editor.addMesh("m1");
      m2 = editor.addMesh("m2");
      m3 = editor.addMesh("m3");
      outside = editor.addMesh("outside");
      meshGroup = group("group", [m1, m2]);
      editor.root.children = [m0, meshGroup, m3];
    });

    function activeLabels() {
      return viewModel.rows.filter((row) => row.active).map((row) => row.label);
    }

    function activeMeshes() {
      return editor.meshes.filter((mesh) => editor.isMeshActive(mesh));
    }

    it("rows start showing whether their meshes are active", function () {
      editor.setMeshActive(m1);

      viewModel = new EditorOutlinerViewModel(editor);

      expect(activeLabels()).toEqual(["m1"]);
    });

    it("rows are selectable when they have a mesh", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      expect(viewModel.rows.map((row) => row.selectable)).toEqual([
        true,
        false,
        true,
        true,
        true,
      ]);
    });

    it("makes only the row's mesh active", function () {
      editor.setMeshActive(m0);
      editor.setMeshActive(outside);
      viewModel = new EditorOutlinerViewModel(editor);

      viewModel.select(findRow("m1"));

      expect(activeMeshes()).toEqual([m1]);
      expect(activeLabels()).toEqual(["m1"]);
    });

    it("toggles the row's mesh and keeps the others with toggle", function () {
      editor.setMeshActive(m0);
      viewModel = new EditorOutlinerViewModel(editor);

      viewModel.select(findRow("m1"), { toggle: true });

      expect(activeMeshes()).toEqual([m0, m1]);
      expect(activeLabels()).toEqual(["m0", "m1"]);

      viewModel.select(findRow("m0"), { toggle: true });

      expect(activeMeshes()).toEqual([m1]);
      expect(activeLabels()).toEqual(["m1"]);
    });

    it("makes only the meshes from the last selected row active with range", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.select(findRow("m1"));
      editor.setMeshActive(outside);

      viewModel.select(findRow("m3"), { range: true });

      expect(activeMeshes()).toEqual([m1, m2, m3]);
      expect(activeLabels()).toEqual(["m1", "m2", "m3"]);
    });

    it("selects ranges upward", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.select(findRow("m2"));

      viewModel.select(findRow("m0"), { range: true });

      expect(activeMeshes()).toEqual([m0, m1, m2]);
    });

    it("skips rows that can't be selected in a range", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.select(findRow("m0"));

      viewModel.select(findRow("m3"), { range: true });

      expect(activeMeshes()).toEqual([m0, m1, m2, m3]);
    });

    it("keeps where ranges start", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.select(findRow("m1"));
      viewModel.select(findRow("m3"), { range: true });

      viewModel.select(findRow("m0"), { range: true });

      expect(activeMeshes()).toEqual([m0, m1]);
    });

    it("starts ranges at rows selected with toggle", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.select(findRow("m0"));
      viewModel.select(findRow("m2"), { toggle: true });

      viewModel.select(findRow("m3"), { range: true });

      expect(activeMeshes()).toEqual([m2, m3]);
    });

    it("adds a range to the active meshes with toggle and range", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.select(findRow("m1"));
      editor.setMeshActive(outside);

      viewModel.select(findRow("m2"), { toggle: true });
      viewModel.select(findRow("m3"), { toggle: true, range: true });

      expect(activeMeshes()).toEqual([m1, m2, m3, outside]);
    });

    it("treats a range without a start as a plain selection", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      viewModel.select(findRow("m2"), { range: true });

      expect(activeMeshes()).toEqual([m2]);
    });

    it("treats a range whose start is hidden as a plain selection", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      viewModel.select(findRow("m1"));
      viewModel.toggleExpanded(findRow("group"));

      viewModel.select(findRow("m3"), { range: true });

      expect(activeMeshes()).toEqual([m3]);
    });

    it("does nothing for a row that can't be selected", function () {
      editor.setMeshActive(m0);
      viewModel = new EditorOutlinerViewModel(editor);

      viewModel.select(findRow("group"));

      expect(activeMeshes()).toEqual([m0]);
    });

    it("does nothing for a row whose mesh isn't in the editor", function () {
      editor.setMeshActive(m0);
      editor.root.children = [m0, mesh("stale")];
      viewModel = new EditorOutlinerViewModel(editor);

      expect(() => viewModel.select(findRow("stale"))).not.toThrow();
      expect(activeMeshes()).toEqual([m0]);
    });

    it("rows follow meshActiveChanged", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      editor.setMeshActive(m2);
      editor.meshActiveChanged.raiseEvent(m2, true);

      expect(activeLabels()).toEqual(["m2"]);

      editor.setMeshInactive(m2);
      editor.meshActiveChanged.raiseEvent(m2, false);

      expect(activeLabels()).toEqual([]);
    });

    it("updates hidden rows on meshActiveChanged", function () {
      viewModel = new EditorOutlinerViewModel(editor);
      const row = findRow("m1");
      expect(row.active).toBe(false);
      viewModel.toggleExpanded(findRow("group"));

      editor.setMeshActive(m1);
      editor.meshActiveChanged.raiseEvent(m1, true);

      expect(row.active).toBe(true);
    });

    it("ignores meshActiveChanged for meshes not in the tree", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      expect(() =>
        editor.meshActiveChanged.raiseEvent(outside, true),
      ).not.toThrow();
      expect(activeLabels()).toEqual([]);
    });

    describe("activate", function () {
      it("selects and focuses a row that can be selected", function () {
        viewModel = new EditorOutlinerViewModel(editor);
        viewModel.select(findRow("m0"));

        viewModel.activate(findRow("m1"), { toggle: true });

        expect(activeMeshes()).toEqual([m0, m1]);
        expect(viewModel.focusedRow).toBe(findRow("m1"));
      });

      it("expands or collapses and focuses a row that can't be selected", function () {
        editor.setMeshActive(m0);
        viewModel = new EditorOutlinerViewModel(editor);

        viewModel.activate(findRow("group"));

        expect(rowLabels()).toEqual(["m0", "group", "m3"]);
        expect(viewModel.focusedRow).toBe(findRow("group"));
        expect(activeMeshes()).toEqual([m0]);
      });
    });
  });

  describe("keyboard focus", function () {
    function focusedLabel() {
      return viewModel.focusedRow?.label;
    }

    beforeEach(function () {
      // a
      //   b
      //     c
      // d
      viewModel = new EditorOutlinerViewModel(editor);
    });

    it("starts with no row focused", function () {
      expect(viewModel.focusedRow).toBeUndefined();
    });

    it("focusNext and focusPrevious focus the first row if none is focused", function () {
      viewModel.focusNext();
      expect(focusedLabel()).toBe("a");

      viewModel.focusedRow = undefined;
      viewModel.focusPrevious();
      expect(focusedLabel()).toBe("a");
    });

    it("focusNext and focusPrevious move between rows and stop at the ends", function () {
      viewModel.focusFirst();

      viewModel.focusNext();
      expect(focusedLabel()).toBe("b");
      viewModel.focusNext();
      viewModel.focusNext();
      expect(focusedLabel()).toBe("d");

      viewModel.focusPrevious();
      expect(focusedLabel()).toBe("b");
      viewModel.focusPrevious();
      viewModel.focusPrevious();
      expect(focusedLabel()).toBe("a");
    });

    it("focusFirst and focusLast focus the first and last rows", function () {
      viewModel.focusLast();
      expect(focusedLabel()).toBe("d");

      viewModel.focusFirst();
      expect(focusedLabel()).toBe("a");
    });

    it("expandOrFocusChild expands a collapsed row, then focuses its first child", function () {
      viewModel.focusedRow = findRow("b");

      viewModel.expandOrFocusChild();
      expect(rowLabels()).toEqual(["a", "  b", "    c", "d"]);
      expect(focusedLabel()).toBe("b");

      viewModel.expandOrFocusChild();
      expect(focusedLabel()).toBe("c");
    });

    it("expandOrFocusChild does nothing for a row without children", function () {
      viewModel.focusedRow = findRow("d");

      viewModel.expandOrFocusChild();

      expect(focusedLabel()).toBe("d");
      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });

    it("collapseOrFocusParent collapses an expanded row, then focuses its parent", function () {
      viewModel.toggleExpanded(findRow("b"));
      viewModel.focusedRow = findRow("b");

      viewModel.collapseOrFocusParent();
      expect(rowLabels()).toEqual(["a", "  b", "d"]);
      expect(focusedLabel()).toBe("b");

      viewModel.collapseOrFocusParent();
      expect(focusedLabel()).toBe("a");
    });

    it("collapseOrFocusParent keeps the focus on a root row without children", function () {
      viewModel.focusedRow = findRow("d");

      viewModel.collapseOrFocusParent();

      expect(focusedLabel()).toBe("d");
    });

    it("navigation does nothing for keys that need a focused row", function () {
      viewModel.expandOrFocusChild();
      viewModel.collapseOrFocusParent();

      expect(viewModel.focusedRow).toBeUndefined();
      expect(rowLabels()).toEqual(["a", "  b", "d"]);
    });

    it("clears the focus when the focused row is hidden", function () {
      viewModel.focusedRow = findRow("b");

      viewModel.toggleExpanded(findRow("a"));

      expect(viewModel.focusedRow).toBeUndefined();
    });

    it("keeps the focus when the focused row stays visible", function () {
      viewModel.focusedRow = findRow("d");

      viewModel.toggleExpanded(findRow("a"));

      expect(focusedLabel()).toBe("d");
    });
  });

  describe("destroy", function () {
    it("stops listening to the editor", function () {
      viewModel = new EditorOutlinerViewModel(editor);

      viewModel.destroy();

      expect(editor.meshGroupChanged.numberOfListeners).toBe(0);
      expect(editor.meshActiveChanged.numberOfListeners).toBe(0);
    });
  });
});
