import {
  Cartesian3,
  CartographicGeocoderService,
  CesiumWidget,
  Clock,
  CreditDisplay,
  EllipsoidTerrainProvider,
  Rectangle,
  WebMercatorProjection,
  ConstantPositionProperty,
  ConstantProperty,
  DataSourceCollection,
  DataSourceDisplay,
  Entity,
  Camera,
  CameraFlightPath,
  ImageryLayer,
  ImageryLayerCollection,
  SceneMode,
  ShadowMode,
} from "@cesium/engine";

import {
  Animation,
  BaseLayerPicker,
  ProviderViewModel,
  ClockViewModel,
  FullscreenButton,
  Geocoder,
  HomeButton,
  NavigationHelpButton,
  SceneModePicker,
  SelectionIndicator,
  Timeline,
} from "../../index.js";

import createViewer from "../createViewer.js";
import DomEventSimulator from "../../../../Specs/DomEventSimulator.js";
import MockDataSource from "../../../../Specs/MockDataSource.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Widgets/Viewer/Viewer",
  function () {
    const testProvider = {
      tilingScheme: {
        tileXYToRectangle: function () {
          return new Rectangle();
        },
      },
      rectangle: Rectangle.MAX_VALUE,
    };

    const testProviderViewModel = new ProviderViewModel({
      name: "name",
      tooltip: "tooltip",
      iconUrl: "url",
      creationFunction: function () {
        return testProvider;
      },
    });

    let container;
    let viewer;
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
      if (viewer && !viewer.isDestroyed()) {
        viewer = viewer.destroy();
      }

      document.body.removeChild(container);
    });

    it("constructor sets default values", function () {
      viewer = createViewer(container);
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.clockViewModel).toBeInstanceOf(ClockViewModel);
      expect(viewer.animation.viewModel.clockViewModel).toBe(
        viewer.clockViewModel,
      );
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      expect(viewer.imageryLayers).toBeInstanceOf(ImageryLayerCollection);
      expect(viewer.terrainProvider).toBeInstanceOf(EllipsoidTerrainProvider);
      expect(viewer.creditDisplay).toBeInstanceOf(CreditDisplay);
      expect(viewer.camera).toBeInstanceOf(Camera);
      expect(viewer.dataSourceDisplay).toBeInstanceOf(DataSourceDisplay);
      expect(viewer.dataSources).toBeInstanceOf(DataSourceCollection);
      expect(viewer.canvas).toBe(viewer.cesiumWidget.canvas);
      expect(viewer.cesiumLogo).toBe(viewer.cesiumWidget.cesiumLogo);
      expect(viewer.screenSpaceEventHandler).toBe(
        viewer.cesiumWidget.screenSpaceEventHandler,
      );
      expect(viewer.useBrowserRecommendedResolution).toBe(true);
      expect(viewer.isDestroyed()).toEqual(false);
      viewer.destroy();
      expect(viewer.isDestroyed()).toEqual(true);
    });

    it("can specify custom clockViewModel", function () {
      const clockViewModel = new ClockViewModel();
      viewer = createViewer(container, { clockViewModel: clockViewModel });
      expect(viewer.clockViewModel).toBe(clockViewModel);
      expect(viewer.animation.viewModel.clockViewModel).toBe(
        viewer.clockViewModel,
      );
      viewer.destroy();
      expect(clockViewModel.isDestroyed()).toBe(false);
      clockViewModel.destroy();
    });

    it("setting shouldAnimate in options overrides clock shouldAnimate", function () {
      const clockViewModel = new ClockViewModel(
        new Clock({
          shouldAnimate: false,
        }),
      );

      viewer = createViewer(container, {
        clockViewModel: clockViewModel,
        shouldAnimate: true,
      });

      expect(viewer.clock.shouldAnimate).toBe(true);
    });

    it("renders without errors", function () {
      viewer = createViewer(container);
      spyOn(viewer.scene.renderError, "raiseEvent");
      viewer.render();
      expect(viewer.scene.renderError.raiseEvent).not.toHaveBeenCalled();
    });

    it("constructor works with container id string", function () {
      viewer = createViewer("container");
      expect(viewer.container).toBe(container);
    });

    it("can shut off HomeButton", function () {
      viewer = createViewer(container, {
        homeButton: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeUndefined();
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off SceneModePicker", function () {
      viewer = createViewer(container, {
        sceneModePicker: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeUndefined();
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off BaseLayerPicker", function () {
      viewer = createViewer(container, {
        baseLayerPicker: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeUndefined();
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off NavigationHelpButton", function () {
      viewer = createViewer(container, {
        navigationHelpButton: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeUndefined();
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off Animation", function () {
      viewer = createViewer(container, {
        animation: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeUndefined();
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off Timeline", function () {
      viewer = createViewer(container, {
        timeline: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeUndefined();
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off FullscreenButton", function () {
      viewer = createViewer(container, {
        fullscreenButton: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeUndefined();
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off FullscreenButton and Timeline", function () {
      viewer = createViewer(container, {
        timeline: false,
        fullscreenButton: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeUndefined();
      expect(viewer.fullscreenButton).toBeUndefined();
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off FullscreenButton, Timeline, and Animation", function () {
      viewer = createViewer(container, {
        timeline: false,
        fullscreenButton: false,
        animation: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeUndefined(Animation);
      expect(viewer.timeline).toBeUndefined();
      expect(viewer.fullscreenButton).toBeUndefined();
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("can shut off Geocoder", function () {
      viewer = createViewer(container, {
        geocoder: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeUndefined();
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
      viewer.resize();
      viewer.render();
    });

    it("constructs geocoder", function () {
      viewer = createViewer(container, {
        geocoder: true,
      });
      expect(viewer.geocoder).toBeDefined();
      expect(viewer.geocoder.viewModel._geocoderServices.length).toBe(1);
    });

    it("constructs geocoder with geocoder service option", function () {
      const service = new CartographicGeocoderService();
      viewer = createViewer(container, {
        geocoder: service,
      });
      expect(viewer.geocoder).toBeDefined();
      expect(viewer.geocoder.viewModel._geocoderServices.length).toBe(1);
      expect(viewer.geocoder.viewModel._geocoderServices[0]).toBe(service);
    });

    it("constructs geocoder with geocoder service options", function () {
      const service = new CartographicGeocoderService();
      viewer = createViewer(container, {
        geocoder: [service],
      });
      expect(viewer.geocoder).toBeDefined();
      expect(viewer.geocoder.viewModel._geocoderServices.length).toBe(1);
      expect(viewer.geocoder.viewModel._geocoderServices[0]).toBe(service);
    });

    it("can shut off SelectionIndicator", function () {
      viewer = createViewer(container, {
        selectionIndicator: false,
      });
      expect(viewer.container).toBe(container);
      expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
      expect(viewer.geocoder).toBeInstanceOf(Geocoder);
      expect(viewer.homeButton).toBeInstanceOf(HomeButton);
      expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
      expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
      expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
      expect(viewer.animation).toBeInstanceOf(Animation);
      expect(viewer.timeline).toBeInstanceOf(Timeline);
      expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
      expect(viewer.selectionIndicator).toBeUndefined();
      viewer.resize();
      viewer.render();
    });

    it("can set shadows", function () {
      viewer = createViewer(container, {
        shadows: true,
      });
      expect(viewer.shadows).toBe(true);
    });

    it("can set terrain shadows", function () {
      viewer = createViewer(container, {
        terrainShadows: ShadowMode.ENABLED,
      });
      expect(viewer.terrainShadows).toBe(ShadowMode.ENABLED);
    });

    it("can set terrainProvider", function () {
      const provider = new EllipsoidTerrainProvider();

      viewer = createViewer(container, {
        baseLayerPicker: false,
        terrainProvider: provider,
      });
      expect(viewer.scene.terrainProvider).toBe(provider);

      const anotherProvider = new EllipsoidTerrainProvider();
      viewer.terrainProvider = anotherProvider;
      expect(viewer.terrainProvider).toBe(anotherProvider);
    });

    it("can set fullScreenElement", function () {
      const testElement = document.createElement("span");

      viewer = createViewer(container, {
        fullscreenElement: testElement,
      });
      expect(viewer.fullscreenButton.viewModel.fullscreenElement).toBe(
        testElement,
      );
    });

    it("can set contextOptions", function () {
      const webglOptions = {
        alpha: true,
        depth: true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
        stencil: true,
        antialias: false,
        powerPreference: "low-power",
        premultipliedAlpha: true, // Workaround IE 11.0.8, which does not honor false.
        preserveDrawingBuffer: true,
      };
      const contextOptions = {
        allowTextureFilterAnisotropic: false,
        webgl: webglOptions,
      };

      viewer = createViewer(container, {
        contextOptions: contextOptions,
      });

      const context = viewer.scene.context;
      const contextAttributes = context._gl.getContextAttributes();

      expect(context.options.allowTextureFilterAnisotropic).toEqual(false);
      expect(contextAttributes.alpha).toEqual(webglOptions.alpha);
      expect(contextAttributes.depth).toEqual(webglOptions.depth);
      expect(contextAttributes.stencil).toEqual(webglOptions.stencil);
      expect(contextAttributes.antialias).toEqual(webglOptions.antialias);
      expect(contextAttributes.powerPreference).toEqual(
        webglOptions.powerPreference,
      );
      expect(contextAttributes.premultipliedAlpha).toEqual(
        webglOptions.premultipliedAlpha,
      );
      expect(contextAttributes.preserveDrawingBuffer).toEqual(
        webglOptions.preserveDrawingBuffer,
      );
    });

    it("can disable Order Independent Translucency", function () {
      viewer = createViewer(container, {
        orderIndependentTranslucency: false,
      });
      expect(viewer.scene.orderIndependentTranslucency).toBe(false);
    });

    it("can set scene mode", function () {
      viewer = createViewer(container, {
        sceneMode: SceneMode.SCENE2D,
      });
      viewer.scene.completeMorph();
      expect(viewer.scene.mode).toBe(SceneMode.SCENE2D);
    });

    it("can set map projection", function () {
      const mapProjection = new WebMercatorProjection();

      viewer = createViewer(container, {
        mapProjection: mapProjection,
      });
      expect(viewer.scene.mapProjection).toEqual(mapProjection);
    });

    it("can set selectedImageryProviderViewModel", async function () {
      viewer = createViewer(container, {
        selectedImageryProviderViewModel: testProviderViewModel,
      });
      await pollToPromise(() => viewer.scene.imageryLayers.get(0).ready);
      expect(viewer.scene.imageryLayers.length).toEqual(1);
      expect(viewer.scene.imageryLayers.get(0).imageryProvider).toBe(
        testProvider,
      );
      expect(viewer.baseLayerPicker.viewModel.selectedImagery).toBe(
        testProviderViewModel,
      );
    });

    it("can set imageryProviderViewModels", async function () {
      const models = [testProviderViewModel];

      viewer = createViewer(container, {
        imageryProviderViewModels: models,
        selectedImageryProviderViewModel: models[0],
      });
      await pollToPromise(() => viewer.scene.imageryLayers.get(0).ready);
      expect(viewer.scene.imageryLayers.length).toEqual(1);
      expect(viewer.scene.imageryLayers.get(0).imageryProvider).toBe(
        testProvider,
      );
      expect(viewer.baseLayerPicker.viewModel.selectedImagery).toBe(
        testProviderViewModel,
      );
      expect(
        viewer.baseLayerPicker.viewModel.imageryProviderViewModels.length,
      ).toBe(models.length);
      expect(
        viewer.baseLayerPicker.viewModel.imageryProviderViewModels[0],
      ).toEqual(models[0]);
    });

    it("can set baseLayer when BaseLayerPicker is disabled", function () {
      viewer = createViewer(container, {
        baseLayerPicker: false,
        baseLayer: new ImageryLayer(testProvider),
      });
      expect(viewer.scene.imageryLayers.length).toEqual(1);
      expect(viewer.scene.imageryLayers.get(0).imageryProvider).toBe(
        testProvider,
      );
    });

    it("can set baseLayer to false when BaseLayerPicker is disabled", function () {
      viewer = createViewer(container, {
        baseLayerPicker: false,
        baseLayer: false,
      });
      expect(viewer.scene.imageryLayers.length).toEqual(0);
    });

    it("can disable render loop", function () {
      viewer = createViewer(container, {
        useDefaultRenderLoop: false,
      });
      expect(viewer.useDefaultRenderLoop).toBe(false);
    });

    it("can set target frame rate", function () {
      viewer = createViewer(container, {
        targetFrameRate: 23,
      });
      expect(viewer.targetFrameRate).toBe(23);
    });

    it("does not create a globe if option is false", function () {
      viewer = createViewer(container, {
        globe: false,
      });
      expect(viewer.scene.globe).not.toBeDefined();
    });

    it("does not create a skyBox if option is false", function () {
      viewer = createViewer(container, {
        skyBox: false,
      });
      expect(viewer.scene.skyBox).not.toBeDefined();
    });

    it("does not create a skyAtmosphere if option is false", function () {
      viewer = createViewer(container, {
        skyAtmosphere: false,
      });
      expect(viewer.scene.skyAtmosphere).not.toBeDefined();
    });

    it("throws if targetFrameRate less than 0", function () {
      viewer = createViewer(container);
      expect(function () {
        viewer.targetFrameRate = -1;
      }).toThrowDeveloperError();
    });

    it("can set resolutionScale", function () {
      viewer = createViewer(container);
      viewer.resolutionScale = 0.5;
      expect(viewer.resolutionScale).toBe(0.5);
    });

    it("throws if resolutionScale is less than 0", function () {
      viewer = createViewer(container);
      expect(function () {
        viewer.resolutionScale = -1;
      }).toThrowDeveloperError();
    });

    it("can enable useBrowserRecommendedResolution", function () {
      viewer = createViewer(container, {
        useBrowserRecommendedResolution: true,
      });

      expect(viewer.useBrowserRecommendedResolution).toBe(true);
    });

    it("useBrowserRecommendedResolution ignores devicePixelRatio", function () {
      const oldDevicePixelRatio = window.devicePixelRatio;
      window.devicePixelRatio = 2.0;

      viewer = createViewer(container, {
        useDefaultRenderLoop: false,
      });

      viewer.resolutionScale = 0.5;

      viewer.useBrowserRecommendedResolution = true;
      viewer.resize();
      expect(viewer.scene.pixelRatio).toEqual(0.5);

      viewer.useBrowserRecommendedResolution = false;
      viewer.resize();
      expect(viewer.scene.pixelRatio).toEqual(1.0);

      window.devicePixelRatio = oldDevicePixelRatio;
    });

    it("constructor throws with undefined container", function () {
      expect(function () {
        return createViewer(undefined);
      }).toThrowDeveloperError();
    });

    it("constructor throws with non-existant string container", function () {
      expect(function () {
        return createViewer("doesNotExist");
      }).toThrowDeveloperError();
    });

    it("constructor throws if using selectedImageryProviderViewModel with BaseLayerPicker disabled", function () {
      expect(function () {
        return createViewer(container, {
          baseLayerPicker: false,
          selectedImageryProviderViewModel: testProviderViewModel,
        });
      }).toThrowDeveloperError();
    });

    it("extend throws with undefined mixin", function () {
      viewer = createViewer(container);
      expect(function () {
        return viewer.extend(undefined);
      }).toThrowDeveloperError();
    });

    it("stops the render loop when render throws", function () {
      viewer = createViewer(container);
      expect(viewer.useDefaultRenderLoop).toEqual(true);

      const error = "foo";
      viewer.scene.primitives.update = function () {
        throw error;
      };

      return pollToPromise(function () {
        return !viewer.useDefaultRenderLoop;
      }, "render loop to be disabled.");
    });

    it("shows the error panel when render throws", function () {
      viewer = createViewer(container);

      const error = "foo";
      viewer.scene.primitives.update = function () {
        throw error;
      };

      return pollToPromise(function () {
        return !viewer.useDefaultRenderLoop;
      }).catch(function () {
        expect(
          viewer._element.querySelector(".cesium-widget-errorPanel"),
        ).not.toBeNull();

        const messages = viewer._element.querySelectorAll(
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
          viewer._element.querySelector(".cesium-button"),
        );

        expect(
          viewer._element.querySelector(".cesium-widget-errorPanel"),
        ).toBeNull();
      });
    });

    it("does not show the error panel if disabled", function () {
      viewer = createViewer(container, {
        showRenderLoopErrors: false,
      });

      const error = "foo";
      viewer.scene.primitives.update = function () {
        throw error;
      };

      return pollToPromise(function () {
        return !viewer.useDefaultRenderLoop;
      }).catch(function () {
        expect(
          viewer._element.querySelector(".cesium-widget-errorPanel"),
        ).toBeNull();
      });
    });

    it("can enable requestRender mode", function () {
      viewer = createViewer(container, {
        requestRenderMode: true,
      });

      expect(viewer.scene.requestRenderMode).toBe(true);
    });

    it("can set maximumRenderTimeChange", function () {
      viewer = createViewer(container, {
        maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      });

      expect(viewer.scene.maximumRenderTimeChange).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it("can set depthPlaneEllipsoidOffset", function () {
      viewer = createViewer(container, {
        depthPlaneEllipsoidOffset: Number.POSITIVE_INFINITY,
      });

      expect(viewer.scene._depthPlane._ellipsoidOffset).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it("can get and set selectedEntity", function () {
      const viewer = createViewer(container);

      const dataSource = new MockDataSource();
      viewer.dataSources.add(dataSource);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(123456, 123456, 123456),
      );

      dataSource.entities.add(entity);

      viewer.selectedEntity = entity;
      expect(viewer.selectedEntity).toBe(entity);

      viewer.selectedEntity = undefined;
      expect(viewer.selectedEntity).toBeUndefined();

      viewer.destroy();
    });

    it("raises an event when the selected entity changes", function () {
      const viewer = createViewer(container);

      const dataSource = new MockDataSource();
      viewer.dataSources.add(dataSource);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(123456, 123456, 123456),
      );

      dataSource.entities.add(entity);

      let myEntity;
      viewer.selectedEntityChanged.addEventListener(function (newSelection) {
        myEntity = newSelection;
      });
      viewer.selectedEntity = entity;
      expect(myEntity).toBe(entity);

      viewer.selectedEntity = undefined;
      expect(myEntity).toBeUndefined();

      viewer.destroy();
    });

    it("selectedEntity sets InfoBox properties", function () {
      const viewer = createViewer(container);

      const entity = new Entity();

      const viewModel = viewer.infoBox.viewModel;
      expect(viewModel.showInfo).toBe(false);

      viewer.selectedEntity = entity;

      viewer.clock.tick();
      expect(viewModel.showInfo).toBe(true);
      expect(viewModel.titleText).toEqual(entity.id);
      expect(viewModel.description).toEqual("");

      entity.name = "Yes, this is name.";
      entity.description = "tubelcane";

      viewer.clock.tick();
      expect(viewModel.showInfo).toBe(true);
      expect(viewModel.titleText).toEqual(entity.name);
      expect(viewModel.description).toEqual(entity.description.getValue());

      viewer.selectedEntity = undefined;

      viewer.clock.tick();
      expect(viewModel.showInfo).toBe(false);
      expect(viewModel.titleText).toEqual("");
      expect(viewModel.description).toEqual("");

      viewer.destroy();
    });

    it("home button resets tracked object", function () {
      viewer = createViewer(container);

      const entity = new Entity();
      entity.position = new ConstantProperty(
        new Cartesian3(123456, 123456, 123456),
      );

      viewer.trackedEntity = entity;
      expect(viewer.trackedEntity).toBe(entity);

      //Needed to avoid actually creating a flight when we issue the home command.
      spyOn(CameraFlightPath, "createTween").and.returnValue({
        startObject: {},
        stopObject: {},
        duration: 0.0,
      });

      viewer.homeButton.viewModel.command();
      expect(viewer.trackedEntity).toBeUndefined();
    });

    it("suspends animation by dataSources if allowed", function () {
      viewer = createViewer(container);

      let updateResult = true;
      spyOn(viewer.dataSourceDisplay, "update").and.callFake(function () {
        viewer.dataSourceDisplay._ready = updateResult;
        return updateResult;
      });

      expect(viewer.clockViewModel.canAnimate).toBe(true);

      viewer.clock.tick();
      expect(viewer.clockViewModel.canAnimate).toBe(true);

      updateResult = false;
      viewer.clock.tick();
      expect(viewer.clockViewModel.canAnimate).toBe(false);

      viewer.clockViewModel.canAnimate = true;
      viewer.allowDataSourcesToSuspendAnimation = false;
      viewer.clock.tick();
      expect(viewer.clockViewModel.canAnimate).toBe(true);
    });
  },
  "WebGL",
);
