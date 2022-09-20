import {
  EllipsoidTerrainProvider,
  TerrainProvider,
} from "../../index.js";;

import createContext from "../../../../Specs/createContext.js";;

describe(
  "Core/EllipsoidTerrainProvider",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    it("conforms to TerrainProvider interface", function () {
      expect(EllipsoidTerrainProvider).toConformToInterface(TerrainProvider);
    });

    it("resolves readyPromise", function () {
      const provider = new EllipsoidTerrainProvider();

      return provider.readyPromise.then(function (result) {
        expect(result).toBe(true);
        expect(provider.ready).toBe(true);
      });
    });

    it("requestTileGeometry creates terrain data.", function () {
      const terrain = new EllipsoidTerrainProvider();
      const terrainData = terrain.requestTileGeometry(0, 0, 0);
      expect(terrainData).toBeDefined();
    });

    it("has error event", function () {
      const provider = new EllipsoidTerrainProvider();
      expect(provider.errorEvent).toBeDefined();
      expect(provider.errorEvent).toBe(provider.errorEvent);
    });

    it("returns undefined on getTileDataAvailable()", function () {
      const provider = new EllipsoidTerrainProvider();
      expect(provider.getTileDataAvailable()).toBeUndefined();
    });
  },
  "WebGL"
);
