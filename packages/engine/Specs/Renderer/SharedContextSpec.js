import SharedContext from "../../Source/Renderer/SharedContext";

describe("Renderer/SharedContext", function () {
  let sharedContext;
  beforeEach(function () {
    sharedContext = new SharedContext();
  });

  afterEach(function () {
    if (!sharedContext.isDestroyed()) {
      sharedContext.destroy();
    }
  });

  it("scene context forwards to shared Context", function () {
    const sceneContext = sharedContext._createSceneContext(
      document.createElement("canvas"),
    );
    expect(sceneContext.gl).toEqual(sharedContext._context.gl);
    expect(sceneContext._shaderCache).toEqual(
      sharedContext._context.shaderCache,
    );
    expect(sceneContext.uniformState).toEqual(
      sharedContext._context.uniformState,
    );
    expect(sceneContext.clear).toEqual(sharedContext._context.clear);
  });

  it("canvas returns scene canvas", function () {
    const sceneCanvas = document.createElement("canvas");
    const sceneContext = sharedContext._createSceneContext(sceneCanvas);
    expect(sceneContext.canvas).toBe(sceneCanvas);
    expect(sharedContext._context.canvas).not.toBe(sceneCanvas);
  });

  it("destroys shared Context after all scene contexts are destroyed", function () {
    const sc = sharedContext._context;
    expect(sc.isDestroyed()).toEqual(false);
    expect(sharedContext._canvases).toEqual([]);

    const canvases = [
      document.createElement("canvas"),
      document.createElement("canvas"),
    ];
    const contexts = canvases.map((canvas) =>
      sharedContext._createSceneContext(canvas),
    );
    expect(sharedContext._canvases).toEqual(canvases);

    contexts[0].destroy();
    expect(contexts[0].isDestroyed()).toEqual(true);
    expect(sharedContext._canvases).toEqual([canvases[1]]);
    expect(sc.isDestroyed()).toEqual(false);
    expect(function () {
      expect(contexts[0].canvas).not.toBe(undefined);
    }).toThrowDeveloperError();

    contexts[1].destroy();
    expect(contexts[1].isDestroyed()).toEqual(true);
    expect(sharedContext._canvases).toEqual([]);
    expect(sc.isDestroyed()).toEqual(true);
  });

  it("does not auto-destroy after all scene context are destroyed if so specified", function () {
    const sc = new SharedContext({ autoDestroy: false });
    const ctxt = sc._createSceneContext(document.createElement("canvas"));
    ctxt.destroy();
    expect(sc._canvases).toEqual([]);
    expect(ctxt.isDestroyed()).toBe(true);
    expect(sc.isDestroyed()).toBe(false);

    sc.destroy();
    expect(sc.isDestroyed()).toBe(true);
  });

  it("throws if attempting to create multiple scene contexts for same canvas", function () {
    const canvas = document.createElement("canvas");
    sharedContext._createSceneContext(canvas);
    expect(function () {
      sharedContext._createSceneContext(canvas);
    }).toThrowDeveloperError();
  });
});
