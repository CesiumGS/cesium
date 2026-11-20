import { Event } from "@cesium/core";
import { EditorOutliner, Mesh } from "../../../index.js";

describe("Widgets/EditorOutliner/EditorOutliner", function () {
  let container;
  let editor;
  let outliner;

  // Groups are plain objects, so specs can change their children, then raise
  // meshGroupChanged.
  function group(name, children = []) {
    return { name, children };
  }

  // Like MeshEditor, setMeshActive and setMeshInactive don't raise
  // meshActiveChanged, which the editor raises on the next frame.
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
        // The outliner recognizes meshes by their type.
        const mesh = Object.create(Mesh.prototype, { name: { value: name } });
        meshes.push(mesh);
        return mesh;
      },
      hasMesh(mesh) {
        return meshes.includes(mesh);
      },
      isMeshActive(mesh) {
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

  function getRows() {
    return [...container.querySelectorAll(".cesium-editor-outliner-row")];
  }

  function getRow(label) {
    return getRows().find(
      (row) =>
        row.querySelector(".cesium-editor-outliner-label").textContent ===
        label,
    );
  }

  function getLabels() {
    return getRows().map(
      (row) => row.querySelector(".cesium-editor-outliner-label").textContent,
    );
  }

  function click(element, options = {}) {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, ...options }),
    );
  }

  function clickExpander(label) {
    click(getRow(label).querySelector(".cesium-editor-outliner-expander"));
  }

  let m1, m2, m3, unused, meshGroup;

  // Adds a group holding a group to meshGroup, after unused.
  function addNestedGroup() {
    meshGroup.children = [
      ...meshGroup.children,
      group("nested", [group("child")]),
    ];
    editor.meshGroupChanged.raiseEvent(meshGroup);
  }

  beforeEach(function () {
    container = document.createElement("div");
    container.id = "editorOutlinerTest";
    document.body.appendChild(container);
    editor = createEditor();

    // group
    //   i1 (m1)
    //   i2 (m2)
    //   unused, an empty group
    // i3 (m3)
    m1 = editor.addMesh("i1");
    m2 = editor.addMesh("i2");
    m3 = editor.addMesh("i3");
    unused = group("unused");
    meshGroup = group("group", [m1, m2, unused]);
    editor.root.children = [meshGroup, m3];
  });

  afterEach(function () {
    outliner?.destroy();
    outliner = undefined;
    container.remove();
  });

  it("creates the outliner in the supplied element or element ID", function () {
    outliner = new EditorOutliner(container, editor);
    expect(outliner.container).toBe(container);
    expect(container.querySelectorAll(".cesium-editor-outliner").length).toBe(
      1,
    );

    outliner.destroy();
    outliner = new EditorOutliner(container.id, editor);
    expect(outliner.container).toBe(container);
    expect(container.querySelectorAll(".cesium-editor-outliner").length).toBe(
      1,
    );
  });

  it("requires a container and editor", function () {
    expect(() => new EditorOutliner(undefined, editor)).toThrowDeveloperError();
    expect(() => new EditorOutliner(container)).toThrowDeveloperError();
    expect(
      () => new EditorOutliner("missingEditorOutliner", editor),
    ).toThrowDeveloperError();
    expect(container.children.length).toBe(0);
  });

  it("exposes a view model for the editor", function () {
    outliner = new EditorOutliner(container, editor);

    expect(outliner.viewModel.editor).toBe(editor);
  });

  describe("rows", function () {
    it("show the visible rows' labels", function () {
      outliner = new EditorOutliner(container, editor);

      expect(getLabels()).toEqual(["group", "i1", "i2", "unused", "i3"]);
    });

    it("are indented with a guide line per level of depth", function () {
      outliner = new EditorOutliner(container, editor);
      const guideCount = (label) =>
        getRow(label).querySelectorAll(".cesium-editor-outliner-guide").length;

      expect(guideCount("group")).toBe(0);
      expect(guideCount("i1")).toBe(1);

      addNestedGroup();
      clickExpander("nested");

      expect(guideCount("child")).toBe(2);
    });

    it("show whether they're expandable and expanded", function () {
      outliner = new EditorOutliner(container, editor);
      const expander = getRow("group").querySelector(
        ".cesium-editor-outliner-expander",
      );

      expect(expander.classList).toContain("cesium-editor-outliner-expandable");
      expect(expander.classList).toContain("cesium-editor-outliner-expanded");
      expect(
        getRow("i3").querySelector(".cesium-editor-outliner-expander")
          .classList,
      ).not.toContain("cesium-editor-outliner-expandable");
    });

    it("are dimmed when they can be neither selected nor expanded", function () {
      outliner = new EditorOutliner(container, editor);
      const disabled = "cesium-editor-outliner-row-disabled";

      expect(getRow("unused").classList).toContain(disabled);
      expect(getRow("group").classList).not.toContain(disabled);
      expect(getRow("i1").classList).not.toContain(disabled);
    });

    it("are highlighted while their meshes are active", function () {
      outliner = new EditorOutliner(container, editor);
      const active = "cesium-editor-outliner-row-active";

      editor.setMeshActive(m2);
      editor.meshActiveChanged.raiseEvent(m2, true);

      expect(getRow("i2").classList).toContain(active);
      expect(getRow("i1").classList).not.toContain(active);
    });

    it("follow changes to the tree", function () {
      outliner = new EditorOutliner(container, editor);

      editor.root.children = [...editor.root.children, group("added")];
      editor.meshGroupChanged.raiseEvent(editor.root);

      expect(getLabels()).toEqual([
        "group",
        "i1",
        "i2",
        "unused",
        "i3",
        "added",
      ]);
    });
  });

  describe("clicking", function () {
    it("a row makes its mesh the only active mesh", function () {
      outliner = new EditorOutliner(container, editor);
      editor.setMeshActive(m3);

      click(getRow("i1"));

      expect(editor.isMeshActive(m1)).toBe(true);
      expect(editor.isMeshActive(m3)).toBe(false);
      expect(getRow("i1").classList).toContain(
        "cesium-editor-outliner-row-active",
      );
    });

    it("a row with Ctrl or Cmd toggles its mesh", function () {
      outliner = new EditorOutliner(container, editor);
      click(getRow("i1"));

      click(getRow("i3"), { ctrlKey: true });
      expect(editor.isMeshActive(m1)).toBe(true);
      expect(editor.isMeshActive(m3)).toBe(true);

      click(getRow("i3"), { metaKey: true });
      expect(editor.isMeshActive(m3)).toBe(false);
    });

    it("a row with Shift selects a range", function () {
      outliner = new EditorOutliner(container, editor);
      click(getRow("i1"));

      click(getRow("i3"), { shiftKey: true });

      expect(editor.isMeshActive(m1)).toBe(true);
      expect(editor.isMeshActive(m2)).toBe(true);
      expect(editor.isMeshActive(m3)).toBe(true);
    });

    it("a group's row expands or collapses it", function () {
      outliner = new EditorOutliner(container, editor);

      click(getRow("group"));

      expect(getLabels()).toEqual(["group", "i3"]);
    });

    it("an expander expands or collapses its row once", function () {
      outliner = new EditorOutliner(container, editor);
      addNestedGroup();

      clickExpander("nested");

      expect(getLabels()).toEqual([
        "group",
        "i1",
        "i2",
        "unused",
        "nested",
        "child",
        "i3",
      ]);
    });

    it("an empty group's row does nothing", function () {
      outliner = new EditorOutliner(container, editor);
      editor.setMeshActive(m3);

      click(getRow("unused"));

      expect(editor.isMeshActive(m3)).toBe(true);
      expect(getLabels()).toEqual(["group", "i1", "i2", "unused", "i3"]);
    });
  });

  describe("accessibility", function () {
    function getTree() {
      return container.querySelector(".cesium-editor-outliner");
    }

    it("is a multiselectable tree in the tab order", function () {
      outliner = new EditorOutliner(container, editor);
      const tree = getTree();

      expect(tree.getAttribute("role")).toBe("tree");
      expect(tree.getAttribute("aria-multiselectable")).toBe("true");
      expect(tree.tabIndex).toBe(0);
    });

    it("describes each row's level and state", function () {
      outliner = new EditorOutliner(container, editor);
      editor.setMeshActive(m1);
      editor.meshActiveChanged.raiseEvent(m1, true);

      const group = getRow("group");
      expect(group.getAttribute("role")).toBe("treeitem");
      expect(group.getAttribute("aria-level")).toBe("1");
      expect(group.getAttribute("aria-expanded")).toBe("true");
      expect(group.hasAttribute("aria-selected")).toBe(false);
      expect(group.hasAttribute("aria-disabled")).toBe(false);

      const i1 = getRow("i1");
      expect(i1.getAttribute("aria-level")).toBe("2");
      expect(i1.hasAttribute("aria-expanded")).toBe(false);
      expect(i1.getAttribute("aria-selected")).toBe("true");
      expect(getRow("i2").getAttribute("aria-selected")).toBe("false");

      expect(getRow("unused").getAttribute("aria-disabled")).toBe("true");
    });

    it("gives rows IDs unique to each outliner", function () {
      outliner = new EditorOutliner(container, editor);
      const other = new EditorOutliner(container, editor);

      const ids = getRows().map((row) => row.id);
      other.destroy();

      expect(new Set(ids).size).toBe(ids.length);
    });

    it("points to the focused row", function () {
      outliner = new EditorOutliner(container, editor);
      const tree = getTree();
      expect(tree.hasAttribute("aria-activedescendant")).toBe(false);

      outliner.viewModel.focusedRow = outliner.viewModel.rows[1];

      expect(tree.getAttribute("aria-activedescendant")).toBe(getRow("i1").id);
      expect(getRow("i1").classList).toContain(
        "cesium-editor-outliner-row-focused",
      );
    });
  });

  describe("keyboard", function () {
    function pressKey(key, options = {}) {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
      });
      container.querySelector(".cesium-editor-outliner").dispatchEvent(event);
      return event;
    }

    function focusedLabel() {
      return outliner.viewModel.focusedRow?.label;
    }

    it("focuses the first row when the outliner gains focus", function () {
      outliner = new EditorOutliner(container, editor);

      // Dispatched, since focus() only raises it while the window has focus.
      container
        .querySelector(".cesium-editor-outliner")
        .dispatchEvent(new FocusEvent("focus"));

      expect(focusedLabel()).toBe("group");
    });

    it("keeps the focused row when the outliner gains focus", function () {
      outliner = new EditorOutliner(container, editor);
      click(getRow("i3"));

      // Dispatched, since focus() only raises it while the window has focus.
      container
        .querySelector(".cesium-editor-outliner")
        .dispatchEvent(new FocusEvent("focus"));

      expect(focusedLabel()).toBe("i3");
    });

    it("moves the focus with the arrow keys, Home and End", function () {
      outliner = new EditorOutliner(container, editor);

      pressKey("ArrowDown");
      expect(focusedLabel()).toBe("group");
      pressKey("ArrowDown");
      expect(focusedLabel()).toBe("i1");
      pressKey("ArrowUp");
      expect(focusedLabel()).toBe("group");
      pressKey("End");
      expect(focusedLabel()).toBe("i3");
      pressKey("Home");
      expect(focusedLabel()).toBe("group");
    });

    it("collapses and expands with the left and right arrow keys", function () {
      outliner = new EditorOutliner(container, editor);
      pressKey("ArrowDown");

      pressKey("ArrowLeft");
      expect(getLabels()).toEqual(["group", "i3"]);

      pressKey("ArrowRight");
      expect(getLabels()).toEqual(["group", "i1", "i2", "unused", "i3"]);

      pressKey("ArrowRight");
      expect(focusedLabel()).toBe("i1");

      pressKey("ArrowLeft");
      expect(focusedLabel()).toBe("group");
    });

    it("acts on the focused row with Enter and Space, as clicking does", function () {
      outliner = new EditorOutliner(container, editor);
      outliner.viewModel.focusedRow = outliner.viewModel.rows[1];

      pressKey("Enter");
      expect(editor.isMeshActive(m1)).toBe(true);

      pressKey("End");
      pressKey(" ", { ctrlKey: true });
      expect(editor.isMeshActive(m1)).toBe(true);
      expect(editor.isMeshActive(m3)).toBe(true);

      pressKey("Home");
      pressKey("Enter");
      expect(getLabels()).toEqual(["group", "i3"]);
    });

    it("ignores Enter and Space without a focused row", function () {
      outliner = new EditorOutliner(container, editor);

      const event = pressKey("Enter");

      expect(event.defaultPrevented).toBe(false);
      expect(getLabels()).toEqual(["group", "i1", "i2", "unused", "i3"]);
    });

    it("prevents the default action only for the keys it handles", function () {
      outliner = new EditorOutliner(container, editor);

      expect(pressKey("ArrowDown").defaultPrevented).toBe(true);
      expect(pressKey(" ").defaultPrevented).toBe(true);
      expect(pressKey("Tab").defaultPrevented).toBe(false);
      expect(pressKey("1").defaultPrevented).toBe(false);
    });

    it("focuses a clicked row", function () {
      outliner = new EditorOutliner(container, editor);

      click(getRow("i2"));
      expect(focusedLabel()).toBe("i2");

      clickExpander("group");
      expect(focusedLabel()).toBe("group");
    });

    it("scrolls the focused row into view", function () {
      outliner = new EditorOutliner(container, editor);
      const scrollIntoView = spyOn(Element.prototype, "scrollIntoView");

      pressKey("End");

      expect(scrollIntoView).toHaveBeenCalledOnceWith({ block: "nearest" });
      expect(scrollIntoView.calls.mostRecent().object).toBe(getRow("i3"));
    });
  });

  describe("destroy", function () {
    it("stops scrolling rows into view", function () {
      outliner = new EditorOutliner(container, editor);
      const viewModel = outliner.viewModel;
      const scrollIntoView = spyOn(Element.prototype, "scrollIntoView");

      outliner.destroy();
      outliner = undefined;
      viewModel.focusFirst();

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
    it("removes the outliner from the container", function () {
      outliner = new EditorOutliner(container, editor);

      outliner.destroy();
      outliner = undefined;

      expect(container.children.length).toBe(0);
    });

    it("stops listening to the editor", function () {
      outliner = new EditorOutliner(container, editor);

      outliner.destroy();
      outliner = undefined;

      expect(editor.meshActiveChanged.numberOfListeners).toBe(0);
      expect(editor.meshGroupChanged.numberOfListeners).toBe(0);
    });
  });
});
