import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import { SingleTileImageryProvider } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { NearFarScalar } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/Globe",
  function () {
    let scene;
    let globe;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      globe = new Globe();
      scene.globe = globe;
    });

    afterEach(function () {
      scene.globe = undefined;
      Resource._Implementations.loadWithXhr =
        Resource._DefaultImplementations.loadWithXhr;
    });

    function returnTileJson(path) {
      const oldLoad = Resource._Implementations.loadWithXhr;
      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        if (url.indexOf("layer.json") >= 0) {
          Resource._DefaultImplementations.loadWithXhr(
            path,
            responseType,
            method,
            data,
            headers,
            deferred
          );
        } else {
          return oldLoad(
            url,
            responseType,
            method,
            data,
            headers,
            deferred,
            overrideMimeType
          );
        }
      };
    }

    function returnVertexNormalTileJson() {
      return returnTileJson(
        "Data/CesiumTerrainTileJson/VertexNormals.tile.json"
      );
    }

    /**
     * Repeatedly calls render until the load queue is empty. Returns a promise that resolves
     * when the load queue is empty.
     */
    function updateUntilDone(globe) {
      // update until the load queue is empty.
      return pollToPromise(function () {
        globe._surface._debug.enableDebugOutput = true;
        scene.render();
        return globe.tilesLoaded;
      });
    }

    it("renders with enableLighting", function () {
      globe.enableLighting = true;

      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Red16x16.png" })
      );

      scene.camera.setView({
        destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
      });

      return updateUntilDone(globe).then(function () {
        scene.globe.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        scene.globe.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("renders with dynamicAtmosphereLighting", function () {
      globe.enableLighting = true;
      globe.dynamicAtmosphereLighting = true;

      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Red16x16.png" })
      );

      scene.camera.setView({
        destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
      });

      return updateUntilDone(globe).then(function () {
        scene.globe.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        scene.globe.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("renders with dynamicAtmosphereLightingFromSun", function () {
      globe.enableLighting = true;
      globe.dynamicAtmosphereLighting = true;
      globe.dynamicAtmosphereLightingFromSun = true;

      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Red16x16.png" })
      );

      scene.camera.setView({
        destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
      });

      return updateUntilDone(globe).then(function () {
        scene.globe.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        scene.globe.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("renders with showWaterEffect set to false", function () {
      globe.showWaterEffect = false;

      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Red16x16.png" })
      );

      scene.camera.setView({
        destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
      });

      return updateUntilDone(globe).then(function () {
        scene.globe.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        scene.globe.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("ImageryLayersUpdated event fires when layer is added, hidden, shown, moved, or removed", function () {
      let timesEventRaised = 0;
      globe.imageryLayersUpdatedEvent.addEventListener(function () {
        ++timesEventRaised;
      });

      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      const layer = layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Red16x16.png" })
      );
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Red16x16.png" })
      );
      return updateUntilDone(globe)
        .then(function () {
          expect(timesEventRaised).toEqual(2);

          layer.show = false;
          return updateUntilDone(globe);
        })
        .then(function () {
          expect(timesEventRaised).toEqual(3);

          layer.show = true;
          return updateUntilDone(globe);
        })
        .then(function () {
          expect(timesEventRaised).toEqual(4);

          layerCollection.raise(layer);
          return updateUntilDone(globe);
        })
        .then(function () {
          expect(timesEventRaised).toEqual(5);

          layerCollection.remove(layer);
          return updateUntilDone(globe);
        })
        .then(function () {
          expect(timesEventRaised).toEqual(6);
        });
    });

    it("terrainProviderChanged event fires", function () {
      const terrainProvider = new CesiumTerrainProvider({
        url: "made/up/url",
        requestVertexNormals: true,
      });

      const spyListener = jasmine.createSpy("listener");
      globe.terrainProviderChanged.addEventListener(spyListener);

      globe.terrainProvider = terrainProvider;

      expect(spyListener).toHaveBeenCalledWith(terrainProvider);
    });

    it("tilesLoaded return true when tile load queue is empty", function () {
      expect(globe.tilesLoaded).toBe(true);

      globe._surface._tileLoadQueueHigh.length = 2;
      expect(globe.tilesLoaded).toBe(false);

      globe._surface._tileLoadQueueHigh.length = 0;
      expect(globe.tilesLoaded).toBe(true);

      globe._surface._tileLoadQueueMedium.length = 2;
      expect(globe.tilesLoaded).toBe(false);

      globe._surface._tileLoadQueueMedium.length = 0;
      expect(globe.tilesLoaded).toBe(true);

      globe._surface._tileLoadQueueLow.length = 2;
      expect(globe.tilesLoaded).toBe(false);

      globe._surface._tileLoadQueueLow.length = 0;
      expect(globe.tilesLoaded).toBe(true);

      const terrainProvider = new CesiumTerrainProvider({
        url: "made/up/url",
        requestVertexNormals: true,
      });

      globe.terrainProvider = terrainProvider;
      scene.render();
      expect(globe.tilesLoaded).toBe(false);
    });

    it("renders terrain with enableLighting", function () {
      globe.enableLighting = true;

      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      const imageryProvider = new SingleTileImageryProvider({
        url: "Data/Images/Red16x16.png",
      });
      layerCollection.addImageryProvider(imageryProvider);
      return imageryProvider.readyPromise.then(function () {
        Resource._Implementations.loadWithXhr = function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        ) {
          Resource._DefaultImplementations.loadWithXhr(
            "Data/CesiumTerrainTileJson/tile.vertexnormals.terrain",
            responseType,
            method,
            data,
            headers,
            deferred
          );
        };

        returnVertexNormalTileJson();

        const terrainProvider = new CesiumTerrainProvider({
          url: "made/up/url",
          requestVertexNormals: true,
        });

        globe.terrainProvider = terrainProvider;
        scene.camera.setView({
          destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
        });

        return updateUntilDone(globe).then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);

          scene.globe.show = false;
          expect(scene).toRender([0, 0, 0, 255]);
        });
      });
    });

    it("renders terrain with lambertDiffuseMultiplier", function () {
      globe.enableLighting = true;

      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      const imageryProvider = new SingleTileImageryProvider({
        url: "Data/Images/Red16x16.png",
      });
      layerCollection.addImageryProvider(imageryProvider);
      return imageryProvider.readyPromise.then(function () {
        Resource._Implementations.loadWithXhr = function (
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        ) {
          Resource._DefaultImplementations.loadWithXhr(
            "Data/CesiumTerrainTileJson/tile.vertexnormals.terrain",
            responseType,
            method,
            data,
            headers,
            deferred
          );
        };

        returnVertexNormalTileJson();

        const terrainProvider = new CesiumTerrainProvider({
          url: "made/up/url",
          requestVertexNormals: true,
        });

        globe.terrainProvider = terrainProvider;
        scene.camera.setView({
          destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
        });

        return updateUntilDone(globe).then(function () {
          let initialRgba;
          expect(scene).toRenderAndCall(function (rgba) {
            initialRgba = rgba;
            expect(initialRgba).not.toEqual([0, 0, 0, 255]);
          });
          globe.lambertDiffuseMultiplier = 10.0;
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(initialRgba);
          });
        });
      });
    });

    it("renders with hue shift", function () {
      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Blue.png" })
      );

      scene.camera.flyHome(0.0);

      return updateUntilDone(globe).then(function () {
        scene.globe.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        scene.globe.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
        expect(scene).toRenderAndCall(function (rgba) {
          scene.globe.atmosphereHueShift = 0.1;
          expect(scene).notToRender([0, 0, 0, 255]);
          expect(scene).notToRender(rgba);
        });
      });
    });

    it("renders with saturation shift", function () {
      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Blue.png" })
      );

      scene.camera.flyHome(0.0);

      return updateUntilDone(globe).then(function () {
        scene.globe.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        scene.globe.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
        expect(scene).toRenderAndCall(function (rgba) {
          scene.globe.atmosphereSaturationShift = 0.1;
          expect(scene).notToRender([0, 0, 0, 255]);
          expect(scene).notToRender(rgba);
        });
      });
    });

    it("renders with brightness shift", function () {
      const layerCollection = globe.imageryLayers;
      layerCollection.removeAll();
      layerCollection.addImageryProvider(
        new SingleTileImageryProvider({ url: "Data/Images/Blue.png" })
      );

      scene.camera.flyHome(0.0);

      return updateUntilDone(globe).then(function () {
        scene.globe.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        scene.globe.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
        expect(scene).toRenderAndCall(function (rgba) {
          scene.globe.atmosphereBrightnessShift = 0.1;
          expect(scene).notToRender([0, 0, 0, 255]);
          expect(scene).notToRender(rgba);
        });
      });
    });

    it("applies back face culling", function () {
      scene.camera.setView({
        destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
      });

      return updateUntilDone(globe).then(function () {
        globe.backFaceCulling = true;
        scene.render();
        let command = scene.frameState.commandList[0];
        expect(command.renderState.cull.enabled).toBe(true);
        globe.backFaceCulling = false;
        scene.render();
        command = scene.frameState.commandList[0];
        expect(command.renderState.cull.enabled).toBe(false);
      });
    });

    it("shows terrain skirts", function () {
      scene.camera.setView({
        destination: new Rectangle(0.0001, 0.0001, 0.0025, 0.0025),
      });

      return updateUntilDone(globe).then(function () {
        globe.showSkirts = true;
        scene.render();
        let command = scene.frameState.commandList[0];
        const indexCount = command.count;
        expect(indexCount).toBe(command.owner.data.renderedMesh.indices.length);

        globe.showSkirts = false;
        scene.render();
        command = scene.frameState.commandList[0];
        expect(command.count).toBeLessThan(indexCount);
        expect(command.count).toBe(
          command.owner.data.renderedMesh.indexCountWithoutSkirts
        );
      });
    });

    it("gets underground color", function () {
      expect(globe.undergroundColor).toEqual(Color.BLACK);
    });

    it("sets underground color", function () {
      globe.undergroundColor = Color.RED;

      scene.camera.setView({
        destination: new Cartesian3(
          -524251.65918537375,
          -5316355.5357514685,
          3400179.253223899
        ),
        orientation: new HeadingPitchRoll(
          0.22779127099032603,
          -0.7030060668670961,
          0.0024147223687949193
        ),
      });

      return updateUntilDone(globe).then(function () {
        expect(scene).toRender([255, 0, 0, 255]);
      });
    });

    it("gets underground color by distance", function () {
      expect(globe.undergroundColorAlphaByDistance).toBeDefined();
    });

    it("sets underground color by distance", function () {
      globe.baseColor = Color.BLACK;
      globe.undergroundColor = Color.RED;
      const radius = globe.ellipsoid.maximumRadius;
      globe.undergroundColorAlphaByDistance = new NearFarScalar(
        radius * 0.25,
        0.0,
        radius * 2.0,
        1.0
      );

      scene.camera.setView({
        destination: new Cartesian3(
          -524251.65918537375,
          -5316355.5357514685,
          3400179.253223899
        ),
        orientation: new HeadingPitchRoll(
          0.24245689061958142,
          -0.445653254172905,
          0.0024147223687949193
        ),
      });

      return updateUntilDone(globe).then(function () {
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[0]).toBeLessThan(255);
        });
      });
    });

    it("throws if underground color by distance far is less than near", function () {
      expect(function () {
        globe.undergroundColorAlphaByDistance = new NearFarScalar(
          1.0,
          0.0,
          0.0,
          1.0
        );
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
