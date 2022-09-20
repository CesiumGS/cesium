import {
  Clock,
  defaultValue,
  EllipsoidTerrainProvider,
  ScreenSpaceEventHandler,
  WebMercatorProjection,
  Camera,
  ImageryLayerCollection,
  Scene,
  SceneMode,
  SkyBox,
  TileCoordinatesImageryProvider,
  CesiumWidget,
} from "../../../../Source/Cesium.js";

import DomEventSimulator from "../../DomEventSimulator.js";
import getWebGLStub from "../../getWebGLStub.js";
import pollToPromise from "../../pollToPromise.js";

describe(
  "Widgets/CesiumWidget/CesiumWidget",
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

    function createCesiumWidget(container, options) {
      options = defaultValue(options, {});
      options.contextOptions = defaultValue(options.contextOptions, {});
      options.contextOptions.webgl = defaultValue(
        options.contextOptions.webgl,
        {}
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
      expect(widget.creditContainer).toBeInstanceOf(HTMLElement);
      expect(widget.creditViewport).toBeInstanceOf(HTMLElement);
      expect(widget.scene).toBeInstanceOf(Scene);
      expect(widget.imageryLayers).toBeInstanceOf(ImageryLayerCollection);
      expect(widget.terrainProvider).toBeInstanceOf(EllipsoidTerrainProvider);
      expect(widget.camera).toBeInstanceOf(Camera);
      expect(widget.clock).toBeInstanceOf(Clock);
      expect(widget.screenSpaceEventHandler).toBeInstanceOf(
        ScreenSpaceEventHandler
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

    it("sets expected options imageryProvider", function () {
      const options = {
        imageryProvider: new TileCoordinatesImageryProvider(),
      };
      widget = createCesiumWidget(container, options);
      const imageryLayers = widget.scene.imageryLayers;
      expect(imageryLayers.length).toEqual(1);
      expect(imageryLayers.get(0).imageryProvider).toBe(
        options.imageryProvider
      );
    });

    it("does not create an ImageryProvider if option is false", function () {
      widget = createCesiumWidget(container, {
        imageryProvider: false,
      });
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
        webglOptions.premultipliedAlpha
      );
      expect(contextAttributes.powerPreference).toEqual(
        webglOptions.powerPreference
      );
      expect(contextAttributes.preserveDrawingBuffer).toEqual(
        webglOptions.preserveDrawingBuffer
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
        Number.POSITIVE_INFINITY
      );
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
          widget._element.querySelector(".cesium-widget-errorPanel")
        ).not.toBeNull();

        const messages = widget._element.querySelectorAll(
          ".cesium-widget-errorPanel-message"
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
          widget._element.querySelector(".cesium-button")
        );

        expect(
          widget._element.querySelector(".cesium-widget-errorPanel")
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
          widget._element.querySelector(".cesium-widget-errorPanel")
        ).toBeNull();
      });
    });
  },
  "WebGL"
);
