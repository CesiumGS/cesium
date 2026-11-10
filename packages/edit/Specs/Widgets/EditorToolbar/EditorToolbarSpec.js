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
    editor = {
      mode: EditMode.NONE,
      activeTool: selectTool,
      modeChanged: new Event(),
      activeToolChanged: new Event(),
    };
    translateTool = { supportsMode: (mode) => mode !== EditMode.NONE };
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
    toolbar = new EditorToolbar(container, editor, { tools });
    expect(toolbar.container).toBe(container);
    expect(container.querySelectorAll(".cesium-editor-toolbar").length).toBe(1);
    expect(getDropdown("mode").children.length).toBe(4);
    expect(getDropdown("tool").children.length).toBe(2);

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

  it("shows the current mode and tool icons and labels", function () {
    toolbar = new EditorToolbar(container, editor, { tools });
    const modeButton = getMainButton("mode");
    const toolButton = getMainButton("tool");
    const initialModeIcon = modeButton.querySelector("path").getAttribute("d");
    const initialToolIcon = toolButton.querySelector("path").getAttribute("d");
    expect(modeButton.title).toBe("Object Mode");
    expect(toolButton.title).toBe("Select");

    changeMode(EditMode.EDGE);
    changeTool(translateTool);

    expect(modeButton.title).toBe("Edge");
    expect(modeButton.querySelector("path").getAttribute("d")).not.toBe(
      initialModeIcon,
    );
    expect(toolButton.title).toBe("Translate");
    expect(toolButton.querySelector("path").getAttribute("d")).not.toBe(
      initialToolIcon,
    );
    expect(getDropdown("mode").children[2].getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(getDropdown("tool").children[1].getAttribute("aria-pressed")).toBe(
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

  it("displays a neutral mode label when the mode is not represented", function () {
    toolbar = new EditorToolbar(container, editor, { tools });

    changeMode(EditMode.VERTEX | EditMode.EDGE);

    expect(getMainButton("mode").title).toBe("Custom Mode");
    expect(
      getDropdown("mode").querySelectorAll(".cesium-editor-toolbar-active")
        .length,
    ).toBe(0);
  });

  it("hides the tool dropdown while the active tool isn't an entry", function () {
    editor.activeTool = undefined;
    toolbar = new EditorToolbar(container, editor, { tools });
    expect(getMainButton("tool")).toBeNull();

    changeTool(selectTool);
    expect(getMainButton("tool").title).toBe("Select");
    getMainButton("tool").click();
    expect(toolbar.viewModel.toolDropDownVisible).toBe(true);

    changeTool({});
    expect(getMainButton("tool")).toBeNull();
    expect(toolbar.viewModel.toolDropDownVisible).toBe(false);

    changeTool(undefined);
    expect(getMainButton("tool")).toBeNull();

    changeTool(translateTool);
    expect(getMainButton("tool").title).toBe("Translate");
    expect(getDropdown("tool").style.display).toBe("none");
  });

  it("omits dropdowns without entries", function () {
    toolbar = new EditorToolbar(container, editor, { modes: [], tools: [] });

    expect(container.querySelector(".cesium-editor-toolbar")).not.toBeNull();
    expect(getMainButton("mode")).toBeNull();
    expect(getMainButton("tool")).toBeNull();
  });

  it("omits the tool dropdown by default", function () {
    toolbar = new EditorToolbar(container, editor);

    expect(getDropdown("mode").children.length).toBe(4);
    expect(getMainButton("tool")).toBeNull();
  });

  it("opens and closes the dropdowns", function () {
    toolbar = new EditorToolbar(container, editor, { tools });
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
    toolbar = new EditorToolbar(container, editor, { tools });

    getMainButton("mode").click();
    getDropdown("mode").children[1].click();
    expect(editor.mode).toBe(EditMode.VERTEX);
    expect(getDropdown("mode").style.display).toBe("none");
    editor.modeChanged.raiseEvent(editor.mode, EditMode.NONE);

    getMainButton("tool").click();
    getDropdown("tool").children[1].click();
    expect(editor.activeTool).toBe(translateTool);
    expect(getDropdown("tool").style.display).toBe("none");
  });

  it("disables unsupported tool buttons", function () {
    toolbar = new EditorToolbar(container, editor, { tools });
    const buttons = getDropdown("tool").children;

    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
    buttons[1].click();
    expect(editor.activeTool).toBe(selectTool);
  });

  it("updates tool availability after a mode change", function () {
    toolbar = new EditorToolbar(container, editor, { tools });
    const translateButton = getDropdown("tool").children[1];

    changeMode(EditMode.VERTEX);
    expect(translateButton.disabled).toBe(false);
    changeMode(EditMode.NONE);
    expect(translateButton.disabled).toBe(true);
  });

  ["pointerdown", "mousedown", "touchstart"].forEach(function (type) {
    it(`closes dropdowns on outside ${type} but not inside`, function () {
      toolbar = new EditorToolbar(container, editor, { tools });
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
    toolbar = new EditorToolbar(container, editor, { tools });
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
