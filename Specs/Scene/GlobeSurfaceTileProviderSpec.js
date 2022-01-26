import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { Credit } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { EllipsoidTerrainProvider } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";
import { ContextLimits } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { BlendingState } from "../../Source/Cesium.js";
import { ClippingPlane } from "../../Source/Cesium.js";
import { ClippingPlaneCollection } from "../../Source/Cesium.js";
import { Fog } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import { GlobeSurfaceShaderSet } from "../../Source/Cesium.js";
import { GlobeSurfaceTileProvider } from "../../Source/Cesium.js";
import { ImageryLayerCollection } from "../../Source/Cesium.js";
import { ImagerySplitDirection } from "../../Source/Cesium.js";
import { Model } from "../../Source/Cesium.js";
import { QuadtreeTile } from "../../Source/Cesium.js";
import { QuadtreeTileProvider } from "../../Source/Cesium.js";
import { SceneMode } from "../../Source/Cesium.js";
import { SingleTileImageryProvider } from "../../Source/Cesium.js";
import { WebMapServiceImageryProvider } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/GlobeSurfaceTileProvider",
  function () {
    let scene;

    function forEachRenderedTile(
      quadtreePrimitive,
      minimumTiles,
      maximumTiles,
      callback
    ) {
      let tileCount = 0;
      quadtreePrimitive.forEachRenderedTile(function (tile) {
        ++tileCount;
        callback(tile);
      });

      if (defined(minimumTiles)) {
        expect(tileCount).not.toBeLessThan(minimumTiles);
      }

      if (defined(maximumTiles)) {
        expect(tileCount).not.toBeGreaterThan(maximumTiles);
      }
    }

    /**
     * Repeatedly calls update until the load queue is empty.  You must wrap any code to follow
     * this in a "runs" function.
     */
    function updateUntilDone(globe) {
      // update until the load queue is empty.
      return pollToPromise(function () {
        scene.renderForSpecs();
        return (
          globe._surface.tileProvider.ready &&
          globe._surface._tileLoadQueueHigh.length === 0 &&
          globe._surface._tileLoadQueueMedium.length === 0 &&
          globe._surface._tileLoadQueueLow.length === 0 &&
          globe._surface._debug.tilesWaitingForChildren === 0
        );
      });
    }

    const cameraDestination = new Rectangle(0.0001, 0.0001, 0.003, 0.003);
    function switchViewMode(mode, projection) {
      scene.mode = mode;
      scene.frameState.mapProjection = projection;
      scene.camera.update(scene.mode);
      scene.camera.setView({
        destination: cameraDestination,
      });
    }

    beforeAll(function () {
      scene = createScene();
      scene.frameState.scene3DOnly = false;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.globe = new Globe();
    });

    afterEach(function () {
      scene.imageryLayers.removeAll();
      scene.primitives.removeAll();
    });

    it("conforms to QuadtreeTileProvider interface", function () {
      expect(GlobeSurfaceTileProvider).toConformToInterface(
        QuadtreeTileProvider
      );
    });

    describe(
      "construction",
      function () {
        it("throws if a terrainProvider is not provided", function () {
          function constructWithoutTerrainProvider() {
            return new GlobeSurfaceTileProvider({
              imageryLayers: new ImageryLayerCollection(),
              surfaceShaderSet: new GlobeSurfaceShaderSet(),
            });
          }
          expect(constructWithoutTerrainProvider).toThrowDeveloperError();
        });

        it("throws if a imageryLayers is not provided", function () {
          function constructWithoutImageryLayerCollection() {
            return new GlobeSurfaceTileProvider({
              terrainProvider: new EllipsoidTerrainProvider(),
              surfaceShaderSet: new GlobeSurfaceShaderSet(),
            });
          }
          expect(
            constructWithoutImageryLayerCollection
          ).toThrowDeveloperError();
        });

        it("throws if a surfaceShaderSet is not provided", function () {
          function constructWithoutImageryLayerCollection() {
            return new GlobeSurfaceTileProvider({
              terrainProvider: new EllipsoidTerrainProvider(),
              imageryLayers: new ImageryLayerCollection(),
            });
          }
          expect(
            constructWithoutImageryLayerCollection
          ).toThrowDeveloperError();
        });
      },
      "WebGL"
    );

    describe(
      "layer updating",
      function () {
        it("removing a layer removes it from all tiles", function () {
          const layer = scene.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: "Data/Images/Red16x16.png",
            })
          );

          return updateUntilDone(scene.globe).then(function () {
            // All tiles should have one or more associated images.
            forEachRenderedTile(scene.globe._surface, 1, undefined, function (
              tile
            ) {
              expect(tile.data.imagery.length).toBeGreaterThan(0);
              for (let i = 0; i < tile.data.imagery.length; ++i) {
                expect(tile.data.imagery[i].readyImagery.imageryLayer).toEqual(
                  layer
                );
              }
            });

            scene.imageryLayers.remove(layer);

            // All associated images should be gone.
            forEachRenderedTile(scene.globe._surface, 1, undefined, function (
              tile
            ) {
              expect(tile.data.imagery.length).toEqual(0);
            });
          });
        });

        it("adding a layer adds it to all tiles after update", function () {
          scene.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: "Data/Images/Red16x16.png",
            })
          );

          return updateUntilDone(scene.globe).then(function () {
            // Add another layer
            const layer2 = scene.imageryLayers.addImageryProvider(
              new SingleTileImageryProvider({
                url: "Data/Images/Green4x4.png",
              })
            );

            return updateUntilDone(scene.globe).then(function () {
              // All tiles should have one or more associated images.
              forEachRenderedTile(scene.globe._surface, 1, undefined, function (
                tile
              ) {
                expect(tile.data.imagery.length).toBeGreaterThan(0);
                let hasImageFromLayer2 = false;
                for (let i = 0; i < tile.data.imagery.length; ++i) {
                  let imageryTile = tile.data.imagery[i].readyImagery;
                  if (!defined(imageryTile)) {
                    imageryTile = tile.data.imagery[i].loadingImagery;
                  }
                  if (imageryTile.imageryLayer === layer2) {
                    hasImageFromLayer2 = true;
                  }
                }
                expect(hasImageFromLayer2).toEqual(true);
              });
            });
          });
        });

        it("moving a layer moves the corresponding TileImagery instances on every tile", function () {
          const layer1 = scene.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: "Data/Images/Red16x16.png",
            })
          );
          const layer2 = scene.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: "Data/Images/Green4x4.png",
            })
          );

          return updateUntilDone(scene.globe).then(function () {
            forEachRenderedTile(scene.globe._surface, 1, undefined, function (
              tile
            ) {
              expect(tile.data.imagery.length).toBeGreaterThan(0);
              let indexOfFirstLayer1 = tile.data.imagery.length;
              let indexOfLastLayer1 = -1;
              let indexOfFirstLayer2 = tile.data.imagery.length;
              for (let i = 0; i < tile.data.imagery.length; ++i) {
                if (tile.data.imagery[i].readyImagery.imageryLayer === layer1) {
                  indexOfFirstLayer1 = Math.min(indexOfFirstLayer1, i);
                  indexOfLastLayer1 = i;
                } else {
                  expect(
                    tile.data.imagery[i].readyImagery.imageryLayer
                  ).toEqual(layer2);
                  indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                }
              }
              expect(indexOfFirstLayer1).toBeLessThan(indexOfFirstLayer2);
              expect(indexOfLastLayer1).toBeLessThan(indexOfFirstLayer2);
            });

            scene.imageryLayers.raiseToTop(layer1);

            return updateUntilDone(scene.globe).then(function () {
              forEachRenderedTile(scene.globe._surface, 1, undefined, function (
                tile
              ) {
                expect(tile.data.imagery.length).toBeGreaterThan(0);
                let indexOfFirstLayer2 = tile.data.imagery.length;
                let indexOfLastLayer2 = -1;
                let indexOfFirstLayer1 = tile.data.imagery.length;
                for (let i = 0; i < tile.data.imagery.length; ++i) {
                  if (
                    tile.data.imagery[i].readyImagery.imageryLayer === layer2
                  ) {
                    indexOfFirstLayer2 = Math.min(indexOfFirstLayer2, i);
                    indexOfLastLayer2 = i;
                  } else {
                    expect(
                      tile.data.imagery[i].readyImagery.imageryLayer
                    ).toEqual(layer1);
                    indexOfFirstLayer1 = Math.min(indexOfFirstLayer1, i);
                  }
                }
                expect(indexOfFirstLayer2).toBeLessThan(indexOfFirstLayer1);
                expect(indexOfLastLayer2).toBeLessThan(indexOfFirstLayer1);
              });
            });
          });
        });

        it("adding a layer creates its skeletons only once", function () {
          scene.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: "Data/Images/Red16x16.png",
            })
          );

          return updateUntilDone(scene.globe).then(function () {
            // Add another layer
            const layer2 = scene.imageryLayers.addImageryProvider(
              new SingleTileImageryProvider({
                url: "Data/Images/Green4x4.png",
              })
            );

            return updateUntilDone(scene.globe).then(function () {
              // All tiles should have one or more associated images.
              forEachRenderedTile(scene.globe._surface, 1, undefined, function (
                tile
              ) {
                expect(tile.data.imagery.length).toBeGreaterThan(0);
                let tilesFromLayer2 = 0;
                for (let i = 0; i < tile.data.imagery.length; ++i) {
                  let imageryTile = tile.data.imagery[i].readyImagery;
                  if (!defined(imageryTile)) {
                    imageryTile = tile.data.imagery[i].loadingImagery;
                  }
                  if (imageryTile.imageryLayer === layer2) {
                    ++tilesFromLayer2;
                  }
                }
                expect(tilesFromLayer2).toBe(1);
              });
            });
          });
        });

        it("calling _reload adds a callback per layer per tile", function () {
          const layer1 = scene.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: "Data/Images/Red16x16.png",
            })
          );

          const layer2 = scene.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: "Data/Images/Green4x4.png",
            })
          );

          return updateUntilDone(scene.globe).then(function () {
            // Verify that each tile has 2 imagery objects and no loaded callbacks
            forEachRenderedTile(scene.globe._surface, 1, undefined, function (
              tile
            ) {
              expect(tile.data.imagery.length).toBe(2);
              expect(Object.keys(tile._loadedCallbacks).length).toBe(0);
            });

            // Reload each layer
            layer1._imageryProvider._reload();
            layer2._imageryProvider._reload();

            // These should be ignored
            layer1._imageryProvider._reload();
            layer2._imageryProvider._reload();

            // Verify that each tile has 4 imagery objects (the old imagery and the reloaded imagery for each layer)
            //  and also has 2 callbacks so the old imagery will be removed once loaded.
            forEachRenderedTile(scene.globe._surface, 1, undefined, function (
              tile
            ) {
              expect(tile.data.imagery.length).toBe(4);
              expect(Object.keys(tile._loadedCallbacks).length).toBe(2);
            });

            return updateUntilDone(scene.globe).then(function () {
              // Verify the old imagery was removed and the callbacks are no longer there
              forEachRenderedTile(scene.globe._surface, 1, undefined, function (
                tile
              ) {
                expect(tile.data.imagery.length).toBe(2);
                expect(Object.keys(tile._loadedCallbacks).length).toBe(0);
              });
            });
          });
        });
      },
      "WebGL"
    );

    it("renders in 2D geographic", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      switchViewMode(
        SceneMode.SCENE2D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("renders in 2D web mercator", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      switchViewMode(
        SceneMode.SCENE2D,
        new WebMercatorProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("renders in Columbus View geographic", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      switchViewMode(
        SceneMode.COLUMBUS_VIEW,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("renders in Columbus View web mercator", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      switchViewMode(
        SceneMode.COLUMBUS_VIEW,
        new WebMercatorProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 128, 255]);
      });
    });

    it("renders in 3D", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("renders in 3D (2)", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    describe("fog", function () {
      it("culls tiles in full fog", function () {
        expect(scene).toRender([0, 0, 0, 255]);
        scene.imageryLayers.addImageryProvider(
          new SingleTileImageryProvider({
            url: "Data/Images/Red16x16.png",
          })
        );
        const oldFog = scene.fog;
        scene.fog = new Fog();
        switchViewMode(
          SceneMode.SCENE3D,
          new GeographicProjection(Ellipsoid.WGS84)
        );
        scene.camera.lookUp(1.2); // Horizon-view

        return updateUntilDone(scene.globe).then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);

          scene.fog.enabled = true;
          scene.fog.density = 1.0;
          scene.fog.screenSpaceErrorFactor = 0.0;

          expect(scene).toRender([0, 0, 0, 255]);

          scene.fog = oldFog;
        });
      });

      it("culls tiles because of increased SSE", function () {
        expect(scene).toRender([0, 0, 0, 255]);
        scene.imageryLayers.addImageryProvider(
          new SingleTileImageryProvider({
            url: "Data/Images/Red16x16.png",
          })
        );
        const oldFog = scene.fog;
        scene.fog = new Fog();
        switchViewMode(
          SceneMode.SCENE3D,
          new GeographicProjection(Ellipsoid.WGS84)
        );
        scene.camera.lookUp(1.2); // Horizon-view

        return updateUntilDone(scene.globe).then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);

          scene.fog.enabled = true;
          scene.fog.density = 0.001;
          scene.fog.screenSpaceErrorFactor = 0.0;
          let result;
          expect(scene).toRenderAndCall(function (rgba) {
            result = rgba;
            expect(rgba).not.toEqual([0, 0, 0, 255]);
          });

          scene.fog.screenSpaceErrorFactor = 10000.0;

          expect(scene).notToRender(result);

          scene.fog = oldFog;
        });
      });
    });

    it("can change baseColor", function () {
      expect(scene).toRender([0, 0, 0, 255]);
      scene.globe.baseColor = Color.RED;
      scene.fog.enabled = false;
      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).toRender([255, 0, 0, 255]);
      });
    });

    it("renders in 3D and then Columbus View", function () {
      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );
      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        switchViewMode(
          SceneMode.COLUMBUS_VIEW,
          new GeographicProjection(Ellipsoid.WGS84)
        );

        return updateUntilDone(scene.globe).then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
        });
      });
    });

    it("renders even if imagery root tiles fail to load", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      const providerWithInvalidRootTiles = new WebMapServiceImageryProvider({
        url: "/invalid",
        layers: "invalid",
      });

      scene.imageryLayers.addImageryProvider(providerWithInvalidRootTiles);
      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);
      });
    });

    it("passes layer adjustment values as uniforms", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      const layer = scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      layer.alpha = 0.123;
      layer.nightAlpha = 0.658;
      layer.dayAlpha = 0.356;
      layer.brightness = 0.456;
      layer.contrast = 0.654;
      layer.gamma = 0.321;
      layer.saturation = 0.123;
      layer.hue = 0.456;
      layer.splitDirection = ImagerySplitDirection.LEFT;

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        let tileCommandCount = 0;
        const commandList = scene.frameState.commandList;

        for (let i = 0; i < commandList.length; ++i) {
          const command = commandList[i];

          const uniforms = command.uniformMap;
          if (!defined(uniforms) || !defined(uniforms.u_dayTextureAlpha)) {
            continue;
          }

          ++tileCommandCount;

          expect(uniforms.u_dayTextureAlpha()).toEqual([0.123]);
          expect(uniforms.u_dayTextureNightAlpha()).toEqual([0.658]);
          expect(uniforms.u_dayTextureDayAlpha()).toEqual([0.356]);
          expect(uniforms.u_dayTextureBrightness()).toEqual([0.456]);
          expect(uniforms.u_dayTextureContrast()).toEqual([0.654]);
          expect(uniforms.u_dayTextureOneOverGamma()).toEqual([1.0 / 0.321]);
          expect(uniforms.u_dayTextureSaturation()).toEqual([0.123]);
          expect(uniforms.u_dayTextureHue()).toEqual([0.456]);
          expect(uniforms.u_dayTextureSplit()).toEqual([
            ImagerySplitDirection.LEFT,
          ]);
        }

        expect(tileCommandCount).toBeGreaterThan(0);
      });
    });

    it("renders imagery cutout", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      const layer = scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );
      layer.cutoutRectangle = cameraDestination;

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      let baseColor;
      return updateUntilDone(scene.globe)
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            baseColor = rgba;
            expect(rgba).not.toEqual([0, 0, 0, 255]);
          });
          layer.cutoutRectangle = undefined;

          return updateUntilDone(scene.globe);
        })
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(baseColor);
            expect(rgba).not.toEqual([0, 0, 0, 255]);
          });
        });
    });

    it("renders imagery with color-to-alpha", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      const layer = scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      let layerColor;
      return updateUntilDone(scene.globe)
        .then(function () {
          expect(scene).toRenderAndCall(function (rgba) {
            layerColor = rgba;
            // Expect the layer color to be mostly red
            expect(layerColor[0]).toBeGreaterThan(layerColor[1]);
            expect(layerColor[0]).toBeGreaterThan(layerColor[2]);
          });

          layer.colorToAlpha = new Color(1.0, 0.0, 0.0);
          layer.colorToAlphaThreshold = 0.1;

          return updateUntilDone(scene.globe);
        })
        .then(function () {
          const commandList = scene.frameState.commandList;

          for (let i = 0; i < commandList.length; ++i) {
            const command = commandList[i];

            const uniforms = command.uniformMap;
            if (!defined(uniforms) || !defined(uniforms.u_dayTextureAlpha)) {
              continue;
            }

            expect(uniforms.u_colorsToAlpha()).toEqual([
              new Cartesian4(1.0, 0.0, 0.0, 0.1),
            ]);
          }

          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(layerColor);
          });
        });
    });

    it("skips layer with uniform alpha value of zero", function () {
      const layer = scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
        })
      );

      layer.alpha = 0.0;

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        let tileCommandCount = 0;
        const commandList = scene.frameState.commandList;

        for (let i = 0; i < commandList.length; ++i) {
          const command = commandList[i];

          const uniforms = command.uniformMap;
          if (!defined(uniforms) || !defined(uniforms.u_dayTextureAlpha)) {
            continue;
          }

          ++tileCommandCount;

          expect(uniforms.u_dayTextureAlpha()).toEqual([]);
        }

        expect(tileCommandCount).toBeGreaterThan(0);
      });
    });

    it("can render more imagery layers than the available texture units", function () {
      for (let i = 0; i < ContextLimits.maximumTextureImageUnits + 1; ++i) {
        scene.imageryLayers.addImageryProvider(
          new SingleTileImageryProvider({
            url: "Data/Images/Red16x16.png",
          })
        );
      }

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        const renderStateWithAlphaBlending = RenderState.fromCache({
          blending: BlendingState.ALPHA_BLEND,
        });

        const drawCommandsPerTile = {};
        const commandList = scene.frameState.commandList;

        for (let i = 0; i < commandList.length; ++i) {
          const command = commandList[i];

          if (command.owner instanceof QuadtreeTile) {
            const tile = command.owner;
            const key = "L" + tile.level + "X" + tile.x + "Y" + tile.y;
            if (!defined(drawCommandsPerTile[key])) {
              drawCommandsPerTile[key] = 0;

              // The first draw command for each tile should use a non-alpha-blending render state.
              expect(command.renderState.blending).not.toEqual(
                renderStateWithAlphaBlending.blending
              );
            } else {
              // Successive draw commands per tile should alpha blend.
              expect(command.renderState.blending).toEqual(
                renderStateWithAlphaBlending.blending
              );
              expect(command.uniformMap.u_initialColor().w).toEqual(0.0);
            }

            ++drawCommandsPerTile[key];
          }
        }

        let tileCount = 0;
        for (const tileID in drawCommandsPerTile) {
          if (drawCommandsPerTile.hasOwnProperty(tileID)) {
            ++tileCount;
            expect(drawCommandsPerTile[tileID]).toBeGreaterThanOrEqualTo(2);
          }
        }

        expect(tileCount).toBeGreaterThanOrEqualTo(1);
      });
    });

    it("adds terrain and imagery credits to the CreditDisplay", function () {
      const imageryCredit = new Credit("imagery credit");
      scene.imageryLayers.addImageryProvider(
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
          credit: imageryCredit,
        })
      );

      const terrainCredit = new Credit("terrain credit");
      scene.terrainProvider = new CesiumTerrainProvider({
        url: "https://s3.amazonaws.com/cesiumjs/smallTerrain",
        credit: terrainCredit,
      });

      return updateUntilDone(scene.globe).then(function () {
        const creditDisplay = scene.frameState.creditDisplay;
        creditDisplay.showLightbox();
        expect(
          creditDisplay._currentFrameCredits.lightboxCredits.values
        ).toContain(imageryCredit);
        expect(
          creditDisplay._currentFrameCredits.lightboxCredits.values
        ).toContain(terrainCredit);
        creditDisplay.hideLightbox();
      });
    });

    describe(
      "switching terrain providers",
      function () {
        it("clears the replacement queue", function () {
          return updateUntilDone(scene.globe).then(function () {
            const surface = scene.globe._surface;
            const replacementQueue = surface._tileReplacementQueue;
            expect(replacementQueue.count).toBeGreaterThan(0);
            const oldTile = replacementQueue.head;

            surface.tileProvider.terrainProvider = new EllipsoidTerrainProvider();

            scene.renderForSpecs();

            expect(replacementQueue.count).toBeGreaterThan(0);
            expect(replacementQueue.head).not.toBe(oldTile);
          });
        });

        it("recreates the level zero tiles", function () {
          const surface = scene.globe._surface;

          scene.renderForSpecs();

          let levelZeroTiles = surface._levelZeroTiles;
          expect(levelZeroTiles.length).toBe(2);

          const levelZero0 = levelZeroTiles[0];
          const levelZero1 = levelZeroTiles[1];

          surface.tileProvider.terrainProvider = new EllipsoidTerrainProvider();

          scene.renderForSpecs();
          scene.renderForSpecs();

          levelZeroTiles = surface._levelZeroTiles;
          expect(levelZeroTiles[0]).not.toBe(levelZero0);
          expect(levelZeroTiles[1]).not.toBe(levelZero1);
        });

        it("does nothing if the new provider is the same as the old", function () {
          const surface = scene.globe._surface;
          const provider = surface.tileProvider.terrainProvider;

          scene.renderForSpecs();

          let levelZeroTiles = surface._levelZeroTiles;
          expect(levelZeroTiles.length).toBe(2);

          const levelZero0 = levelZeroTiles[0];
          const levelZero1 = levelZeroTiles[1];

          surface.tileProvider.terrainProvider = provider;

          scene.renderForSpecs();

          levelZeroTiles = surface._levelZeroTiles;
          expect(levelZeroTiles[0]).toBe(levelZero0);
          expect(levelZeroTiles[1]).toBe(levelZero1);
        });
      },
      "WebGL"
    );

    it("renders back side of globe when camera is near the poles", function () {
      const camera = scene.camera;
      camera.position = new Cartesian3(
        2909078.1077849553,
        -38935053.40234136,
        -63252400.94628872
      );
      camera.direction = new Cartesian3(
        -0.03928753135806185,
        0.44884096070717633,
        0.8927476025569903
      );
      camera.up = new Cartesian3(
        0.00002847975895320034,
        -0.8934368803055558,
        0.4491887577613425
      );
      camera.right = new Cartesian3(
        0.99922794650124,
        0.017672942642764363,
        0.03508814656908402
      );
      scene.cullingVolume = camera.frustum.computeCullingVolume(
        camera.position,
        camera.direction,
        camera.up
      );

      return updateUntilDone(scene.globe).then(function () {
        // Both level zero tiles should be rendered.
        forEachRenderedTile(scene.globe._surface, 2, 2, function (tile) {});
      });
    });

    it("throws if baseColor is assigned undefined", function () {
      expect(function () {
        scene.globe._surface.tileProvider.baseColor = undefined;
      }).toThrowDeveloperError();
    });

    it("clipping planes selectively disable rendering globe surface", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        let result;
        expect(scene).toRenderAndCall(function (rgba) {
          result = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        const clipPlane = new ClippingPlane(Cartesian3.UNIT_Z, -10000.0);
        scene.globe.clippingPlanes = new ClippingPlaneCollection({
          planes: [clipPlane],
        });

        expect(scene).notToRender(result);

        clipPlane.distance = 0.0;

        expect(scene).toRender(result);

        scene.globe.clippingPlanes = undefined;
      });
    });

    it("renders with clipping planes edge styling on globe surface", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        let result;
        expect(scene).toRenderAndCall(function (rgba) {
          result = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        const clipPlane = new ClippingPlane(Cartesian3.UNIT_Z, -1000.0);
        scene.globe.clippingPlanes = new ClippingPlaneCollection({
          planes: [clipPlane],
          edgeWidth: 20.0,
          edgeColor: Color.RED,
        });

        expect(scene).notToRender(result);

        clipPlane.distance = 0.0;

        expect(scene).toRender([255, 0, 0, 255]);

        scene.globe.clippingPlanes = undefined;
      });
    });

    it("renders with multiple clipping planes clipping regions according to the value of unionClippingPlane", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        let result;
        expect(scene).toRenderAndCall(function (rgba) {
          result = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        scene.globe.clippingPlanes = new ClippingPlaneCollection({
          planes: [
            new ClippingPlane(Cartesian3.UNIT_Z, -10000.0),
            new ClippingPlane(Cartesian3.UNIT_X, -1000.0),
          ],
          unionClippingRegions: true,
        });

        expect(scene).notToRender(result);

        scene.globe.clippingPlanes.unionClippingRegions = false;

        expect(scene).toRender(result);

        scene.globe.clippingPlanes = undefined;
      });
    });

    it("No extra tiles culled with no clipping planes", function () {
      const globe = scene.globe;
      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(globe).then(function () {
        expect(scene.frameState.commandList.length).toBe(4);
      });
    });

    it("Culls tiles when completely inside clipping region", function () {
      const globe = scene.globe;
      globe.clippingPlanes = new ClippingPlaneCollection({
        planes: [new ClippingPlane(Cartesian3.UNIT_Z, -1000000.0)],
      });

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(globe).then(function () {
        const surface = globe._surface;
        const tile = surface._levelZeroTiles[0];
        expect(tile.isClipped).toBe(true);
        expect(scene.frameState.commandList.length).toBe(2);
      });
    });

    it("Doesn't cull, but clips tiles when intersecting clipping plane", function () {
      const globe = scene.globe;
      globe.clippingPlanes = new ClippingPlaneCollection({
        planes: [new ClippingPlane(Cartesian3.UNIT_Z, 0.0)],
      });

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(globe).then(function () {
        const surface = globe._surface;
        const tile = surface._levelZeroTiles[0];
        expect(tile.isClipped).toBe(true);
        expect(scene.frameState.commandList.length).toBe(4);
      });
    });

    it("Doesn't cull or clip tiles when completely outside clipping region", function () {
      const globe = scene.globe;
      globe.clippingPlanes = new ClippingPlaneCollection({
        planes: [new ClippingPlane(Cartesian3.UNIT_Z, 10000000.0)],
      });

      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(globe).then(function () {
        const surface = globe._surface;
        const tile = surface._levelZeroTiles[0];
        expect(tile.isClipped).toBe(false);
        expect(scene.frameState.commandList.length).toBe(4);
      });
    });

    it("destroys attached ClippingPlaneCollections that have been detached", function () {
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [new ClippingPlane(Cartesian3.UNIT_Z, 10000000.0)],
      });
      const globe = scene.globe;
      globe.clippingPlanes = clippingPlanes;
      expect(clippingPlanes.isDestroyed()).toBe(false);

      globe.clippingPlanes = undefined;
      expect(clippingPlanes.isDestroyed()).toBe(true);
    });

    it("throws a DeveloperError when given a ClippingPlaneCollection attached to a Model", function () {
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [new ClippingPlane(Cartesian3.UNIT_Z, 10000000.0)],
      });
      const model = scene.primitives.add(
        Model.fromGltf({
          url: "./Data/Models/Box/CesiumBoxTest.gltf",
        })
      );
      model.clippingPlanes = clippingPlanes;
      const globe = scene.globe;

      expect(function () {
        globe.clippingPlanes = clippingPlanes;
      }).toThrowDeveloperError();
    });

    it("cartographicLimitRectangle selectively enables rendering globe surface", function () {
      expect(scene).toRender([0, 0, 0, 255]);
      switchViewMode(
        SceneMode.COLUMBUS_VIEW,
        new GeographicProjection(Ellipsoid.WGS84)
      );
      let result;
      return updateUntilDone(scene.globe)
        .then(function () {
          expect(scene).notToRender([0, 0, 0, 255]);
          expect(scene).toRenderAndCall(function (rgba) {
            result = rgba;
            expect(rgba).not.toEqual([0, 0, 0, 255]);
          });
          scene.globe.cartographicLimitRectangle = Rectangle.fromDegrees(
            -2,
            -2,
            -1,
            -1
          );
          expect(scene).notToRender(result);
          scene.camera.setView({
            destination: scene.globe.cartographicLimitRectangle,
          });
          return updateUntilDone(scene.globe);
        })
        .then(function () {
          expect(scene).toRender(result);
        });
    });

    it("cartographicLimitRectangle defaults to Rectangle.MAX_VALUE", function () {
      scene.globe.cartographicLimitRectangle = undefined;
      expect(
        scene.globe.cartographicLimitRectangle.equals(Rectangle.MAX_VALUE)
      ).toBe(true);
    });

    it("cartographicLimitRectangle culls tiles outside the region", function () {
      switchViewMode(
        SceneMode.COLUMBUS_VIEW,
        new GeographicProjection(Ellipsoid.WGS84)
      );
      let unculledCommandCount;
      return updateUntilDone(scene.globe)
        .then(function () {
          unculledCommandCount = scene.frameState.commandList.length;
          scene.globe.cartographicLimitRectangle = Rectangle.fromDegrees(
            -2,
            -2,
            -1,
            -1
          );
          return updateUntilDone(scene.globe);
        })
        .then(function () {
          expect(unculledCommandCount).toBeGreaterThan(
            scene.frameState.commandList.length
          );
        });
    });

    it("cartographicLimitRectangle may cross the antimeridian", function () {
      switchViewMode(
        SceneMode.SCENE2D,
        new GeographicProjection(Ellipsoid.WGS84)
      );
      let unculledCommandCount;
      return updateUntilDone(scene.globe)
        .then(function () {
          unculledCommandCount = scene.frameState.commandList.length;
          scene.globe.cartographicLimitRectangle = Rectangle.fromDegrees(
            179,
            -2,
            -179,
            -1
          );
          return updateUntilDone(scene.globe);
        })
        .then(function () {
          expect(unculledCommandCount).toBeGreaterThan(
            scene.frameState.commandList.length
          );
        });
    });

    it("disables skirts and enables back face culling when camera is underground", function () {
      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );

      return updateUntilDone(scene.globe)
        .then(function () {
          const command = scene.frameState.commandList[0];
          expect(command.count).toBe(
            command.owner.data.renderedMesh.indices.length
          ); // Has skirts
          expect(command.renderState.cull.enabled).toBe(true); // Has back face culling

          // Look underground
          scene.camera.setView({
            destination: new Cartesian3(
              -746658.0557573901,
              -5644191.0002196245,
              2863585.099969967
            ),
            orientation: new HeadingPitchRoll(
              0.3019699121236403,
              0.07316306869231592,
              0.0007089903642230055
            ),
          });
          return updateUntilDone(scene.globe);
        })
        .then(function () {
          const command = scene.frameState.commandList[0];
          expect(command.count).toBe(
            command.owner.data.renderedMesh.indexCountWithoutSkirts
          ); // No skirts
          expect(command.renderState.cull.enabled).toBe(false); // No back face culling
        });
    });

    it("Detects change in terrain exaggeration", function () {
      switchViewMode(
        SceneMode.SCENE3D,
        new GeographicProjection(Ellipsoid.WGS84)
      );
      scene.camera.flyHome(0.0);

      scene.globe.terrainExaggeration = 1.0;
      scene.globe.terrainExaggerationRelativeHeight = 0.0;

      return updateUntilDone(scene.globe).then(function () {
        forEachRenderedTile(scene.globe._surface, 1, undefined, function (
          tile
        ) {
          const surfaceTile = tile.data;
          const encoding = surfaceTile.mesh.encoding;
          const boundingSphere = surfaceTile.tileBoundingRegion.boundingSphere;
          expect(encoding.exaggeration).toEqual(1.0);
          expect(encoding.hasGeodeticSurfaceNormals).toEqual(false);
          expect(boundingSphere.radius).toBeLessThan(7000000.0);
        });

        scene.globe.terrainExaggeration = 2.0;
        scene.globe.terrainExaggerationRelativeHeight = -1000000.0;

        return updateUntilDone(scene.globe).then(function () {
          forEachRenderedTile(scene.globe._surface, 1, undefined, function (
            tile
          ) {
            const surfaceTile = tile.data;
            const encoding = surfaceTile.mesh.encoding;
            const boundingSphere =
              surfaceTile.tileBoundingRegion.boundingSphere;
            expect(encoding.exaggeration).toEqual(2.0);
            expect(encoding.hasGeodeticSurfaceNormals).toEqual(true);
            expect(boundingSphere.radius).toBeGreaterThan(7000000.0);
          });

          scene.globe.terrainExaggeration = 1.0;
          scene.globe.terrainExaggerationRelativeHeight = 0.0;

          return updateUntilDone(scene.globe).then(function () {
            forEachRenderedTile(scene.globe._surface, 1, undefined, function (
              tile
            ) {
              const surfaceTile = tile.data;
              const encoding = surfaceTile.mesh.encoding;
              const boundingSphere =
                surfaceTile.tileBoundingRegion.boundingSphere;
              expect(encoding.exaggeration).toEqual(1.0);
              expect(encoding.hasGeodeticSurfaceNormals).toEqual(false);
              expect(boundingSphere.radius).toBeLessThan(7000000.0);
            });
          });
        });
      });
    });
  },
  "WebGL"
);
