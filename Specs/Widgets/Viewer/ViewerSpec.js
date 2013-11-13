/*global defineSuite*/
defineSuite([
         'Widgets/Viewer/Viewer',
         'Widgets/Animation/Animation',
         'Widgets/BaseLayerPicker/BaseLayerPicker',
         'Widgets/BaseLayerPicker/ImageryProviderViewModel',
         'Widgets/CesiumWidget/CesiumWidget',
         'Widgets/FullscreenButton/FullscreenButton',
         'Widgets/HomeButton/HomeButton',
         'Widgets/Geocoder/Geocoder',
         'Widgets/SceneModePicker/SceneModePicker',
         'Widgets/Timeline/Timeline',
         'Core/ClockRange',
         'Core/ClockStep',
         'Core/JulianDate',
         'DynamicScene/DataSourceDisplay',
         'DynamicScene/DataSourceCollection',
         'DynamicScene/DynamicClock',
         'Scene/EllipsoidTerrainProvider',
         'Scene/SceneMode',
         'Specs/EventHelper',
         'Specs/MockDataSource'
     ], function(
         Viewer,
         Animation,
         BaseLayerPicker,
         ImageryProviderViewModel,
         CesiumWidget,
         FullscreenButton,
         HomeButton,
         Geocoder,
         SceneModePicker,
         Timeline,
         ClockRange,
         ClockStep,
         JulianDate,
         DataSourceDisplay,
         DataSourceCollection,
         DynamicClock,
         EllipsoidTerrainProvider,
         SceneMode,
         EventHelper,
         MockDataSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var testProvider = {
        isReady : function() {
            return false;
        }
    };

    var testProviderViewModel = new ImageryProviderViewModel({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider;
        }
    });

    var container;
    var viewer;
    beforeEach(function() {
        container = document.createElement('div');
        container.id = 'container';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        document.body.appendChild(container);
    });

    afterEach(function() {
        if (viewer && !viewer.isDestroyed()) {
            viewer = viewer.destroy();
        }

        document.body.removeChild(container);
    });

    it('constructor sets default values', function() {
        viewer = new Viewer(container);
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        expect(viewer.dataSourceDisplay).toBeInstanceOf(DataSourceDisplay);
        expect(viewer.dataSources).toBeInstanceOf(DataSourceCollection);
        expect(viewer.canvas).toBe(viewer.cesiumWidget.canvas);
        expect(viewer.cesiumLogo).toBe(viewer.cesiumWidget.cesiumLogo);
        expect(viewer.sceneTransitioner).toBe(viewer.cesiumWidget.sceneTransitioner);
        expect(viewer.screenSpaceEventHandler).toBe(viewer.cesiumWidget.screenSpaceEventHandler);
        expect(viewer.isDestroyed()).toEqual(false);
        viewer.destroy();
        expect(viewer.isDestroyed()).toEqual(true);
    });

    it('constructor works with container id string', function() {
        viewer = new Viewer('container');
        expect(viewer.container).toBe(container);
    });

    it('can shut off HomeButton', function() {
        viewer = new Viewer(container, {
            homeButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeUndefined();
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
    });

    it('can shut off SceneModePicker', function() {
        viewer = new Viewer(container, {
            sceneModePicker : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeUndefined();
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
    });

    it('can shut off BaseLayerPicker', function() {
        viewer = new Viewer(container, {
            baseLayerPicker : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeUndefined();
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
    });

    it('can shut off Animation', function() {
        viewer = new Viewer(container, {
            animation : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeUndefined();
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
    });

    it('can shut off Timeline', function() {
        viewer = new Viewer(container, {
            timeline : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
    });

    it('can shut off FullscreenButton', function() {
        viewer = new Viewer(container, {
            fullscreenButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.resize();
        viewer.render();
    });

    it('can shut off FullscreenButton and Timeline', function() {
        viewer = new Viewer(container, {
            timeline : false,
            fullscreenButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.resize();
        viewer.render();
    });

    it('can shut off FullscreenButton, Timeline, and Animation', function() {
        viewer = new Viewer(container, {
            timeline : false,
            fullscreenButton : false,
            animation : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeInstanceOf(Geocoder);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeUndefined(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.resize();
        viewer.render();
    });

    it('can shut off Geocoder', function() {
        viewer = new Viewer(container, {
            geocoder : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.geocoder).toBeUndefined();
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
    });

    it('can set terrainProvider', function() {
        var provider = new EllipsoidTerrainProvider();

        viewer = new Viewer(container, {
            terrainProvider : provider
        });
        expect(viewer.centralBody.terrainProvider).toBe(provider);
    });

    it('can set fullScreenElement', function() {
        var testElement = document.createElement('span');

        viewer = new Viewer(container, {
            fullscreenElement : testElement
        });
        expect(viewer.fullscreenButton.viewModel.fullscreenElement).toBe(testElement);
    });

    it('can set contextOptions', function() {
        var contextOptions = {
            alpha : true,
            depth : true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
            stencil : true,
            antialias : false,
            premultipliedAlpha : false,
            preserveDrawingBuffer : true
        };

        viewer = new Viewer(container, {
            contextOptions : contextOptions
        });

        var contextAttributes = viewer.scene.getContext()._gl.getContextAttributes();
        expect(contextAttributes).toEqual(contextOptions);
    });

    it('can set scene mode', function() {
        viewer = new Viewer(container, {
            sceneMode : SceneMode.SCENE2D
        });
        expect(viewer.scene.mode).toBe(SceneMode.SCENE2D);
    });

    it('can set selectedImageryProviderViewModel', function() {
        viewer = new Viewer(container, {
            selectedImageryProviderViewModel : testProviderViewModel
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem).toBe(testProviderViewModel);
    });

    it('can set imageryProvider when BaseLayerPicker is disabled', function() {
        viewer = new Viewer(container, {
            baseLayerPicker : false,
            imageryProvider : testProvider
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
    });

    it('can set imageryProviderViewModels', function() {
        var models = [testProviderViewModel];

        viewer = new Viewer(container, {
            imageryProviderViewModels : models
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem).toBe(testProviderViewModel);
        expect(viewer.baseLayerPicker.viewModel.imageryProviderViewModels).toEqual(models);
    });

    it('can disable render loop', function() {
        viewer = new Viewer(container, {
            useDefaultRenderLoop : false
        });
        expect(viewer.useDefaultRenderLoop).toBe(false);
    });

    it('constructor throws with undefined container', function() {
        expect(function() {
            return new Viewer(undefined);
        }).toThrow();
    });

    it('constructor throws with non-existant string container', function() {
        expect(function() {
            return new Viewer('doesNotExist');
        }).toThrow();
    });

    it('constructor throws if using selectedImageryProviderViewModel with BaseLayerPicker disabled', function() {
        expect(function() {
            return new Viewer(container, {
                baseLayerPicker : false,
                selectedImageryProviderViewModel : testProviderViewModel
            });
        }).toThrow();
    });

    it('constructor throws if using imageryProvider with BaseLayerPicker enabled', function() {
        expect(function() {
            return new Viewer(container, {
                imageryProvider : testProvider
            });
        }).toThrow();
    });

    it('extend throws with undefined mixin', function() {
        viewer = new Viewer(container);
        expect(function() {
            return viewer.extend(undefined);
        }).toThrow();
    });

    it('raises onRenderLoopError and stops the render loop when render throws', function() {
        viewer = new Viewer(container);
        expect(viewer.useDefaultRenderLoop).toEqual(true);

        var spyListener = jasmine.createSpy('listener');
        viewer.onRenderLoopError.addEventListener(spyListener);

        var error = 'foo';
        viewer.render = function() {
            throw error;
        };

        waitsFor(function() {
            return spyListener.wasCalled;
        });

        runs(function() {
            expect(spyListener).toHaveBeenCalledWith(viewer, error);
            expect(viewer.useDefaultRenderLoop).toEqual(false);
        });
    });

    it('sets the clock and timeline based on the first data source', function() {
        var dataSource = new MockDataSource();
        dataSource.clock = new DynamicClock();
        dataSource.clock.startTime = JulianDate.fromIso8601('2013-08-01T18:00Z');
        dataSource.clock.stopTime = JulianDate.fromIso8601('2013-08-21T02:00Z');
        dataSource.clock.currentTime = JulianDate.fromIso8601('2013-08-02T00:00Z');
        dataSource.clock.clockRange = ClockRange.CLAMPED;
        dataSource.clock.clockStep = ClockStep.TICK_DEPENDENT;
        dataSource.clock.multiplier = 20.0;

        viewer = new Viewer(container);
        viewer.dataSources.add(dataSource);

        expect(viewer.clock.startTime).toEqual(dataSource.clock.startTime);
        expect(viewer.clock.stopTime).toEqual(dataSource.clock.stopTime);
        expect(viewer.clock.currentTime).toEqual(dataSource.clock.currentTime);
        expect(viewer.clock.clockRange).toEqual(dataSource.clock.clockRange);
        expect(viewer.clock.clockStep).toEqual(dataSource.clock.clockStep);
        expect(viewer.clock.multiplier).toEqual(dataSource.clock.multiplier);
    });

    it('shows the error panel when render throws', function() {
        viewer = new Viewer(container);

        var error = 'foo';
        viewer.render = function() {
            throw error;
        };

        waitsFor(function() {
            return !viewer.useDefaultRenderLoop;
        });

        runs(function() {
            expect(viewer._element.querySelector('.cesium-widget-errorPanel')).not.toBeNull();
            expect(viewer._element.querySelector('.cesium-widget-errorPanel-message').textContent).toEqual(error);

            // click the OK button to dismiss the panel
            EventHelper.fireClick(viewer._element.querySelector('.cesium-widget-button'));

            expect(viewer._element.querySelector('.cesium-widget-errorPanel')).toBeNull();
        });
    });

    it('does not show the error panel if disabled', function() {
        viewer = new Viewer(container, {
            showRenderLoopErrors : false
        });

        var error = 'foo';
        viewer.render = function() {
            throw error;
        };

        waitsFor(function() {
            return !viewer.useDefaultRenderLoop;
        });

        runs(function() {
            expect(viewer._element.querySelector('.cesium-widget-errorPanel')).toBeNull();
        });
    });
}, 'WebGL');