import { Event } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import { EditMode, EditorToolbar } from "../../../index.js";

describe("Widgets/EditorToolbar/EditorToolbar", function () {
  let container;
  let editor;
  let toolbar;
  let selectTool;
  let translateTool;
  let tools;

  beforeEach(function () {
    container = document.createElement("div");
    container.id = "editorToolbarTest";
    document.body.appendChild(container);
    selectTool = { supportsMode: () => true };
    translateTool = { supportsMode: (mode) => mode !== EditMode.NONE };
    let mode = EditMode.NONE;
    let activeTool = selectTool;
    editor = {
      modeChanged: new Event(),
      activeToolChanged: new Event(),
      get mode() {
        return mode;
      },
      set mode(value) {
        const previous = mode;
        mode = value;
        if (activeTool && !activeTool.supportsMode(mode)) {
          this.activeTool = undefined;
        }
        this.modeChanged.raiseEvent(mode, previous);
      },
      get activeTool() {
        return activeTool;
      },
      set activeTool(value) {
        const previous = activeTool;
        activeTool = value;
        this.activeToolChanged.raiseEvent(value, previous);
      },
    };
    tools = [
      { id: "select", label: "Select", tool: selectTool },
      { id: "translate", label: "Translate", tool: translateTool },
    ];
  });

  afterEach(function () {
    toolbar?.destroy();
    toolbar = undefined;
    container.remove();
  });

  function getModeButton() {
    return container.querySelector(".cesium-editor-toolbar-mode > button");
  }

  function getComponents() {
    return container.querySelector(".cesium-editor-toolbar-components");
  }

  function getToolButton() {
    return container.querySelector(".cesium-editor-toolbar-tool > button");
  }

  function getToolDropdown() {
    return container.querySelector(
      ".cesium-editor-toolbar-tool .cesium-editor-toolbar-dropdown",
    );
  }

  function shiftClick(button) {
    button.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    );
  }

  function isPressed(button) {
    return (
      button.getAttribute("aria-pressed") === "true" &&
      button.classList.contains("cesium-editor-toolbar-active")
    );
  }

  it("creates the toolbar in the supplied element or element ID", function () {
    toolbar = new EditorToolbar(container, editor, { tools });
    expect(toolbar.container).toBe(container);
    expect(container.querySelectorAll(".cesium-editor-toolbar").length).toBe(1);
    expect(getModeButton()).not.toBeNull();
    expect(getComponents().children.length).toBe(3);
    expect(getToolDropdown().children.length).toBe(2);

    toolbar.destroy();
    toolbar = new EditorToolbar(container.id, editor, { tools });
    expect(toolbar.container).toBe(container);
    expect(container.querySelectorAll(".cesium-editor-toolbar").length).toBe(1);
  });

  it("requires a container and editor", function () {
    expect(() => new EditorToolbar(undefined, editor)).toThrowDeveloperError();
    expect(() => new EditorToolbar(container)).toThrowDeveloperError();
    expect(
      () => new EditorToolbar("missingEditorToolbar", editor),
    ).toThrowDeveloperError();
    expect(container.children.length).toBe(0);
  });

  describe("modes", function () {
    it("toggles between Object Mode and Edit Mode with one button", function () {
      toolbar = new EditorToolbar(container, editor);
      const modeButton = getModeButton();
      const objectIcon = modeButton.querySelector("path").getAttribute("d");

      expect(
        container.querySelectorAll(".cesium-editor-toolbar-mode > button")
          .length,
      ).toBe(1);
      expect(modeButton.title).toBe("Object Mode");
      expect(modeButton.getAttribute("aria-label")).toBe("Edit Mode");
      expect(modeButton.getAttribute("aria-pressed")).toBe("false");
      expect(getComponents().style.display).toBe("none");

      modeButton.click();

      expect(editor.mode).toBe(EditMode.VERTEX);
      expect(modeButton.title).toBe("Edit Mode");
      expect(modeButton.getAttribute("aria-label")).toBe("Edit Mode");
      expect(modeButton.getAttribute("aria-pressed")).toBe("true");
      expect(modeButton.querySelector("path").getAttribute("d")).not.toBe(
        objectIcon,
      );
      expect(getComponents().style.display).not.toBe("none");

      modeButton.click();

      expect(editor.mode).toBe(EditMode.NONE);
      expect(modeButton.title).toBe("Object Mode");
      expect(modeButton.querySelector("path").getAttribute("d")).toBe(
        objectIcon,
      );
      expect(getComponents().style.display).toBe("none");
    });

    it("labels the component buttons with distinct icons", function () {
      toolbar = new EditorToolbar(container, editor);

      expect(
        Array.from(getComponents().children).map((button) => button.title),
      ).toEqual(["Vertex", "Edge", "Face"]);
      const icons = Array.from(
        container.querySelectorAll(".cesium-editor-toolbar-group path"),
      ).map((path) => path.getAttribute("d"));
      expect(new Set(icons).size).toBe(4);
    });

    it("shows the current component mode in Edit Mode", function () {
      editor.mode = EditMode.EDGE;
      toolbar = new EditorToolbar(container, editor);
      const [vertexButton, edgeButton, faceButton] = getComponents().children;

      expect(getModeButton().title).toBe("Edit Mode");
      expect(getComponents().style.display).not.toBe("none");
      expect(isPressed(vertexButton)).toBe(false);
      expect(isPressed(edgeButton)).toBe(true);
      expect(isPressed(faceButton)).toBe(false);
    });

    it("enters Edit Mode in the last component mode", function () {
      toolbar = new EditorToolbar(container, editor);

      getModeButton().click();
      getComponents().children[2].click();
      expect(editor.mode).toBe(EditMode.FACE);
      expect(isPressed(getComponents().children[2])).toBe(true);

      getModeButton().click();
      expect(editor.mode).toBe(EditMode.NONE);

      getModeButton().click();
      expect(editor.mode).toBe(EditMode.FACE);
    });

    it("presses each component button of a combined mode", function () {
      toolbar = new EditorToolbar(container, editor);
      const [vertexButton, edgeButton, faceButton] = getComponents().children;

      editor.mode = EditMode.VERTEX | EditMode.FACE;

      expect(getModeButton().getAttribute("aria-pressed")).toBe("true");
      expect(isPressed(vertexButton)).toBe(true);
      expect(isPressed(edgeButton)).toBe(false);
      expect(isPressed(faceButton)).toBe(true);
    });

    it("combines component modes with Shift+click", function () {
      editor.mode = EditMode.VERTEX;
      toolbar = new EditorToolbar(container, editor);
      const [vertexButton, edgeButton, faceButton] = getComponents().children;

      shiftClick(edgeButton);
      expect(editor.mode).toBe(EditMode.VERTEX | EditMode.EDGE);
      expect(isPressed(vertexButton)).toBe(true);
      expect(isPressed(edgeButton)).toBe(true);

      shiftClick(faceButton);
      expect(editor.mode).toBe(EditMode.VERTEX | EditMode.EDGE | EditMode.FACE);

      shiftClick(vertexButton);
      expect(editor.mode).toBe(EditMode.EDGE | EditMode.FACE);
      expect(isPressed(vertexButton)).toBe(false);

      faceButton.click();
      expect(editor.mode).toBe(EditMode.FACE);
      expect(isPressed(edgeButton)).toBe(false);
    });

    it("keeps the last component when Shift+clicking it", function () {
      editor.mode = EditMode.EDGE;
      toolbar = new EditorToolbar(container, editor);

      shiftClick(getComponents().children[1]);

      expect(editor.mode).toBe(EditMode.EDGE);
      expect(isPressed(getComponents().children[1])).toBe(true);
    });
  });

  describe("tools", function () {
    it("shows the active tool's icon and label", function () {
      toolbar = new EditorToolbar(container, editor, { tools });
      const toolButton = getToolButton();
      const initialIcon = toolButton.querySelector("path").getAttribute("d");
      expect(toolButton.title).toBe("Select");

      editor.mode = EditMode.EDGE;
      editor.activeTool = translateTool;

      expect(toolButton.title).toBe("Translate");
      expect(toolButton.querySelector("path").getAttribute("d")).not.toBe(
        initialIcon,
      );
      expect(isPressed(getToolDropdown().children[1])).toBe(true);
    });

    it("uses custom entry icons and view box sizes without mutating entries", function () {
      const entry = Object.freeze({
        id: "custom",
        label: "Custom selection",
        tool: selectTool,
        iconPath: "M 0 0 L 10 20 Z",
        iconWidth: 10,
        iconHeight: 20,
      });
      toolbar = new EditorToolbar(container, editor, { tools: [entry] });

      const button = getToolButton();
      expect(button.title).toBe(entry.label);
      expect(button.querySelector("path").getAttribute("d")).toBe(
        entry.iconPath,
      );
      expect(button.querySelector("svg").getAttribute("viewBox")).toBe(
        "0 0 10 20",
      );
      expect(toolbar.viewModel.toolEntries[0]).toBe(entry);
    });

    it("defaults custom icon dimensions to 64", function () {
      toolbar = new EditorToolbar(container, editor, {
        tools: [
          {
            id: "custom",
            label: "Custom",
            tool: selectTool,
            iconPath: "M 0 0 Z",
          },
        ],
      });
      expect(getToolButton().querySelector("svg").getAttribute("viewBox")).toBe(
        "0 0 64 64",
      );
    });

    it("rejects unknown entry IDs without icons and cleans up", function () {
      expect(
        () =>
          new EditorToolbar(container, editor, {
            tools: [{ id: "custom", label: "Custom", tool: selectTool }],
          }),
      ).toThrowDeveloperError();

      expect(container.children.length).toBe(0);
      expect(editor.modeChanged.numberOfListeners).toBe(0);
      expect(editor.activeToolChanged.numberOfListeners).toBe(0);
    });

    it("hides the tool dropdown while the active tool isn't an entry", function () {
      editor.activeTool = undefined;
      toolbar = new EditorToolbar(container, editor, { tools });
      expect(getToolButton()).toBeNull();

      editor.activeTool = selectTool;
      expect(getToolButton().title).toBe("Select");
      getToolButton().click();
      expect(toolbar.viewModel.toolDropDownVisible).toBe(true);

      editor.activeTool = {};
      expect(getToolButton()).toBeNull();
      expect(toolbar.viewModel.toolDropDownVisible).toBe(false);

      editor.activeTool = undefined;
      expect(getToolButton()).toBeNull();

      editor.mode = EditMode.VERTEX;
      editor.activeTool = translateTool;
      expect(getToolButton().title).toBe("Translate");
      expect(getToolDropdown().style.display).toBe("none");
    });

    it("omits the tool dropdown without tool entries", function () {
      toolbar = new EditorToolbar(container, editor);

      expect(getModeButton()).not.toBeNull();
      expect(getToolButton()).toBeNull();
    });

    it("opens and closes the tool dropdown", function () {
      toolbar = new EditorToolbar(container, editor, { tools });
      const toolButton = getToolButton();

      expect(getToolDropdown().style.display).toBe("none");
      toolButton.click();
      expect(getToolDropdown().style.display).not.toBe("none");
      expect(toolButton.getAttribute("aria-expanded")).toBe("true");
      expect(
        toolButton.classList.contains("cesium-editor-toolbar-selected"),
      ).toBe(true);
      toolButton.click();
      expect(getToolDropdown().style.display).toBe("none");
    });

    it("selects tools and closes the dropdown", function () {
      editor.mode = EditMode.VERTEX;
      toolbar = new EditorToolbar(container, editor, { tools });

      getToolButton().click();
      getToolDropdown().children[1].click();
      expect(editor.activeTool).toBe(translateTool);
      expect(getToolDropdown().style.display).toBe("none");
    });

    it("disables unsupported tool buttons", function () {
      toolbar = new EditorToolbar(container, editor, { tools });
      const buttons = getToolDropdown().children;

      expect(buttons[0].disabled).toBe(false);
      expect(buttons[1].disabled).toBe(true);
      buttons[1].click();
      expect(editor.activeTool).toBe(selectTool);
    });

    it("updates tool availability after a mode change", function () {
      toolbar = new EditorToolbar(container, editor, { tools });
      const translateButton = getToolDropdown().children[1];

      editor.mode = EditMode.VERTEX;
      expect(translateButton.disabled).toBe(false);
      editor.mode = EditMode.NONE;
      expect(translateButton.disabled).toBe(true);
    });

    ["pointerdown", "mousedown", "touchstart"].forEach(function (type) {
      it(`closes the dropdown on outside ${type} but not inside`, function () {
        toolbar = new EditorToolbar(container, editor, { tools });
        toolbar.viewModel.toolDropDownVisible = true;
        getToolButton().dispatchEvent(
          new window.Event(type, { bubbles: true }),
        );
        expect(toolbar.viewModel.toolDropDownVisible).toBe(true);

        document.body.dispatchEvent(new window.Event(type, { bubbles: true }));
        expect(toolbar.viewModel.toolDropDownVisible).toBe(false);
      });
    });
  });

  it("removes DOM, bindings, and listeners on destroy", function () {
    const sibling = document.createElement("span");
    container.appendChild(sibling);
    toolbar = new EditorToolbar(container, editor, { tools });
    const viewModel = toolbar.viewModel;
    const wrapper = container.querySelector(".cesium-editor-toolbar");
    const components = getComponents();
    const cleanNode = spyOn(knockout, "cleanNode").and.callThrough();
    const removeListener = spyOn(
      document,
      "removeEventListener",
    ).and.callThrough();

    toolbar.destroy();
    toolbar = undefined;

    expect(cleanNode).toHaveBeenCalledWith(wrapper);
    expect(container.children.length).toBe(1);
    expect(container.firstChild).toBe(sibling);
    expect(editor.modeChanged.numberOfListeners).toBe(0);
    expect(editor.activeToolChanged.numberOfListeners).toBe(0);
    for (const type of ["pointerdown", "mousedown", "touchstart"]) {
      expect(removeListener).toHaveBeenCalledWith(
        type,
        jasmine.any(Function),
        true,
      );
    }
    viewModel.toolDropDownVisible = true;
    document.body.dispatchEvent(
      new window.Event("pointerdown", { bubbles: true }),
    );
    expect(viewModel.toolDropDownVisible).toBe(true);
    editor.mode = EditMode.FACE;
    expect(components.style.display).toBe("none");
  });
});
