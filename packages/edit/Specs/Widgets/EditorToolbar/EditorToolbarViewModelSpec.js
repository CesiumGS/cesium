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

  function createViewModel(options) {
    return new EditorToolbarViewModel(editor, {
      tools: [
        { id: "none", label: "Tools", tool: undefined },
        { id: "select", label: "Select", tool: selectTool },
        { id: "translate", label: "Translate", tool: translateTool },
      ],
      ...options,
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
    expect(viewModel.modeId).toBe("none");
    expect(viewModel.toolId).toBe("none");
    expect(viewModel.modeDropDownVisible).toBe(false);
    expect(viewModel.toolDropDownVisible).toBe(false);
  });

  it("doesn't add tools to the editor by default", function () {
    viewModel = new EditorToolbarViewModel(editor);

    expect(viewModel.toolEntries).toEqual([
      { id: "none", label: "Tools", tool: undefined },
    ]);
    expect(SelectTool.addTo).not.toHaveBeenCalled();
    expect(TranslateTool.addTo).not.toHaveBeenCalled();
  });

  it("uses custom mode and tool entries without registering default tools", function () {
    const modes = [{ id: "points", label: "Points", mode: EditMode.VERTEX }];
    const tools = [{ id: "custom", label: "Custom", tool: selectTool }];
    viewModel = new EditorToolbarViewModel(editor, { modes, tools });

    expect(viewModel.modeEntries).toBe(modes);
    expect(viewModel.toolEntries).toBe(tools);
    expect(SelectTool.addTo).not.toHaveBeenCalled();
    expect(TranslateTool.addTo).not.toHaveBeenCalled();
  });

  it("reflects the editor's initial mode and tool", function () {
    editor.mode = EditMode.EDGE;
    editor.activeTool = translateTool;
    viewModel = createViewModel();

    expect(viewModel.modeId).toBe("edge");
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
    expect(viewModel.toolId).toBe("none");
  });

  it("leaves the selected ID undefined when no entry matches", function () {
    viewModel = createViewModel();

    editor.mode = EditMode.VERTEX | EditMode.EDGE;
    editor.activeTool = {};

    expect(viewModel.modeId).toBeUndefined();
    expect(viewModel.toolId).toBeUndefined();
  });

  it("accepts empty custom entries without creating defaults", function () {
    viewModel = new EditorToolbarViewModel(editor, { modes: [], tools: [] });

    expect(viewModel.modeId).toBeUndefined();
    expect(viewModel.toolId).toBeUndefined();
    expect(SelectTool.addTo).not.toHaveBeenCalled();
    expect(TranslateTool.addTo).not.toHaveBeenCalled();
  });

  it("changes modes and tools through its commands", function () {
    viewModel = createViewModel();

    viewModel.selectModeEntry(viewModel.modeEntries[1]);
    viewModel.selectToolEntry(viewModel.toolEntries[2]);

    expect(editor.mode).toBe(EditMode.VERTEX);
    expect(editor.activeTool).toBe(translateTool);
    expect(viewModel.modeId).toBe("vertex");
    expect(viewModel.toolId).toBe("translate");
  });

  it("clears the active tool through the no-tool entry", function () {
    editor.activeTool = selectTool;
    viewModel = createViewModel();

    viewModel.selectToolEntry(viewModel.toolEntries[0]);

    expect(editor.activeTool).toBeUndefined();
    expect(viewModel.toolId).toBe("none");
  });

  it("disables unsupported tools using supportsMode", function () {
    viewModel = createViewModel();

    expect(viewModel.isToolEnabled(viewModel.toolEntries[0])).toBe(true);
    expect(viewModel.isToolEnabled(viewModel.toolEntries[1])).toBe(true);
    expect(viewModel.isToolEnabled(viewModel.toolEntries[2])).toBe(false);
    expect(translateTool.supportsMode).toHaveBeenCalledWith(EditMode.NONE);

    editor.mode = EditMode.EDGE;

    expect(viewModel.isToolEnabled(viewModel.toolEntries[2])).toBe(true);
    expect(translateTool.supportsMode).toHaveBeenCalledWith(EditMode.EDGE);
  });

  it("updates observable availability even when no mode entry matches", function () {
    viewModel = createViewModel({ modes: [] });
    const availability = knockout.pureComputed(() =>
      viewModel.isToolEnabled(viewModel.toolEntries[2]),
    );
    const listener = jasmine.createSpy();
    const subscription = availability.subscribe(listener);

    expect(availability()).toBe(false);
    editor.mode = EditMode.FACE;

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
      viewModel.selectToolEntry(viewModel.toolEntries[2]),
    ).toThrowDeveloperError();

    expect(editor.activeTool).toBe(selectTool);
    expect(viewModel.toolId).toBe("select");
    expect(viewModel.toolDropDownVisible).toBe(true);
  });

  it("closes the other dropdown when opening a dropdown", function () {
    viewModel = createViewModel();

    viewModel.toggleModeDropDown();
    expect(viewModel.modeDropDownVisible).toBe(true);
    viewModel.toggleToolDropDown();
    expect(viewModel.toolDropDownVisible).toBe(true);
    expect(viewModel.modeDropDownVisible).toBe(false);
    viewModel.toggleModeDropDown();
    expect(viewModel.modeDropDownVisible).toBe(true);
    expect(viewModel.toolDropDownVisible).toBe(false);
    viewModel.toggleModeDropDown();
    expect(viewModel.modeDropDownVisible).toBe(false);
    viewModel.toggleToolDropDown();
    viewModel.toggleToolDropDown();
    expect(viewModel.toolDropDownVisible).toBe(false);
  });

  it("closes a dropdown after selecting an entry", function () {
    viewModel = createViewModel();
    viewModel.modeDropDownVisible = true;
    viewModel.selectModeEntry(viewModel.modeEntries[1]);
    expect(viewModel.modeDropDownVisible).toBe(false);

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
