import { Cartesian3, Ellipsoid, Event } from "@cesium/core";
import {
  EditMode,
  EditorGrid,
  EditorOutliner,
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
      // Used by the outliner.
      root: { children: [] },
      meshGroupChanged: new Event(),
      meshActiveChanged: new Event(),
      meshes: [],
      hasMesh: () => false,
      isMeshActive: () => false,
      destroy: jasmine.createSpy("editor.destroy"),
      get mode() {
        return mode;
      },
      set mode(value) {
        const previous = mode;
        mode = value;
        if (activeTool && !activeTool.supportsMode(mode)) {
          this.activeTool = undefined;
        }
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
        canvas: document.createElement("canvas"),
        primitives: {
          contains: (primitive) => primitive === editor,
          add: jasmine
            .createSpy("primitives.add")
            .and.callFake((primitive) => primitive),
          remove: jasmine.createSpy("primitives.remove"),
        },
        ellipsoid: Ellipsoid.WGS84,
        screenSpaceCameraController: {
          enableInputs: true,
          enableCollisionDetection: true,
        },
      },
      addController: jasmine.createSpy("addController"),
      removeController: jasmine.createSpy("removeController"),
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

  it("exposes the provided editor and creates a toolbar with toolbar options", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });

    expect(viewer.editor).toBe(editor);
    expect(viewer.editorToolbar).toBeInstanceOf(EditorToolbar);
    expect(viewer.editorToolbar.viewModel.editor).toBe(editor);
    const toolbarContainer = viewer.editorToolbar.container;
    expect(toolbarContainer.parentNode).toBe(viewer.container);
    expect(toolbarContainer.className).toBe(
      "cesium-viewer-editorToolbarContainer",
    );
  });

  it("adds default tools to the editor and the toolbar", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });

    expect(SelectTool.addTo).toHaveBeenCalledOnceWith(editor);
    expect(TranslateTool.addTo).toHaveBeenCalledOnceWith(editor);
    expect(viewer.editorTools).toEqual({
      select: selectTool,
      translate: translateTool,
    });
    expect(Object.isFrozen(viewer.editorTools)).toBe(true);
    expect(
      viewer.editorToolbar.viewModel.toolEntries.map((entry) => entry.tool),
    ).toEqual([selectTool, translateTool]);
    expect(viewer.editorToolbar.viewModel.toolId).toBe("select");
  });

  it("exposes the default tools without a toolbar", function () {
    viewerEditorMixin(viewer, { editor });

    expect(viewer.editorTools.select).toBe(selectTool);
    expect(viewer.editorTools.translate).toBe(translateTool);
  });

  describe("default tool", function () {
    it("activates the select tool", function () {
      viewerEditorMixin(viewer, { editor });

      expect(editor.activeTool).toBe(selectTool);
    });

    it("keeps an already active tool", function () {
      const otherTool = createTool(() => true);
      editor.activeTool = otherTool;

      viewerEditorMixin(viewer, { editor, toolbar: {} });

      expect(editor.activeTool).toBe(otherTool);
    });

    it("reactivates the select tool when a mode change deactivates the active tool", function () {
      viewerEditorMixin(viewer, { editor, toolbar: {} });
      editor.mode = EditMode.VERTEX;
      editor.activeTool = translateTool;

      editor.mode = EditMode.NONE;

      expect(editor.activeTool).toBe(selectTool);
      expect(viewer.editorToolbar.viewModel.toolId).toBe("select");
    });

    it("keeps a tool that supports the new mode", function () {
      viewerEditorMixin(viewer, { editor });
      editor.mode = EditMode.VERTEX;
      editor.activeTool = translateTool;

      editor.mode = EditMode.FACE;

      expect(editor.activeTool).toBe(translateTool);
    });

    it("stops reactivating the select tool after the viewer is destroyed", function () {
      viewerEditorMixin(viewer, { editor });
      const listenerCount = editor.modeChanged.numberOfListeners;

      viewer.destroy();

      expect(editor.modeChanged.numberOfListeners).toBe(listenerCount - 1);
      editor.mode = EditMode.VERTEX;
      editor.activeTool = translateTool;
      editor.mode = EditMode.NONE;
      expect(editor.activeTool).toBeUndefined();
    });
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

    viewer.editorTools = {};
    expect(() => viewerEditorMixin(viewer, { editor })).toThrowDeveloperError();
    delete viewer.editorTools;

    viewer.editorToolbar = {};
    expect(() => viewerEditorMixin(viewer, { editor })).toThrowDeveloperError();
    delete viewer.editorToolbar;

    viewer.editorOutliner = {};
    expect(() => viewerEditorMixin(viewer, { editor })).toThrowDeveloperError();
    delete viewer.editorOutliner;

    viewer.editorGrid = {};
    expect(() => viewerEditorMixin(viewer, { editor })).toThrowDeveloperError();
    expect(viewer.container.children.length).toBe(0);
  });

  describe("grid", function () {
    const origin = Cartesian3.fromDegrees(-123.0, 44.0, 100.0);

    it("is not created by default", function () {
      viewerEditorMixin(viewer, { editor });

      expect(viewer.editorGrid).toBeUndefined();
      expect(viewer.scene.primitives.add).not.toHaveBeenCalled();
    });

    it("is added to the scene with grid options", function () {
      viewerEditorMixin(viewer, { editor, grid: { origin, spacing: 0.5 } });

      const grid = viewer.editorGrid;
      expect(grid).toBeInstanceOf(EditorGrid);
      expect(viewer.scene.primitives.add).toHaveBeenCalledOnceWith(grid);
      expect(grid.origin).toEqual(origin);
      expect(grid.spacing).toBe(0.5);
      expect(grid.ellipsoid).toBe(Ellipsoid.WGS84);
    });

    it("uses an ellipsoid from its options", function () {
      viewerEditorMixin(viewer, {
        editor,
        grid: { origin, ellipsoid: Ellipsoid.UNIT_SPHERE },
      });

      expect(viewer.editorGrid.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
    });

    it("requires an origin", function () {
      expect(() =>
        viewerEditorMixin(viewer, { editor, toolbar: {}, grid: {} }),
      ).toThrowDeveloperError();

      expect(viewer.scene.primitives.add).not.toHaveBeenCalled();
      expect(viewer.container.children.length).toBe(0);
    });

    it("is removed with the viewer", function () {
      viewerEditorMixin(viewer, { editor, grid: { origin } });
      const grid = viewer.editorGrid;

      viewer.destroy();

      expect(viewer.scene.primitives.remove).toHaveBeenCalledOnceWith(grid);
    });

    it("isn't added if the mixin fails", function () {
      expect(() =>
        viewerEditorMixin(viewer, {
          editor,
          toolbar: {},
          grid: { origin },
          keyBindings: { modes: { x: "missing" } },
        }),
      ).toThrowDeveloperError();

      expect(viewer.scene.primitives.add).not.toHaveBeenCalled();
    });
  });

  describe("outliner", function () {
    it("is not created by default", function () {
      viewerEditorMixin(viewer, { editor, toolbar: {} });

      expect(viewer.editorOutliner).toBeUndefined();
      expect(viewer.container.children.length).toBe(1);
    });

    it("is created in its own container with outliner", function () {
      viewerEditorMixin(viewer, { editor, outliner: true });

      const outliner = viewer.editorOutliner;
      expect(outliner).toBeInstanceOf(EditorOutliner);
      expect(outliner.viewModel.editor).toBe(editor);
      expect(outliner.container.parentNode).toBe(viewer.container);
      expect(outliner.container.className).toBe(
        "cesium-viewer-editorOutlinerContainer",
      );
    });

    it("can be created without the toolbar", function () {
      viewerEditorMixin(viewer, { editor, outliner: true });

      expect(viewer.editorToolbar).toBeUndefined();
      expect(viewer.editorOutliner).toBeInstanceOf(EditorOutliner);
      expect(viewer.container.children.length).toBe(1);
    });

    it("shows the editor's hierarchy", function () {
      viewerEditorMixin(viewer, { editor, outliner: true });

      expect(viewer.editorOutliner.viewModel.editor).toBe(editor);
    });

    it("is destroyed with the viewer", function () {
      viewerEditorMixin(viewer, { editor, outliner: true });
      const outliner = viewer.editorOutliner;
      const outlinerContainer = outliner.container;
      spyOn(outliner, "destroy").and.callThrough();

      viewer.destroy();

      expect(outliner.destroy).toHaveBeenCalled();
      expect(outlinerContainer.parentNode).toBeNull();
    });

    it("is removed if the mixin fails", function () {
      expect(() =>
        viewerEditorMixin(viewer, {
          editor,
          toolbar: {},
          outliner: true,
          keyBindings: { modes: { x: "missing" } },
        }),
      ).toThrowDeveloperError();

      expect(viewer.container.children.length).toBe(0);
    });
  });

  it("forwards toolbar options", function () {
    const tools = [{ id: "select", label: "Select", tool: selectTool }];
    viewerEditorMixin(viewer, { editor, toolbar: { tools } });

    expect(viewer.editorToolbar.viewModel.toolEntries).toBe(tools);
    expect(viewer.editorTools.select).toBe(selectTool);

    // Default shortcuts for omitted entries are skipped.
    press("1");
    expect(editor.mode).toBe(EditMode.VERTEX);
    expect(press("g").defaultPrevented).toBe(false);
    expect(editor.activeTool).toBe(selectTool);
  });

  it("does not create a toolbar without toolbar options", function () {
    viewerEditorMixin(viewer, { editor });

    expect(viewer.editor).toBe(editor);
    expect(viewer.editorToolbar).toBeUndefined();
    expect(viewer.container.children.length).toBe(0);
  });

  it("maps 0 to Object and 1, 2, and 3 to component modes", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });

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
    viewerEditorMixin(viewer, { editor, toolbar: {} });
    editor.mode = EditMode.VERTEX;

    expect(press("g").defaultPrevented).toBe(true);
    expect(editor.activeTool).toBe(translateTool);
    press("s");
    expect(editor.activeTool).toBe(selectTool);
  });

  it("does not activate an unsupported tool with a shortcut", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });

    const event = press("g");
    expect(event.defaultPrevented).toBe(false);
    expect(editor.activeTool).toBe(selectTool);
  });

  it("cancels the active tool with Escape without changing mode", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });
    editor.mode = EditMode.FACE;
    editor.activeTool = translateTool;

    expect(press("Escape").defaultPrevented).toBe(true);
    expect(translateTool.cancel).toHaveBeenCalledTimes(1);
    expect(editor.mode).toBe(EditMode.FACE);
    expect(editor.activeTool).toBe(translateTool);
  });

  it("ignores Escape when there is no active tool", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });
    editor.activeTool = undefined;

    expect(press("Escape").defaultPrevented).toBe(false);
    expect(selectTool.cancel).not.toHaveBeenCalled();
    expect(translateTool.cancel).not.toHaveBeenCalled();
  });

  it("supports custom entry shortcuts", function () {
    viewerEditorMixin(viewer, {
      editor,
      toolbar: {},
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
        toolbar: {},
        keyBindings: { tools: { r: "rotate" } },
      }),
    ).toThrowDeveloperError();
    expect(viewer.container.children.length).toBe(0);
    expect(viewer.hasOwnProperty("editor")).toBe(false);
  });

  it("can disable keyboard handling", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {}, keyBindings: false });
    editor.activeTool = selectTool;

    press("2");
    press("Escape");
    expect(editor.mode).toBe(EditMode.NONE);
    expect(selectTool.cancel).not.toHaveBeenCalled();
  });

  it("does not install shortcuts without a toolbar", function () {
    viewerEditorMixin(viewer, { editor });
    editor.activeTool = selectTool;

    press("2");
    expect(editor.mode).toBe(EditMode.NONE);
    press("Escape");
    expect(selectTool.cancel).toHaveBeenCalledTimes(1);
  });

  it("ignores handled events, modified shortcuts, and text input", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });

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
    viewerEditorMixin(viewer, { editor, toolbar: {} });

    expect(press("Tab").defaultPrevented).toBe(false);
    expect(editor.mode).toBe(EditMode.NONE);
  });

  it("focuses the owning window on pointerdown", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });
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
    viewerEditorMixin(viewer, { editor, toolbar: {} });

    const types = addEventListener.calls.allArgs().map((args) => args[0]);
    expect(types).toEqual(["pointerdown"]);
  });

  it("destroys the toolbar and removes listeners with the viewer", function () {
    viewerEditorMixin(viewer, { editor, toolbar: {} });
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
    viewerEditorMixin(viewer, { editor, toolbar: {} });

    viewer.destroy();

    expect(editor.destroy).not.toHaveBeenCalled();
  });

  describe("camera controls", function () {
    it("replace the camera controller's inputs", function () {
      viewerEditorMixin(viewer, { editor, toolbar: {} });

      expect(viewer.addController).toHaveBeenCalledTimes(3);
      expect(viewer.scene.screenSpaceCameraController.enableInputs).toBe(false);
    });

    it("are removed with the viewer", function () {
      viewerEditorMixin(viewer, { editor, toolbar: {} });
      const added = viewer.addController.calls.allArgs().map((args) => args[0]);

      viewer.destroy();

      expect(
        viewer.removeController.calls.allArgs().map((args) => args[0]),
      ).toEqual(added);
      expect(viewer.scene.screenSpaceCameraController.enableInputs).toBe(true);
    });

    it("aren't added if the mixin fails", function () {
      expect(() =>
        viewerEditorMixin(viewer, {
          editor,
          toolbar: {},
          keyBindings: { modes: { x: "missing" } },
        }),
      ).toThrowDeveloperError();

      expect(viewer.addController).not.toHaveBeenCalled();
      expect(viewer.scene.screenSpaceCameraController.enableInputs).toBe(true);
    });
  });
});
