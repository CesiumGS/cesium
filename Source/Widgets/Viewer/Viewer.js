/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../DataSources/DataSourceCollection',
        '../../DataSources/DataSourceDisplay',
        '../../ThirdParty/knockout',
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
        '../SceneModePicker/SceneModePicker',
        '../SelectionIndicator/SelectionIndicator',
        '../subscribeAndEvaluate',
        '../Timeline/Timeline'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EventHelper,
        DataSourceCollection,
        DataSourceDisplay,
        knockout,
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
        SceneModePicker,
        SelectionIndicator,
        subscribeAndEvaluate,
        Timeline) {
    "use strict";

    function onTimelineScrubfunction(e) {
        var clock = e.clock;
        clock.currentTime = e.timeJulian;
        clock.shouldAnimate = false;
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
     * @param {Boolean} [options.geocoder=true] If set to false, the Geocoder widget will not be created.
     * @param {Boolean} [options.homeButton=true] If set to false, the HomeButton widget will not be created.
     * @param {Boolean} [options.infoBox=true] If set to false, the InfoBox widget will not be created.
     * @param {Boolean} [options.sceneModePicker=true] If set to false, the SceneModePicker widget will not be created.
     * @param {Boolean} [options.selectionIndicator=true] If set to false, the SelectionIndicator widget will not be created.
     * @param {Boolean} [options.timeline=true] If set to false, the Timeline widget will not be created.
     * @param {Boolean} [options.navigationHelpButton=true] If set to the false, the navigation help button will not be created.
     * @param {Boolean} [options.navigationInstructionsInitiallyVisible=true] True if the navigation instructions should initially be visible, or false if the should not be shown until the user explicitly clicks the button.
     * @param {Boolean} [options.scene3DOnly=false] When <code>true</code>, each geometry instance will only be rendered in 3D to save GPU memory.
     * @param {ProviderViewModel} [options.selectedImageryProviderViewModel] The view model for the current base imagery layer, if not supplied the first available base layer is used.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ProviderViewModel[]} [options.imageryProviderViewModels=createDefaultImageryProviderViewModels()] The array of ProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ProviderViewModel} [options.selectedTerrainProviderViewModel] The view model for the current base terrain layer, if not supplied the first available base layer is used.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ProviderViewModel[]} [options.terrainProviderViewModels=createDefaultTerrainProviderViewModels()] The array of ProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ImageryProvider} [options.imageryProvider=new BingMapsImageryProvider()] The imagery provider to use.  This value is only valid if options.baseLayerPicker is set to false.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider()] The terrain provider to use
     * @param {SkyBox} [options.skyBox] The skybox used to render the stars.  When <code>undefined</code>, the default stars are used.
     * @param {Element} [options.fullscreenElement=document.body] The element to make full screen when the full screen button is pressed.
     * @param {Boolean} [options.useDefaultRenderLoop=true] True if this widget should control the render loop, false otherwise.
     * @param {Number} [options.targetFrameRate] The target frame rate when using the default render loop.
     * @param {Boolean} [options.showRenderLoopErrors=true] If true, this widget will automatically display an HTML panel to the user containing the error, if a render loop error occurs.
     * @param {Boolean} [options.automaticallyTrackDataSourceClocks=true] If true, this widget will automatically track the clock settings of newly added DataSources, updating if the DataSource's clock changes.  Set this to false if you want to configure the clock independently.
     * @param {Object} [options.contextOptions] Context and WebGL creation properties corresponding to <code>options</code> passed to {@link Scene}.
     * @param {SceneMode} [options.sceneMode=SceneMode.SCENE3D] The initial scene mode.
     * @param {MapProjection} [options.mapProjection=new GeographicProjection()] The map projection to use in 2D and Columbus View modes.
     * @param {Boolean} [options.orderIndependentTranslucency=true] If true and the configuration supports it, use order independent translucency.
     * @param {Element|String} [options.creditContainer] The DOM element or ID that will contain the {@link CreditDisplay}.  If not specified, the credits are added to the bottom of the widget itself.
     * @param {DataSourceCollection} [options.dataSources=new DataSourceCollection()] The collection of data sources visualized by the widget.  If this parameter is provided,
                                     the instance is assumed to be owned by the caller and will not be destroyed when the viewer is destroyed.
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
     * @see viewerEntityMixin
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
     *         url : '//cesiumjs.org/smallterrain',
     *         credit : 'Terrain data courtesy Analytical Graphics, Inc.'
     *     }),
     *     //Hide the base layer picker
     *     baseLayerPicker : false,
     *     //Use OpenStreetMaps
     *     imageryProvider : new Cesium.OpenStreetMapImageryProvider({
     *         url : '//a.tile.openstreetmap.org/'
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
     * //Allow users to zoom and follow objects loaded from CZML by clicking on it.
     * viewer.extend(Cesium.viewerEntityMixin);
     *
     * //Show a pop-up alert if we encounter an error when processing a dropped file
     * viewer.dropError.addEventListener(function(dropHandler, name, error) {
     *     console.log(error);
     *     window.alert(error);
     * });
     */
    var Viewer = function(container, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var createBaseLayerPicker = !defined(options.baseLayerPicker) || options.baseLayerPicker !== false;

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
            skyBox : options.skyBox,
            sceneMode : options.sceneMode,
            mapProjection : options.mapProjection,
            orderIndependentTranslucency : options.orderIndependentTranslucency,
            contextOptions : options.contextOptions,
            useDefaultRenderLoop : options.useDefaultRenderLoop,
            targetFrameRate : options.targetFrameRate,
            showRenderLoopErrors : options.showRenderLoopErrors,
            creditContainer : defined(options.creditContainer) ? options.creditContainer : bottomContainer,
            scene3DOnly : scene3DOnly
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
        var that = this;

        eventHelper.add(clock.onTick, function(clock) {
            var isUpdated = dataSourceDisplay.update(clock.currentTime);
            if (that._allowDataSourcesToSuspendAnimation) {
                clockViewModel.canAnimate = isUpdated;
            }
        });

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
                scene : cesiumWidget.scene
            });
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
        }

        // SceneModePicker
        // By default, we silently disable the scene mode picker if scene3DOnly is true,
        // but if sceneModePicker is explicitly set to true, throw an error.
        if ((options.sceneModePicker === true) && scene3DOnly) {
            throw new DeveloperError('options.sceneModePicker is not available when options.scene3DOnly is set to true.');
        }

        var sceneModePicker;
        if (!scene3DOnly && (!defined(options.sceneModePicker) || options.sceneModePicker !== false)) {
            sceneModePicker = new SceneModePicker(toolbar, cesiumWidget.scene);
        }

        // BaseLayerPicker
        var baseLayerPicker;
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
            this._baseLayerPickerDropDown = elements[0];
        }

        // Navigation Help Button
        var navigationHelpButton;
        if (!defined(options.navigationHelpButton) || options.navigationHelpButton !== false) {
            var showNavHelp = true;
            if (defined(window.localStorage)) {
                var  hasSeenNavHelp = window.localStorage.getItem('cesium-hasSeenNavHelp');
                if (defined(hasSeenNavHelp) && Boolean(hasSeenNavHelp)) {
                    showNavHelp = false;
                } else {
                    window.localStorage.setItem('cesium-hasSeenNavHelp', 'true');
                }
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
        if (!defined(options.fullscreenButton) || options.fullscreenButton !== false) {
            var fullscreenContainer = document.createElement('div');
            fullscreenContainer.className = 'cesium-viewer-fullscreenContainer';
            viewerContainer.appendChild(fullscreenContainer);
            fullscreenButton = new FullscreenButton(fullscreenContainer, options.fullscreenElement);

            //Subscribe to fullscreenButton.viewModel.isFullscreenEnabled so
            //that we can hide/show the button as well as size the timeline.
            this._fullscreenSubscription = subscribeAndEvaluate(fullscreenButton.viewModel, 'isFullscreenEnabled', function(isFullscreenEnabled) {
                fullscreenContainer.style.display = isFullscreenEnabled ? 'block' : 'none';
                if (defined(timeline)) {
                    timeline.container.style.right = fullscreenContainer.clientWidth + 'px';
                    timeline.resize();
                }
            });
        } else if (defined(timeline)) {
            timeline.container.style.right = 0;
        }

        /**
         * Gets or sets the data source to track with the viewer's clock.
         * @type {DataSource}
         */
        this.clockTrackedDataSource = undefined;

        knockout.track(this, ['clockTrackedDataSource']);

        this._dataSourceChangedListeners = {};
        this._knockoutSubscriptions = [];
        var automaticallyTrackDataSourceClocks = defaultValue(options.automaticallyTrackDataSourceClocks, true);

        function trackDataSourceClock(dataSource) {
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

        this._knockoutSubscriptions.push(subscribeAndEvaluate(this, 'clockTrackedDataSource', function(value) {
            trackDataSourceClock(value);
        }));

        var onDataSourceChanged = function(dataSource) {
            if (that.clockTrackedDataSource === dataSource) {
                trackDataSourceClock(dataSource);
            }
        };

        var onDataSourceAdded = function(dataSourceCollection, dataSource) {
            if (automaticallyTrackDataSourceClocks) {
                that.clockTrackedDataSource = dataSource;
            }
            var id = dataSource.entities.id;
            var removalFunc = eventHelper.add(dataSource.changedEvent, onDataSourceChanged);
            that._dataSourceChangedListeners[id] = removalFunc;
        };

        var onDataSourceRemoved = function(dataSourceCollection, dataSource) {
            var resetClock = (that.clockTrackedDataSource === dataSource);
            var id = dataSource.entities.id;
            that._dataSourceChangedListeners[id]();
            that._dataSourceChangedListeners[id] = undefined;
            if (resetClock) {
                var numDataSources = dataSourceCollection.length;
                if (automaticallyTrackDataSourceClocks && numDataSources > 0) {
                    that.clockTrackedDataSource = dataSourceCollection.get(numDataSources - 1);
                } else {
                    that.clockTrackedDataSource = undefined;
                }
            }
        };

        eventHelper.add(dataSourceCollection.dataSourceAdded, onDataSourceAdded);
        eventHelper.add(dataSourceCollection.dataSourceRemoved, onDataSourceRemoved);

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
        this._baseLayerPicker = baseLayerPicker;
        this._animation = animation;
        this._timeline = timeline;
        this._fullscreenButton = fullscreenButton;
        this._geocoder = geocoder;
        this._eventHelper = eventHelper;
        this._lastWidth = 0;
        this._lastHeight = 0;
        this._allowDataSourcesToSuspendAnimation = true;

        // Prior to each render, check if anything needs to be resized.
        cesiumWidget.scene.preRender.addEventListener(function(scene, time) {
            resizeViewer(that);
        });
    };

    defineProperties(Viewer.prototype, {
        /**
         * Gets the parent container.
         * @memberof Viewer.prototype
         * @type {Element}
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
         */
        sceneModePicker : {
            get : function() {
                return this._sceneModePicker;
            }
        },

        /**
         * Gets the BaseLayerPicker.
         * @memberof Viewer.prototype
         * @type {BaseLayerPicker}
         */
        baseLayerPicker : {
            get : function() {
                return this._baseLayerPicker;
            }
        },

        /**
         * Gets the Animation widget.
         * @memberof Viewer.prototype
         * @type {Animation}
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
         */
        fullscreenButton : {
            get : function() {
                return this._fullscreenButton;
            }
        },

        /**
         * Gets the display used for {@link DataSource} visualization.
         * @memberof Viewer.prototype
         * @type {DataSourceDisplay}
         */
        dataSourceDisplay : {
            get : function() {
                return this._dataSourceDisplay;
            }
        },

        /**
         * Gets the set of {@link DataSource} instances to be visualized.
         * @memberof Viewer.prototype
         * @type {DataSourceCollection}
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
         */
        scene : {
            get : function() {
                return this._cesiumWidget.scene;
            }
        },

        /**
         * Gets the clock.
         * @memberof Viewer.prototype
         * @type {Clock}
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
         */
        screenSpaceEventHandler : {
            get : function() {
                return this._cesiumWidget.screenSpaceEventHandler;
            }
        },

        /**
         * Gets or sets the target frame rate of the widget when <code>useDefaultRenderLoop</code>
         * is true. If undefined, the browser's {@link requestAnimationFrame} implementation
         * determines the frame rate.  This value must be greater than 0 and a value higher than
         * the underlying requestAnimationFrame implementatin will have no effect.
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
        }
    });

    /**
     * Extends the base viewer functionality with the provided mixin.
     * A mixin may add additional properties, functions, or other behavior
     * to the provided viewer instance.
     *
     * @param {Viewer~ViewerMixin} mixin The Viewer mixin to add to this instance.
     * @param {Object} options The options object to be passed to the mixin function.
     *
     * @see viewerDragDropMixin
     * @see viewerEntityMixin
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
        cesiumWidget.resize();
        resizeViewer(this);
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
        var numSubscriptions = this._knockoutSubscriptions.length;
        for (i = 0; i < numSubscriptions; i++) {
            this._knockoutSubscriptions[i].dispose();
        }

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

    function resizeViewer(viewer) {
        var container = viewer._container;
        var width = container.clientWidth;
        var height = container.clientHeight;
        var animationExists = defined(viewer._animation);
        var timelineExists = defined(viewer._timeline);

        if (width === viewer._lastWidth && height === viewer._lastHeight) {
            return;
        }

        var panelMaxHeight = height - 125;
        var baseLayerPickerDropDown = viewer._baseLayerPickerDropDown;

        if (defined(baseLayerPickerDropDown)) {
            baseLayerPickerDropDown.style.maxHeight = panelMaxHeight + 'px';
        }

        if (defined(viewer._infoBox)) {
            viewer._infoBox.viewModel.maxHeight = panelMaxHeight;
        }

        var timeline = viewer._timeline;
        var animationContainer;
        var animationWidth = 0;
        var creditLeft = 0;
        var creditBottom = 0;

        if (animationExists && window.getComputedStyle(viewer._animation.container).visibility !== 'hidden') {
            var lastWidth = viewer._lastWidth;
            animationContainer = viewer._animation.container;
            if (width > 900) {
                animationWidth = 169;
                if (lastWidth <= 900) {
                    animationContainer.style.width = '169px';
                    animationContainer.style.height = '112px';
                    viewer._animation.resize();
                }
            } else if (width >= 600) {
                animationWidth = 136;
                if (lastWidth < 600 || lastWidth > 900) {
                    animationContainer.style.width = '136px';
                    animationContainer.style.height = '90px';
                    viewer._animation.resize();
                }
            } else {
                animationWidth = 106;
                if (lastWidth > 600 || lastWidth === 0) {
                    animationContainer.style.width = '106px';
                    animationContainer.style.height = '70px';
                    viewer._animation.resize();
                }
            }
            creditLeft = animationWidth + 5;
        }

        if (timelineExists && window.getComputedStyle(viewer._timeline.container).visibility !== 'hidden') {
            var fullscreenButton = viewer._fullscreenButton;
            var timelineContainer = timeline.container;
            var timelineStyle = timelineContainer.style;

            creditBottom = timelineContainer.clientHeight + 3;
            timelineStyle.left = animationWidth + 'px';

            if (defined(fullscreenButton)) {
                timelineStyle.right = fullscreenButton.container.clientWidth + 'px';
            }
            timeline.resize();
        }

        viewer._bottomContainer.style.left = creditLeft + 'px';
        viewer._bottomContainer.style.bottom = creditBottom + 'px';

        viewer._lastWidth = width;
        viewer._lastHeight = height;
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
