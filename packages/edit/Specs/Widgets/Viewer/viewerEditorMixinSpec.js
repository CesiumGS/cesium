import { Event } from "@cesium/core";
import {
  EditMode,
  EditorToolbar,
  SelectTool,
  TranslateTool,
  viewerEditorMixin,
} from "../../../index.js";

describe("Widgets/Viewer/viewerEditorMixin", function () {
  let viewer;
  let viewerDestroy;
  let editor;
  let selectTool;
  let translateTool;
  let input;

  function createEditor() {
    let mode = EditMode.NONE;
    let activeTool;
    return {
      modeChanged: new Event(),
      activeToolChanged: new Event(),
      destroy: jasmine.createSpy("editor.destroy"),
      get mode() {
        return mode;
      },
      set mode(value) {
        const previous = mode;
        mode = value;
        this.modeChanged.raiseEvent(value, previous);
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
  }

  function createTool(supportsMode) {
    return {
      supportsMode,
      cancel: jasmine.createSpy("cancel"),
    };
  }

  beforeEach(function () {
    editor = createEditor();
    selectTool = createTool(() => true);
    translateTool = createTool((mode) => mode !== EditMode.NONE);
    spyOn(SelectTool, "addTo").and.returnValue(selectTool);
    spyOn(TranslateTool, "addTo").and.returnValue(translateTool);

    const container = document.createElement("div");
    document.body.appendChild(container);
    viewerDestroy = jasmine.createSpy("viewer.destroy");
    viewer = {
      container,
      scene: {
        primitives: {
          contains: (primitive) => primitive === editor,
        },
      },
      destroy: viewerDestroy,
    };
  });

  afterEach(function () {
    if (!viewerDestroy.calls.any()) {
      viewer.destroy();
    }
    viewer.container.remove();
    input?.remove();
    input = undefined;
  });

  function press(key, options, target) {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    (target ?? document).dispatchEvent(event);
    return event;
  }

  it("exposes the provided editor and creates a toolbar by default", function () {
    viewerEditorMixin(viewer, { editor });

    expect(viewer.editor).toBe(editor);
    expect(viewer.editorToolbar).toBeInstanceOf(EditorToolbar);
    expect(viewer.editorToolbar.viewModel.editor).toBe(editor);
    const toolbarContainer = viewer.editorToolbar.container;
    expect(toolbarContainer.parentNode).toBe(viewer.container);
    expect(toolbarContainer.className).toBe(
      "cesium-viewer-editorToolbarContainer",
    );
  });

  it("requires a viewer and an editor in its scene", function () {
    expect(() =>
      viewerEditorMixin(undefined, { editor }),
    ).toThrowDeveloperError();
    expect(() => viewerEditorMixin(viewer)).toThrowDeveloperError();
    expect(() => viewerEditorMixin(viewer, {})).toThrowDeveloperError();
    expect(() =>
      viewerEditorMixin(viewer, { editor: createEditor() }),
    ).toThrowDeveloperError();
    expect(viewer.container.children.length).toBe(0);
  });

  it("rejects properties already defined by another mixin", function () {
    viewer.editor = {};
    expect(() => viewerEditorMixin(viewer, { editor })).toThrowDeveloperError();
    delete viewer.editor;

    viewer.editorToolbar = {};
    expect(() => viewerEditorMixin(viewer, { editor })).toThrowDeveloperError();
    expect(viewer.container.children.length).toBe(0);
  });

  it("forwards toolbar options", function () {
    const modes = [{ id: "vertex", label: "Vertex", mode: EditMode.VERTEX }];
    const tools = [{ id: "select", label: "Select", tool: selectTool }];
    viewerEditorMixin(viewer, { editor, toolbarOptions: { modes, tools } });

    expect(viewer.editorToolbar.viewModel.modeEntries).toBe(modes);
    expect(viewer.editorToolbar.viewModel.toolEntries).toBe(tools);

    // Default shortcuts for omitted entries are skipped.
    press("1");
    expect(editor.mode).toBe(EditMode.VERTEX);
    press("0");
    expect(editor.mode).toBe(EditMode.VERTEX);
  });

  it("can omit the toolbar", function () {
    viewerEditorMixin(viewer, { editor, toolbar: false });

    expect(viewer.editor).toBe(editor);
    expect(viewer.editorToolbar).toBeUndefined();
    expect(viewer.container.children.length).toBe(0);
  });

  it("maps 0 to Object and 1, 2, and 3 to component modes", function () {
    viewerEditorMixin(viewer, { editor });

    expect(press("2").defaultPrevented).toBe(true);
    expect(editor.mode).toBe(EditMode.EDGE);
    press("3");
    expect(editor.mode).toBe(EditMode.FACE);
    press("1");
    expect(editor.mode).toBe(EditMode.VERTEX);
    press("0");
    expect(editor.mode).toBe(EditMode.NONE);
  });

  it("selects tools with s and g", function () {
    viewerEditorMixin(viewer, { editor });
    editor.mode = EditMode.VERTEX;

    expect(press("g").defaultPrevented).toBe(true);
    expect(editor.activeTool).toBe(translateTool);
    press("s");
    expect(editor.activeTool).toBe(selectTool);
  });

  it("does not activate an unsupported tool with a shortcut", function () {
    viewerEditorMixin(viewer, { editor });

    const event = press("g");
    expect(event.defaultPrevented).toBe(false);
    expect(editor.activeTool).toBeUndefined();
  });

  it("cancels the active tool with Escape without changing mode", function () {
    viewerEditorMixin(viewer, { editor });
    editor.mode = EditMode.FACE;
    editor.activeTool = translateTool;

    expect(press("Escape").defaultPrevented).toBe(true);
    expect(translateTool.cancel).toHaveBeenCalledTimes(1);
    expect(editor.mode).toBe(EditMode.FACE);
    expect(editor.activeTool).toBe(translateTool);
  });

  it("ignores Escape when there is no active tool", function () {
    viewerEditorMixin(viewer, { editor });

    expect(press("Escape").defaultPrevented).toBe(false);
    expect(selectTool.cancel).not.toHaveBeenCalled();
    expect(translateTool.cancel).not.toHaveBeenCalled();
  });

  it("supports custom entry shortcuts", function () {
    viewerEditorMixin(viewer, {
      editor,
      keyBindings: { modes: { f: "face" }, tools: { t: "translate" } },
    });

    press("f");
    expect(editor.mode).toBe(EditMode.FACE);
    press("t");
    expect(editor.activeTool).toBe(translateTool);

    press("1");
    press("s");
    expect(editor.mode).toBe(EditMode.FACE);
    expect(editor.activeTool).toBe(translateTool);
  });

  it("rejects shortcuts for unknown entries", function () {
    expect(() =>
      viewerEditorMixin(viewer, {
        editor,
        keyBindings: { tools: { r: "rotate" } },
      }),
    ).toThrowDeveloperError();
    expect(viewer.container.children.length).toBe(0);
    expect(viewer.hasOwnProperty("editor")).toBe(false);
  });

  it("can disable keyboard handling", function () {
    viewerEditorMixin(viewer, { editor, keyBindings: false });
    editor.activeTool = selectTool;

    press("2");
    press("Escape");
    expect(editor.mode).toBe(EditMode.NONE);
    expect(selectTool.cancel).not.toHaveBeenCalled();
  });

  it("does not install shortcuts without a toolbar", function () {
    viewerEditorMixin(viewer, { editor, toolbar: false });
    editor.activeTool = selectTool;

    press("2");
    expect(editor.mode).toBe(EditMode.NONE);
    press("Escape");
    expect(selectTool.cancel).toHaveBeenCalledTimes(1);
  });

  it("ignores handled events, modified shortcuts, and text input", function () {
    viewerEditorMixin(viewer, { editor });

    const handled = new KeyboardEvent("keydown", {
      key: "2",
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    document.dispatchEvent(handled);
    press("2", { ctrlKey: true });
    press("2", { metaKey: true });
    press("2", { altKey: true });

    input = document.createElement("input");
    document.body.appendChild(input);
    press("2", undefined, input);

    expect(editor.mode).toBe(EditMode.NONE);
  });

  it("leaves Tab available for focus navigation", function () {
    viewerEditorMixin(viewer, { editor });

    expect(press("Tab").defaultPrevented).toBe(false);
    expect(editor.mode).toBe(EditMode.NONE);
  });

  it("focuses the owning window on pointerdown", function () {
    viewerEditorMixin(viewer, { editor });
    spyOn(window, "focus");

    viewer.container.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    expect(window.focus).toHaveBeenCalled();
  });

  it("does not register or select meshes with a separate click handler", function () {
    const addEventListener = spyOn(
      viewer.container,
      "addEventListener",
    ).and.callThrough();
    viewerEditorMixin(viewer, { editor });

    const types = addEventListener.calls.allArgs().map((args) => args[0]);
    expect(types).toEqual(["pointerdown"]);
  });

  it("destroys the toolbar and removes listeners with the viewer", function () {
    viewerEditorMixin(viewer, { editor });
    const toolbar = viewer.editorToolbar;
    const toolbarContainer = toolbar.container;
    spyOn(toolbar, "destroy").and.callThrough();
    spyOn(window, "focus");

    viewer.destroy();

    expect(toolbar.destroy).toHaveBeenCalled();
    expect(toolbarContainer.parentNode).toBeNull();
    expect(viewerDestroy).toHaveBeenCalledTimes(1);
    press("2");
    expect(editor.mode).toBe(EditMode.NONE);
    viewer.container.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    expect(window.focus).not.toHaveBeenCalled();
  });

  it("leaves editor destruction to the scene", function () {
    viewerEditorMixin(viewer, { editor });

    viewer.destroy();

    expect(editor.destroy).not.toHaveBeenCalled();
  });
});
