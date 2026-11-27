import { SelectionStep as WasmSelectionStep } from "@cesium/mesh-editor";
import { SelectionStep } from "../../index.js";

describe("Editor/SelectionStep", function () {
  it("matches the wasm editor's selection steps", function () {
    expect(SelectionStep.EDGE).toBe(WasmSelectionStep.Edge);
    expect(SelectionStep.FACE).toBe(WasmSelectionStep.Face);
  });
});
