import {
  BoundingSphere,
  Cartesian3,
  Cesium3DTileset,
  Cesium3DTilesVoxelProvider,
  CesiumWidget,
  Clock,
  ClockRange,
  ClockStep,
  CreditDisplay,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  DataSourceClock,
  DataSourceCollection,
  defaultValue,
  defined,
  EllipsoidTerrainProvider,
  Entity,
  HeadingPitchRange,
  JulianDate,
  Matrix4,
  Rectangle,
  ScreenSpaceEventHandler,
  TimeDynamicPointCloud,
  TimeIntervalCollection,
  VoxelPrimitive,
  WebMercatorProjection,
  Camera,
  ImageryLayer,
  ImageryLayerCollection,
  Scene,
  SceneMode,
  SkyBox,
  TileCoordinatesImageryProvider,
} from "../../index.js";

import DomEventSimulator from "../../../../Specs/DomEventSimulator.js";
import getWebGLStub from "../../../../Specs/getWebGLStub.js";
import MockDataSource from "../../../../Specs/MockDataSource.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Widget/CesiumWidget",
  function () {
    let container;
    let widget;
    beforeEach(function () {
      container = document.createElement("div");
      container.id = "container";
      container.style.width = "1px";
      container.style.height = "1px";
      container.style.overflow = "hidden";
      container.style.position = "relative";
      document.body.appendChild(container);
    });

    afterEach(function () {
      if (widget && !widget.isDestroyed()) {
        widget = widget.destroy();
      }
      document.body.removeChild(container);
    });

    const testProvider = {
      tilingScheme: {
        tileXYToRectangle: function () {
          return new Rectangle();
        },
      },
      rectangle: Rectangle.MAX_VALUE,
    };

    function createCesiumWidget(container, options) {
      options = defaultValue(options, {});
      options.contextOptions = defaultValue(options.contextOptions, {});
      options.contextOptions.webgl = defaultValue(
        options.contextOptions.webgl,
        {},
      );
      if (!!window.webglStub) {
        options.contextOptions.getWebGLStub = getWebGLStub;
      }

      return new CesiumWidget(container, options);
    }

    it("can create, render, and destroy", function () {
      widget = createCesiumWidget(container);
      expect(widget.isDestroyed()).toEqual(false);
      expect(widget.container).toBeInstanceOf(HTMLElement);
      expect(widget.canvas).toBeInstanceOf(HTMLElement);
      expect(widget.creditDisplay).toBeInstanceOf(CreditDisplay);
      expect(widget.creditContainer).toBeInstanceOf(HTMLElement);
      expect(widget.creditViewport).toBeInstanceOf(HTMLElement);
      expect(widget.scene).toBeInstanceOf(Scene);
      expect(widget.imageryLayers).toBeInstanceOf(ImageryLayerCollection);
      expect(widget.terrainProvider).toBeInstanceOf(EllipsoidTerrainProvider);
      expect(widget.camera).toBeInstanceOf(Camera);
      expect(widget.clock).toBeInstanceOf(Clock);
      expect(widget.screenSpaceEventHandler).toBeInstanceOf(
        ScreenSpaceEventHandler,
      );
      expect(widget.useBrowserRecommendedResolution).toBe(true);
      widget.render();
      widget.destroy();
      expect(widget.isDestroyed()).toEqual(true);
    });

    it("can pass id string for container", function () {
      widget = createCesiumWidget("container");
    });

    it("sets expected options clock", function () {
      const options = {
        clock: new Clock(),
      };
      widget = createCesiumWidget(container, options);
      expect(widget.clock).toBe(options.clock);
    });

    it("can set shouldAnimate", function () {
      const options = {
        shouldAnimate: true,
      };
      widget = createCesiumWidget(container, options);
      expect(widget.clock.shouldAnimate).toBe(true);
    });

    it("can set scene mode 2D", function () {
      widget = createCesiumWidget(container, {
        sceneMode: SceneMode.SCENE2D,
      });
      widget.scene.completeMorph();
      expect(widget.scene.mode).toBe(SceneMode.SCENE2D);
    });

    it("can set map projection", function () {
      const mapProjection = new WebMercatorProjection();

      widget = createCesiumWidget(container, {
        mapProjection: mapProjection,
      });
      expect(widget.scene.mapProjection).toEqual(mapProjection);
    });

    it("can set scene mode Columbus", function () {
      widget = createCesiumWidget(container, {
        sceneMode: SceneMode.COLUMBUS_VIEW,
      });
      widget.scene.completeMorph();
      expect(widget.scene.mode).toBe(SceneMode.COLUMBUS_VIEW);
    });

    it("can disable render loop", function () {
      widget = createCesiumWidget(container, {
        useDefaultRenderLoop: false,
      });
      expect(widget.useDefaultRenderLoop).toBe(false);
    });

    it("can set target frame rate", function () {
      widget = createCesiumWidget(container, {
        targetFrameRate: 23,
      });
      expect(widget.targetFrameRate).toBe(23);
    });

    it("sets expected options baseLayer", function () {
      const provider = new TileCoordinatesImageryProvider();
      const options = {
        baseLayer: new ImageryLayer(provider),
      };
      widget = createCesiumWidget(container, options);
      const imageryLayers = widget.scene.imageryLayers;
      expect(imageryLayers.length).toEqual(1);
      expect(imageryLayers.get(0).imageryProvider).toBe(provider);
    });

    it("does not create imagery if baseLayer option is false", function () {
      const options = {
        baseLayer: false,
      };
      widget = createCesiumWidget(container, options);
      const imageryLayers = widget.scene.imageryLayers;
      expect(imageryLayers.length).toEqual(0);
    });

    it("sets expected options terrainProvider", function () {
      const options = {
        terrainProvider: new EllipsoidTerrainProvider(),
      };
      widget = createCesiumWidget(container, options);
      expect(widget.terrainProvider).toBe(options.terrainProvider);

      const anotherProvider = new EllipsoidTerrainProvider();
      widget.terrainProvider = anotherProvider;
      expect(widget.terrainProvider).toBe(anotherProvider);
    });

    it("does not create a globe if option is false", function () {
      widget = createCesiumWidget(container, {
        globe: false,
      });
      expect(widget.scene.globe).not.toBeDefined();
    });

    it("sky atmopshere is hidden by default if a globe if option is false", function () {
      widget = createCesiumWidget(container, {
        globe: false,
      });
      expect(widget.scene.skyAtmosphere.show).toBeFalse();
    });

    it("does not create a skyBox if option is false", function () {
      widget = createCesiumWidget(container, {
        skyBox: false,
      });
      expect(widget.scene.skyBox).not.toBeDefined();
    });

    it("does not create a skyAtmosphere if option is false", function () {
      widget = createCesiumWidget(container, {
        skyAtmosphere: false,
      });
      expect(widget.scene.skyAtmosphere).not.toBeDefined();
    });

    it("sets expected options skyBox", function () {
      const options = {
        skyBox: new SkyBox({
          sources: {
            positiveX: "./Data/Images/Blue.png",
            negativeX: "./Data/Images/Green.png",
            positiveY: "./Data/Images/Blue.png",
            negativeY: "./Data/Images/Green.png",
            positiveZ: "./Data/Images/Blue.png",
            negativeZ: "./Data/Images/Green.png",
          },
        }),
      };
      widget = createCesiumWidget(container, options);
      expect(widget.scene.skyBox).toBe(options.skyBox);
    });

    it("can set dataSources at construction", function () {
      const collection = new DataSourceCollection();
      widget = createCesiumWidget(container, {
        dataSources: collection,
      });
      expect(widget.dataSources).toBe(collection);
    });

    it("default DataSourceCollection is destroyed when widget is destroyed", function () {
      widget = createCesiumWidget(container);
      const dataSources = widget.dataSources;
      widget.destroy();
      expect(dataSources.isDestroyed()).toBe(true);
    });

    it("specified DataSourceCollection is not destroyed when widget is destroyed", function () {
      const collection = new DataSourceCollection();
      widget = createCesiumWidget(container, {
        dataSources: collection,
      });
      widget.destroy();
      expect(collection.isDestroyed()).toBe(false);
    });

    it("can set contextOptions", function () {
      const webglOptions = {
        alpha: true,
        depth: true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
        stencil: true,
        antialias: false,
        premultipliedAlpha: true, // Workaround IE 11.0.8, which does not honor false.
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      };
      const contextOptions = {
        allowTextureFilterAnisotropic: false,
        webgl: webglOptions,
      };

      widget = createCesiumWidget(container, {
        contextOptions: contextOptions,
      });

      const context = widget.scene.context;
      const contextAttributes = context._gl.getContextAttributes();

      expect(context.options.allowTextureFilterAnisotropic).toEqual(false);
      expect(contextAttributes.alpha).toEqual(webglOptions.alpha);
      expect(contextAttributes.depth).toEqual(webglOptions.depth);
      expect(contextAttributes.stencil).toEqual(webglOptions.stencil);
      expect(contextAttributes.antialias).toEqual(webglOptions.antialias);
      expect(contextAttributes.premultipliedAlpha).toEqual(
        webglOptions.premultipliedAlpha,
      );
      expect(contextAttributes.powerPreference).toEqual(
        webglOptions.powerPreference,
      );
      expect(contextAttributes.preserveDrawingBuffer).toEqual(
        webglOptions.preserveDrawingBuffer,
      );
    });

    it("can disable Order Independent Translucency", function () {
      widget = createCesiumWidget(container, {
        orderIndependentTranslucency: false,
      });
      expect(widget.scene.orderIndependentTranslucency).toBe(false);
    });

    it("can enable requestRenderMode", function () {
      widget = createCesiumWidget(container, {
        requestRenderMode: true,
      });

      expect(widget.scene.requestRenderMode).toBe(true);
    });

    it("can set maximumRenderTimeChange", function () {
      widget = createCesiumWidget(container, {
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      });

      expect(widget.scene.maximumRenderTimeChange).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it("can get and set trackedEntity", function () {
      widget = createCesiumWidget(container);

      const entity = new Entity();
      entity.position = new ConstantProperty(
        new Cartesian3(123456, 123456, 123456),
      );

      widget.trackedEntity = entity;
      expect(widget.trackedEntity).toBe(entity);

      widget.trackedEntity = undefined;
      expect(widget.trackedEntity).toBeUndefined();
    });

    it("raises an event when the tracked entity changes", function () {
      const widget = createCesiumWidget(container);

      const dataSource = new MockDataSource();
      widget.dataSources.add(dataSource);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(123456, 123456, 123456),
      );

      dataSource.entities.add(entity);

      let myEntity;
      widget.trackedEntityChanged.addEventListener(function (newValue) {
        myEntity = newValue;
      });
      widget.trackedEntity = entity;
      expect(myEntity).toBe(entity);

      widget.trackedEntity = undefined;
      expect(myEntity).toBeUndefined();

      widget.destroy();
    });

    it("stops tracking when tracked object is removed", function () {
      widget = createCesiumWidget(container);

      const entity = new Entity();
      entity.position = new ConstantProperty(
        new Cartesian3(123456, 123456, 123456),
      );

      const dataSource = new MockDataSource();
      dataSource.entities.add(entity);

      widget.dataSources.add(dataSource);
      widget.trackedEntity = entity;

      expect(widget.trackedEntity).toBe(entity);

      return pollToPromise(function () {
        widget.render();
        return Cartesian3.equals(
          Matrix4.getTranslation(
            widget.scene.camera.transform,
            new Cartesian3(),
          ),
          entity.position.getValue(),
        );
      }).then(function () {
        dataSource.entities.remove(entity);

        expect(widget.trackedEntity).toBeUndefined();
        expect(widget.scene.camera.transform).toEqual(Matrix4.IDENTITY);

        dataSource.entities.add(entity);
        widget.trackedEntity = entity;

        expect(widget.trackedEntity).toBe(entity);

        return pollToPromise(function () {
          widget.render();
          widget.render();
          return Cartesian3.equals(
            Matrix4.getTranslation(
              widget.scene.camera.transform,
              new Cartesian3(),
            ),
            entity.position.getValue(),
          );
        }).then(function () {
          widget.dataSources.remove(dataSource);

          expect(widget.trackedEntity).toBeUndefined();
          expect(widget.scene.camera.transform).toEqual(Matrix4.IDENTITY);
        });
      });
    });

    it("does not crash when tracking an object with a position property whose value is undefined.", function () {
      widget = createCesiumWidget(container);

      const entity = new Entity();
      entity.position = new ConstantProperty(undefined);
      entity.polyline = {
        positions: [
          Cartesian3.fromDegrees(0, 0, 0),
          Cartesian3.fromDegrees(0, 0, 1),
        ],
      };

      widget.entities.add(entity);
      widget.trackedEntity = entity;

      spyOn(widget.scene.renderError, "raiseEvent");
      return pollToPromise(function () {
        widget.render();
        return widget.dataSourceDisplay.update(widget.clock.currentTime);
      }).then(function () {
        expect(widget.scene.renderError.raiseEvent).not.toHaveBeenCalled();
      });
    });

    it("throws if no container provided", function () {
      expect(function () {
        return createCesiumWidget(undefined);
      }).toThrowDeveloperError();
    });

    it("throws if targetFrameRate less than 0", function () {
      widget = createCesiumWidget(container);
      expect(function () {
        widget.targetFrameRate = -1;
      }).toThrowDeveloperError();
    });

    it("suspends animation by dataSources if allowed", function () {
      widget = createCesiumWidget(container);

      let updateResult = true;
      spyOn(widget.dataSourceDisplay, "update").and.callFake(function () {
        widget.dataSourceDisplay._ready = updateResult;
        return updateResult;
      });

      expect(widget.clock.canAnimate).toBe(true);

      widget.clock.tick();
      expect(widget.clock.canAnimate).toBe(true);

      updateResult = false;
      widget.clock.tick();
      expect(widget.clock.canAnimate).toBe(false);

      widget.clock.canAnimate = true;
      widget.allowDataSourcesToSuspendAnimation = false;
      widget.clock.tick();
      expect(widget.clock.canAnimate).toBe(true);
    });

    it("sets the clock based on the first data source", function () {
      const dataSource = new MockDataSource();
      dataSource.clock = new DataSourceClock();
      dataSource.clock.startTime = JulianDate.fromIso8601("2013-08-01T18:00Z");
      dataSource.clock.stopTime = JulianDate.fromIso8601("2013-08-21T02:00Z");
      dataSource.clock.currentTime =
        JulianDate.fromIso8601("2013-08-02T00:00Z");
      dataSource.clock.clockRange = ClockRange.CLAMPED;
      dataSource.clock.clockStep = ClockStep.TICK_DEPENDENT;
      dataSource.clock.multiplier = 20.0;

      widget = createCesiumWidget(container);
      return widget.dataSources.add(dataSource).then(function () {
        expect(widget.clock.startTime).toEqual(dataSource.clock.startTime);
        expect(widget.clock.stopTime).toEqual(dataSource.clock.stopTime);
        expect(widget.clock.currentTime).toEqual(dataSource.clock.currentTime);
        expect(widget.clock.clockRange).toEqual(dataSource.clock.clockRange);
        expect(widget.clock.clockStep).toEqual(dataSource.clock.clockStep);
        expect(widget.clock.multiplier).toEqual(dataSource.clock.multiplier);
      });
    });

    it("sets the clock for multiple data sources", function () {
      const dataSource1 = new MockDataSource();
      dataSource1.clock = new DataSourceClock();
      dataSource1.clock.startTime = JulianDate.fromIso8601("2013-08-01T18:00Z");
      dataSource1.clock.stopTime = JulianDate.fromIso8601("2013-08-21T02:00Z");
      dataSource1.clock.currentTime =
        JulianDate.fromIso8601("2013-08-02T00:00Z");

      let dataSource2, dataSource3;
      widget = createCesiumWidget(container);
      return widget.dataSources
        .add(dataSource1)
        .then(function () {
          expect(widget.clockTrackedDataSource).toBe(dataSource1);
          expect(widget.clock.startTime).toEqual(dataSource1.clock.startTime);

          dataSource2 = new MockDataSource();
          dataSource2.clock = new DataSourceClock();
          dataSource2.clock.startTime =
            JulianDate.fromIso8601("2014-08-01T18:00Z");
          dataSource2.clock.stopTime =
            JulianDate.fromIso8601("2014-08-21T02:00Z");
          dataSource2.clock.currentTime =
            JulianDate.fromIso8601("2014-08-02T00:00Z");

          widget.dataSources.add(dataSource2);
        })
        .then(function () {
          expect(widget.clockTrackedDataSource).toBe(dataSource2);
          expect(widget.clock.startTime).toEqual(dataSource2.clock.startTime);

          dataSource3 = new MockDataSource();
          dataSource3.clock = new DataSourceClock();
          dataSource3.clock.startTime =
            JulianDate.fromIso8601("2015-08-01T18:00Z");
          dataSource3.clock.stopTime =
            JulianDate.fromIso8601("2015-08-21T02:00Z");
          dataSource3.clock.currentTime =
            JulianDate.fromIso8601("2015-08-02T00:00Z");

          widget.dataSources.add(dataSource3);
        })
        .then(function () {
          expect(widget.clockTrackedDataSource).toBe(dataSource3);
          expect(widget.clock.startTime).toEqual(dataSource3.clock.startTime);

          // Removing the last dataSource moves the clock to second-last.
          widget.dataSources.remove(dataSource3);
          expect(widget.clockTrackedDataSource).toBe(dataSource2);
          expect(widget.clock.startTime).toEqual(dataSource2.clock.startTime);

          // Removing the first data source has no effect, because it's not active.
          widget.dataSources.remove(dataSource1);
          expect(widget.clockTrackedDataSource).toBe(dataSource2);
          expect(widget.clock.startTime).toEqual(dataSource2.clock.startTime);
        });
    });

    it("updates the clock when the data source changes", function () {
      const dataSource = new MockDataSource();
      dataSource.clock = new DataSourceClock();
      dataSource.clock.startTime = JulianDate.fromIso8601("2013-08-01T18:00Z");
      dataSource.clock.stopTime = JulianDate.fromIso8601("2013-08-21T02:00Z");
      dataSource.clock.currentTime =
        JulianDate.fromIso8601("2013-08-02T00:00Z");
      dataSource.clock.clockRange = ClockRange.CLAMPED;
      dataSource.clock.clockStep = ClockStep.TICK_DEPENDENT;
      dataSource.clock.multiplier = 20.0;

      widget = createCesiumWidget(container);
      return widget.dataSources.add(dataSource).then(function () {
        dataSource.clock.startTime =
          JulianDate.fromIso8601("2014-08-01T18:00Z");
        dataSource.clock.stopTime = JulianDate.fromIso8601("2014-08-21T02:00Z");
        dataSource.clock.currentTime =
          JulianDate.fromIso8601("2014-08-02T00:00Z");
        dataSource.clock.clockRange = ClockRange.UNBOUNDED;
        dataSource.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        dataSource.clock.multiplier = 10.0;

        dataSource.changedEvent.raiseEvent(dataSource);

        expect(widget.clock.startTime).toEqual(dataSource.clock.startTime);
        expect(widget.clock.stopTime).toEqual(dataSource.clock.stopTime);
        expect(widget.clock.currentTime).toEqual(dataSource.clock.currentTime);
        expect(widget.clock.clockRange).toEqual(dataSource.clock.clockRange);
        expect(widget.clock.clockStep).toEqual(dataSource.clock.clockStep);
        expect(widget.clock.multiplier).toEqual(dataSource.clock.multiplier);

        dataSource.clock.clockStep = ClockStep.SYSTEM_CLOCK;
        dataSource.clock.multiplier = 1.0;

        dataSource.changedEvent.raiseEvent(dataSource);

        expect(widget.clock.clockStep).toEqual(dataSource.clock.clockStep);
      });
    });

    it("can manually control the clock tracking", function () {
      const dataSource1 = new MockDataSource();
      dataSource1.clock = new DataSourceClock();
      dataSource1.clock.startTime = JulianDate.fromIso8601("2013-08-01T18:00Z");
      dataSource1.clock.stopTime = JulianDate.fromIso8601("2013-08-21T02:00Z");
      dataSource1.clock.currentTime =
        JulianDate.fromIso8601("2013-08-02T00:00Z");

      widget = createCesiumWidget(container, {
        automaticallyTrackDataSourceClocks: false,
      });

      let dataSource2;
      return widget.dataSources
        .add(dataSource1)
        .then(function () {
          // Because of the above widget option, data sources are not automatically
          // selected for clock tracking.
          expect(widget.clockTrackedDataSource).not.toBeDefined();
          // The mock data source time is in the past, so will not be the default time.
          expect(widget.clock.startTime).not.toEqual(
            dataSource1.clock.startTime,
          );

          // Manually set the first data source as the tracked data source.
          widget.clockTrackedDataSource = dataSource1;
          expect(widget.clockTrackedDataSource).toBe(dataSource1);
          expect(widget.clock.startTime).toEqual(dataSource1.clock.startTime);

          dataSource2 = new MockDataSource();
          dataSource2.clock = new DataSourceClock();
          dataSource2.clock.startTime =
            JulianDate.fromIso8601("2014-08-01T18:00Z");
          dataSource2.clock.stopTime =
            JulianDate.fromIso8601("2014-08-21T02:00Z");
          dataSource2.clock.currentTime =
            JulianDate.fromIso8601("2014-08-02T00:00Z");

          // Adding a second data source in manual mode still leaves the first one tracked.
          widget.dataSources.add(dataSource2);
        })
        .then(function () {
          expect(widget.clockTrackedDataSource).toBe(dataSource1);
          expect(widget.clock.startTime).toEqual(dataSource1.clock.startTime);

          // Removing the tracked data source in manual mode turns off tracking, even
          // if other data sources remain available for tracking.
          widget.dataSources.remove(dataSource1);
          expect(widget.clockTrackedDataSource).not.toBeDefined();
        });
    });

    it("can set resolutionScale", function () {
      widget = createCesiumWidget(container);
      widget.resolutionScale = 0.5;
      expect(widget.resolutionScale).toBe(0.5);
    });

    it("can enable useBrowserRecommendedResolution", function () {
      widget = createCesiumWidget(container, {
        useBrowserRecommendedResolution: true,
      });

      expect(widget.useBrowserRecommendedResolution).toBe(true);
    });

    it("useBrowserRecommendedResolution ignores devicePixelRatio", function () {
      const oldDevicePixelRatio = window.devicePixelRatio;
      window.devicePixelRatio = 2.0;

      widget = createCesiumWidget(container, {
        useDefaultRenderLoop: false,
      });

      widget.resolutionScale = 0.5;

      widget.useBrowserRecommendedResolution = true;
      widget.resize();
      expect(widget.scene.pixelRatio).toEqual(0.5);

      widget.useBrowserRecommendedResolution = false;
      widget.resize();
      expect(widget.scene.pixelRatio).toEqual(1.0);

      window.devicePixelRatio = oldDevicePixelRatio;
    });

    it("throws if resolutionScale is less than 0", function () {
      widget = createCesiumWidget(container);
      expect(function () {
        widget.resolutionScale = -1;
      }).toThrowDeveloperError();
    });

    it("resizing triggers a render in requestRender mode", function () {
      widget = createCesiumWidget(container, {
        requestRenderMode: true,
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      });

      const scene = widget._scene;
      spyOn(scene, "requestRender");

      widget.resize();

      expect(scene.requestRender).not.toHaveBeenCalled();

      widget._forceResize = true;
      widget.resize();

      expect(scene.requestRender).toHaveBeenCalled();
    });

    it("throws if no container id does not exist", function () {
      expect(function () {
        return createCesiumWidget("doesnotexist");
      }).toThrowDeveloperError();
    });

    it("stops the render loop when render throws", function () {
      widget = createCesiumWidget(container);
      expect(widget.useDefaultRenderLoop).toEqual(true);

      const error = "foo";
      widget.scene.primitives.update = function () {
        throw error;
      };

      return pollToPromise(function () {
        return !widget.useDefaultRenderLoop;
      }, "render loop to be disabled.");
    });

    it("shows the error panel when render throws", function () {
      widget = createCesiumWidget(container);

      const error = "foo";
      widget.scene.primitives.update = function () {
        throw error;
      };

      return pollToPromise(function () {
        return !widget.useDefaultRenderLoop;
      }).then(function () {
        expect(
          widget._element.querySelector(".cesium-widget-errorPanel"),
        ).not.toBeNull();

        const messages = widget._element.querySelectorAll(
          ".cesium-widget-errorPanel-message",
        );

        let found = false;
        for (let i = 0; i < messages.length; ++i) {
          if (messages[i].textContent.indexOf(error) !== -1) {
            found = true;
          }
        }

        expect(found).toBe(true);

        // click the OK button to dismiss the panel
        DomEventSimulator.fireClick(
          widget._element.querySelector(".cesium-button"),
        );

        expect(
          widget._element.querySelector(".cesium-widget-errorPanel"),
        ).toBeNull();
      });
    });

    it("does not show the error panel if disabled", function () {
      widget = createCesiumWidget(container, {
        showRenderLoopErrors: false,
      });

      const error = "foo";
      widget.scene.primitives.update = function () {
        throw error;
      };

      return pollToPromise(function () {
        return !widget.useDefaultRenderLoop;
      }).then(function () {
        expect(
          widget._element.querySelector(".cesium-widget-errorPanel"),
        ).toBeNull();
      });
    });

    it("zoomTo throws if target is not defined", function () {
      widget = createCesiumWidget(container);

      expect(function () {
        widget.zoomTo();
      }).toThrowDeveloperError();
    });

    it("zoomTo zooms to Cesium3DTileset with default offset when offset not defined", async function () {
      widget = createCesiumWidget(container);

      const path =
        "./Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
      const tileset = await Cesium3DTileset.fromUrl(path);

      const expectedBoundingSphere = tileset.boundingSphere;
      const expectedOffset = new HeadingPitchRange(
        0.0,
        -0.5,
        expectedBoundingSphere.radius,
      );

      let wasCompleted = false;
      spyOn(widget.camera, "viewBoundingSphere").and.callFake(
        function (boundingSphere, offset) {
          expect(boundingSphere).toEqual(expectedBoundingSphere);
          expect(offset).toEqual(expectedOffset);
          wasCompleted = true;
        },
      );
      const promise = widget.zoomTo(tileset);

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("zoomTo zooms to Cesium3DTileset with offset", async function () {
      widget = createCesiumWidget(container);

      const path =
        "./Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
      const tileset = await Cesium3DTileset.fromUrl(path);

      const expectedBoundingSphere = tileset.boundingSphere;
      const expectedOffset = new HeadingPitchRange(
        0.4,
        1.2,
        4.0 * expectedBoundingSphere.radius,
      );

      const promise = widget.zoomTo(tileset, expectedOffset);
      let wasCompleted = false;
      spyOn(widget.camera, "viewBoundingSphere").and.callFake(
        function (boundingSphere, offset) {
          expect(boundingSphere).toEqual(expectedBoundingSphere);
          expect(offset).toEqual(expectedOffset);
          wasCompleted = true;
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    async function loadTimeDynamicPointCloud(widget) {
      const scene = widget.scene;
      const clock = widget.clock;

      const uri =
        "./Data/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/0.pnts";
      const dates = ["2018-07-19T15:18:00Z", "2018-07-19T15:18:00.5Z"];

      function dataCallback() {
        return {
          uri: uri,
        };
      }

      const timeIntervalCollection =
        TimeIntervalCollection.fromIso8601DateArray({
          iso8601Dates: dates,
          dataCallback: dataCallback,
        });

      const pointCloud = new TimeDynamicPointCloud({
        intervals: timeIntervalCollection,
        clock: clock,
      });

      const start = JulianDate.fromIso8601(dates[0]);

      clock.startTime = start;
      clock.currentTime = start;
      clock.multiplier = 0.0;

      scene.primitives.add(pointCloud);

      await pollToPromise(function () {
        scene.render();
        return defined(pointCloud.boundingSphere);
      });

      return pointCloud;
    }

    it("zoomTo zooms to TimeDynamicPointCloud with default offset when offset not defined", function () {
      widget = createCesiumWidget(container);
      return loadTimeDynamicPointCloud(widget).then(function (pointCloud) {
        const expectedBoundingSphere = pointCloud.boundingSphere;
        const expectedOffset = new HeadingPitchRange(
          0.0,
          -0.5,
          expectedBoundingSphere.radius,
        );

        const promise = widget.zoomTo(pointCloud);
        let wasCompleted = false;
        spyOn(widget.camera, "viewBoundingSphere").and.callFake(
          function (boundingSphere, offset) {
            expect(boundingSphere).toEqual(expectedBoundingSphere);
            expect(offset).toEqual(expectedOffset);
            wasCompleted = true;
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
          widget.scene.primitives.remove(pointCloud);
        });
      });
    });

    it("zoomTo zooms to TimeDynamicPointCloud with offset", function () {
      widget = createCesiumWidget(container);
      return loadTimeDynamicPointCloud(widget).then(function (pointCloud) {
        const expectedBoundingSphere = pointCloud.boundingSphere;
        const expectedOffset = new HeadingPitchRange(
          0.4,
          1.2,
          4.0 * expectedBoundingSphere.radius,
        );

        const promise = widget.zoomTo(pointCloud, expectedOffset);
        let wasCompleted = false;
        spyOn(widget.camera, "viewBoundingSphere").and.callFake(
          function (boundingSphere, offset) {
            expect(boundingSphere).toEqual(expectedBoundingSphere);
            expect(offset).toEqual(expectedOffset);
            wasCompleted = true;
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
          widget.scene.primitives.remove(pointCloud);
        });
      });
    });

    async function loadVoxelPrimitive(widget) {
      const voxelPrimitive = new VoxelPrimitive({
        provider: await Cesium3DTilesVoxelProvider.fromUrl(
          "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json",
        ),
      });
      widget.scene.primitives.add(voxelPrimitive);
      return voxelPrimitive;
    }

    it("zoomTo zooms to VoxelPrimitive with default offset when offset not defined", function () {
      widget = createCesiumWidget(container);

      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const expectedBoundingSphere = voxelPrimitive.boundingSphere;
        const expectedOffset = new HeadingPitchRange(
          0.0,
          -0.5,
          expectedBoundingSphere.radius,
        );

        const promise = widget.zoomTo(voxelPrimitive);
        let wasCompleted = false;
        spyOn(widget.camera, "viewBoundingSphere").and.callFake(
          function (boundingSphere, offset) {
            expect(boundingSphere).toEqual(expectedBoundingSphere);
            expect(offset).toEqual(expectedOffset);
            wasCompleted = true;
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("zoomTo zooms to VoxelPrimitive with offset", function () {
      widget = createCesiumWidget(container);

      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const expectedBoundingSphere = voxelPrimitive.boundingSphere;
        const expectedOffset = new HeadingPitchRange(
          0.4,
          1.2,
          4.0 * expectedBoundingSphere.radius,
        );

        const promise = widget.zoomTo(voxelPrimitive, expectedOffset);
        let wasCompleted = false;
        spyOn(widget.camera, "viewBoundingSphere").and.callFake(
          function (boundingSphere, offset) {
            expect(boundingSphere).toEqual(expectedBoundingSphere);
            expect(offset).toEqual(expectedOffset);
            wasCompleted = true;
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("zoomTo zooms to entity with undefined offset when offset not defined", function () {
      widget = createCesiumWidget(container);
      widget.entities.add({
        name: "Blue box",
        position: Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
        box: {
          dimensions: new Cartesian3(400000.0, 300000.0, 500000.0),
          material: Color.BLUE,
        },
      });

      const entities = widget.entities;

      const promise = widget.zoomTo(entities);
      let wasCompleted = false;
      spyOn(widget.dataSourceDisplay, "getBoundingSphere").and.callFake(
        function () {
          return new BoundingSphere();
        },
      );

      spyOn(widget.camera, "viewBoundingSphere").and.callFake(
        function (boundingSphere, offset) {
          expect(boundingSphere).toBeDefined();
          // expect offset to be undefined - doesn't use default bc of how zoomTo for entities is set up
          expect(offset).toBeUndefined();
          wasCompleted = true;
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("zoomTo zooms to entity with offset", function () {
      widget = createCesiumWidget(container);
      widget.entities.add({
        name: "Blue box",
        position: Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
        box: {
          dimensions: new Cartesian3(400000.0, 300000.0, 500000.0),
          material: Color.BLUE,
        },
      });

      const entities = widget.entities;
      // fake temp offset
      const expectedOffset = new HeadingPitchRange(3.0, 0.2, 2.3);

      const promise = widget.zoomTo(entities, expectedOffset);
      let wasCompleted = false;
      spyOn(widget.dataSourceDisplay, "getBoundingSphere").and.callFake(
        function () {
          return new BoundingSphere();
        },
      );
      spyOn(widget.camera, "viewBoundingSphere").and.callFake(
        function (boundingSphere, offset) {
          expect(expectedOffset).toEqual(offset);
          wasCompleted = true;
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("zoomTo zooms to entity when globe is disabled", async function () {
      // Create widget with globe disabled
      const widget = createCesiumWidget(container, {
        globe: false,
        infoBox: false,
        selectionIndicator: false,
        shadows: true,
        shouldAnimate: true,
      });

      // Create position variable
      const position = Cartesian3.fromDegrees(-123.0744619, 44.0503706, 1000.0);

      // Add entity to widget
      const entity = widget.entities.add({
        position: position,
        model: {
          uri: "../SampleData/models/CesiumAir/Cesium_Air.glb",
        },
      });

      await widget.zoomTo(entity);

      // Verify that no errors occurred
      expect(widget.scene).toBeDefined();
      expect(widget.scene.errorEvent).toBeUndefined();
    });

    it("flyTo throws if target is not defined", function () {
      widget = createCesiumWidget(container);

      expect(function () {
        widget.flyTo();
      }).toThrowDeveloperError();
    });

    it("flyTo flies to Cesium3DTileset with default offset when options not defined", async function () {
      widget = createCesiumWidget(container);

      const path =
        "./Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
      const tileset = await Cesium3DTileset.fromUrl(path);

      const promise = widget.flyTo(tileset);
      let wasCompleted = false;

      spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
        function (target, options) {
          expect(options.offset).toBeDefined();
          expect(options.duration).toBeUndefined();
          expect(options.maximumHeight).toBeUndefined();
          wasCompleted = true;
          options.complete();
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("flyTo flies to Cesium3DTileset with default offset when offset not defined", async function () {
      widget = createCesiumWidget(container);

      const path =
        "./Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
      const tileset = await Cesium3DTileset.fromUrl(path);

      const options = {};

      const promise = widget.flyTo(tileset, options);
      let wasCompleted = false;

      spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
        function (target, options) {
          expect(options.offset).toBeDefined();
          expect(options.duration).toBeUndefined();
          expect(options.maximumHeight).toBeUndefined();
          wasCompleted = true;
          options.complete();
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("flyTo flies to Cesium3DTileset when options are defined", async function () {
      widget = createCesiumWidget(container);

      const path =
        "./Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/tileset.json";
      const tileset = await Cesium3DTileset.fromUrl(path);

      const offsetVal = new HeadingPitchRange(3.0, 0.2, 2.3);
      const options = {
        offset: offsetVal,
        duration: 3.0,
        maximumHeight: 5.0,
      };

      const promise = widget.flyTo(tileset, options);
      let wasCompleted = false;

      spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
        function (target, options) {
          expect(options.duration).toBeDefined();
          expect(options.maximumHeight).toBeDefined();
          wasCompleted = true;
          options.complete();
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("flyTo flies to TimeDynamicPointCloud with default offset when options not defined", function () {
      widget = createCesiumWidget(container);
      return loadTimeDynamicPointCloud(widget).then(function (pointCloud) {
        const promise = widget.flyTo(pointCloud);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.offset).toBeDefined();
            expect(options.duration).toBeUndefined();
            expect(options.maximumHeight).toBeUndefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
          widget.scene.primitives.remove(pointCloud);
        });
      });
    });

    it("flyTo flies to TimeDynamicPointCloud with default offset when offset not defined", function () {
      widget = createCesiumWidget(container);
      return loadTimeDynamicPointCloud(widget).then(function (pointCloud) {
        const options = {};
        const promise = widget.flyTo(pointCloud, options);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.offset).toBeDefined();
            expect(options.duration).toBeUndefined();
            expect(options.maximumHeight).toBeUndefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
          widget.scene.primitives.remove(pointCloud);
        });
      });
    });

    it("flyTo flies to TimeDynamicPointCloud when options are defined", function () {
      widget = createCesiumWidget(container);
      return loadTimeDynamicPointCloud(widget).then(function (pointCloud) {
        const offsetVal = new HeadingPitchRange(3.0, 0.2, 2.3);
        const options = {
          offset: offsetVal,
          duration: 3.0,
          maximumHeight: 5.0,
        };
        const promise = widget.flyTo(pointCloud, options);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.duration).toBeDefined();
            expect(options.maximumHeight).toBeDefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
          widget.scene.primitives.remove(pointCloud);
        });
      });
    });

    it("flyTo flies to VoxelPrimitive with default offset when options not defined", function () {
      widget = createCesiumWidget(container);

      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const promise = widget.flyTo(voxelPrimitive);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.offset).toBeDefined();
            expect(options.duration).toBeUndefined();
            expect(options.maximumHeight).toBeUndefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("flyTo flies to VoxelPrimitive with default offset when offset not defined", function () {
      widget = createCesiumWidget(container);
      const options = {};

      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const promise = widget.flyTo(voxelPrimitive, options);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.offset).toBeDefined();
            expect(options.duration).toBeUndefined();
            expect(options.maximumHeight).toBeUndefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("flyTo flies to VoxelPrimitive when options are defined", function () {
      widget = createCesiumWidget(container);

      // load tileset to test
      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const offsetVal = new HeadingPitchRange(3.0, 0.2, 2.3);
        const options = {
          offset: offsetVal,
          duration: 3.0,
          maximumHeight: 5.0,
        };

        const promise = widget.flyTo(voxelPrimitive, options);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.duration).toBeDefined();
            expect(options.maximumHeight).toBeDefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("flyTo flies to entity with default offset when options not defined", function () {
      widget = createCesiumWidget(container);

      widget.entities.add({
        name: "Blue box",
        position: Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
        box: {
          dimensions: new Cartesian3(400000.0, 300000.0, 500000.0),
          material: Color.BLUE,
        },
      });

      const entities = widget.entities;
      const promise = widget.flyTo(entities);
      let wasCompleted = false;
      spyOn(widget.dataSourceDisplay, "getBoundingSphere").and.callFake(
        function () {
          return new BoundingSphere();
        },
      );
      spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
        function (target, options) {
          expect(options.duration).toBeUndefined();
          expect(options.maximumHeight).toBeUndefined();
          wasCompleted = true;
          options.complete();
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("flyTo flies to imagery layer with default offset when options are not defined", async function () {
      widget = createCesiumWidget(container);

      const imageryLayer = new ImageryLayer(testProvider);

      const promise = widget.flyTo(imageryLayer, {
        duration: 0,
      });

      widget._postRender();

      await expectAsync(promise).toBeResolved();
    });

    it("flyTo flies to VoxelPrimitive with default offset when options not defined", function () {
      widget = createCesiumWidget(container);

      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const promise = widget.flyTo(voxelPrimitive);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.offset).toBeDefined();
            expect(options.duration).toBeUndefined();
            expect(options.maximumHeight).toBeUndefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("flyTo flies to VoxelPrimitive with default offset when offset not defined", function () {
      widget = createCesiumWidget(container);
      const options = {};

      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const promise = widget.flyTo(voxelPrimitive, options);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.offset).toBeDefined();
            expect(options.duration).toBeUndefined();
            expect(options.maximumHeight).toBeUndefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("flyTo flies to VoxelPrimitive when options are defined", function () {
      widget = createCesiumWidget(container);

      // load tileset to test
      return loadVoxelPrimitive(widget).then(function (voxelPrimitive) {
        const offsetVal = new HeadingPitchRange(3.0, 0.2, 2.3);
        const options = {
          offset: offsetVal,
          duration: 3.0,
          maximumHeight: 5.0,
        };

        const promise = widget.flyTo(voxelPrimitive, options);
        let wasCompleted = false;

        spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
          function (target, options) {
            expect(options.duration).toBeDefined();
            expect(options.maximumHeight).toBeDefined();
            wasCompleted = true;
            options.complete();
          },
        );

        widget._postRender();

        return promise.then(function () {
          expect(wasCompleted).toEqual(true);
        });
      });
    });

    it("flyTo flys to entity with default offset when offset not defined", function () {
      widget = createCesiumWidget(container);

      widget.entities.add({
        name: "Blue box",
        position: Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
        box: {
          dimensions: new Cartesian3(400000.0, 300000.0, 500000.0),
          material: Color.BLUE,
        },
      });

      const entities = widget.entities;
      const options = {};

      const promise = widget.flyTo(entities, options);
      let wasCompleted = false;
      spyOn(widget.dataSourceDisplay, "getBoundingSphere").and.callFake(
        function () {
          return new BoundingSphere();
        },
      );
      spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
        function (target, options) {
          expect(options.duration).toBeUndefined();
          expect(options.maximumHeight).toBeUndefined();
          wasCompleted = true;
          options.complete();
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("flyTo flies to entity when options are defined", function () {
      widget = createCesiumWidget(container);

      widget.entities.add({
        name: "Blue box",
        position: Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
        box: {
          dimensions: new Cartesian3(400000.0, 300000.0, 500000.0),
          material: Color.BLUE,
        },
      });

      const entities = widget.entities;
      const offsetVal = new HeadingPitchRange(3.0, 0.2, 2.3);
      const options = {
        offset: offsetVal,
        duration: 3.0,
        maximumHeight: 5.0,
      };

      const promise = widget.flyTo(entities, options);
      let wasCompleted = false;
      spyOn(widget.dataSourceDisplay, "getBoundingSphere").and.callFake(
        function () {
          return new BoundingSphere();
        },
      );
      spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
        function (target, options) {
          expect(options.duration).toBeDefined();
          expect(options.maximumHeight).toBeDefined();
          wasCompleted = true;
          options.complete();
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("flyTo flies to entity when offset is defined but other options for flyTo are not", function () {
      widget = createCesiumWidget(container);

      widget.entities.add({
        name: "Blue box",
        position: Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
        box: {
          dimensions: new Cartesian3(400000.0, 300000.0, 500000.0),
          material: Color.BLUE,
        },
      });

      const entities = widget.entities;
      const offsetVal = new HeadingPitchRange(3.0, 0.2, 2.3);
      const options = {
        offset: offsetVal,
      };

      const promise = widget.flyTo(entities, options);
      let wasCompleted = false;
      spyOn(widget.dataSourceDisplay, "getBoundingSphere").and.callFake(
        function () {
          return new BoundingSphere();
        },
      );
      spyOn(widget.camera, "flyToBoundingSphere").and.callFake(
        function (target, options) {
          expect(options.duration).toBeUndefined();
          expect(options.maximumHeight).toBeUndefined();
          wasCompleted = true;
          options.complete();
        },
      );

      widget._postRender();

      return promise.then(function () {
        expect(wasCompleted).toEqual(true);
      });
    });

    it("removes data source listeners when destroyed", function () {
      widget = createCesiumWidget(container);

      //one data source that is added before mixing in
      const preMixinDataSource = new MockDataSource();
      //one data source that is added after mixing in
      const postMixinDataSource = new MockDataSource();
      return widget.dataSources
        .add(preMixinDataSource)
        .then(function () {
          widget.dataSources.add(postMixinDataSource);
        })
        .then(function () {
          const preMixinListenerCount =
            preMixinDataSource.entities.collectionChanged._listeners.length;
          const postMixinListenerCount =
            postMixinDataSource.entities.collectionChanged._listeners.length;

          widget = widget.destroy();

          expect(
            preMixinDataSource.entities.collectionChanged._listeners.length,
          ).not.toEqual(preMixinListenerCount);
          expect(
            postMixinDataSource.entities.collectionChanged._listeners.length,
          ).not.toEqual(postMixinListenerCount);
        });
    });
  },
  "WebGL",
);
