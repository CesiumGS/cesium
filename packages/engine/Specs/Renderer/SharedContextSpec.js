import createCanvas from "../../../../Specs/createCanvas";
import SharedContext from "../../Source/Renderer/SharedContext";

describe(
  "Renderer/SharedContext",
  function () {
    // All of these tests require a real WebGL context. Skip them if WebGL is stubbed.
    const webglStub = !!window.webglStub;
    let sharedContext;
    beforeEach(function () {
      sharedContext = new SharedContext();
    });

    afterEach(function () {
      if (!sharedContext.isDestroyed()) {
        sharedContext.destroy();
      }
    });

    describe("scene context", function () {
      it("forwards to shared Context", function () {
        if (webglStub) {
          return;
        }

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
        if (webglStub) {
          return;
        }

        const sceneCanvas = document.createElement("canvas");
        const sceneContext = sharedContext._createSceneContext(sceneCanvas);
        expect(sceneContext.canvas).toBe(sceneCanvas);
        expect(sharedContext._context.canvas).not.toBe(sceneCanvas);
      });

      it("throws if attempting to create multiple scene contexts for same canvas", function () {
        if (webglStub) {
          return;
        }

        const canvas = document.createElement("canvas");
        sharedContext._createSceneContext(canvas);
        expect(function () {
          sharedContext._createSceneContext(canvas);
        }).toThrowDeveloperError();
      });

      it("throws upon failure to obtain 2d context", function () {
        if (webglStub) {
          return;
        }

        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl");
        expect(gl).not.toBeNull();
        expect(function () {
          sharedContext._createSceneContext(canvas);
        }).toThrowDeveloperError();
      });

      it("obtains drawing buffer width+height from scene canvas", function () {
        if (webglStub) {
          return;
        }

        const c = createCanvas(5, 10);
        const sc = sharedContext._createSceneContext(c);
        expect(sc.drawingBufferWidth).toEqual(c.width);
        expect(sc.drawingBufferHeight).toEqual(c.height);
        expect(sc.drawingBufferWidth).not.toEqual(
          sharedContext._context.drawingBufferWidth,
        );
        expect(sc.drawingBufferHeight).not.toEqual(
          sharedContext._context.drawingBufferHeight,
        );
      });

      it("resizes off-screen canvas to be at least as large as on-screen canvas", function () {
        if (webglStub) {
          return;
        }

        const c = createCanvas(5, 10);
        const ctx = sharedContext._createSceneContext(c);
        const sharedCanvas = sharedContext._context.canvas;
        const startWidth = sharedCanvas.width;
        const startHeight = sharedCanvas.height;
        expect(startWidth).toBeGreaterThan(c.width);
        expect(startHeight).toBeGreaterThan(c.height);

        ctx.beginFrame();
        expect(sharedCanvas.width).toEqual(startWidth);
        expect(sharedCanvas.height).toEqual(startHeight);

        c.width = startWidth + 5;
        expect(sharedCanvas.width).toEqual(startWidth);

        ctx.beginFrame();
        expect(sharedCanvas.width).toEqual(c.width);
        expect(sharedCanvas.height).toEqual(startHeight);

        c.height = startHeight + 10;
        ctx.beginFrame();
        expect(sharedCanvas.width).toEqual(c.width);
        expect(sharedCanvas.height).toEqual(c.height);

        c.width = 5;
        c.height = 10;
        expect(sharedCanvas.width).toEqual(startWidth + 5);
        expect(sharedCanvas.height).toEqual(startHeight + 10);
      });
    });

    it("destroys shared Context after all scene contexts are destroyed", function () {
      if (webglStub) {
        return;
      }
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
      if (webglStub) {
        return;
      }
      const sc = new SharedContext({ autoDestroy: false });
      const ctxt = sc._createSceneContext(document.createElement("canvas"));
      ctxt.destroy();
      expect(sc._canvases).toEqual([]);
      expect(ctxt.isDestroyed()).toBe(true);
      expect(sc.isDestroyed()).toBe(false);

      sc.destroy();
      expect(sc.isDestroyed()).toBe(true);
    });
  },
  "WebGL",
);
