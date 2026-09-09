import {
  MLTDataProvider,
  UrlTemplate3DTilesDataProvider,
} from "../../index.js";

describe("Scene/MLTDataProvider", function () {
  const template = "http://example.invalid/{z}/{x}/{y}.mlt";

  it("is a UrlTemplate3DTilesDataProvider", function () {
    const provider = new MLTDataProvider(template);
    expect(provider instanceof UrlTemplate3DTilesDataProvider).toBe(true);
    expect(provider.urlTemplate).toBe(template);
  });

  it("constructor sets default options", function () {
    const provider = new MLTDataProvider(template);
    expect(provider._workerPoolSize).toBe(4);
  });

  it("constructor accepts workerPoolSize option", function () {
    const provider = new MLTDataProvider(template, {
      workerPoolSize: 2,
    });
    expect(provider._workerPoolSize).toBe(2);
  });

  it("creates a codec for mlt content with a missing tile policy", function () {
    const provider = new MLTDataProvider(template);
    const codec = provider._createCodec();
    expect(codec.contentType).toBe("mlt");
    expect(codec.missingTilePolicy.statusCodes).toContain(404);
    expect(codec.missingTilePolicy.statusCodes).toContain(204);
    expect(typeof codec.createContent).toBe("function");
  });

  it("creates the task processor pool lazily and cycles through it", function () {
    const provider = new MLTDataProvider(template, { workerPoolSize: 2 });
    expect(provider._taskProcessors).toBeUndefined();

    const first = provider._getTaskProcessor();
    const pool = provider._taskProcessors;
    expect(pool).toBeDefined();
    expect(pool.length).toBeGreaterThanOrEqual(1);
    expect(pool.length).toBeLessThanOrEqual(2);
    expect(first).toBe(pool[0]);

    // Round-robin: after poolSize calls, the same processor comes up again.
    for (let i = 1; i < pool.length; i++) {
      expect(provider._getTaskProcessor()).toBe(pool[i]);
    }
    expect(provider._getTaskProcessor()).toBe(first);

    provider.destroy();
  });

  it("uses a pool of at least one processor", function () {
    const provider = new MLTDataProvider(template, { workerPoolSize: 1 });
    const first = provider._getTaskProcessor();
    expect(provider._taskProcessors.length).toBe(1);
    expect(provider._getTaskProcessor()).toBe(first);
    provider.destroy();
  });

  it("destroy destroys the task processor pool", function () {
    const provider = new MLTDataProvider(template, { workerPoolSize: 1 });
    provider._getTaskProcessor();
    expect(provider._taskProcessors).toBeDefined();

    provider.destroy();
    expect(provider._taskProcessors).toBeUndefined();
    expect(provider.isDestroyed()).toBe(true);
  });

  it("destroy is safe when no task processors were created", function () {
    const provider = new MLTDataProvider(template);
    provider.destroy();
    expect(provider.isDestroyed()).toBe(true);
  });

  it("fromUrl creates a provider with the mlt codec attached", async function () {
    const provider = await MLTDataProvider.fromUrl(template, { maxZoom: 1 });
    expect(provider instanceof MLTDataProvider).toBe(true);
    expect(provider.tileset).toBeDefined();
    expect(provider.tileset._runtimeContentCodec.contentType).toBe("mlt");
    provider.destroy();
  });
});
