import { BoundingRectangle } from "../../Source/Cesium.js";
import { Framebuffer } from "../../Source/Cesium.js";
import { GlobeTranslucencyFramebuffer } from "../../Source/Cesium.js";
import { PassState } from "../../Source/Cesium.js";
import { PixelDatatype } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

describe("Scene/GlobeTranslucencyFramebuffer", function () {
  var scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("creates resources", function () {
    var globeTranslucency = new GlobeTranslucencyFramebuffer();
    var context = scene.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    expect(globeTranslucency._colorTexture).toBeDefined();
    expect(globeTranslucency._framebuffer).toBeDefined();
    expect(globeTranslucency._packedDepthTexture).toBeDefined();
    expect(globeTranslucency._packedDepthFramebuffer).toBeDefined();

    if (context.depthTexture) {
      expect(globeTranslucency._depthStencilTexture).toBeDefined();
    } else {
      expect(globeTranslucency._depthStencilRenderbuffer).toBeDefined();
    }

    expect(globeTranslucency._packedDepthCommand).toBeDefined();
    expect(globeTranslucency._clearCommand).toBeDefined();
  });

  it("recreates resources when viewport changes", function () {
    var globeTranslucency = new GlobeTranslucencyFramebuffer();
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    var firstColorTexture = globeTranslucency._colorTexture;
    var firstFramebuffer = globeTranslucency._framebuffer;
    var firstPackedDepthFramebuffer = globeTranslucency._packedDepthFramebuffer;
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

    var frameState = scene.frameState;
    var context = frameState.context;
    var globeTranslucency = new GlobeTranslucencyFramebuffer();
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    var firstColorTexture = globeTranslucency._colorTexture;

    var expectedPixelDatatype = context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT;
    globeTranslucency.updateAndClear(true, viewport, context, passState);
    expect(firstColorTexture.isDestroyed()).toBe(true);
    expect(globeTranslucency._colorTexture).not.toBe(firstColorTexture);
    expect(globeTranslucency._colorTexture.pixelDatatype).toBe(
      expectedPixelDatatype
    );
  });

  it("destroys", function () {
    var globeTranslucency = new GlobeTranslucencyFramebuffer();
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);

    globeTranslucency.updateAndClear(false, viewport, context, passState);

    spyOn(Texture.prototype, "destroy").and.callThrough();
    spyOn(Framebuffer.prototype, "destroy").and.callThrough();

    globeTranslucency.destroy();

    expect(globeTranslucency.isDestroyed()).toBe(true);
    expect(Texture.prototype.destroy).toHaveBeenCalled();
    expect(Framebuffer.prototype.destroy).toHaveBeenCalled();
  });
});
