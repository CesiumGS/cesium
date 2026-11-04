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
      it("queries wasm with the tool's ID and the requested mode");
      it("supports every mode for the select tool");
      it("does not support Object mode for the translate tool");
      it("does not activate the tool or change the editor's mode");
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
