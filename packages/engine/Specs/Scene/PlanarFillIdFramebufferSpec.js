import { PlanarFillIdFramebuffer, Texture } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe("Scene/PlanarFillIdFramebuffer", function () {
  let scene;
  let context;

  beforeAll(function () {
    scene = createScene();
    context = scene.context;
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("constructs", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    expect(framebuffer).toBeDefined();
    expect(framebuffer.isDestroyed()).toBe(false);
  });

  it("creates framebuffer with correct dimensions", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    framebuffer.update(context, viewport, hdr);

    expect(framebuffer.framebuffer).toBeDefined();
    expect(framebuffer.idTexture.width).toBe(viewport.width);
    expect(framebuffer.idTexture.height).toBe(viewport.height);

    framebuffer.destroy();
  });

  it("updates framebuffer when dimensions change", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    let viewport = { width: 256, height: 256 };
    const hdr = false;

    framebuffer.update(context, viewport, hdr);
    const originalFramebuffer = framebuffer.framebuffer;

    viewport = { width: 512, height: 512 };
    framebuffer.update(context, viewport, hdr);

    expect(framebuffer.framebuffer).not.toBe(originalFramebuffer);
    expect(framebuffer.idTexture.width).toBe(viewport.width);
    expect(framebuffer.idTexture.height).toBe(viewport.height);

    framebuffer.destroy();
  });

  it("does not update framebuffer when dimensions are the same", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    framebuffer.update(context, viewport, hdr);
    const originalFramebuffer = framebuffer.framebuffer;

    framebuffer.update(context, viewport, hdr);
    expect(framebuffer.framebuffer).toBe(originalFramebuffer);

    framebuffer.destroy();
  });

  it("provides access to id texture", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    framebuffer.update(context, viewport, hdr);

    const idTexture = framebuffer.idTexture;
    expect(idTexture).toBeDefined();
    expect(idTexture instanceof Texture).toBe(true);
    expect(idTexture.width).toBe(viewport.width);
    expect(idTexture.height).toBe(viewport.height);

    framebuffer.destroy();
  });

  it("provides access to depth-stencil texture", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    framebuffer.update(context, viewport, hdr);

    const depthStencilTexture = framebuffer.depthStencilTexture;
    expect(depthStencilTexture).toBeDefined();
    expect(depthStencilTexture instanceof Texture).toBe(true);

    framebuffer.destroy();
  });

  it("returns a clear command", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    framebuffer.update(context, viewport, hdr);

    expect(function () {
      const clearCommand = framebuffer.getClearCommand();
      expect(clearCommand).toBeDefined();
      expect(clearCommand.framebuffer).toBe(framebuffer.framebuffer);
    }).not.toThrow();

    framebuffer.destroy();
  });

  it("destroys properly", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    framebuffer.update(context, viewport, hdr);
    expect(framebuffer.isDestroyed()).toBe(false);

    framebuffer.destroy();
    expect(framebuffer.isDestroyed()).toBe(true);
  });

  it("can be destroyed without calling update", function () {
    const framebuffer = new PlanarFillIdFramebuffer();
    expect(framebuffer.isDestroyed()).toBe(false);

    framebuffer.destroy();
    expect(framebuffer.isDestroyed()).toBe(true);
  });
});
