import { Event } from "@cesium/core";
import { knockout } from "@cesium/widgets";
import {
  EditMode,
  EditorToolbarViewModel,
  SelectTool,
  TranslateTool,
} from "../../../index.js";

describe("Widgets/EditorToolbar/EditorToolbarViewModel", function () {
  let editor;
  let viewModel;
  let selectTool;
  let translateTool;

  beforeEach(function () {
    let mode = EditMode.NONE;
    let activeTool;
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
    selectTool = { supportsMode: jasmine.createSpy().and.returnValue(true) };
    translateTool = {
      supportsMode: jasmine
        .createSpy()
        .and.callFake((mode) => mode !== EditMode.NONE),
    };
    spyOn(SelectTool, "addTo").and.returnValue(selectTool);
    spyOn(TranslateTool, "addTo").and.returnValue(translateTool);
  });

  function createViewModel() {
    return new EditorToolbarViewModel(editor, {
      tools: [
        { id: "select", label: "Select", tool: selectTool },
        { id: "translate", label: "Translate", tool: translateTool },
      ],
    });
  }

  afterEach(function () {
    viewModel?.destroy();
    viewModel = undefined;
  });

  it("requires an editor", function () {
    expect(() => new EditorToolbarViewModel()).toThrowDeveloperError();
  });

  it("creates the default mode entries", function () {
    viewModel = new EditorToolbarViewModel(editor);

    expect(viewModel.editor).toBe(editor);
    expect(viewModel.modeEntries).toEqual([
      { id: "none", label: "Object Mode", mode: EditMode.NONE },
      { id: "vertex", label: "Vertex", mode: EditMode.VERTEX },
      { id: "edge", label: "Edge", mode: EditMode.EDGE },
      { id: "face", label: "Face", mode: EditMode.FACE },
    ]);
    expect(viewModel.componentEntries).toEqual(viewModel.modeEntries.slice(1));
    expect(viewModel.modeId).toBe("none");
    expect(viewModel.editing).toBe(false);
    expect(viewModel.toolId).toBeUndefined();
    expect(viewModel.toolDropDownVisible).toBe(false);
  });

  it("doesn't add tools to the editor by default", function () {
    viewModel = new EditorToolbarViewModel(editor);

    expect(viewModel.toolEntries).toEqual([]);
    expect(SelectTool.addTo).not.toHaveBeenCalled();
    expect(TranslateTool.addTo).not.toHaveBeenCalled();
  });

  it("uses custom tool entries without registering default tools", function () {
    const tools = [{ id: "custom", label: "Custom", tool: selectTool }];
    viewModel = new EditorToolbarViewModel(editor, { tools });

    expect(viewModel.toolEntries).toBe(tools);
    expect(SelectTool.addTo).not.toHaveBeenCalled();
    expect(TranslateTool.addTo).not.toHaveBeenCalled();
  });

  it("reflects the editor's initial mode and tool", function () {
    editor.mode = EditMode.EDGE;
    editor.activeTool = translateTool;
    viewModel = createViewModel();

    expect(viewModel.modeId).toBe("edge");
    expect(viewModel.editing).toBe(true);
    expect(viewModel.toolId).toBe("translate");
  });

  it("reflects external mode and tool changes observably", function () {
    viewModel = createViewModel();
    const modeListener = jasmine.createSpy();
    const toolListener = jasmine.createSpy();
    const modeSubscription = knockout
      .getObservable(viewModel, "modeId")
      .subscribe(modeListener);
    const toolSubscription = knockout
      .getObservable(viewModel, "toolId")
      .subscribe(toolListener);

    editor.mode = EditMode.FACE;
    editor.activeTool = selectTool;

    expect(viewModel.modeId).toBe("face");
    expect(viewModel.toolId).toBe("select");
    expect(modeListener).toHaveBeenCalledWith("face");
    expect(toolListener).toHaveBeenCalledWith("select");
    modeSubscription.dispose();
    toolSubscription.dispose();
  });

  it("reflects a mode change that clears the active tool", function () {
    editor.mode = EditMode.VERTEX;
    editor.activeTool = translateTool;
    viewModel = createViewModel();

    editor.mode = EditMode.NONE;

    expect(viewModel.modeId).toBe("none");
    expect(viewModel.toolId).toBeUndefined();
  });

  it("leaves the selected ID undefined when no entry matches", function () {
    viewModel = createViewModel();

    editor.mode = EditMode.VERTEX | EditMode.EDGE;
    editor.activeTool = {};

    expect(viewModel.modeId).toBeUndefined();
    expect(viewModel.editing).toBe(true);
    expect(viewModel.toolId).toBeUndefined();
  });

  describe("edit mode", function () {
    it("enters vertex mode initially", function () {
      viewModel = createViewModel();

      viewModel.enterEditMode();

      expect(editor.mode).toBe(EditMode.VERTEX);
      expect(viewModel.editing).toBe(true);
    });

    it("restores the last component mode", function () {
      viewModel = createViewModel();
      editor.mode = EditMode.FACE;
      viewModel.exitEditMode();
      expect(editor.mode).toBe(EditMode.NONE);
      expect(viewModel.editing).toBe(false);

      viewModel.enterEditMode();

      expect(editor.mode).toBe(EditMode.FACE);
    });

    it("restores a component mode the editor started in", function () {
      editor.mode = EditMode.EDGE;
      viewModel = createViewModel();
      viewModel.exitEditMode();

      viewModel.enterEditMode();

      expect(editor.mode).toBe(EditMode.EDGE);
    });

    it("restores a combined component mode", function () {
      viewModel = createViewModel();
      editor.mode = EditMode.VERTEX | EditMode.FACE;
      editor.mode = EditMode.NONE;

      viewModel.enterEditMode();

      expect(editor.mode).toBe(EditMode.VERTEX | EditMode.FACE);
    });

    it("leaves a component mode unchanged when entering edit mode", function () {
      viewModel = createViewModel();
      editor.mode = EditMode.EDGE;
      const modeListener = jasmine.createSpy();
      editor.modeChanged.addEventListener(modeListener);

      viewModel.enterEditMode();

      expect(editor.mode).toBe(EditMode.EDGE);
      expect(modeListener).not.toHaveBeenCalled();
    });

    it("adds and removes components", function () {
      viewModel = createViewModel();
      editor.mode = EditMode.VERTEX;
      const [vertex, edge, face] = viewModel.componentEntries;

      viewModel.toggleComponentEntry(face);
      expect(editor.mode).toBe(EditMode.VERTEX | EditMode.FACE);
      expect(viewModel.modeId).toBeUndefined();
      viewModel.toggleComponentEntry(edge);
      expect(editor.mode).toBe(EditMode.VERTEX | EditMode.EDGE | EditMode.FACE);
      viewModel.toggleComponentEntry(vertex);
      expect(editor.mode).toBe(EditMode.EDGE | EditMode.FACE);
    });

    it("keeps the last component", function () {
      viewModel = createViewModel();
      editor.mode = EditMode.EDGE;
      const modeListener = jasmine.createSpy();
      editor.modeChanged.addEventListener(modeListener);

      viewModel.toggleComponentEntry(viewModel.componentEntries[1]);

      expect(editor.mode).toBe(EditMode.EDGE);
      expect(modeListener).not.toHaveBeenCalled();
    });

    it("reports active components observably", function () {
      viewModel = createViewModel();
      const [vertex, edge, face] = viewModel.componentEntries;
      const active = knockout.pureComputed(() =>
        viewModel.componentEntries.map((entry) =>
          viewModel.isComponentActive(entry),
        ),
      );
      const listener = jasmine.createSpy();
      const subscription = active.subscribe(listener);

      expect(active()).toEqual([false, false, false]);
      editor.mode = EditMode.VERTEX | EditMode.FACE;
      expect(listener).toHaveBeenCalledWith([true, false, true]);
      expect(viewModel.isComponentActive(vertex)).toBe(true);
      expect(viewModel.isComponentActive(edge)).toBe(false);
      expect(viewModel.isComponentActive(face)).toBe(true);
      subscription.dispose();
      active.dispose();
    });

    it("toggles edit mode", function () {
      viewModel = createViewModel();

      viewModel.toggleEditMode();
      expect(editor.mode).toBe(EditMode.VERTEX);
      editor.mode = EditMode.EDGE;
      viewModel.toggleEditMode();
      expect(editor.mode).toBe(EditMode.NONE);
      viewModel.toggleEditMode();
      expect(editor.mode).toBe(EditMode.EDGE);
    });

    it("updates editing observably", function () {
      viewModel = createViewModel();
      const listener = jasmine.createSpy();
      const subscription = knockout
        .getObservable(viewModel, "editing")
        .subscribe(listener);

      editor.mode = EditMode.EDGE;
      expect(listener).toHaveBeenCalledWith(true);
      editor.mode = EditMode.NONE;
      expect(listener).toHaveBeenCalledWith(false);
      subscription.dispose();
    });
  });

  it("changes modes and tools through its commands", function () {
    viewModel = createViewModel();

    viewModel.selectModeEntry(viewModel.modeEntries[1]);
    viewModel.selectToolEntry(viewModel.toolEntries[1]);

    expect(editor.mode).toBe(EditMode.VERTEX);
    expect(editor.activeTool).toBe(translateTool);
    expect(viewModel.modeId).toBe("vertex");
    expect(viewModel.toolId).toBe("translate");
  });

  it("disables unsupported tools using supportsMode", function () {
    viewModel = createViewModel();

    expect(viewModel.isToolEnabled(viewModel.toolEntries[0])).toBe(true);
    expect(viewModel.isToolEnabled(viewModel.toolEntries[1])).toBe(false);
    expect(translateTool.supportsMode).toHaveBeenCalledWith(EditMode.NONE);

    editor.mode = EditMode.EDGE;

    expect(viewModel.isToolEnabled(viewModel.toolEntries[1])).toBe(true);
    expect(translateTool.supportsMode).toHaveBeenCalledWith(EditMode.EDGE);
  });

  it("updates observable availability even when no mode entry matches", function () {
    viewModel = createViewModel();
    const availability = knockout.pureComputed(() =>
      viewModel.isToolEnabled(viewModel.toolEntries[1]),
    );
    const listener = jasmine.createSpy();
    const subscription = availability.subscribe(listener);

    expect(availability()).toBe(false);
    editor.mode = EditMode.EDGE | EditMode.FACE;

    expect(viewModel.modeId).toBeUndefined();
    expect(availability()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
    subscription.dispose();
    availability.dispose();
  });

  it("rejects an unsupported tool without changing state", function () {
    editor.activeTool = selectTool;
    viewModel = createViewModel();
    viewModel.toolDropDownVisible = true;

    expect(() =>
      viewModel.selectToolEntry(viewModel.toolEntries[1]),
    ).toThrowDeveloperError();

    expect(editor.activeTool).toBe(selectTool);
    expect(viewModel.toolId).toBe("select");
    expect(viewModel.toolDropDownVisible).toBe(true);
  });

  it("closes the tool dropdown when the active tool isn't an entry", function () {
    editor.activeTool = selectTool;
    viewModel = createViewModel();
    viewModel.toolDropDownVisible = true;

    editor.activeTool = undefined;

    expect(viewModel.toolId).toBeUndefined();
    expect(viewModel.toolDropDownVisible).toBe(false);
  });

  describe("tooltips", function () {
    it("are the labels without shortcuts", function () {
      viewModel = createViewModel();

      expect(viewModel.modeShortcuts).toEqual({});
      expect(viewModel.toolShortcuts).toEqual({});
      expect(viewModel.getModeTooltip(viewModel.componentEntries[0])).toBe(
        "Vertex",
      );
      expect(viewModel.getToolTooltip(viewModel.toolEntries[0])).toBe("Select");
      expect(viewModel.getModeToggleTooltip()).toBe("Switch to Edit Mode");
      editor.mode = EditMode.EDGE;
      expect(viewModel.getModeToggleTooltip()).toBe("Switch to Object Mode");
    });

    it("show shortcuts, with single characters in upper case", function () {
      viewModel = createViewModel();
      viewModel.modeShortcuts = { none: ["0"], vertex: ["1", "v"] };
      viewModel.toolShortcuts = { select: ["s"], translate: ["ArrowUp"] };

      expect(viewModel.getModeTooltip(viewModel.componentEntries[0])).toBe(
        "Vertex (1, V)",
      );
      expect(viewModel.getModeTooltip(viewModel.componentEntries[1])).toBe(
        "Edge",
      );
      expect(viewModel.getToolTooltip(viewModel.toolEntries[0])).toBe(
        "Select (S)",
      );
      expect(viewModel.getToolTooltip(viewModel.toolEntries[1])).toBe(
        "Translate (ArrowUp)",
      );
      // Edit Mode has no shortcut of its own.
      expect(viewModel.getModeToggleTooltip()).toBe("Switch to Edit Mode");
      editor.mode = EditMode.FACE;
      expect(viewModel.getModeToggleTooltip()).toBe(
        "Switch to Object Mode (0)",
      );
    });

    it("update observably when shortcuts change", function () {
      viewModel = createViewModel();
      const tooltip = knockout.pureComputed(() =>
        viewModel.getToolTooltip(viewModel.toolEntries[0]),
      );
      const listener = jasmine.createSpy();
      const subscription = tooltip.subscribe(listener);

      viewModel.toolShortcuts = { select: ["s"] };

      expect(listener).toHaveBeenCalledWith("Select (S)");
      subscription.dispose();
      tooltip.dispose();
    });
  });

  it("toggles the tool dropdown", function () {
    viewModel = createViewModel();

    viewModel.toggleToolDropDown();
    expect(viewModel.toolDropDownVisible).toBe(true);
    viewModel.toggleToolDropDown();
    expect(viewModel.toolDropDownVisible).toBe(false);
  });

  it("closes the tool dropdown after selecting a tool", function () {
    viewModel = createViewModel();
    viewModel.selectModeEntry(viewModel.modeEntries[1]);

    viewModel.toolDropDownVisible = true;
    viewModel.selectToolEntry(viewModel.toolEntries[1]);
    expect(viewModel.toolDropDownVisible).toBe(false);
  });

  it("removes editor listeners on destroy without changing editor state", function () {
    editor.activeTool = selectTool;
    const modeListener = jasmine.createSpy();
    editor.modeChanged.addEventListener(modeListener);
    viewModel = createViewModel();
    expect(editor.modeChanged.numberOfListeners).toBe(2);
    expect(editor.activeToolChanged.numberOfListeners).toBe(1);

    viewModel.destroy();

    expect(editor.modeChanged.numberOfListeners).toBe(1);
    expect(editor.activeToolChanged.numberOfListeners).toBe(0);
    expect(editor.activeTool).toBe(selectTool);
    editor.mode = EditMode.FACE;
    expect(modeListener).toHaveBeenCalled();
    expect(viewModel.modeId).toBe("none");
  });
});
