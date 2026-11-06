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

  // The rows as labels, indented two spaces per level.
  function rowLabels() {
    return viewModel.rows.map((row) => `${"  ".repeat(row.depth)}${row.label}`);
  }

  function findRow(label) {
    return viewModel.rows.find((row) => row.label === label);
  }

  let a, b, c, d;

  beforeEach(function () {
    editor = {};
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
      expect(findRow("a").expandable).toBe(true);
      expect(findRow("a").mesh).toBeUndefined();
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

  describe("destroy", function () {
    it("stops listening to the provider", function () {
      viewModel = new EditorOutlinerViewModel(editor, provider);

      viewModel.destroy();

      expect(provider.changed.numberOfListeners).toBe(0);
    });
  });
});
