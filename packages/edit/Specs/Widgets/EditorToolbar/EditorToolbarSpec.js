import { Event } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import {
  EditMode,
  EditorToolbar,
  SelectTool,
  TranslateTool,
} from "../../../index.js";

describe("Widgets/EditorToolbar/EditorToolbar", function () {
  let container;
  let editor;
  let toolbar;
  let selectTool;
  let translateTool;

  beforeEach(function () {
    container = document.createElement("div");
    container.id = "editorToolbarTest";
    document.body.appendChild(container);
    editor = {
      mode: EditMode.NONE,
      activeTool: undefined,
      modeChanged: new Event(),
      activeToolChanged: new Event(),
    };
    selectTool = { supportsMode: () => true };
    translateTool = { supportsMode: (mode) => mode !== EditMode.NONE };
    spyOn(SelectTool, "addTo").and.returnValue(selectTool);
    spyOn(TranslateTool, "addTo").and.returnValue(translateTool);
  });

  afterEach(function () {
    toolbar?.destroy();
    toolbar = undefined;
    container.remove();
  });

  function getMainButton(kind) {
    return container.querySelector(`.cesium-editor-toolbar-${kind} > button`);
  }

  function getDropdown(kind) {
    return container.querySelector(
      `.cesium-editor-toolbar-${kind} .cesium-editor-toolbar-dropdown`,
    );
  }

  function changeMode(mode) {
    const previous = editor.mode;
    editor.mode = mode;
    editor.modeChanged.raiseEvent(mode, previous);
  }

  function changeTool(tool) {
    const previous = editor.activeTool;
    editor.activeTool = tool;
    editor.activeToolChanged.raiseEvent(tool, previous);
  }

  it("creates the toolbar in the supplied element or element ID", function () {
    toolbar = new EditorToolbar(container, editor);
    expect(toolbar.container).toBe(container);
    expect(container.querySelectorAll(".cesium-editor-toolbar").length).toBe(1);
    expect(getDropdown("mode").children.length).toBe(4);
    expect(getDropdown("tool").children.length).toBe(3);

    toolbar.destroy();
    toolbar = new EditorToolbar(container.id, editor);
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

  it("shows the current mode and tool icons and labels", function () {
    toolbar = new EditorToolbar(container, editor);
    const modeButton = getMainButton("mode");
    const toolButton = getMainButton("tool");
    const initialModeIcon = modeButton.querySelector("path").getAttribute("d");
    expect(modeButton.title).toBe("Object Mode");
    expect(toolButton.title).toBe("Tools");
    expect(toolButton.querySelector("svg").getAttribute("viewBox")).toBe(
      "0 0 163 259",
    );

    changeMode(EditMode.EDGE);
    changeTool(translateTool);

    expect(modeButton.title).toBe("Edge");
    expect(modeButton.querySelector("path").getAttribute("d")).not.toBe(
      initialModeIcon,
    );
    expect(toolButton.title).toBe("Translate");
    expect(toolButton.querySelector("svg").getAttribute("viewBox")).toBe(
      "0 0 64 64",
    );
    expect(getDropdown("mode").children[2].getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(getDropdown("tool").children[2].getAttribute("aria-pressed")).toBe(
      "true",
    );
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
    changeTool(selectTool);
    toolbar = new EditorToolbar(container, editor, { tools: [entry] });

    const button = getMainButton("tool");
    expect(button.title).toBe(entry.label);
    expect(button.querySelector("path").getAttribute("d")).toBe(entry.iconPath);
    expect(button.querySelector("svg").getAttribute("viewBox")).toBe(
      "0 0 10 20",
    );
    expect(toolbar.viewModel.toolEntries[0]).toBe(entry);
  });

  it("defaults custom icon dimensions to 64", function () {
    toolbar = new EditorToolbar(container, editor, {
      modes: [
        {
          id: "custom",
          label: "Custom",
          mode: EditMode.NONE,
          iconPath: "M 0 0 Z",
        },
      ],
    });
    expect(
      getMainButton("mode").querySelector("svg").getAttribute("viewBox"),
    ).toBe("0 0 64 64");
  });

  it("rejects unknown entry IDs without icons and cleans up", function () {
    expect(
      () =>
        new EditorToolbar(container, editor, {
          modes: [{ id: "custom", label: "Custom", mode: EditMode.NONE }],
        }),
    ).toThrowDeveloperError();

    expect(container.children.length).toBe(0);
    expect(editor.modeChanged.numberOfListeners).toBe(0);
    expect(editor.activeToolChanged.numberOfListeners).toBe(0);
  });

  it("displays neutral labels when the editor state is not represented", function () {
    toolbar = new EditorToolbar(container, editor);

    changeMode(EditMode.VERTEX | EditMode.EDGE);
    changeTool({});

    expect(getMainButton("mode").title).toBe("Custom Mode");
    expect(getMainButton("tool").title).toBe("Custom Tool");
    expect(
      container.querySelectorAll(".cesium-editor-toolbar-active").length,
    ).toBe(0);
  });

  it("supports empty entry lists", function () {
    toolbar = new EditorToolbar(container, editor, { modes: [], tools: [] });

    expect(getDropdown("mode").children.length).toBe(0);
    expect(getDropdown("tool").children.length).toBe(0);
    expect(getMainButton("mode").title).toBe("Custom Mode");
    expect(getMainButton("tool").title).toBe("Custom Tool");
  });

  it("opens and closes the dropdowns", function () {
    toolbar = new EditorToolbar(container, editor);
    const modeButton = getMainButton("mode");
    const toolButton = getMainButton("tool");

    expect(getDropdown("mode").style.display).toBe("none");
    modeButton.click();
    expect(getDropdown("mode").style.display).not.toBe("none");
    expect(modeButton.getAttribute("aria-expanded")).toBe("true");
    expect(
      modeButton.classList.contains("cesium-editor-toolbar-selected"),
    ).toBe(true);

    toolButton.click();
    expect(getDropdown("mode").style.display).toBe("none");
    expect(getDropdown("tool").style.display).not.toBe("none");
    toolButton.click();
    expect(getDropdown("tool").style.display).toBe("none");
  });

  it("selects entries and closes their dropdowns", function () {
    toolbar = new EditorToolbar(container, editor);

    getMainButton("mode").click();
    getDropdown("mode").children[1].click();
    expect(editor.mode).toBe(EditMode.VERTEX);
    expect(getDropdown("mode").style.display).toBe("none");
    editor.modeChanged.raiseEvent(editor.mode, EditMode.NONE);

    getMainButton("tool").click();
    getDropdown("tool").children[2].click();
    expect(editor.activeTool).toBe(translateTool);
    expect(getDropdown("tool").style.display).toBe("none");
  });

  it("disables unsupported tool buttons", function () {
    toolbar = new EditorToolbar(container, editor);
    const buttons = getDropdown("tool").children;

    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(false);
    expect(buttons[2].disabled).toBe(true);
    buttons[2].click();
    expect(editor.activeTool).toBeUndefined();
  });

  it("updates tool availability after a mode change", function () {
    toolbar = new EditorToolbar(container, editor);
    const translateButton = getDropdown("tool").children[2];

    changeMode(EditMode.VERTEX);
    expect(translateButton.disabled).toBe(false);
    changeMode(EditMode.NONE);
    expect(translateButton.disabled).toBe(true);
  });

  ["pointerdown", "mousedown", "touchstart"].forEach(function (type) {
    it(`closes dropdowns on outside ${type} but not inside`, function () {
      toolbar = new EditorToolbar(container, editor);
      toolbar.viewModel.modeDropDownVisible = true;
      getMainButton("mode").dispatchEvent(
        new window.Event(type, { bubbles: true }),
      );
      expect(toolbar.viewModel.modeDropDownVisible).toBe(true);

      document.body.dispatchEvent(new window.Event(type, { bubbles: true }));
      expect(toolbar.viewModel.modeDropDownVisible).toBe(false);
      toolbar.viewModel.toolDropDownVisible = true;
      document.body.dispatchEvent(new window.Event(type, { bubbles: true }));
      expect(toolbar.viewModel.toolDropDownVisible).toBe(false);
    });
  });

  it("removes DOM, bindings, and listeners on destroy", function () {
    const sibling = document.createElement("span");
    container.appendChild(sibling);
    toolbar = new EditorToolbar(container, editor);
    const viewModel = toolbar.viewModel;
    const wrapper = container.querySelector(".cesium-editor-toolbar");
    const modeButton = getMainButton("mode");
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
    viewModel.modeDropDownVisible = true;
    document.body.dispatchEvent(
      new window.Event("pointerdown", { bubbles: true }),
    );
    expect(viewModel.modeDropDownVisible).toBe(true);
    changeMode(EditMode.FACE);
    expect(modeButton.title).toBe("Object Mode");
  });
});
