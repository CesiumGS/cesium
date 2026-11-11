import { Event } from "@cesium/core";
import { MouseButton } from "@cesium/engine";
import {
  EditMode,
  EditorCameraControls,
  EditorCursor,
} from "../../../index.js";

describe("Widgets/Viewer/EditorCursor", function () {
  let canvas;
  let viewer;
  let editor;
  let tools;
  let cursor;

  beforeEach(function () {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    viewer = { scene: { canvas } };
    editor = {
      mode: EditMode.NONE,
      activeTool: undefined,
      modeChanged: new Event(),
      activeToolChanged: new Event(),
    };
    tools = { select: {}, translate: {} };
  });

  afterEach(function () {
    cursor?.destroy();
    cursor = undefined;
    canvas.remove();
  });

  function setMode(mode) {
    editor.mode = mode;
    editor.modeChanged.raiseEvent(mode);
  }

  function setTool(tool) {
    editor.activeTool = tool;
    editor.activeToolChanged.raiseEvent(tool);
  }

  function pointer(type, button, target) {
    (target ?? canvas).dispatchEvent(
      new PointerEvent(type, { button, bubbles: true }),
    );
  }

  it("reflects the initial mode and tool", function () {
    editor.mode = EditMode.EDGE;
    editor.activeTool = tools.translate;

    cursor = new EditorCursor(viewer, editor, tools);

    expect(canvas.getAttribute("data-cesium-edit-mode")).toBe("edge");
    expect(canvas.getAttribute("data-cesium-edit-tool")).toBe("translate");
  });

  it("names the mode's components, or none", function () {
    cursor = new EditorCursor(viewer, editor, tools);
    expect(canvas.getAttribute("data-cesium-edit-mode")).toBe("none");

    setMode(EditMode.VERTEX | EditMode.FACE);
    expect(canvas.getAttribute("data-cesium-edit-mode")).toBe("vertex face");

    setMode(EditMode.NONE);
    expect(canvas.getAttribute("data-cesium-edit-mode")).toBe("none");
  });

  it("names the active tool, and omits unknown tools", function () {
    cursor = new EditorCursor(viewer, editor, tools);
    expect(canvas.hasAttribute("data-cesium-edit-tool")).toBe(false);

    setTool(tools.select);
    expect(canvas.getAttribute("data-cesium-edit-tool")).toBe("select");

    setTool({});
    expect(canvas.hasAttribute("data-cesium-edit-tool")).toBe(false);
  });

  it("marks middle-button drags as navigating until released anywhere", function () {
    cursor = new EditorCursor(viewer, editor, tools);

    pointer("pointerdown", 0);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(false);

    pointer("pointerdown", 1);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(true);

    pointer("pointerup", 0, document.body);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(true);

    pointer("pointerup", 1, document.body);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(false);
  });

  it("follows the camera controls' drag buttons", function () {
    spyOnProperty(EditorCameraControls, "dragButtons").and.returnValue([
      MouseButton.RIGHT,
    ]);
    cursor = new EditorCursor(viewer, editor, tools);

    pointer("pointerdown", MouseButton.MIDDLE);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(false);

    pointer("pointerdown", MouseButton.RIGHT);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(true);

    pointer("pointerup", MouseButton.RIGHT, document.body);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(false);
  });

  it("stops navigating when the pointer is canceled", function () {
    cursor = new EditorCursor(viewer, editor, tools);
    pointer("pointerdown", 1);

    pointer("pointercancel", -1);

    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(false);
  });

  it("removes its attributes and listeners when destroyed", function () {
    cursor = new EditorCursor(viewer, editor, tools);
    setTool(tools.select);
    pointer("pointerdown", 1);

    cursor.destroy();
    cursor = undefined;

    expect(canvas.hasAttribute("data-cesium-edit-mode")).toBe(false);
    expect(canvas.hasAttribute("data-cesium-edit-tool")).toBe(false);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(false);
    expect(editor.modeChanged.numberOfListeners).toBe(0);
    expect(editor.activeToolChanged.numberOfListeners).toBe(0);

    setMode(EditMode.VERTEX);
    pointer("pointerdown", 1);
    expect(canvas.hasAttribute("data-cesium-edit-mode")).toBe(false);
    expect(canvas.hasAttribute("data-cesium-edit-navigating")).toBe(false);
  });
});
