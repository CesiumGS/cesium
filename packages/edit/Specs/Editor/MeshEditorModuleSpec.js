import { MeshEditorModule } from "../../index.js";

describe("Editor/MeshEditorModule", function () {
  it("load returns the same promise on every call", function () {
    const promise = MeshEditorModule.load();
    expect(MeshEditorModule.load()).toBe(promise);
    return promise;
  });

  it("load resolves to the same module on every call", async function () {
    const first = await MeshEditorModule.load();
    const second = await MeshEditorModule.load();
    expect(first).toBeInstanceOf(MeshEditorModule);
    expect(second).toBe(first);
  });

  it("exposes the wasm memory", async function () {
    const module = await MeshEditorModule.load();
    expect(module.memory).toBeInstanceOf(WebAssembly.Memory);
    expect(module.memory.buffer.byteLength).toBeGreaterThan(0);
  });

  it("exposes the topology overlay shaders", async function () {
    const { shaders } = await MeshEditorModule.load();
    for (const kind of ["point", "edge", "face", "defaultHooks"]) {
      expect(shaders[kind].vertex).toEqual(jasmine.any(String));
      expect(shaders[kind].fragment).toEqual(jasmine.any(String));
    }
    expect(shaders.uniforms).toBeDefined();
  });
});
