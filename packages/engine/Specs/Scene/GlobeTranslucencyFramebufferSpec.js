import {
  BoundingRectangle,
  Framebuffer,
  GlobeTranslucencyFramebuffer,
  PassState,
  PixelDatatype,
  Texture,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe("Scene/GlobeTranslucencyFramebuffer", function () {
  let scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("creates resources", function () {
    const globeTranslucency = new GlobeTranslucencyFramebuffer();
    const context = scene.context;
    const viewport = new BoundingRectangle(0, 0, 100, 100);
    const passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    expect(globeTranslucency.classificationTexture).toBeDefined();
    expect(globeTranslucency.classificationFramebuffer).toBeDefined();
    expect(globeTranslucency.packedDepthTexture).toBeDefined();
    expect(globeTranslucency.packedDepthFramebuffer).toBeDefined();

    if (context.depthTexture) {
      expect(globeTranslucency.depthStencilTexture).toBeDefined();
    } else {
      expect(globeTranslucency.depthStencilRenderbuffer).toBeDefined();
    }

    expect(globeTranslucency._packedDepthCommand).toBeDefined();
    expect(globeTranslucency._clearCommand).toBeDefined();
  });

  it("recreates resources when viewport changes", function () {
    const globeTranslucency = new GlobeTranslucencyFramebuffer();
    const frameState = scene.frameState;
    const context = frameState.context;
    const viewport = new BoundingRectangle(0, 0, 100, 100);
    const passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    const firstColorTexture = globeTranslucency.classificationTexture;
    const firstFramebuffer = globeTranslucency.classificationFramebuffer;
    const firstPackedDepthFramebuffer =
      globeTranslucency.packedDepthFramebuffer;
    expect(globeTranslucency._clearCommand.framebuffer).toBe(firstFramebuffer);
    expect(globeTranslucency._packedDepthCommand.framebuffer).toBe(
      firstPackedDepthFramebuffer
    );

    viewport.width = 50;
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    expect(firstColorTexture.isDestroyed()).toBe(true);
    expect(globeTranslucency._colorTexture).not.toBe(firstColorTexture);
    expect(globeTranslucency._clearCommand.framebuffer).not.toBe(
      firstFramebuffer
    );
    expect(globeTranslucency._packedDepthCommand.framebuffer).not.toBe(
      firstPackedDepthFramebuffer
    );
  });

  it("recreates resources when HDR changes", function () {
    if (!scene.highDynamicRangeSupported) {
      return;
    }

    const frameState = scene.frameState;
    const context = frameState.context;
    const globeTranslucency = new GlobeTranslucencyFramebuffer();
    const viewport = new BoundingRectangle(0, 0, 100, 100);
    const passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    const firstColorTexture = globeTranslucency.classificationTexture;

    const expectedPixelDatatype = context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT;
    globeTranslucency.updateAndClear(true, viewport, context, passState);
    expect(firstColorTexture.isDestroyed()).toBe(true);
    expect(globeTranslucency.classificationTexture).not.toBe(firstColorTexture);
    expect(globeTranslucency.classificationTexture.pixelDatatype).toBe(
      expectedPixelDatatype
    );
  });

  it("destroys", function () {
    const globeTranslucency = new GlobeTranslucencyFramebuffer();
    const frameState = scene.frameState;
    const context = frameState.context;
    const viewport = new BoundingRectangle(0, 0, 100, 100);
    const passState = new PassState(context);

    globeTranslucency.updateAndClear(false, viewport, context, passState);

    spyOn(Texture.prototype, "destroy").and.callThrough();
    spyOn(Framebuffer.prototype, "destroy").and.callThrough();

    globeTranslucency.destroy();

    expect(globeTranslucency.isDestroyed()).toBe(true);
    expect(Texture.prototype.destroy).toHaveBeenCalled();
    expect(Framebuffer.prototype.destroy).toHaveBeenCalled();
  });
});
