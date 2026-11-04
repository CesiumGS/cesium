import { MeshEditor as WasmMeshEditor } from "@cesium/mesh-editor";
import {
  EditMode,
  MeshEditor,
  MeshEditorTool,
  SelectTool,
  TranslateTool,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Editor/MeshEditorTool",
  function () {
    let scene;
    let editor;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(async function () {
      editor = await MeshEditor.addToScene(scene);
      editor.mode = EditMode.VERTEX;
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    describe("addTo", function () {
      it("returns a tool of the type it's called on", function () {
        const selectTool = SelectTool.addTo(editor);
        const translateTool = TranslateTool.addTo(editor);

        expect(selectTool).toBeInstanceOf(SelectTool);
        expect(selectTool).toBeInstanceOf(MeshEditorTool);
        expect(translateTool).toBeInstanceOf(TranslateTool);
      });

      it("adds a separate tool on each call", function () {
        const first = TranslateTool.addTo(editor);
        const second = TranslateTool.addTo(editor);

        editor.activeTool = first;
        expect(editor.activeTool).toBe(first);

        editor.activeTool = second;
        expect(editor.activeTool).toBe(second);
      });

      it("adds an inactive tool", function () {
        TranslateTool.addTo(editor);

        expect(editor.activeTool).toBeUndefined();
      });
    });

    describe("supportsMode", function () {
      it("queries wasm with the tool's ID and the requested mode", function () {
        const query = spyOn(
          WasmMeshEditor.prototype,
          "toolSupportsMode",
        ).and.callThrough();
        SelectTool.addTo(editor);
        const tool = TranslateTool.addTo(editor);
        const mode = EditMode.VERTEX | EditMode.EDGE;

        expect(tool.supportsMode(mode)).toBe(true);

        expect(query).toHaveBeenCalledOnceWith(tool._id, mode);
      });

      it("supports every mode for the select tool", function () {
        const tool = SelectTool.addTo(editor);

        for (let mode = EditMode.NONE; mode <= 7; mode++) {
          expect(tool.supportsMode(mode)).toBe(true);
        }
      });

      it("supports only component modes for the translate tool", function () {
        const tool = TranslateTool.addTo(editor);

        expect(tool.supportsMode(EditMode.NONE)).toBe(false);
        for (let mode = EditMode.VERTEX; mode <= 7; mode++) {
          expect(tool.supportsMode(mode)).toBe(true);
        }
      });

      it("does not activate the tool or change the editor's mode", function () {
        const tool = TranslateTool.addTo(editor);

        expect(tool.supportsMode(EditMode.NONE)).toBe(false);
        expect(tool.supportsMode(EditMode.EDGE)).toBe(true);
        expect(editor.activeTool).toBeUndefined();
        expect(editor.mode).toBe(EditMode.VERTEX);

        const selectTool = SelectTool.addTo(editor);
        editor.activeTool = selectTool;

        tool.supportsMode(EditMode.FACE);
        selectTool.supportsMode(EditMode.NONE);

        expect(editor.activeTool).toBe(selectTool);
        expect(editor.mode).toBe(EditMode.VERTEX);
      });

      it("throws for unknown components", function () {
        const tool = SelectTool.addTo(editor);

        expect(() => tool.supportsMode(8)).toThrowError();
      });

      it("throws if the mode is missing or is not a number", function () {
        const tool = SelectTool.addTo(editor);

        expect(() => tool.supportsMode()).toThrowDeveloperError();
        expect(() => tool.supportsMode("vertex")).toThrowDeveloperError();
      });
    });

    describe("confirm", function () {
      it("confirms the interaction of the active tool", function () {
        spyOn(WasmMeshEditor.prototype, "confirm").and.callThrough();
        const translateTool = TranslateTool.addTo(editor);
        editor.activeTool = translateTool;

        translateTool.confirm();

        expect(WasmMeshEditor.prototype.confirm).toHaveBeenCalled();
      });

      it("does nothing if another tool is active", function () {
        spyOn(WasmMeshEditor.prototype, "confirm").and.callThrough();
        const translateTool = TranslateTool.addTo(editor);
        editor.activeTool = SelectTool.addTo(editor);

        translateTool.confirm();

        expect(WasmMeshEditor.prototype.confirm).not.toHaveBeenCalled();
      });

      it("does nothing if no tool is active", function () {
        spyOn(WasmMeshEditor.prototype, "confirm").and.callThrough();
        const translateTool = TranslateTool.addTo(editor);

        translateTool.confirm();

        expect(WasmMeshEditor.prototype.confirm).not.toHaveBeenCalled();
      });
    });

    describe("cancel", function () {
      it("cancels the interaction of the active tool", function () {
        spyOn(WasmMeshEditor.prototype, "cancel").and.callThrough();
        const translateTool = TranslateTool.addTo(editor);
        editor.activeTool = translateTool;

        translateTool.cancel();

        expect(WasmMeshEditor.prototype.cancel).toHaveBeenCalled();
      });

      it("does nothing if another tool is active", function () {
        spyOn(WasmMeshEditor.prototype, "cancel").and.callThrough();
        const translateTool = TranslateTool.addTo(editor);
        editor.activeTool = SelectTool.addTo(editor);

        translateTool.cancel();

        expect(WasmMeshEditor.prototype.cancel).not.toHaveBeenCalled();
      });

      it("does nothing if no tool is active", function () {
        spyOn(WasmMeshEditor.prototype, "cancel").and.callThrough();
        const translateTool = TranslateTool.addTo(editor);

        translateTool.cancel();

        expect(WasmMeshEditor.prototype.cancel).not.toHaveBeenCalled();
      });
    });
  },
  "WebGL",
);
