import { Terrain, EllipsoidTerrainProvider } from "../../index.js";

describe("Scene/Terrain", function () {
  it("constructor throws without terrain promise", function () {
    expect(() => new Terrain()).toThrowDeveloperError();
  });

  it("does not throw on error", function () {
    expect(() => {
      // eslint-disable-next-line no-unused-vars
      const terrain = new Terrain(Promise.reject(new Error("Fail")));
    }).not.toThrow();
  });

  it("readyEvent handles terrain promise success", async function () {
    let resolve;
    const promise = new Promise((r) => {
      resolve = r;
    });

    const terrain = new Terrain(promise);
    const terrainProvider = new EllipsoidTerrainProvider();

    let wasCalled = false;
    terrain.readyEvent.addEventListener((provider) => {
      expect(provider).toBe(terrainProvider);
      wasCalled = true;
    });

    resolve(terrainProvider);

    await promise;
    expect(wasCalled).toBeTrue();
    expect(terrain.provider).toBe(terrainProvider);
  });

  it("errorEvent handles terrain promise failure", async function () {
    let reject;
    const promise = new Promise((resolve, r) => {
      reject = r;
    });

    const terrain = new Terrain(promise);
    const error = new Error("Fail");

    let wasCalled = false;
    terrain.errorEvent.addEventListener((e) => {
      expect(e).toBe(error);
      wasCalled = true;
    });

    reject(error);

    await expectAsync(promise).toBeRejected();
    expect(wasCalled).toBeTrue();
  });
});
