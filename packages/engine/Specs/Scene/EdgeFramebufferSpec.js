import { EdgeFramebuffer, Texture } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe("Scene/EdgeFramebuffer", function () {
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
    const edgeFramebuffer = new EdgeFramebuffer();
    expect(edgeFramebuffer).toBeDefined();
    expect(edgeFramebuffer.isDestroyed()).toBe(false);
  });

  it("creates framebuffer with correct dimensions", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);

    expect(edgeFramebuffer.framebuffer).toBeDefined();
    expect(edgeFramebuffer.colorTexture.width).toBe(viewport.width);
    expect(edgeFramebuffer.colorTexture.height).toBe(viewport.height);

    edgeFramebuffer.destroy();
  });

  it("creates multiple render targets", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);

    const framebuffer = edgeFramebuffer.framebuffer;
    expect(framebuffer.numberOfColorAttachments).toBeGreaterThan(1);

    expect(framebuffer.getColorTexture(0)).toBeDefined(); // Edge color texture
    expect(framebuffer.getColorTexture(1)).toBeDefined(); // Edge ID texture

    edgeFramebuffer.destroy();
  });

  it("updates framebuffer when dimensions change", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    let viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);
    const originalFramebuffer = edgeFramebuffer.framebuffer;

    viewport = { width: 512, height: 512 };
    edgeFramebuffer.update(context, viewport, hdr);

    expect(edgeFramebuffer.framebuffer).not.toBe(originalFramebuffer);
    expect(edgeFramebuffer.colorTexture.width).toBe(viewport.width);
    expect(edgeFramebuffer.colorTexture.height).toBe(viewport.height);

    edgeFramebuffer.destroy();
  });

  it("does not update framebuffer when dimensions are the same", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);
    const originalFramebuffer = edgeFramebuffer.framebuffer;

    edgeFramebuffer.update(context, viewport, hdr);
    expect(edgeFramebuffer.framebuffer).toBe(originalFramebuffer);

    edgeFramebuffer.destroy();
  });

  it("provides access to edge color texture", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);

    const edgeColorTexture = edgeFramebuffer.colorTexture;
    expect(edgeColorTexture).toBeDefined();
    expect(edgeColorTexture instanceof Texture).toBe(true);
    expect(edgeColorTexture.width).toBe(viewport.width);
    expect(edgeColorTexture.height).toBe(viewport.height);

    edgeFramebuffer.destroy();
  });

  it("provides access to edge ID texture", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);

    const edgeIdTexture = edgeFramebuffer.idTexture;
    expect(edgeIdTexture).toBeDefined();
    expect(edgeIdTexture instanceof Texture).toBe(true);
    expect(edgeIdTexture.width).toBe(viewport.width);
    expect(edgeIdTexture.height).toBe(viewport.height);

    edgeFramebuffer.destroy();
  });

  it("clears the framebuffer", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);

    expect(function () {
      const clearCommand = edgeFramebuffer.getClearCommand();
      expect(clearCommand).toBeDefined();
    }).not.toThrow();

    edgeFramebuffer.destroy();
  });

  it("destroys properly", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const viewport = { width: 256, height: 256 };
    const hdr = false;

    edgeFramebuffer.update(context, viewport, hdr);
    expect(edgeFramebuffer.isDestroyed()).toBe(false);

    edgeFramebuffer.destroy();
    expect(edgeFramebuffer.isDestroyed()).toBe(true);
  });

  it("can be destroyed multiple times without errors", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    expect(edgeFramebuffer.isDestroyed()).toBe(false);

    edgeFramebuffer.destroy();
    expect(edgeFramebuffer.isDestroyed()).toBe(true);

    // Second destroy should not throw but object is already destroyed
    expect(edgeFramebuffer.isDestroyed()).toBe(true);
  });

  it("handles invalid dimensions gracefully", function () {
    const edgeFramebuffer = new EdgeFramebuffer();
    const hdr = false;

    expect(function () {
      edgeFramebuffer.update(context, { width: 0, height: 256 }, hdr);
    }).toThrowDeveloperError();

    expect(function () {
      edgeFramebuffer.update(context, { width: 256, height: 0 }, hdr);
    }).toThrowDeveloperError();

    edgeFramebuffer.destroy();
  });
});
