/*global defineSuite*/
defineSuite([
        'Widgets/Viewer/Viewer',
        'Core/Cartesian3',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/EllipsoidTerrainProvider',
        'Core/JulianDate',
        'Core/Matrix4',
        'Core/WebMercatorProjection',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/DataSourceClock',
        'DataSources/DataSourceCollection',
        'DataSources/DataSourceDisplay',
        'DataSources/Entity',
        'Scene/Camera',
        'Scene/CameraFlightPath',
        'Scene/ImageryLayerCollection',
        'Scene/SceneMode',
        'Specs/createViewer',
        'Specs/DomEventSimulator',
        'Specs/MockDataSource',
        'Specs/pollToPromise',
        'Widgets/Animation/Animation',
        'Widgets/BaseLayerPicker/BaseLayerPicker',
        'Widgets/BaseLayerPicker/ProviderViewModel',
        'Widgets/CesiumWidget/CesiumWidget',
        'Widgets/FullscreenButton/FullscreenButton',
        'Widgets/Geocoder/Geocoder',
        'Widgets/HomeButton/HomeButton',
        'Widgets/NavigationHelpButton/NavigationHelpButton',
        'Widgets/SceneModePicker/SceneModePicker',
        'Widgets/SelectionIndicator/SelectionIndicator',
        'Widgets/Timeline/Timeline'
    ], function(
        Viewer,
        Cartesian3,
        ClockRange,
        ClockStep,
        EllipsoidTerrainProvider,
        JulianDate,
        Matrix4,
        WebMercatorProjection,
        ConstantPositionProperty,
        ConstantProperty,
        DataSourceClock,
        DataSourceCollection,
        DataSourceDisplay,
        Entity,
        Camera,
        CameraFlightPath,
        ImageryLayerCollection,
        SceneMode,
        createViewer,
        DomEventSimulator,
        MockDataSource,
        pollToPromise,
        Animation,
        BaseLayerPicker,
        ProviderViewModel,
        CesiumWidget,
        FullscreenButton,
        Geocoder,
        HomeButton,
        NavigationHelpButton,
        SceneModePicker,
        SelectionIndicator,
        Timeline) {
    'use strict';

    var testProvider = {
        isReady : function() {
            return false;
        }
    };

    var testProviderViewModel = new ProviderViewModel({
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
        viewer = createViewer(container);
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
        expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
        expect(viewer.imageryLayers).toBeInstanceOf(ImageryLayerCollection);
        expect(viewer.terrainProvider).toBeInstanceOf(EllipsoidTerrainProvider);
        expect(viewer.camera).toBeInstanceOf(Camera);
        expect(viewer.dataSourceDisplay).toBeInstanceOf(DataSourceDisplay);
        expect(viewer.dataSources).toBeInstanceOf(DataSourceCollection);
        expect(viewer.canvas).toBe(viewer.cesiumWidget.canvas);
        expect(viewer.cesiumLogo).toBe(viewer.cesiumWidget.cesiumLogo);
        expect(viewer.screenSpaceEventHandler).toBe(viewer.cesiumWidget.screenSpaceEventHandler);
        expect(viewer.isDestroyed()).toEqual(false);
        viewer.destroy();
        expect(viewer.isDestroyed()).toEqual(true);
    });

    it('renders without errors', function() {
        viewer = createViewer(container);
        spyOn(viewer.scene.renderError, 'raiseEvent');
        viewer.render();
        expect(viewer.scene.renderError.raiseEvent).not.toHaveBeenCalled();
    });

    it('constructor works with container id string', function() {
        viewer = createViewer('container');
        expect(viewer.container).toBe(container);
    });

    it('can shut off HomeButton', function() {
        viewer = createViewer(container, {
            homeButton : false
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

    it('can shut off SceneModePicker', function() {
        viewer = createViewer(container, {
            sceneModePicker : false
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

    it('can shut off BaseLayerPicker', function() {
        viewer = createViewer(container, {
            baseLayerPicker : false
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

    it('can shut off NavigationHelpButton', function() {
        viewer = createViewer(container, {
            navigationHelpButton : false
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

    it('can shut off Animation', function() {
        viewer = createViewer(container, {
            animation : false
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

    it('can shut off Timeline', function() {
        viewer = createViewer(container, {
            timeline : false
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

    it('can shut off FullscreenButton', function() {
        viewer = createViewer(container, {
            fullscreenButton : false
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

    it('can shut off FullscreenButton and Timeline', function() {
        viewer = createViewer(container, {
            timeline : false,
            fullscreenButton : false
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

    it('can shut off FullscreenButton, Timeline, and Animation', function() {
        viewer = createViewer(container, {
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
        expect(viewer.navigationHelpButton).toBeInstanceOf(NavigationHelpButton);
        expect(viewer.animation).toBeUndefined(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeUndefined();
        expect(viewer.selectionIndicator).toBeInstanceOf(SelectionIndicator);
        viewer.resize();
        viewer.render();
    });

    it('can shut off Geocoder', function() {
        viewer = createViewer(container, {
            geocoder : false
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

    it('can shut off SelectionIndicator', function() {
        viewer = createViewer(container, {
            selectionIndicator : false
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

    it('can set shadows', function() {
        viewer = createViewer(container, {
            shadows : true
        });
        expect(viewer.shadows).toBe(true);
    });

    it('can set terrain shadows', function() {
        viewer = createViewer(container, {
            terrainShadows : true
        });
        expect(viewer.terrainShadows).toBe(true);
    });

    it('can set terrainProvider', function() {
        var provider = new EllipsoidTerrainProvider();

        viewer = createViewer(container, {
            baseLayerPicker : false,
            terrainProvider : provider
        });
        expect(viewer.scene.terrainProvider).toBe(provider);

        var anotherProvider = new EllipsoidTerrainProvider();
        viewer.terrainProvider = anotherProvider;
        expect(viewer.terrainProvider).toBe(anotherProvider);
    });

    it('can set fullScreenElement', function() {
        var testElement = document.createElement('span');

        viewer = createViewer(container, {
            fullscreenElement : testElement
        });
        expect(viewer.fullscreenButton.viewModel.fullscreenElement).toBe(testElement);
    });

    it('can set contextOptions', function() {
        var webglOptions = {
            alpha : true,
            depth : true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
            stencil : true,
            antialias : false,
            premultipliedAlpha : true, // Workaround IE 11.0.8, which does not honor false.
            preserveDrawingBuffer : true
        };
        var contextOptions = {
            allowTextureFilterAnisotropic : false,
            webgl : webglOptions
        };

        viewer = createViewer(container, {
            contextOptions : contextOptions
        });

        var context = viewer.scene.context;
        var contextAttributes = context._gl.getContextAttributes();

        expect(context.options.allowTextureFilterAnisotropic).toEqual(false);
        expect(contextAttributes.alpha).toEqual(webglOptions.alpha);
        expect(contextAttributes.depth).toEqual(webglOptions.depth);
        expect(contextAttributes.stencil).toEqual(webglOptions.stencil);
        expect(contextAttributes.antialias).toEqual(webglOptions.antialias);
        expect(contextAttributes.premultipliedAlpha).toEqual(webglOptions.premultipliedAlpha);
        expect(contextAttributes.preserveDrawingBuffer).toEqual(webglOptions.preserveDrawingBuffer);
    });

    it('can disable Order Independent Translucency', function() {
        viewer = createViewer(container, {
            orderIndependentTranslucency : false
        });
        expect(viewer.scene.orderIndependentTranslucency).toBe(false);
    });

    it('can set scene mode', function() {
        viewer = createViewer(container, {
            sceneMode : SceneMode.SCENE2D
        });
        viewer.scene.completeMorph();
        expect(viewer.scene.mode).toBe(SceneMode.SCENE2D);
    });

    it('can set map projection', function() {
        var mapProjection = new WebMercatorProjection();

        viewer = createViewer(container, {
            mapProjection : mapProjection
        });
        expect(viewer.scene.mapProjection).toEqual(mapProjection);
    });

    it('can set selectedImageryProviderViewModel', function() {
        viewer = createViewer(container, {
            selectedImageryProviderViewModel : testProviderViewModel
        });
        expect(viewer.scene.imageryLayers.length).toEqual(1);
        expect(viewer.scene.imageryLayers.get(0).imageryProvider).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedImagery).toBe(testProviderViewModel);
    });

    it('can set imageryProvider when BaseLayerPicker is disabled', function() {
        viewer = createViewer(container, {
            baseLayerPicker : false,
            imageryProvider : testProvider
        });
        expect(viewer.scene.imageryLayers.length).toEqual(1);
        expect(viewer.scene.imageryLayers.get(0).imageryProvider).toBe(testProvider);
    });

    it('can set imageryProviderViewModels', function() {
        var models = [testProviderViewModel];

        viewer = createViewer(container, {
            imageryProviderViewModels : models
        });
        expect(viewer.scene.imageryLayers.length).toEqual(1);
        expect(viewer.scene.imageryLayers.get(0).imageryProvider).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedImagery).toBe(testProviderViewModel);
        expect(viewer.baseLayerPicker.viewModel.imageryProviderViewModels.length).toBe(models.length);
        expect(viewer.baseLayerPicker.viewModel.imageryProviderViewModels[0]).toEqual(models[0]);
    });

    it('can disable render loop', function() {
        viewer = createViewer(container, {
            useDefaultRenderLoop : false
        });
        expect(viewer.useDefaultRenderLoop).toBe(false);
    });

    it('can set target frame rate', function() {
        viewer = createViewer(container, {
            targetFrameRate : 23
        });
        expect(viewer.targetFrameRate).toBe(23);
    });

    it('does not create a globe if option is false', function() {
        viewer = createViewer(container, {
            globe : false
        });
        expect(viewer.scene.globe).not.toBeDefined();
    });

    it('does not create a skyBox if option is false', function() {
        viewer = createViewer(container, {
            skyBox : false
        });
        expect(viewer.scene.skyBox).not.toBeDefined();
    });

    it('does not create a skyAtmosphere if option is false', function() {
        viewer = createViewer(container, {
            skyAtmosphere : false
        });
        expect(viewer.scene.skyAtmosphere).not.toBeDefined();
    });

    it('can set dataSources at construction', function() {
        var collection = new DataSourceCollection();
        viewer = createViewer(container, {
            dataSources : collection
        });
        expect(viewer.dataSources).toBe(collection);
    });

    it('default DataSourceCollection is destroyed when Viewer is destroyed', function() {
        viewer = createViewer(container);
        var dataSources = viewer.dataSources;
        viewer.destroy();
        expect(dataSources.isDestroyed()).toBe(true);
    });

    it('specified DataSourceCollection is not destroyed when Viewer is destroyed', function() {
        var collection = new DataSourceCollection();
        viewer = createViewer(container, {
            dataSources : collection
        });
        viewer.destroy();
        expect(collection.isDestroyed()).toBe(false);
    });

    it('throws if targetFrameRate less than 0', function() {
        viewer = createViewer(container);
        expect(function() {
            viewer.targetFrameRate = -1;
        }).toThrowDeveloperError();
    });

    it('can set resolutionScale', function() {
        viewer = createViewer(container);
        viewer.resolutionScale = 0.5;
        expect(viewer.resolutionScale).toBe(0.5);
    });

    it('throws if resolutionScale is less than 0', function() {
        viewer = createViewer(container);
        expect(function() {
            viewer.resolutionScale = -1;
        }).toThrowDeveloperError();
    });

    it('constructor throws with undefined container', function() {
        expect(function() {
            return createViewer(undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with non-existant string container', function() {
        expect(function() {
            return createViewer('doesNotExist');
        }).toThrowDeveloperError();
    });

    it('constructor throws if using selectedImageryProviderViewModel with BaseLayerPicker disabled', function() {
        expect(function() {
            return createViewer(container, {
                baseLayerPicker : false,
                selectedImageryProviderViewModel : testProviderViewModel
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if using imageryProvider with BaseLayerPicker enabled', function() {
        expect(function() {
            return createViewer(container, {
                imageryProvider : testProvider
            });
        }).toThrowDeveloperError();
    });

    it('extend throws with undefined mixin', function() {
        viewer = createViewer(container);
        expect(function() {
            return viewer.extend(undefined);
        }).toThrowDeveloperError();
    });

    it('stops the render loop when render throws', function() {
        viewer = createViewer(container);
        expect(viewer.useDefaultRenderLoop).toEqual(true);

        var error = 'foo';
        viewer.scene.primitives.update = function() {
            throw error;
        };

        return pollToPromise(function() {
            return !viewer.useDefaultRenderLoop;
        }, 'render loop to be disabled.');
    });

    it('sets the clock and timeline based on the first data source', function() {
        var dataSource = new MockDataSource();
        dataSource.clock = new DataSourceClock();
        dataSource.clock.startTime = JulianDate.fromIso8601('2013-08-01T18:00Z');
        dataSource.clock.stopTime = JulianDate.fromIso8601('2013-08-21T02:00Z');
        dataSource.clock.currentTime = JulianDate.fromIso8601('2013-08-02T00:00Z');
        dataSource.clock.clockRange = ClockRange.CLAMPED;
        dataSource.clock.clockStep = ClockStep.TICK_DEPENDENT;
        dataSource.clock.multiplier = 20.0;

        viewer = createViewer(container);
        viewer.dataSources.add(dataSource);

        expect(viewer.clock.startTime).toEqual(dataSource.clock.startTime);
        expect(viewer.clock.stopTime).toEqual(dataSource.clock.stopTime);
        expect(viewer.clock.currentTime).toEqual(dataSource.clock.currentTime);
        expect(viewer.clock.clockRange).toEqual(dataSource.clock.clockRange);
        expect(viewer.clock.clockStep).toEqual(dataSource.clock.clockStep);
        expect(viewer.clock.multiplier).toEqual(dataSource.clock.multiplier);
    });

    it('sets the clock for multiple data sources', function() {
        var dataSource1 = new MockDataSource();
        dataSource1.clock = new DataSourceClock();
        dataSource1.clock.startTime = JulianDate.fromIso8601('2013-08-01T18:00Z');
        dataSource1.clock.stopTime = JulianDate.fromIso8601('2013-08-21T02:00Z');
        dataSource1.clock.currentTime = JulianDate.fromIso8601('2013-08-02T00:00Z');

        viewer = createViewer(container);
        viewer.dataSources.add(dataSource1);

        expect(viewer.clockTrackedDataSource).toBe(dataSource1);
        expect(viewer.clock.startTime).toEqual(dataSource1.clock.startTime);

        var dataSource2 = new MockDataSource();
        dataSource2.clock = new DataSourceClock();
        dataSource2.clock.startTime = JulianDate.fromIso8601('2014-08-01T18:00Z');
        dataSource2.clock.stopTime = JulianDate.fromIso8601('2014-08-21T02:00Z');
        dataSource2.clock.currentTime = JulianDate.fromIso8601('2014-08-02T00:00Z');

        viewer.dataSources.add(dataSource2);
        expect(viewer.clockTrackedDataSource).toBe(dataSource2);
        expect(viewer.clock.startTime).toEqual(dataSource2.clock.startTime);

        var dataSource3 = new MockDataSource();
        dataSource3.clock = new DataSourceClock();
        dataSource3.clock.startTime = JulianDate.fromIso8601('2015-08-01T18:00Z');
        dataSource3.clock.stopTime = JulianDate.fromIso8601('2015-08-21T02:00Z');
        dataSource3.clock.currentTime = JulianDate.fromIso8601('2015-08-02T00:00Z');

        viewer.dataSources.add(dataSource3);
        expect(viewer.clockTrackedDataSource).toBe(dataSource3);
        expect(viewer.clock.startTime).toEqual(dataSource3.clock.startTime);

        // Removing the last dataSource moves the clock to second-last.
        viewer.dataSources.remove(dataSource3);
        expect(viewer.clockTrackedDataSource).toBe(dataSource2);
        expect(viewer.clock.startTime).toEqual(dataSource2.clock.startTime);

        // Removing the first data source has no effect, because it's not active.
        viewer.dataSources.remove(dataSource1);
        expect(viewer.clockTrackedDataSource).toBe(dataSource2);
        expect(viewer.clock.startTime).toEqual(dataSource2.clock.startTime);
    });

    it('updates the clock when the data source changes', function() {
        var dataSource = new MockDataSource();
        dataSource.clock = new DataSourceClock();
        dataSource.clock.startTime = JulianDate.fromIso8601('2013-08-01T18:00Z');
        dataSource.clock.stopTime = JulianDate.fromIso8601('2013-08-21T02:00Z');
        dataSource.clock.currentTime = JulianDate.fromIso8601('2013-08-02T00:00Z');
        dataSource.clock.clockRange = ClockRange.CLAMPED;
        dataSource.clock.clockStep = ClockStep.TICK_DEPENDENT;
        dataSource.clock.multiplier = 20.0;

        viewer = createViewer(container);
        viewer.dataSources.add(dataSource);

        dataSource.clock.startTime = JulianDate.fromIso8601('2014-08-01T18:00Z');
        dataSource.clock.stopTime = JulianDate.fromIso8601('2014-08-21T02:00Z');
        dataSource.clock.currentTime = JulianDate.fromIso8601('2014-08-02T00:00Z');
        dataSource.clock.clockRange = ClockRange.UNBOUNDED;
        dataSource.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        dataSource.clock.multiplier = 10.0;

        dataSource.changedEvent.raiseEvent(dataSource);

        expect(viewer.clock.startTime).toEqual(dataSource.clock.startTime);
        expect(viewer.clock.stopTime).toEqual(dataSource.clock.stopTime);
        expect(viewer.clock.currentTime).toEqual(dataSource.clock.currentTime);
        expect(viewer.clock.clockRange).toEqual(dataSource.clock.clockRange);
        expect(viewer.clock.clockStep).toEqual(dataSource.clock.clockStep);
        expect(viewer.clock.multiplier).toEqual(dataSource.clock.multiplier);

        dataSource.clock.clockStep = ClockStep.SYSTEM_CLOCK;
        dataSource.clock.multiplier = 1.0;

        dataSource.changedEvent.raiseEvent(dataSource);

        expect(viewer.clock.clockStep).toEqual(dataSource.clock.clockStep);
    });

    it('can manually control the clock tracking', function() {
        var dataSource1 = new MockDataSource();
        dataSource1.clock = new DataSourceClock();
        dataSource1.clock.startTime = JulianDate.fromIso8601('2013-08-01T18:00Z');
        dataSource1.clock.stopTime = JulianDate.fromIso8601('2013-08-21T02:00Z');
        dataSource1.clock.currentTime = JulianDate.fromIso8601('2013-08-02T00:00Z');

        viewer = createViewer(container, { automaticallyTrackDataSourceClocks : false });
        viewer.dataSources.add(dataSource1);

        // Because of the above Viewer option, data sources are not automatically
        // selected for clock tracking.
        expect(viewer.clockTrackedDataSource).not.toBeDefined();
        // The mock data source time is in the past, so will not be the default time.
        expect(viewer.clock.startTime).not.toEqual(dataSource1.clock.startTime);

        // Manually set the first data source as the tracked data source.
        viewer.clockTrackedDataSource = dataSource1;
        expect(viewer.clockTrackedDataSource).toBe(dataSource1);
        expect(viewer.clock.startTime).toEqual(dataSource1.clock.startTime);

        var dataSource2 = new MockDataSource();
        dataSource2.clock = new DataSourceClock();
        dataSource2.clock.startTime = JulianDate.fromIso8601('2014-08-01T18:00Z');
        dataSource2.clock.stopTime = JulianDate.fromIso8601('2014-08-21T02:00Z');
        dataSource2.clock.currentTime = JulianDate.fromIso8601('2014-08-02T00:00Z');

        // Adding a second data source in manual mode still leaves the first one tracked.
        viewer.dataSources.add(dataSource2);
        expect(viewer.clockTrackedDataSource).toBe(dataSource1);
        expect(viewer.clock.startTime).toEqual(dataSource1.clock.startTime);

        // Removing the tracked data source in manual mode turns off tracking, even
        // if other data sources remain available for tracking.
        viewer.dataSources.remove(dataSource1);
        expect(viewer.clockTrackedDataSource).not.toBeDefined();
    });

    it('shows the error panel when render throws', function() {
        viewer = createViewer(container);

        var error = 'foo';
        viewer.scene.primitives.update = function() {
            throw error;
        };

        return pollToPromise(function() {
            return !viewer.useDefaultRenderLoop;
        }).then(function() {
            expect(viewer._element.querySelector('.cesium-widget-errorPanel')).not.toBeNull();

            var messages = viewer._element.querySelectorAll('.cesium-widget-errorPanel-message');

            var found = false;
            for (var i = 0; i < messages.length; ++i) {
                if (messages[i].textContent === error) {
                    found = true;
                }
            }

            expect(found).toBe(true);

            // click the OK button to dismiss the panel
            DomEventSimulator.fireClick(viewer._element.querySelector('.cesium-button'));

            expect(viewer._element.querySelector('.cesium-widget-errorPanel')).toBeNull();
        });
    });

    it('does not show the error panel if disabled', function() {
        viewer = createViewer(container, {
            showRenderLoopErrors : false
        });

        var error = 'foo';
        viewer.scene.primitives.update = function() {
            throw error;
        };

        return pollToPromise(function() {
            return !viewer.useDefaultRenderLoop;
        }).then(function() {
            expect(viewer._element.querySelector('.cesium-widget-errorPanel')).toBeNull();
        });
    });

    it('can get and set trackedEntity', function() {
        viewer = createViewer(container);

        var entity = new Entity();
        entity.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedEntity = entity;
        expect(viewer.trackedEntity).toBe(entity);

        viewer.trackedEntity = undefined;
        expect(viewer.trackedEntity).toBeUndefined();
    });

    it('can get and set selectedEntity', function() {
        var viewer = createViewer(container);

        var dataSource = new MockDataSource();
        viewer.dataSources.add(dataSource);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(123456, 123456, 123456));

        dataSource.entities.add(entity);

        viewer.selectedEntity = entity;
        expect(viewer.selectedEntity).toBe(entity);

        viewer.selectedEntity = undefined;
        expect(viewer.selectedEntity).toBeUndefined();

        viewer.destroy();
    });

    it('selectedEntity sets InfoBox properties', function() {
        var viewer = createViewer(container);

        var entity = new Entity();

        var viewModel = viewer.infoBox.viewModel;
        expect(viewModel.showInfo).toBe(false);

        viewer.selectedEntity = entity;

        viewer.clock.tick();
        expect(viewModel.showInfo).toBe(true);
        expect(viewModel.titleText).toEqual(entity.id);
        expect(viewModel.description).toEqual('');

        entity.name = 'Yes, this is name.';
        entity.description = 'tubelcane';

        viewer.clock.tick();
        expect(viewModel.showInfo).toBe(true);
        expect(viewModel.titleText).toEqual(entity.name);
        expect(viewModel.description).toEqual(entity.description.getValue());

        viewer.selectedEntity = undefined;

        viewer.clock.tick();
        expect(viewModel.showInfo).toBe(false);
        expect(viewModel.titleText).toEqual('');
        expect(viewModel.description).toEqual('');

        viewer.destroy();
    });

    it('home button resets tracked object', function() {
        viewer = createViewer(container);

        var entity = new Entity();
        entity.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedEntity = entity;
        expect(viewer.trackedEntity).toBe(entity);

        //Needed to avoid actually creating a flight when we issue the home command.
        spyOn(CameraFlightPath, 'createTween').and.returnValue({
            startObject : {},
            stopObject: {},
            duration : 0.0
        });

        viewer.homeButton.viewModel.command();
        expect(viewer.trackedEntity).toBeUndefined();
    });

    it('stops tracking when tracked object is removed', function() {
        viewer = createViewer(container);

        var entity = new Entity();
        entity.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        var dataSource = new MockDataSource();
        dataSource.entities.add(entity);

        viewer.dataSources.add(dataSource);
        viewer.trackedEntity = entity;

        expect(viewer.trackedEntity).toBe(entity);

        return pollToPromise(function() {
            viewer.render();
            return Cartesian3.equals(Matrix4.getTranslation(viewer.scene.camera.transform, new Cartesian3()), entity.position.getValue());
        }).then(function() {
            dataSource.entities.remove(entity);

            expect(viewer.trackedEntity).toBeUndefined();
            expect(viewer.scene.camera.transform).toEqual(Matrix4.IDENTITY);

            dataSource.entities.add(entity);
            viewer.trackedEntity = entity;

            expect(viewer.trackedEntity).toBe(entity);

            return pollToPromise(function() {
                viewer.render();
                viewer.render();
                return Cartesian3.equals(Matrix4.getTranslation(viewer.scene.camera.transform, new Cartesian3()), entity.position.getValue());
            }).then(function() {
                viewer.dataSources.remove(dataSource);

                expect(viewer.trackedEntity).toBeUndefined();
                expect(viewer.scene.camera.transform).toEqual(Matrix4.IDENTITY);
            });
        });
    });

    it('does not crash when tracking an object with a position property whose value is undefined.', function() {
        viewer = createViewer(container);

        var entity = new Entity();
        entity.position = new ConstantProperty(undefined);
        entity.polyline = {
            positions : [Cartesian3.fromDegrees(0, 0, 0), Cartesian3.fromDegrees(0, 0, 1)]
        };

        viewer.entities.add(entity);
        viewer.trackedEntity = entity;

        spyOn(viewer.scene.renderError, 'raiseEvent');
        return pollToPromise(function() {
            viewer.render();
            return viewer.dataSourceDisplay.update(viewer.clock.currentTime);
        }).then(function() {
            expect(viewer.scene.renderError.raiseEvent).not.toHaveBeenCalled();
        });
    });

    it('removes data source listeners when destroyed', function() {
        viewer = createViewer(container);

        //one data source that is added before mixing in
        var preMixinDataSource = new MockDataSource();
        viewer.dataSources.add(preMixinDataSource);

        //one data source that is added after mixing in
        var postMixinDataSource = new MockDataSource();
        viewer.dataSources.add(postMixinDataSource);

        var preMixinListenerCount = preMixinDataSource.entities.collectionChanged._listeners.length;
        var postMixinListenerCount = postMixinDataSource.entities.collectionChanged._listeners.length;

        viewer = viewer.destroy();

        expect(preMixinDataSource.entities.collectionChanged._listeners.length).not.toEqual(preMixinListenerCount);
        expect(postMixinDataSource.entities.collectionChanged._listeners.length).not.toEqual(postMixinListenerCount);
    });
}, 'WebGL');
