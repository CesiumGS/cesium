/*global define*/
define([
        '../../Core/BoundingSphere',
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../Core/EventHelper',
        '../../Core/isArray',
        '../../Core/Matrix4',
        '../../Core/Rectangle',
        '../../Core/ScreenSpaceEventType',
        '../../DataSources/BoundingSphereState',
        '../../DataSources/ConstantPositionProperty',
        '../../DataSources/DataSourceCollection',
        '../../DataSources/DataSourceDisplay',
        '../../DataSources/Entity',
        '../../DataSources/EntityView',
        '../../DataSources/Property',
        '../../Scene/ImageryLayer',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when',
        '../Animation/Animation',
        '../Animation/AnimationViewModel',
        '../BaseLayerPicker/BaseLayerPicker',
        '../BaseLayerPicker/createDefaultImageryProviderViewModels',
        '../BaseLayerPicker/createDefaultTerrainProviderViewModels',
        '../CesiumWidget/CesiumWidget',
        '../ClockViewModel',
        '../FullscreenButton/FullscreenButton',
        '../Geocoder/Geocoder',
        '../getElement',
        '../HomeButton/HomeButton',
        '../InfoBox/InfoBox',
        '../NavigationHelpButton/NavigationHelpButton',
        '../ProjectionPicker/ProjectionPicker',
        '../SceneModePicker/SceneModePicker',
        '../SelectionIndicator/SelectionIndicator',
        '../subscribeAndEvaluate',
        '../Timeline/Timeline',
        '../VRButton/VRButton'
    ], function(
        BoundingSphere,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        EventHelper,
        isArray,
        Matrix4,
        Rectangle,
        ScreenSpaceEventType,
        BoundingSphereState,
        ConstantPositionProperty,
        DataSourceCollection,
        DataSourceDisplay,
        Entity,
        EntityView,
        Property,
        ImageryLayer,
        SceneMode,
        knockout,
        when,
        Animation,
        AnimationViewModel,
        BaseLayerPicker,
        createDefaultImageryProviderViewModels,
        createDefaultTerrainProviderViewModels,
        CesiumWidget,
        ClockViewModel,
        FullscreenButton,
        Geocoder,
        getElement,
        HomeButton,
        InfoBox,
        NavigationHelpButton,
        ProjectionPicker,
        SceneModePicker,
        SelectionIndicator,
        subscribeAndEvaluate,
        Timeline,
        VRButton) {
    'use strict';

    var boundingSphereScratch = new BoundingSphere();

    function onTimelineScrubfunction(e) {
        var clock = e.clock;
        clock.currentTime = e.timeJulian;
        clock.shouldAnimate = false;
    }

    function pickEntity(viewer, e) {
        var picked = viewer.scene.pick(e.position);
        if (defined(picked)) {
            var id = defaultValue(picked.id, picked.primitive.id);
            if (id instanceof Entity) {
                return id;
            }
        }

        // No regular entity picked.  Try picking features from imagery layers.
        if (defined(viewer.scene.globe)) {
            return pickImageryLayerFeature(viewer, e.position);
        }
    }

    function trackDataSourceClock(timeline, clock, dataSource) {
        if (defined(dataSource)) {
            var dataSourceClock = dataSource.clock;
            if (defined(dataSourceClock)) {
                dataSourceClock.getValue(clock);
                if (defined(timeline)) {
                    timeline.updateFromClock();
                    timeline.zoomTo(dataSourceClock.startTime, dataSourceClock.stopTime);
                }
            }
        }
    }

    var cartesian3Scratch = new Cartesian3();

    function pickImageryLayerFeature(viewer, windowPosition) {
        var scene = viewer.scene;
        var pickRay = scene.camera.getPickRay(windowPosition);
        var imageryLayerFeaturePromise = scene.imageryLayers.pickImageryLayerFeatures(pickRay, scene);
        if (!defined(imageryLayerFeaturePromise)) {
            return;
        }

        // Imagery layer feature picking is asynchronous, so put up a message while loading.
        var loadingMessage = new Entity({
            id : 'Loading...',
            description : 'Loading feature information...'
        });

        when(imageryLayerFeaturePromise, function(features) {
            // Has this async pick been superseded by a later one?
            if (viewer.selectedEntity !== loadingMessage) {
                return;
            }

            if (!defined(features) || features.length === 0) {
                viewer.selectedEntity = createNoFeaturesEntity();
                return;
            }

            // Select the first feature.
            var feature = features[0];

            var entity = new Entity({
                id : feature.name,
                description : feature.description
            });

            if (defined(feature.position)) {
                var ecfPosition = viewer.scene.globe.ellipsoid.cartographicToCartesian(feature.position, cartesian3Scratch);
                entity.position = new ConstantPositionProperty(ecfPosition);
            }

            viewer.selectedEntity = entity;
        }, function() {
            // Has this async pick been superseded by a later one?
            if (viewer.selectedEntity !== loadingMessage) {
                return;
            }
            viewer.selectedEntity = createNoFeaturesEntity();
        });

        return loadingMessage;
    }

    function createNoFeaturesEntity() {
        return new Entity({
            id : 'None',
            description : 'No features found.'
        });
    }

    function enableVRUI(viewer, enabled) {
        var geocoder = viewer._geocoder;
        var homeButton = viewer._homeButton;
        var sceneModePicker = viewer._sceneModePicker;
        var projectionPicker = viewer._projectionPicker;
        var baseLayerPicker = viewer._baseLayerPicker;
        var animation = viewer._animation;
        var timeline = viewer._timeline;
        var fullscreenButton = viewer._fullscreenButton;
        var infoBox = viewer._infoBox;
        var selectionIndicator = viewer._selectionIndicator;

        var visibility = enabled ? 'hidden' : 'visible';

        if (defined(geocoder)) {
            geocoder.container.style.visibility = visibility;
        }
        if (defined(homeButton)) {
            homeButton.container.style.visibility = visibility;
        }
        if(defined(sceneModePicker)) {
            sceneModePicker.container.style.visibility = visibility;
        }
        if (defined(projectionPicker)) {
            projectionPicker.container.style.visibility = visibility;
        }
        if(defined(baseLayerPicker)) {
            baseLayerPicker.container.style.visibility = visibility;
        }
        if (defined(animation)) {
            animation.container.style.visibility = visibility;
        }
        if (defined(timeline)) {
            timeline.container.style.visibility = visibility;
        }
        if (defined(fullscreenButton) && fullscreenButton.viewModel.isFullscreenEnabled) {
            fullscreenButton.container.style.visibility = visibility;
        }
        if (defined(infoBox)) {
            infoBox.container.style.visibility = visibility;
        }
        if (defined(selectionIndicator)) {
            selectionIndicator.container.style.visibility = visibility;
        }

        if (viewer._container) {
            var right = enabled || !defined(fullscreenButton) ? 0 : fullscreenButton.container.clientWidth;
            viewer._vrButton.container.style.right = right + 'px';

            viewer.forceResize();
        }
    }

    /**
     * A base widget for building applications.  It composites all of the standard Cesium widgets into one reusable package.
     * The widget can always be extended by using mixins, which add functionality useful for a variety of applications.
     *
     * @alias Viewer
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.animation=true] If set to false, the Animation widget will not be created.
     * @param {Boolean} [options.baseLayerPicker=true] If set to false, the BaseLayerPicker widget will not be created.
     * @param {Boolean} [options.fullscreenButton=true] If set to false, the FullscreenButton widget will not be created.
     * @param {Boolean} [options.vrButton=false] If set to true, the VRButton widget will be created.
     * @param {Boolean} [options.geocoder=true] If set to false, the Geocoder widget will not be created.
     * @param {Boolean} [options.homeButton=true] If set to false, the HomeButton widget will not be created.
     * @param {Boolean} [options.infoBox=true] If set to false, the InfoBox widget will not be created.
     * @param {Boolean} [options.sceneModePicker=true] If set to false, the SceneModePicker widget will not be created.
     * @param {Boolean} [options.selectionIndicator=true] If set to false, the SelectionIndicator widget will not be created.
     * @param {Boolean} [options.timeline=true] If set to false, the Timeline widget will not be created.
     * @param {Boolean} [options.navigationHelpButton=true] If set to false, the navigation help button will not be created.
     * @param {Boolean} [options.navigationInstructionsInitiallyVisible=true] True if the navigation instructions should initially be visible, or false if the should not be shown until the user explicitly clicks the button.
     * @param {Boolean} [options.scene3DOnly=false] When <code>true</code>, each geometry instance will only be rendered in 3D to save GPU memory.
     * @param {Clock} [options.clock=new Clock()] The clock to use to control current time.
     * @param {ProviderViewModel} [options.selectedImageryProviderViewModel] The view model for the current base imagery layer, if not supplied the first available base layer is used.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ProviderViewModel[]} [options.imageryProviderViewModels=createDefaultImageryProviderViewModels()] The array of ProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ProviderViewModel} [options.selectedTerrainProviderViewModel] The view model for the current base terrain layer, if not supplied the first available base layer is used.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ProviderViewModel[]} [options.terrainProviderViewModels=createDefaultTerrainProviderViewModels()] The array of ProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ImageryProvider} [options.imageryProvider=new BingMapsImageryProvider()] The imagery provider to use.  This value is only valid if options.baseLayerPicker is set to false.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider()] The terrain provider to use
     * @param {SkyBox} [options.skyBox] The skybox used to render the stars.  When <code>undefined</code>, the default stars are used.
     * @param {SkyAtmosphere} [options.skyAtmosphere] Blue sky, and the glow around the Earth's limb.  Set to <code>false</code> to turn it off.
     * @param {Element|String} [options.fullscreenElement=document.body] The element or id to be placed into fullscreen mode when the full screen button is pressed.
     * @param {Boolean} [options.useDefaultRenderLoop=true] True if this widget should control the render loop, false otherwise.
     * @param {Number} [options.targetFrameRate] The target frame rate when using the default render loop.
     * @param {Boolean} [options.showRenderLoopErrors=true] If true, this widget will automatically display an HTML panel to the user containing the error, if a render loop error occurs.
     * @param {Boolean} [options.automaticallyTrackDataSourceClocks=true] If true, this widget will automatically track the clock settings of newly added DataSources, updating if the DataSource's clock changes.  Set this to false if you want to configure the clock independently.
     * @param {Object} [options.contextOptions] Context and WebGL creation properties corresponding to <code>options</code> passed to {@link Scene}.
     * @param {SceneMode} [options.sceneMode=SceneMode.SCENE3D] The initial scene mode.
     * @param {MapProjection} [options.mapProjection=new GeographicProjection()] The map projection to use in 2D and Columbus View modes.
     * @param {Globe} [options.globe=new Globe(mapProjection.ellipsoid)] The globe to use in the scene.  If set to <code>false</code>, no globe will be added.
     * @param {Boolean} [options.orderIndependentTranslucency=true] If true and the configuration supports it, use order independent translucency.
     * @param {Element|String} [options.creditContainer] The DOM element or ID that will contain the {@link CreditDisplay}.  If not specified, the credits are added to the bottom of the widget itself.
     * @param {DataSourceCollection} [options.dataSources=new DataSourceCollection()] The collection of data sources visualized by the widget.  If this parameter is provided,
     *                               the instance is assumed to be owned by the caller and will not be destroyed when the viewer is destroyed.
     * @param {Number} [options.terrainExaggeration=1.0] A scalar used to exaggerate the terrain. Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
     * @param {Boolean} [options.shadows=false] Determines if shadows are cast by the sun.
     * @param {ShadowMode} [options.terrainShadows=ShadowMode.RECEIVE_ONLY] Determines if the terrain casts or receives shadows from the sun.
     * @param {MapMode2D} [options.mapMode2D=MapMode2D.INFINITE_SCROLL] Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
     * @param {Boolean} [options.projectionPicker=false] If set to true, the ProjectionPicker widget will be created.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     * @exception {DeveloperError} options.imageryProvider is not available when using the BaseLayerPicker widget, specify options.selectedImageryProviderViewModel instead.
     * @exception {DeveloperError} options.terrainProvider is not available when using the BaseLayerPicker widget, specify options.selectedTerrainProviderViewModel instead.
     * @exception {DeveloperError} options.selectedImageryProviderViewModel is not available when not using the BaseLayerPicker widget, specify options.imageryProvider instead.
     * @exception {DeveloperError} options.selectedTerrainProviderViewModel is not available when not using the BaseLayerPicker widget, specify options.terrainProvider instead.
     *
     * @see Animation
     * @see BaseLayerPicker
     * @see CesiumWidget
     * @see FullscreenButton
     * @see HomeButton
     * @see SceneModePicker
     * @see Timeline
     * @see viewerDragDropMixin
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Hello%20World.html|Cesium Sandcastle Hello World Demo}
     *
     * @example
     * //Initialize the viewer widget with several custom options and mixins.
     * var viewer = new Cesium.Viewer('cesiumContainer', {
     *     //Start in Columbus Viewer
     *     sceneMode : Cesium.SceneMode.COLUMBUS_VIEW,
     *     //Use standard Cesium terrain
     *     terrainProvider : new Cesium.CesiumTerrainProvider({
     *         url : 'https://assets.agi.com/stk-terrain/world'
     *     }),
     *     //Hide the base layer picker
     *     baseLayerPicker : false,
     *     //Use OpenStreetMaps
     *     imageryProvider : Cesium.createOpenStreetMapImageryProvider({
     *         url : 'https://a.tile.openstreetmap.org/'
     *     }),
     *     // Use high-res stars downloaded from https://github.com/AnalyticalGraphicsInc/cesium-assets
     *     skyBox : new Cesium.SkyBox({
     *         sources : {
     *           positiveX : 'stars/TychoSkymapII.t3_08192x04096_80_px.jpg',
     *           negativeX : 'stars/TychoSkymapII.t3_08192x04096_80_mx.jpg',
     *           positiveY : 'stars/TychoSkymapII.t3_08192x04096_80_py.jpg',
     *           negativeY : 'stars/TychoSkymapII.t3_08192x04096_80_my.jpg',
     *           positiveZ : 'stars/TychoSkymapII.t3_08192x04096_80_pz.jpg',
     *           negativeZ : 'stars/TychoSkymapII.t3_08192x04096_80_mz.jpg'
     *         }
     *     }),
     *     // Show Columbus View map with Web Mercator projection
     *     mapProjection : new Cesium.WebMercatorProjection()
     * });
     *
     * //Add basic drag and drop functionality
     * viewer.extend(Cesium.viewerDragDropMixin);
     *
     * //Show a pop-up alert if we encounter an error when processing a dropped file
     * viewer.dropError.addEventListener(function(dropHandler, name, error) {
     *     console.log(error);
     *     window.alert(error);
     * });
     */
    function Viewer(container, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var createBaseLayerPicker = (!defined(options.globe) || options.globe !== false) &&
            (!defined(options.baseLayerPicker) || options.baseLayerPicker !== false);

        //>>includeStart('debug', pragmas.debug);
        // If using BaseLayerPicker, imageryProvider is an invalid option
        if (createBaseLayerPicker && defined(options.imageryProvider)) {
            throw new DeveloperError('options.imageryProvider is not available when using the BaseLayerPicker widget. \
Either specify options.selectedImageryProviderViewModel instead or set options.baseLayerPicker to false.');
        }

        // If not using BaseLayerPicker, selectedImageryProviderViewModel is an invalid option
        if (!createBaseLayerPicker && defined(options.selectedImageryProviderViewModel)) {
            throw new DeveloperError('options.selectedImageryProviderViewModel is not available when not using the BaseLayerPicker widget. \
Either specify options.imageryProvider instead or set options.baseLayerPicker to true.');
        }

        // If using BaseLayerPicker, terrainProvider is an invalid option
        if (createBaseLayerPicker && defined(options.terrainProvider)) {
            throw new DeveloperError('options.terrainProvider is not available when using the BaseLayerPicker widget. \
Either specify options.selectedTerrainProviderViewModel instead or set options.baseLayerPicker to false.');
        }

        // If not using BaseLayerPicker, selectedTerrainProviderViewModel is an invalid option
        if (!createBaseLayerPicker && defined(options.selectedTerrainProviderViewModel)) {
            throw new DeveloperError('options.selectedTerrainProviderViewModel is not available when not using the BaseLayerPicker widget. \
Either specify options.terrainProvider instead or set options.baseLayerPicker to true.');
        }
        //>>includeEnd('debug')

        var that = this;

        var viewerContainer = document.createElement('div');
        viewerContainer.className = 'cesium-viewer';
        container.appendChild(viewerContainer);

        // Cesium widget container
        var cesiumWidgetContainer = document.createElement('div');
        cesiumWidgetContainer.className = 'cesium-viewer-cesiumWidgetContainer';
        viewerContainer.appendChild(cesiumWidgetContainer);

        // Bottom container
        var bottomContainer = document.createElement('div');
        bottomContainer.className = 'cesium-viewer-bottom';

        viewerContainer.appendChild(bottomContainer);

        var scene3DOnly = defaultValue(options.scene3DOnly, false);

        // Cesium widget
        var cesiumWidget = new CesiumWidget(cesiumWidgetContainer, {
            terrainProvider : options.terrainProvider,
            imageryProvider : createBaseLayerPicker ? false : options.imageryProvider,
            clock : options.clock,
            skyBox : options.skyBox,
            skyAtmosphere : options.skyAtmosphere,
            sceneMode : options.sceneMode,
            mapProjection : options.mapProjection,
            globe : options.globe,
            orderIndependentTranslucency : options.orderIndependentTranslucency,
            contextOptions : options.contextOptions,
            useDefaultRenderLoop : options.useDefaultRenderLoop,
            targetFrameRate : options.targetFrameRate,
            showRenderLoopErrors : options.showRenderLoopErrors,
            creditContainer : defined(options.creditContainer) ? options.creditContainer : bottomContainer,
            scene3DOnly : scene3DOnly,
            terrainExaggeration : options.terrainExaggeration,
            shadows : options.shadows,
            terrainShadows : options.terrainShadows,
            mapMode2D : options.mapMode2D
        });

        var dataSourceCollection = options.dataSources;
        var destroyDataSourceCollection = false;
        if (!defined(dataSourceCollection)) {
            dataSourceCollection = new DataSourceCollection();
            destroyDataSourceCollection = true;
        }

        var dataSourceDisplay = new DataSourceDisplay({
            scene : cesiumWidget.scene,
            dataSourceCollection : dataSourceCollection
        });

        var clock = cesiumWidget.clock;
        var clockViewModel = new ClockViewModel(clock);
        var eventHelper = new EventHelper();

        eventHelper.add(clock.onTick, Viewer.prototype._onTick, this);
        eventHelper.add(cesiumWidget.scene.morphStart, Viewer.prototype._clearTrackedObject, this);

        // Selection Indicator
        var selectionIndicator;
        if (!defined(options.selectionIndicator) || options.selectionIndicator !== false) {
            var selectionIndicatorContainer = document.createElement('div');
            selectionIndicatorContainer.className = 'cesium-viewer-selectionIndicatorContainer';
            viewerContainer.appendChild(selectionIndicatorContainer);
            selectionIndicator = new SelectionIndicator(selectionIndicatorContainer, cesiumWidget.scene);
        }

        // Info Box
        var infoBox;
        if (!defined(options.infoBox) || options.infoBox !== false) {
            var infoBoxContainer = document.createElement('div');
            infoBoxContainer.className = 'cesium-viewer-infoBoxContainer';
            viewerContainer.appendChild(infoBoxContainer);
            infoBox = new InfoBox(infoBoxContainer);

            var infoBoxViewModel = infoBox.viewModel;
            eventHelper.add(infoBoxViewModel.cameraClicked, Viewer.prototype._onInfoBoxCameraClicked, this);
            eventHelper.add(infoBoxViewModel.closeClicked, Viewer.prototype._onInfoBoxClockClicked, this);
        }

        // Main Toolbar
        var toolbar = document.createElement('div');
        toolbar.className = 'cesium-viewer-toolbar';
        viewerContainer.appendChild(toolbar);

        // Geocoder
        var geocoder;
        if (!defined(options.geocoder) || options.geocoder !== false) {
            var geocoderContainer = document.createElement('div');
            geocoderContainer.className = 'cesium-viewer-geocoderContainer';
            toolbar.appendChild(geocoderContainer);
            geocoder = new Geocoder({
                container : geocoderContainer,
                geocoderServices: defined(options.geocoder) ? (isArray(options.geocoder) ? options.geocoder : [options.geocoder]) : undefined,
                scene : cesiumWidget.scene
            });
            // Subscribe to search so that we can clear the trackedEntity when it is clicked.
            eventHelper.add(geocoder.viewModel.search.beforeExecute, Viewer.prototype._clearObjects, this);
        }

        // HomeButton
        var homeButton;
        if (!defined(options.homeButton) || options.homeButton !== false) {
            homeButton = new HomeButton(toolbar, cesiumWidget.scene);
            if (defined(geocoder)) {
                eventHelper.add(homeButton.viewModel.command.afterExecute, function() {
                    var viewModel = geocoder.viewModel;
                    viewModel.searchText = '';
                    if (viewModel.isSearchInProgress) {
                        viewModel.search();
                    }
                });
            }
            // Subscribe to the home button beforeExecute event so that we can clear the trackedEntity.
            eventHelper.add(homeButton.viewModel.command.beforeExecute, Viewer.prototype._clearTrackedObject, this);
        }

        // SceneModePicker
        // By default, we silently disable the scene mode picker if scene3DOnly is true,
        // but if sceneModePicker is explicitly set to true, throw an error.
        //>>includeStart('debug', pragmas.debug);
        if ((options.sceneModePicker === true) && scene3DOnly) {
            throw new DeveloperError('options.sceneModePicker is not available when options.scene3DOnly is set to true.');
        }
        //>>includeEnd('debug');

        var sceneModePicker;
        if (!scene3DOnly && (!defined(options.sceneModePicker) || options.sceneModePicker !== false)) {
            sceneModePicker = new SceneModePicker(toolbar, cesiumWidget.scene);
        }

        var projectionPicker;
        if (options.projectionPicker) {
            projectionPicker = new ProjectionPicker(toolbar, cesiumWidget.scene);
        }

        // BaseLayerPicker
        var baseLayerPicker;
        var baseLayerPickerDropDown;
        if (createBaseLayerPicker) {
            var imageryProviderViewModels = defaultValue(options.imageryProviderViewModels, createDefaultImageryProviderViewModels());
            var terrainProviderViewModels = defaultValue(options.terrainProviderViewModels, createDefaultTerrainProviderViewModels());

            baseLayerPicker = new BaseLayerPicker(toolbar, {
                globe : cesiumWidget.scene.globe,
                imageryProviderViewModels : imageryProviderViewModels,
                selectedImageryProviderViewModel : options.selectedImageryProviderViewModel,
                terrainProviderViewModels : terrainProviderViewModels,
                selectedTerrainProviderViewModel : options.selectedTerrainProviderViewModel
            });

            //Grab the dropdown for resize code.
            var elements = toolbar.getElementsByClassName('cesium-baseLayerPicker-dropDown');
            baseLayerPickerDropDown = elements[0];
        }

        // Navigation Help Button
        var navigationHelpButton;
        if (!defined(options.navigationHelpButton) || options.navigationHelpButton !== false) {
            var showNavHelp = true;
            try {
                //window.localStorage is null if disabled in Firefox or undefined in browsers with implementation
                if (defined(window.localStorage)) {
                    var hasSeenNavHelp = window.localStorage.getItem('cesium-hasSeenNavHelp');
                    if (defined(hasSeenNavHelp) && Boolean(hasSeenNavHelp)) {
                        showNavHelp = false;
                    } else {
                        window.localStorage.setItem('cesium-hasSeenNavHelp', 'true');
                    }
                }
            } catch (e) {
                //Accessing window.localStorage throws if disabled in Chrome
                //window.localStorage.setItem throws if in Safari private browsing mode or in any browser if we are over quota.
            }
            navigationHelpButton = new NavigationHelpButton({
                container : toolbar,
                instructionsInitiallyVisible : defaultValue(options.navigationInstructionsInitiallyVisible, showNavHelp)
            });
        }

        // Animation
        var animation;
        if (!defined(options.animation) || options.animation !== false) {
            var animationContainer = document.createElement('div');
            animationContainer.className = 'cesium-viewer-animationContainer';
            viewerContainer.appendChild(animationContainer);
            animation = new Animation(animationContainer, new AnimationViewModel(clockViewModel));
        }

        // Timeline
        var timeline;
        if (!defined(options.timeline) || options.timeline !== false) {
            var timelineContainer = document.createElement('div');
            timelineContainer.className = 'cesium-viewer-timelineContainer';
            viewerContainer.appendChild(timelineContainer);
            timeline = new Timeline(timelineContainer, clock);
            timeline.addEventListener('settime', onTimelineScrubfunction, false);
            timeline.zoomTo(clock.startTime, clock.stopTime);
        }

        // Fullscreen
        var fullscreenButton;
        var fullscreenSubscription;
        if (!defined(options.fullscreenButton) || options.fullscreenButton !== false) {
            var fullscreenContainer = document.createElement('div');
            fullscreenContainer.className = 'cesium-viewer-fullscreenContainer';
            viewerContainer.appendChild(fullscreenContainer);
            fullscreenButton = new FullscreenButton(fullscreenContainer, options.fullscreenElement);

            //Subscribe to fullscreenButton.viewModel.isFullscreenEnabled so
            //that we can hide/show the button as well as size the timeline.
            fullscreenSubscription = subscribeAndEvaluate(fullscreenButton.viewModel, 'isFullscreenEnabled', function(isFullscreenEnabled) {
                fullscreenContainer.style.display = isFullscreenEnabled ? 'block' : 'none';
                if (defined(timeline)) {
                    timeline.container.style.right = fullscreenContainer.clientWidth + 'px';
                    timeline.resize();
                }
            });
        }

        // VR
        var vrButton;
        var vrSubscription;
        var vrModeSubscription;
        if (options.vrButton) {
            var vrContainer = document.createElement('div');
            vrContainer.className = 'cesium-viewer-vrContainer';
            viewerContainer.appendChild(vrContainer);
            vrButton = new VRButton(vrContainer, cesiumWidget.scene, options.fullScreenElement);

            vrSubscription = subscribeAndEvaluate(vrButton.viewModel, 'isVREnabled', function(isVREnabled) {
                vrContainer.style.display = isVREnabled ? 'block' : 'none';
                if (defined(fullscreenButton)) {
                    vrContainer.style.right = fullscreenContainer.clientWidth + 'px';
                }
                if (defined(timeline)) {
                    timeline.container.style.right = vrContainer.clientWidth + 'px';
                    timeline.resize();
                }
            });

            vrModeSubscription = subscribeAndEvaluate(vrButton.viewModel, 'isVRMode', function(isVRMode) {
                enableVRUI(that, isVRMode);
            });
        }

        //Assign all properties to this instance.  No "this" assignments should
        //take place above this line.
        this._baseLayerPickerDropDown = baseLayerPickerDropDown;
        this._fullscreenSubscription = fullscreenSubscription;
        this._vrSubscription = vrSubscription;
        this._vrModeSubscription = vrModeSubscription;
        this._dataSourceChangedListeners = {};
        this._automaticallyTrackDataSourceClocks = defaultValue(options.automaticallyTrackDataSourceClocks, true);
        this._container = container;
        this._bottomContainer = bottomContainer;
        this._element = viewerContainer;
        this._cesiumWidget = cesiumWidget;
        this._selectionIndicator = selectionIndicator;
        this._infoBox = infoBox;
        this._dataSourceCollection = dataSourceCollection;
        this._destroyDataSourceCollection = destroyDataSourceCollection;
        this._dataSourceDisplay = dataSourceDisplay;
        this._clockViewModel = clockViewModel;
        this._toolbar = toolbar;
        this._homeButton = homeButton;
        this._sceneModePicker = sceneModePicker;
        this._projectionPicker = projectionPicker;
        this._baseLayerPicker = baseLayerPicker;
        this._navigationHelpButton = navigationHelpButton;
        this._animation = animation;
        this._timeline = timeline;
        this._fullscreenButton = fullscreenButton;
        this._vrButton = vrButton;
        this._geocoder = geocoder;
        this._eventHelper = eventHelper;
        this._lastWidth = 0;
        this._lastHeight = 0;
        this._allowDataSourcesToSuspendAnimation = true;
        this._entityView = undefined;
        this._enableInfoOrSelection = defined(infoBox) || defined(selectionIndicator);
        this._clockTrackedDataSource = undefined;
        this._trackedEntity = undefined;
        this._needTrackedEntityUpdate = false;
        this._selectedEntity = undefined;
        this._clockTrackedDataSource = undefined;
        this._forceResize = false;
        this._zoomIsFlight = false;
        this._zoomTarget = undefined;
        this._zoomPromise = undefined;
        this._zoomOptions = undefined;
        this._selectedEntityChanged = new Event();
        this._trackedEntityChanged = new Event();

        knockout.track(this, ['_trackedEntity', '_selectedEntity', '_clockTrackedDataSource']);

        //Listen to data source events in order to track clock changes.
        eventHelper.add(dataSourceCollection.dataSourceAdded, Viewer.prototype._onDataSourceAdded, this);
        eventHelper.add(dataSourceCollection.dataSourceRemoved, Viewer.prototype._onDataSourceRemoved, this);

        // Prior to each render, check if anything needs to be resized.
        eventHelper.add(cesiumWidget.scene.preRender, Viewer.prototype.resize, this);
        eventHelper.add(cesiumWidget.scene.postRender, Viewer.prototype._postRender, this);

        // We need to subscribe to the data sources and collections so that we can clear the
        // tracked object when it is removed from the scene.
        // Subscribe to current data sources
        var dataSourceLength = dataSourceCollection.length;
        for (var i = 0; i < dataSourceLength; i++) {
            this._dataSourceAdded(dataSourceCollection, dataSourceCollection.get(i));
        }
        this._dataSourceAdded(undefined, dataSourceDisplay.defaultDataSource);

        // Hook up events so that we can subscribe to future sources.
        eventHelper.add(dataSourceCollection.dataSourceAdded, Viewer.prototype._dataSourceAdded, this);
        eventHelper.add(dataSourceCollection.dataSourceRemoved, Viewer.prototype._dataSourceRemoved, this);

        // Subscribe to left clicks and zoom to the picked object.
        function pickAndTrackObject(e) {
            var entity = pickEntity(that, e);
            if (defined(entity)) {
                //Only track the entity if it has a valid position at the current time.
                if (Property.getValueOrUndefined(entity.position, that.clock.currentTime)) {
                    that.trackedEntity = entity;
                } else {
                    that.zoomTo(entity);
                }
            }
        }

        function pickAndSelectObject(e) {
            that.selectedEntity = pickEntity(that, e);
        }

        cesiumWidget.screenSpaceEventHandler.setInputAction(pickAndSelectObject, ScreenSpaceEventType.LEFT_CLICK);
        cesiumWidget.screenSpaceEventHandler.setInputAction(pickAndTrackObject, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    defineProperties(Viewer.prototype, {
        /**
         * Gets the parent container.
         * @memberof Viewer.prototype
         * @type {Element}
         * @readonly
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the DOM element for the area at the bottom of the window containing the
         * {@link CreditDisplay} and potentially other things.
         * @memberof Viewer.prototype
         * @type {Element}
         * @readonly
         */
        bottomContainer : {
            get : function() {
                return this._bottomContainer;
            }
        },

        /**
         * Gets the CesiumWidget.
         * @memberof Viewer.prototype
         * @type {CesiumWidget}
         * @readonly
         */
        cesiumWidget : {
            get : function() {
                return this._cesiumWidget;
            }
        },

        /**
         * Gets the selection indicator.
         * @memberof Viewer.prototype
         * @type {SelectionIndicator}
         * @readonly
         */
        selectionIndicator : {
            get : function() {
                return this._selectionIndicator;
            }
        },

        /**
         * Gets the info box.
         * @memberof Viewer.prototype
         * @type {InfoBox}
         * @readonly
         */
        infoBox : {
            get : function() {
                return this._infoBox;
            }
        },

        /**
         * Gets the Geocoder.
         * @memberof Viewer.prototype
         * @type {Geocoder}
         * @readonly
         */
        geocoder : {
            get : function() {
                return this._geocoder;
            }
        },

        /**
         * Gets the HomeButton.
         * @memberof Viewer.prototype
         * @type {HomeButton}
         * @readonly
         */
        homeButton : {
            get : function() {
                return this._homeButton;
            }
        },

        /**
         * Gets the SceneModePicker.
         * @memberof Viewer.prototype
         * @type {SceneModePicker}
         * @readonly
         */
        sceneModePicker : {
            get : function() {
                return this._sceneModePicker;
            }
        },

        /**
         * Gets the ProjectionPicker.
         * @memberof Viewer.prototype
         * @type {ProjectionPicker}
         * @readonly
         */
        projectionPicker : {
            get : function() {
                return this._projectionPicker;
            }
        },

        /**
         * Gets the BaseLayerPicker.
         * @memberof Viewer.prototype
         * @type {BaseLayerPicker}
         * @readonly
         */
        baseLayerPicker : {
            get : function() {
                return this._baseLayerPicker;
            }
        },

        /**
         * Gets the NavigationHelpButton.
         * @memberof Viewer.prototype
         * @type {NavigationHelpButton}
         * @readonly
         */
        navigationHelpButton : {
            get : function() {
                return this._navigationHelpButton;
            }
        },

        /**
         * Gets the Animation widget.
         * @memberof Viewer.prototype
         * @type {Animation}
         * @readonly
         */
        animation : {
            get : function() {
                return this._animation;
            }
        },

        /**
         * Gets the Timeline widget.
         * @memberof Viewer.prototype
         * @type {Timeline}
         * @readonly
         */
        timeline : {
            get : function() {
                return this._timeline;
            }
        },

        /**
         * Gets the FullscreenButton.
         * @memberof Viewer.prototype
         * @type {FullscreenButton}
         * @readonly
         */
        fullscreenButton : {
            get : function() {
                return this._fullscreenButton;
            }
        },

        /**
         * Gets the VRButton.
         * @memberof Viewer.prototype
         * @type {VRButton}
         * @readonly
         */
        vrButton : {
            get : function() {
                return this._vrButton;
            }
        },

        /**
         * Gets the display used for {@link DataSource} visualization.
         * @memberof Viewer.prototype
         * @type {DataSourceDisplay}
         * @readonly
         */
        dataSourceDisplay : {
            get : function() {
                return this._dataSourceDisplay;
            }
        },

        /**
         * Gets the collection of entities not tied to a particular data source.
         * This is a shortcut to [dataSourceDisplay.defaultDataSource.entities]{@link Viewer#dataSourceDisplay}.
         * @memberof Viewer.prototype
         * @type {EntityCollection}
         * @readonly
         */
        entities : {
            get : function() {
                return this._dataSourceDisplay.defaultDataSource.entities;
            }
        },

        /**
         * Gets the set of {@link DataSource} instances to be visualized.
         * @memberof Viewer.prototype
         * @type {DataSourceCollection}
         * @readonly
         */
        dataSources : {
            get : function() {
                return this._dataSourceCollection;
            }
        },

        /**
         * Gets the canvas.
         * @memberof Viewer.prototype
         * @type {Canvas}
         * @readonly
         */
        canvas : {
            get : function() {
                return this._cesiumWidget.canvas;
            }
        },

        /**
         * Gets the Cesium logo element.
         * @memberof Viewer.prototype
         * @type {Element}
         * @readonly
         */
        cesiumLogo : {
            get : function() {
                return this._cesiumWidget.cesiumLogo;
            }
        },

        /**
         * Gets the scene.
         * @memberof Viewer.prototype
         * @type {Scene}
         * @readonly
         */
        scene : {
            get : function() {
                return this._cesiumWidget.scene;
            }
        },

        /**
         * Determines if shadows are cast by the sun.
         * @memberof Viewer.prototype
         * @type {Boolean}
         */
        shadows : {
            get : function() {
                return this.scene.shadowMap.enabled;
            },
            set : function(value) {
                this.scene.shadowMap.enabled = value;
            }
        },

        /**
         * Determines if the terrain casts or shadows from the sun.
         * @memberof Viewer.prototype
         * @type {ShadowMode}
         */
        terrainShadows : {
            get : function() {
                return this.scene.globe.shadows;
            },
            set : function(value) {
                this.scene.globe.shadows = value;
            }
        },

        /**
         * Get the scene's shadow map
         * @memberof Viewer.prototype
         * @type {ShadowMap}
         * @readonly
         */
        shadowMap : {
            get : function() {
                return this.scene.shadowMap;
            }
        },

        /**
         * Gets the collection of image layers that will be rendered on the globe.
         * @memberof Viewer.prototype
         *
         * @type {ImageryLayerCollection}
         * @readonly
         */
        imageryLayers : {
            get : function() {
                return this.scene.imageryLayers;
            }
        },

        /**
         * The terrain provider providing surface geometry for the globe.
         * @memberof Viewer.prototype
         *
         * @type {TerrainProvider}
         */
        terrainProvider : {
            get : function() {
                return this.scene.terrainProvider;
            },
            set : function(terrainProvider) {
                this.scene.terrainProvider = terrainProvider;
            }
        },

        /**
         * Gets the camera.
         * @memberof Viewer.prototype
         *
         * @type {Camera}
         * @readonly
         */
        camera : {
            get : function() {
                return this.scene.camera;
            }
        },

        /**
         * Gets the clock.
         * @memberof Viewer.prototype
         * @type {Clock}
         * @readonly
         */
        clock : {
            get : function() {
                return this._cesiumWidget.clock;
            }
        },

        /**
         * Gets the screen space event handler.
         * @memberof Viewer.prototype
         * @type {ScreenSpaceEventHandler}
         * @readonly
         */
        screenSpaceEventHandler : {
            get : function() {
                return this._cesiumWidget.screenSpaceEventHandler;
            }
        },

        /**
         * Gets or sets the target frame rate of the widget when <code>useDefaultRenderLoop</code>
         * is true. If undefined, the browser's {@link requestAnimationFrame} implementation
         * determines the frame rate.  If defined, this value must be greater than 0.  A value higher
         * than the underlying requestAnimationFrame implementation will have no effect.
         * @memberof Viewer.prototype
         *
         * @type {Number}
         */
        targetFrameRate : {
            get : function() {
                return this._cesiumWidget.targetFrameRate;
            },
            set : function(value) {
                this._cesiumWidget.targetFrameRate = value;
            }
        },

        /**
         * Gets or sets whether or not this widget should control the render loop.
         * If set to true the widget will use {@link requestAnimationFrame} to
         * perform rendering and resizing of the widget, as well as drive the
         * simulation clock. If set to false, you must manually call the
         * <code>resize</code>, <code>render</code> methods
         * as part of a custom render loop.  If an error occurs during rendering, {@link Scene}'s
         * <code>renderError</code> event will be raised and this property
         * will be set to false.  It must be set back to true to continue rendering
         * after the error.
         * @memberof Viewer.prototype
         *
         * @type {Boolean}
         */
        useDefaultRenderLoop : {
            get : function() {
                return this._cesiumWidget.useDefaultRenderLoop;
            },
            set : function(value) {
                this._cesiumWidget.useDefaultRenderLoop = value;
            }
        },

        /**
         * Gets or sets a scaling factor for rendering resolution.  Values less than 1.0 can improve
         * performance on less powerful devices while values greater than 1.0 will render at a higher
         * resolution and then scale down, resulting in improved visual fidelity.
         * For example, if the widget is laid out at a size of 640x480, setting this value to 0.5
         * will cause the scene to be rendered at 320x240 and then scaled up while setting
         * it to 2.0 will cause the scene to be rendered at 1280x960 and then scaled down.
         * @memberof Viewer.prototype
         *
         * @type {Number}
         * @default 1.0
         */
        resolutionScale : {
            get : function() {
                return this._cesiumWidget.resolutionScale;
            },
            set : function(value) {
                this._cesiumWidget.resolutionScale = value;
                this._forceResize = true;
            }
        },

        /**
         * Gets or sets whether or not data sources can temporarily pause
         * animation in order to avoid showing an incomplete picture to the user.
         * For example, if asynchronous primitives are being processed in the
         * background, the clock will not advance until the geometry is ready.
         *
         * @memberof Viewer.prototype
         *
         * @type {Boolean}
         */
        allowDataSourcesToSuspendAnimation : {
            get : function() {
                return this._allowDataSourcesToSuspendAnimation;
            },
            set : function(value) {
                this._allowDataSourcesToSuspendAnimation = value;
            }
        },

        /**
         * Gets or sets the Entity instance currently being tracked by the camera.
         * @memberof Viewer.prototype
         * @type {Entity}
         */
        trackedEntity : {
            get : function() {
                return this._trackedEntity;
            },
            set : function(value) {
                if (this._trackedEntity !== value) {
                    this._trackedEntity = value;

                    //Cancel any pending zoom
                    cancelZoom(this);

                    var scene = this.scene;
                    var sceneMode = scene.mode;

                    //Stop tracking
                    if (!defined(value) || !defined(value.position)) {
                        this._needTrackedEntityUpdate = false;
                        if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE2D) {
                            scene.screenSpaceCameraController.enableTranslate = true;
                        }

                        if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE3D) {
                            scene.screenSpaceCameraController.enableTilt = true;
                        }

                        this._entityView = undefined;
                        this.camera.lookAtTransform(Matrix4.IDENTITY);
                    } else {
                        //We can't start tracking immediately, so we set a flag and start tracking
                        //when the bounding sphere is ready (most likely next frame).
                        this._needTrackedEntityUpdate = true;
                    }

                    this._trackedEntityChanged.raiseEvent(value);
                }
            }
        },
        /**
         * Gets or sets the object instance for which to display a selection indicator.
         * @memberof Viewer.prototype
         * @type {Entity}
         */
        selectedEntity : {
            get : function() {
                return this._selectedEntity;
            },
            set : function(value) {
                if (this._selectedEntity !== value) {
                    this._selectedEntity = value;
                    var selectionIndicatorViewModel = defined(this._selectionIndicator) ? this._selectionIndicator.viewModel : undefined;
                    if (defined(value)) {
                        if (defined(selectionIndicatorViewModel)) {
                            selectionIndicatorViewModel.animateAppear();
                        }
                    } else {
                        // Leave the info text in place here, it is needed during the exit animation.
                        if (defined(selectionIndicatorViewModel)) {
                            selectionIndicatorViewModel.animateDepart();
                        }
                    }
                    this._selectedEntityChanged.raiseEvent(value);
                }
            }
        },
        /**
         * Gets the event that is raised when the selected entity chages
         * @memberof Viewer.prototype
         * @type {Event}
         * @readonly
         */
        selectedEntityChanged : {
            get : function() {
                return this._selectedEntityChanged;
            }
        },
        /**
         * Gets the event that is raised when the tracked entity chages
         * @memberof Viewer.prototype
         * @type {Event}
         * @readonly
         */
        trackedEntityChanged : {
            get : function() {
                return this._trackedEntityChanged;
            }
        },
        /**
         * Gets or sets the data source to track with the viewer's clock.
         * @memberof Viewer.prototype
         * @type {DataSource}
         */
        clockTrackedDataSource : {
            get : function() {
                return this._clockTrackedDataSource;
            },
            set : function(value) {
                if (this._clockTrackedDataSource !== value) {
                    this._clockTrackedDataSource = value;
                    trackDataSourceClock(this._timeline, this.clock, value);
                }
            }
        }
    });

    /**
     * Extends the base viewer functionality with the provided mixin.
     * A mixin may add additional properties, functions, or other behavior
     * to the provided viewer instance.
     *
     * @param {Viewer~ViewerMixin} mixin The Viewer mixin to add to this instance.
     * @param {Object} [options] The options object to be passed to the mixin function.
     *
     * @see viewerDragDropMixin
     */
    Viewer.prototype.extend = function(mixin, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(mixin)) {
            throw new DeveloperError('mixin is required.');
        }
        //>>includeEnd('debug')

        mixin(this, options);
    };

    /**
     * Resizes the widget to match the container size.
     * This function is called automatically as needed unless
     * <code>useDefaultRenderLoop</code> is set to false.
     */
    Viewer.prototype.resize = function() {
        var cesiumWidget = this._cesiumWidget;
        var container = this._container;
        var width = container.clientWidth;
        var height = container.clientHeight;
        var animationExists = defined(this._animation);
        var timelineExists = defined(this._timeline);

        if (!this._forceResize && width === this._lastWidth && height === this._lastHeight) {
            return;
        }

        cesiumWidget.resize();
        this._forceResize = false;
        var panelMaxHeight = height - 125;
        var baseLayerPickerDropDown = this._baseLayerPickerDropDown;

        if (defined(baseLayerPickerDropDown)) {
            baseLayerPickerDropDown.style.maxHeight = panelMaxHeight + 'px';
        }

        if (defined(this._geocoder)) {
            var geocoderSuggestions = this._geocoder.searchSuggestionsContainer;
            geocoderSuggestions.style.maxHeight = panelMaxHeight + 'px';
        }

        if (defined(this._infoBox)) {
            this._infoBox.viewModel.maxHeight = panelMaxHeight;
        }

        var timeline = this._timeline;
        var animationContainer;
        var animationWidth = 0;
        var creditLeft = 0;
        var creditBottom = 0;

        if (animationExists && window.getComputedStyle(this._animation.container).visibility !== 'hidden') {
            var lastWidth = this._lastWidth;
            animationContainer = this._animation.container;
            if (width > 900) {
                animationWidth = 169;
                if (lastWidth <= 900) {
                    animationContainer.style.width = '169px';
                    animationContainer.style.height = '112px';
                    this._animation.resize();
                }
            } else if (width >= 600) {
                animationWidth = 136;
                if (lastWidth < 600 || lastWidth > 900) {
                    animationContainer.style.width = '136px';
                    animationContainer.style.height = '90px';
                    this._animation.resize();
                }
            } else {
                animationWidth = 106;
                if (lastWidth > 600 || lastWidth === 0) {
                    animationContainer.style.width = '106px';
                    animationContainer.style.height = '70px';
                    this._animation.resize();
                }
            }
            creditLeft = animationWidth + 5;
        }

        if (timelineExists && window.getComputedStyle(this._timeline.container).visibility !== 'hidden') {
            var fullscreenButton = this._fullscreenButton;
            var vrButton = this._vrButton;
            var timelineContainer = timeline.container;
            var timelineStyle = timelineContainer.style;

            creditBottom = timelineContainer.clientHeight + 3;
            timelineStyle.left = animationWidth + 'px';

            var pixels = 0;
            if (defined(fullscreenButton)) {
                pixels += fullscreenButton.container.clientWidth;
            }
            if (defined(vrButton)) {
                pixels += vrButton.container.clientWidth;
            }

            timelineStyle.right = pixels + 'px';
            timeline.resize();
        }

        this._bottomContainer.style.left = creditLeft + 'px';
        this._bottomContainer.style.bottom = creditBottom + 'px';

        this._lastWidth = width;
        this._lastHeight = height;
    };

    /**
     * This forces the widget to re-think its layout, including
     * widget sizes and credit placement.
     */
    Viewer.prototype.forceResize = function() {
        this._lastWidth = 0;
        this.resize();
    };

    /**
     * Renders the scene.  This function is called automatically
     * unless <code>useDefaultRenderLoop</code> is set to false;
     */
    Viewer.prototype.render = function() {
        this._cesiumWidget.render();
    };

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    Viewer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    Viewer.prototype.destroy = function() {
        var i;

        this.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
        this.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // Unsubscribe from data sources
        var dataSources = this.dataSources;
        var dataSourceLength = dataSources.length;
        for (i = 0; i < dataSourceLength; i++) {
            this._dataSourceRemoved(dataSources, dataSources.get(i));
        }
        this._dataSourceRemoved(undefined, this._dataSourceDisplay.defaultDataSource);

        this._container.removeChild(this._element);
        this._element.removeChild(this._toolbar);

        this._eventHelper.removeAll();

        if (defined(this._geocoder)) {
            this._geocoder = this._geocoder.destroy();
        }

        if (defined(this._homeButton)) {
            this._homeButton = this._homeButton.destroy();
        }

        if (defined(this._sceneModePicker)) {
            this._sceneModePicker = this._sceneModePicker.destroy();
        }

        if (defined(this._projectionPicker)) {
            this._projectionPicker = this._projectionPicker.destroy();
        }

        if (defined(this._baseLayerPicker)) {
            this._baseLayerPicker = this._baseLayerPicker.destroy();
        }

        if (defined(this._animation)) {
            this._element.removeChild(this._animation.container);
            this._animation = this._animation.destroy();
        }

        if (defined(this._timeline)) {
            this._timeline.removeEventListener('settime', onTimelineScrubfunction, false);
            this._element.removeChild(this._timeline.container);
            this._timeline = this._timeline.destroy();
        }

        if (defined(this._fullscreenButton)) {
            this._fullscreenSubscription.dispose();
            this._element.removeChild(this._fullscreenButton.container);
            this._fullscreenButton = this._fullscreenButton.destroy();
        }

        if (defined(this._vrButton)) {
            this._vrSubscription.dispose();
            this._vrModeSubscription.dispose();
            this._element.removeChild(this._vrButton.container);
            this._vrButton = this._vrButton.destroy();
        }

        if (defined(this._infoBox)) {
            this._element.removeChild(this._infoBox.container);
            this._infoBox = this._infoBox.destroy();
        }

        if (defined(this._selectionIndicator)) {
            this._element.removeChild(this._selectionIndicator.container);
            this._selectionIndicator = this._selectionIndicator.destroy();
        }

        this._clockViewModel = this._clockViewModel.destroy();
        this._dataSourceDisplay = this._dataSourceDisplay.destroy();
        this._cesiumWidget = this._cesiumWidget.destroy();

        if (this._destroyDataSourceCollection) {
            this._dataSourceCollection = this._dataSourceCollection.destroy();
        }

        return destroyObject(this);
    };

    /**
     * @private
     */
    Viewer.prototype._dataSourceAdded = function(dataSourceCollection, dataSource) {
        var entityCollection = dataSource.entities;
        entityCollection.collectionChanged.addEventListener(Viewer.prototype._onEntityCollectionChanged, this);
    };

    /**
     * @private
     */
    Viewer.prototype._dataSourceRemoved = function(dataSourceCollection, dataSource) {
        var entityCollection = dataSource.entities;
        entityCollection.collectionChanged.removeEventListener(Viewer.prototype._onEntityCollectionChanged, this);

        if (defined(this.trackedEntity)) {
            if (entityCollection.getById(this.trackedEntity.id) === this.trackedEntity) {
                this.trackedEntity = undefined;
            }
        }

        if (defined(this.selectedEntity)) {
            if (entityCollection.getById(this.selectedEntity.id) === this.selectedEntity) {
                this.selectedEntity = undefined;
            }
        }
    };

    /**
     * @private
     */
    Viewer.prototype._onTick = function(clock) {
        var time = clock.currentTime;

        var isUpdated = this._dataSourceDisplay.update(time);
        if (this._allowDataSourcesToSuspendAnimation) {
            this._clockViewModel.canAnimate = isUpdated;
        }

        var entityView = this._entityView;
        if (defined(entityView)) {
            var trackedEntity = this._trackedEntity;
            var trackedState = this._dataSourceDisplay.getBoundingSphere(trackedEntity, false, boundingSphereScratch);
            if (trackedState === BoundingSphereState.DONE) {
                entityView.update(time, boundingSphereScratch);
            }
        }

        var position;
        var enableCamera = false;
        var selectedEntity = this.selectedEntity;
        var showSelection = defined(selectedEntity) && this._enableInfoOrSelection;

        if (showSelection && selectedEntity.isShowing && selectedEntity.isAvailable(time)) {
            var state = this._dataSourceDisplay.getBoundingSphere(selectedEntity, true, boundingSphereScratch);
            if (state !== BoundingSphereState.FAILED) {
                position = boundingSphereScratch.center;
            } else if (defined(selectedEntity.position)) {
                position = selectedEntity.position.getValue(time, position);
            }
            enableCamera = defined(position);
        }

        var selectionIndicatorViewModel = defined(this._selectionIndicator) ? this._selectionIndicator.viewModel : undefined;
        if (defined(selectionIndicatorViewModel)) {
            selectionIndicatorViewModel.position = Cartesian3.clone(position, selectionIndicatorViewModel.position);
            selectionIndicatorViewModel.showSelection = showSelection && enableCamera;
            selectionIndicatorViewModel.update();
        }

        var infoBoxViewModel = defined(this._infoBox) ? this._infoBox.viewModel : undefined;
        if (defined(infoBoxViewModel)) {
            infoBoxViewModel.showInfo = showSelection;
            infoBoxViewModel.enableCamera = enableCamera;
            infoBoxViewModel.isCameraTracking = (this.trackedEntity === this.selectedEntity);

            if (showSelection) {
                infoBoxViewModel.titleText = defaultValue(selectedEntity.name, selectedEntity.id);
                infoBoxViewModel.description = Property.getValueOrDefault(selectedEntity.description, time, '');
            } else {
                infoBoxViewModel.titleText = '';
                infoBoxViewModel.description = '';
            }
        }
    };

    /**
     * @private
     */
    Viewer.prototype._onEntityCollectionChanged = function(collection, added, removed) {
        var length = removed.length;
        for (var i = 0; i < length; i++) {
            var removedObject = removed[i];
            if (this.trackedEntity === removedObject) {
                this.trackedEntity = undefined;
            }
            if (this.selectedEntity === removedObject) {
                this.selectedEntity = undefined;
            }
        }
    };

    /**
     * @private
     */
    Viewer.prototype._onInfoBoxCameraClicked = function(infoBoxViewModel) {
        if (infoBoxViewModel.isCameraTracking && (this.trackedEntity === this.selectedEntity)) {
            this.trackedEntity = undefined;
        } else {
            var selectedEntity = this.selectedEntity;
            var position = selectedEntity.position;
            if (defined(position)) {
                this.trackedEntity = this.selectedEntity;
            } else {
                this.zoomTo(this.selectedEntity);
            }
        }
    };

    /**
     * @private
     */
    Viewer.prototype._clearTrackedObject = function() {
        this.trackedEntity = undefined;
    };

    /**
     * @private
     */
    Viewer.prototype._onInfoBoxClockClicked = function(infoBoxViewModel) {
        this.selectedEntity = undefined;
    };

    /**
     * @private
     */
    Viewer.prototype._clearObjects = function() {
        this.trackedEntity = undefined;
        this.selectedEntity = undefined;
    };

    /**
     * @private
     */
    Viewer.prototype._onDataSourceChanged = function(dataSource) {
        if (this.clockTrackedDataSource === dataSource) {
            trackDataSourceClock(this.timeline, this.clock, dataSource);
        }
    };

    /**
     * @private
     */
    Viewer.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        if (this._automaticallyTrackDataSourceClocks) {
            this.clockTrackedDataSource = dataSource;
        }
        var id = dataSource.entities.id;
        var removalFunc = this._eventHelper.add(dataSource.changedEvent, Viewer.prototype._onDataSourceChanged, this);
        this._dataSourceChangedListeners[id] = removalFunc;
    };

    /**
     * @private
     */
    Viewer.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        var resetClock = (this.clockTrackedDataSource === dataSource);
        var id = dataSource.entities.id;
        this._dataSourceChangedListeners[id]();
        this._dataSourceChangedListeners[id] = undefined;
        if (resetClock) {
            var numDataSources = dataSourceCollection.length;
            if (this._automaticallyTrackDataSourceClocks && numDataSources > 0) {
                this.clockTrackedDataSource = dataSourceCollection.get(numDataSources - 1);
            } else {
                this.clockTrackedDataSource = undefined;
            }
        }
    };

    /**
     * Asynchronously sets the camera to view the provided entity, entities, or data source.
     * If the data source is still in the process of loading or the visualization is otherwise still loading,
     * this method waits for the data to be ready before performing the zoom.
     *
     * <p>The offset is heading/pitch/range in the local east-north-up reference frame centered at the center of the bounding sphere.
     * The heading and the pitch angles are defined in the local east-north-up reference frame.
     * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
     * angles are above the plane. Negative pitch angles are below the plane. The range is the distance from the center. If the range is
     * zero, a range will be computed such that the whole bounding sphere is visible.</p>
     *
     * <p>In 2D, there must be a top down view. The camera will be placed above the target looking down. The height above the
     * target will be the range. The heading will be determined from the offset. If the heading cannot be
     * determined from the offset, the heading will be north.</p>
     *
     * @param {Entity|Entity[]|EntityCollection|DataSource|ImageryLayer|Promise.<Entity|Entity[]|EntityCollection|DataSource|ImageryLayer>} target The entity, array of entities, entity collection, data source or imagery layer to view. You can also pass a promise that resolves to one of the previously mentioned types.
     * @param {HeadingPitchRange} [offset] The offset from the center of the entity in the local east-north-up reference frame.
     * @returns {Promise.<Boolean>} A Promise that resolves to true if the zoom was successful or false if the entity is not currently visualized in the scene or the zoom was cancelled.
     */
    Viewer.prototype.zoomTo = function(target, offset) {
        return zoomToOrFly(this, target, offset, false);
    };

    /**
     * Flies the camera to the provided entity, entities, or data source.
     * If the data source is still in the process of loading or the visualization is otherwise still loading,
     * this method waits for the data to be ready before performing the flight.
     *
     * <p>The offset is heading/pitch/range in the local east-north-up reference frame centered at the center of the bounding sphere.
     * The heading and the pitch angles are defined in the local east-north-up reference frame.
     * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
     * angles are above the plane. Negative pitch angles are below the plane. The range is the distance from the center. If the range is
     * zero, a range will be computed such that the whole bounding sphere is visible.</p>
     *
     * <p>In 2D, there must be a top down view. The camera will be placed above the target looking down. The height above the
     * target will be the range. The heading will be determined from the offset. If the heading cannot be
     * determined from the offset, the heading will be north.</p>
     *
     * @param {Entity|Entity[]|EntityCollection|DataSource|ImageryLayer|Promise.<Entity|Entity[]|EntityCollection|DataSource|ImageryLayer>} target The entity, array of entities, entity collection, data source or imagery layer to view. You can also pass a promise that resolves to one of the previously mentioned types.
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.duration=3.0] The duration of the flight in seconds.
     * @param {Number} [options.maximumHeight] The maximum height at the peak of the flight.
     * @param {HeadingPitchRange} [options.offset] The offset from the target in the local east-north-up reference frame centered at the target.
     * @returns {Promise.<Boolean>} A Promise that resolves to true if the flight was successful or false if the entity is not currently visualized in the scene or the flight was cancelled.
     */
    Viewer.prototype.flyTo = function(target, options) {
        return zoomToOrFly(this, target, options, true);
    };

    function zoomToOrFly(that, zoomTarget, options, isFlight) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(zoomTarget)) {
            throw new DeveloperError('zoomTarget is required.');
        }
        //>>includeEnd('debug');

        cancelZoom(that);

        //We can't actually perform the zoom until all visualization is ready and
        //bounding spheres have been computed.  Therefore we create and return
        //a deferred which will be resolved as part of the post-render step in the
        //frame that actually performs the zoom
        var zoomPromise = when.defer();
        that._zoomPromise = zoomPromise;
        that._zoomIsFlight = isFlight;
        that._zoomOptions = options;

        when(zoomTarget, function(zoomTarget) {
            //Only perform the zoom if it wasn't cancelled before the promise resolved.
            if (that._zoomPromise !== zoomPromise) {
                return;
            }

            //If the zoom target is a rectangular imagery in an ImageLayer
            if (zoomTarget instanceof ImageryLayer) {
                zoomTarget.getViewableRectangle().then(function(rectangle) {
                    //Only perform the zoom if it wasn't cancelled before the promise was resolved
                    if (that._zoomPromise === zoomPromise) {
                        that._zoomTarget = rectangle;
                    }
                });
                return;
            }

            //If the zoom target is a data source, and it's in the middle of loading, wait for it to finish loading.
            if (zoomTarget.isLoading && defined(zoomTarget.loadingEvent)) {
                var removeEvent = zoomTarget.loadingEvent.addEventListener(function() {
                    removeEvent();

                    //Only perform the zoom if it wasn't cancelled before the data source finished.
                    if (that._zoomPromise === zoomPromise) {
                        that._zoomTarget = zoomTarget.entities.values.slice(0);
                    }
                });
                return;
            }

            //Zoom target is already an array, just copy it and return.
            if (isArray(zoomTarget)) {
                that._zoomTarget = zoomTarget.slice(0);
                return;
            }

            //If zoomTarget is an EntityCollection, this will retrieve the array
            zoomTarget = defaultValue(zoomTarget.values, zoomTarget);

            //If zoomTarget is a DataSource, this will retrieve the array.
            if (defined(zoomTarget.entities)) {
                zoomTarget = zoomTarget.entities.values;
            }

            if (isArray(zoomTarget)) {
                that._zoomTarget = zoomTarget.slice(0);
            } else {
                //Single entity
                that._zoomTarget = [zoomTarget];
            }
        });

        return zoomPromise.promise;
    }

    function clearZoom(viewer) {
        viewer._zoomPromise = undefined;
        viewer._zoomTarget = undefined;
        viewer._zoomOptions = undefined;
    }

    function cancelZoom(viewer) {
        var zoomPromise = viewer._zoomPromise;
        if (defined(zoomPromise)) {
            clearZoom(viewer);
            zoomPromise.resolve(false);
        }
    }

    /**
     * @private
     */
    Viewer.prototype._postRender = function() {
        updateZoomTarget(this);
        updateTrackedEntity(this);
    };

    function updateZoomTarget(viewer) {
        var entities = viewer._zoomTarget;
        if (!defined(entities) || viewer.scene.mode === SceneMode.MORPHING) {
            return;
        }

        var scene = viewer.scene;
        var camera = scene.camera;
        var zoomPromise = viewer._zoomPromise;
        var zoomOptions = defaultValue(viewer._zoomOptions, {});

        //If zoomTarget was an ImageryLayer
        if (entities instanceof Rectangle) {
            var options = {
                destination : entities,
                duration : zoomOptions.duration,
                maximumHeight : zoomOptions.maximumHeight,
                complete : function() {
                    zoomPromise.resolve(true);
                },
                cancel : function() {
                    zoomPromise.resolve(false);
                }
            };

            if (viewer._zoomIsFlight) {
                camera.flyTo(options);
            } else {
                camera.setView(options);
                zoomPromise.resolve(true);
            }
            clearZoom(viewer);
            return;
        }

        var boundingSpheres = [];
        for (var i = 0, len = entities.length; i < len; i++) {
            var state = viewer._dataSourceDisplay.getBoundingSphere(entities[i], false, boundingSphereScratch);

            if (state === BoundingSphereState.PENDING) {
                return;
            } else if (state !== BoundingSphereState.FAILED) {
                boundingSpheres.push(BoundingSphere.clone(boundingSphereScratch));
            }
        }

        if (boundingSpheres.length === 0) {
            cancelZoom(viewer);
            return;
        }

        //Stop tracking the current entity.
        viewer.trackedEntity = undefined;

        var boundingSphere = BoundingSphere.fromBoundingSpheres(boundingSpheres);
        var controller = scene.screenSpaceCameraController;
        controller.minimumZoomDistance = Math.min(controller.minimumZoomDistance, boundingSphere.radius * 0.5);

        if (!viewer._zoomIsFlight) {
            camera.viewBoundingSphere(boundingSphere, viewer._zoomOptions);
            camera.lookAtTransform(Matrix4.IDENTITY);
            clearZoom(viewer);
            zoomPromise.resolve(true);
        } else {
            clearZoom(viewer);
            camera.flyToBoundingSphere(boundingSphere, {
                duration : zoomOptions.duration,
                maximumHeight : zoomOptions.maximumHeight,
                complete : function() {
                    zoomPromise.resolve(true);
                },
                cancel : function() {
                    zoomPromise.resolve(false);
                },
                offset : zoomOptions.offset
            });
        }
    }

    function updateTrackedEntity(viewer) {
        if (!viewer._needTrackedEntityUpdate) {
            return;
        }

        var trackedEntity = viewer._trackedEntity;
        var currentTime = viewer.clock.currentTime;

        //Verify we have a current position at this time. This is only triggered if a position
        //has become undefined after trackedEntity is set but before the boundingSphere has been
        //computed. In this case, we will track the entity once it comes back into existence.
        var currentPosition = Property.getValueOrUndefined(trackedEntity.position, currentTime);

        if (!defined(currentPosition)) {
            return;
        }

        var scene = viewer.scene;

        var state = viewer._dataSourceDisplay.getBoundingSphere(trackedEntity, false, boundingSphereScratch);
        if (state === BoundingSphereState.PENDING) {
            return;
        }

        var sceneMode = scene.mode;
        if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE2D) {
            scene.screenSpaceCameraController.enableTranslate = false;
        }

        if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE3D) {
            scene.screenSpaceCameraController.enableTilt = false;
        }

        var bs = state !== BoundingSphereState.FAILED ? boundingSphereScratch : undefined;
        viewer._entityView = new EntityView(trackedEntity, scene, scene.mapProjection.ellipsoid);
        viewer._entityView.update(currentTime, bs);
        viewer._needTrackedEntityUpdate = false;
    }

    /**
     * A function that augments a Viewer instance with additional functionality.
     * @callback Viewer~ViewerMixin
     * @param {Viewer} viewer The viewer instance.
     * @param {Object} options Options object to be passed to the mixin function.
     *
     * @see Viewer#extend
     */

    return Viewer;
});
