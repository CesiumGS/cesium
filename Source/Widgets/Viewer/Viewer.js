/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/Event',
        '../../Core/EventHelper',
        '../../Core/formatError',
        '../../Core/requestAnimationFrame',
        '../../DynamicScene/DataSourceCollection',
        '../../DynamicScene/DataSourceDisplay',
        '../Animation/Animation',
        '../Animation/AnimationViewModel',
        '../BaseLayerPicker/BaseLayerPicker',
        '../BaseLayerPicker/createDefaultBaseLayers',
        '../CesiumWidget/CesiumWidget',
        '../ClockViewModel',
        '../FullscreenButton/FullscreenButton',
        '../Geocoder/Geocoder',
        '../getElement',
        '../HomeButton/HomeButton',
        '../InfoBox/InfoBox',
        '../SceneModePicker/SceneModePicker',
        '../SelectionIndicator/SelectionIndicator',
        '../subscribeAndEvaluate',
        '../Timeline/Timeline',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        defineProperties,
        destroyObject,
        Event,
        EventHelper,
        formatError,
        requestAnimationFrame,
        DataSourceCollection,
        DataSourceDisplay,
        Animation,
        AnimationViewModel,
        BaseLayerPicker,
        createDefaultBaseLayers,
        CesiumWidget,
        ClockViewModel,
        FullscreenButton,
        Geocoder,
        getElement,
        HomeButton,
        InfoBox,
        SceneModePicker,
        SelectionIndicator,
        subscribeAndEvaluate,
        Timeline,
        knockout) {
    "use strict";

    function onTimelineScrubfunction(e) {
        var clock = e.clock;
        clock.currentTime = e.timeJulian;
        clock.shouldAnimate = false;
    }

    function startRenderLoop(viewer) {
        viewer._renderLoopRunning = true;

        function render() {
            if (viewer.isDestroyed()) {
                return;
            }

            try {
                if (viewer._useDefaultRenderLoop) {
                    viewer.resize();
                    viewer.render();
                    requestAnimationFrame(render);
                } else {
                    viewer._renderLoopRunning = false;
                }
            } catch (error) {
                viewer._useDefaultRenderLoop = false;
                viewer._renderLoopRunning = false;
                viewer._renderLoopError.raiseEvent(viewer, error);
                if (viewer._showRenderLoopErrors) {
                    /*global console*/
                    var title = 'An error occurred while rendering.  Rendering has stopped.';
                    var message = formatError(error);
                    viewer.cesiumWidget.showErrorPanel(title, message);
                    console.error(title + ' ' + message);
                }
            }
        }

        requestAnimationFrame(render);
    }

    /**
     * A base widget for building applications.  It composites all of the standard Cesium widgets into one reusable package.
     * The widget can always be extended by using mixins, which add functionality useful for a variety of applications.
     *
     * @alias Viewer
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Object} [options] Configuration options for the widget.
     * @param {Boolean} [options.animation=true] If set to false, the Animation widget will not be created.
     * @param {Boolean} [options.baseLayerPicker=true] If set to false, the BaseLayerPicker widget will not be created.
     * @param {Boolean} [options.fullscreenButton=true] If set to false, the FullscreenButton widget will not be created.
     * @param {Boolean} [options.geocoder=true] If set to false, the Geocoder widget will not be created.
     * @param {Boolean} [options.homeButton=true] If set to false, the HomeButton widget will not be created.
     * @param {Boolean} [options.infoBox=true] If set to false, the InfoBox widget will not be created.
     * @param {Boolean} [options.sceneModePicker=true] If set to false, the SceneModePicker widget will not be created.
     * @param {Boolean} [options.selectionIndicator=true] If set to false, the SelectionIndicator widget will not be created.
     * @param {Boolean} [options.timeline=true] If set to false, the Timeline widget will not be created.
     * @param {ImageryProviderViewModel} [options.selectedImageryProviderViewModel] The view model for the current base imagery layer, if not supplied the first available base layer is used.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {Array} [options.imageryProviderViewModels=createDefaultBaseLayers()] The array of ImageryProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ImageryProvider} [options.imageryProvider=new BingMapsImageryProvider()] The imagery provider to use.  This value is only valid if options.baseLayerPicker is set to false.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider()] The terrain provider to use
     * @param {SkyBox} [options.skyBox] The skybox used to render the stars.  When <code>undefined</code>, the default stars are used.
     * @param {Element} [options.fullscreenElement=document.body] The element to make full screen when the full screen button is pressed.
     * @param {Boolean} [options.useDefaultRenderLoop=true] True if this widget should control the render loop, false otherwise.
     * @param {Boolean} [options.showRenderLoopErrors=true] If true, this widget will automatically display an HTML panel to the user containing the error, if a render loop error occurs.
     * @param {Boolean} [options.automaticallyTrackDataSourceClocks=true] If true, this widget will automatically track the clock settings of newly added DataSources, updating if the DataSource's clock changes.  Set this to false if you want to configure the clock independently.
     * @param {Object} [options.contextOptions=undefined] Context and WebGL creation properties corresponding to {@link Context#options}.
     * @param {SceneMode} [options.sceneMode=SceneMode.SCENE3D] The initial scene mode.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     * @exception {DeveloperError} options.imageryProvider is not available when using the BaseLayerPicker widget, specify options.selectedImageryProviderViewModel instead.
     * @exception {DeveloperError} options.selectedImageryProviderViewModel is not available when not using the BaseLayerPicker widget, specify options.imageryProvider instead.
     *
     * @see Animation
     * @see BaseLayerPicker
     * @see CesiumWidget
     * @see FullscreenButton
     * @see HomeButton
     * @see SceneModePicker
     * @see Timeline
     * @see viewerDragDropMixin
     * @see viewerDynamicObjectMixin
     *
     * @example
     * //Initialize the viewer widget with several custom options and mixins.
     * var viewer = new Cesium.Viewer('cesiumContainer', {
     *     //Start in Columbus Viewer
     *     sceneMode : Cesium.SceneMode.COLUMBUS_VIEW,
     *     //Use standard Cesium terrain
     *     terrainProvider : new Cesium.CesiumTerrainProvider({
     *         url : 'http://cesiumjs.org/smallterrain',
     *         credit : 'Terrain data courtesy Analytical Graphics, Inc.'
     *     }),
     *     //Hide the base layer picker
     *     baseLayerPicker : false,
     *     //Use OpenStreetMaps
     *     imageryProvider : new Cesium.OpenStreetMapImageryProvider({
     *         url : 'http://tile.openstreetmap.org/'
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
     *     })
     * });
     *
     * //Add basic drag and drop functionality
     * viewer.extend(Cesium.viewerDragDropMixin);
     *
     * //Allow users to zoom and follow objects loaded from CZML by clicking on it.
     * viewer.extend(Cesium.viewerDynamicObjectMixin);
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

        //If using BaseLayerPicker, imageryProvider is an invalid option
        if (createBaseLayerPicker && defined(options.imageryProvider)) {
            throw new DeveloperError('options.imageryProvider is not available when using the BaseLayerPicker widget. \
Either specify options.selectedImageryProviderViewModel instead or set options.baseLayerPicker to false.');
        }

        //If not using BaseLayerPicker, selectedImageryProviderViewModel is an invalid option
        if (!createBaseLayerPicker && defined(options.selectedImageryProviderViewModel)) {
            throw new DeveloperError('options.selectedImageryProviderViewModel is not available when not using the BaseLayerPicker widget. \
Either specify options.imageryProvider instead or set options.baseLayerPicker to true.');
        }
        //>>includeEnd('debug')

        var viewerContainer = document.createElement('div');
        viewerContainer.className = 'cesium-viewer';
        container.appendChild(viewerContainer);

        //Cesium widget
        var cesiumWidgetContainer = document.createElement('div');
        cesiumWidgetContainer.className = 'cesium-viewer-cesiumWidgetContainer';
        viewerContainer.appendChild(cesiumWidgetContainer);
        var cesiumWidget = new CesiumWidget(cesiumWidgetContainer, {
            terrainProvider : options.terrainProvider,
            imageryProvider : createBaseLayerPicker ? false : options.imageryProvider,
            skyBox : options.skyBox,
            sceneMode : options.sceneMode,
            contextOptions : options.contextOptions,
            useDefaultRenderLoop : false
        });

        var dataSourceCollection = new DataSourceCollection();
        var dataSourceDisplay = new DataSourceDisplay(cesiumWidget.scene, dataSourceCollection);

        var clock = cesiumWidget.clock;
        var clockViewModel = new ClockViewModel(clock);
        var eventHelper = new EventHelper();

        eventHelper.add(clock.onTick, function(clock) {
            dataSourceDisplay.update(clock.currentTime);
        });

        //Selection Indicator
        var selectionIndicator;
        if (!defined(options.selectionIndicator) || options.selectionIndicator !== false) {
            var selectionIndicatorContainer = document.createElement('div');
            selectionIndicatorContainer.className = 'cesium-viewer-selectionIndicatorContainer';
            viewerContainer.appendChild(selectionIndicatorContainer);
            selectionIndicator = new SelectionIndicator(selectionIndicatorContainer, cesiumWidget.scene);
        }

        //Info Box
        var infoBox;
        if (!defined(options.infoBox) || options.infoBox !== false) {
            var infoBoxContainer = document.createElement('div');
            infoBoxContainer.className = 'cesium-viewer-infoBoxContainer';
            viewerContainer.appendChild(infoBoxContainer);
            infoBox = new InfoBox(infoBoxContainer);
        }

        //Main Toolbar
        var toolbar = document.createElement('div');
        toolbar.className = 'cesium-viewer-toolbar';
        viewerContainer.appendChild(toolbar);

        //Geocoder
        var geocoder;
        if (!defined(options.geocoder) || options.geocoder !== false) {
            var geocoderContainer = document.createElement('div');
            geocoderContainer.className = 'cesium-viewer-geocoderContainer';
            toolbar.appendChild(geocoderContainer);
            geocoder = new Geocoder({
                container : geocoderContainer,
                scene : cesiumWidget.scene,
                ellipsoid : cesiumWidget.centralBody.ellipsoid
            });
        }

        //HomeButton
        var homeButton;
        if (!defined(options.homeButton) || options.homeButton !== false) {
            homeButton = new HomeButton(toolbar, cesiumWidget.scene, cesiumWidget.sceneTransitioner, cesiumWidget.centralBody.ellipsoid);
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

        //SceneModePicker
        var sceneModePicker;
        if (!defined(options.sceneModePicker) || options.sceneModePicker !== false) {
            sceneModePicker = new SceneModePicker(toolbar, cesiumWidget.sceneTransitioner);
        }

        //BaseLayerPicker
        var baseLayerPicker;
        if (createBaseLayerPicker) {
            var providerViewModels = defaultValue(options.imageryProviderViewModels, createDefaultBaseLayers());
            baseLayerPicker = new BaseLayerPicker(toolbar, cesiumWidget.centralBody.imageryLayers, providerViewModels);
            baseLayerPicker.viewModel.selectedItem = defaultValue(options.selectedImageryProviderViewModel, providerViewModels[0]);

            //Grab the dropdown for resize code.
            var elements = toolbar.getElementsByClassName('cesium-baseLayerPicker-dropDown');
            this._baseLayerPickerDropDown = elements[0];
        }

        //Animation
        var animation;
        if (!defined(options.animation) || options.animation !== false) {
            var animationContainer = document.createElement('div');
            animationContainer.className = 'cesium-viewer-animationContainer';
            viewerContainer.appendChild(animationContainer);
            animation = new Animation(animationContainer, new AnimationViewModel(clockViewModel));
        }

        //Timeline
        var timeline;
        if (!defined(options.timeline) || options.timeline !== false) {
            var timelineContainer = document.createElement('div');
            timelineContainer.className = 'cesium-viewer-timelineContainer';
            viewerContainer.appendChild(timelineContainer);
            timeline = new Timeline(timelineContainer, clock);
            timeline.addEventListener('settime', onTimelineScrubfunction, false);
            timeline.zoomTo(clock.startTime, clock.stopTime);
        }

        //Fullscreen
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
        var that = this;

        function trackDataSourceClock(dataSource) {
            if (defined(dataSource)) {
                var dataSourceClock = dataSource.getClock();
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
            var id = dataSource.getDynamicObjectCollection().id;
            var removalFunc = eventHelper.add(dataSource.getChangedEvent(), onDataSourceChanged);
            that._dataSourceChangedListeners[id] = removalFunc;
        };

        var onDataSourceRemoved = function(dataSourceCollection, dataSource) {
            var resetClock = (that.clockTrackedDataSource === dataSource);
            var id = dataSource.getDynamicObjectCollection().id;
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
        this._element = viewerContainer;
        this._cesiumWidget = cesiumWidget;
        this._selectionIndicator = selectionIndicator;
        this._infoBox = infoBox;
        this._dataSourceCollection = dataSourceCollection;
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
        this._useDefaultRenderLoop = undefined;
        this._renderLoopRunning = false;
        this._showRenderLoopErrors = defaultValue(options.showRenderLoopErrors, true);
        this._renderLoopError = new Event();

        //Start the render loop if not explicitly disabled in options.
        this.useDefaultRenderLoop = defaultValue(options.useDefaultRenderLoop, true);
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
         * @returns {Canvas} The canvas.
         */
        canvas : {
            get : function() {
                return this._cesiumWidget.canvas;
            }
        },

        /**
         * Gets the Cesium logo element.
         * @memberof Viewer.prototype
         * @returns {Element} The logo element.
         */
        cesiumLogo : {
            get : function() {
                return this._cesiumWidget.cesiumLogo;
            }
        },

        /**
         * Gets the scene.
         * @memberof Viewer.prototype
         * @returns {Scene} The scene.
         */
        scene : {
            get : function() {
                return this._cesiumWidget.scene;
            }
        },

        /**
         * Gets the primary central body.
         * @memberof Viewer.prototype
         * @returns {CentralBody} The primary central body.
         */
        centralBody : {
            get : function() {
                return this._cesiumWidget.centralBody;
            }
        },

        /**
         * Gets the clock.
         * @memberof Viewer.prototype
         * @returns {Clock} the clock
         */
        clock : {
            get : function() {
                return this._cesiumWidget.clock;
            }
        },

        /**
         * Gets the scene transitioner.
         * @memberof Viewer.prototype
         * @returns {SceneTransitioner} The scene transitioner.
         */
        sceneTransitioner : {
            get : function() {
                return this._cesiumWidget.sceneTransitioner;
            }
        },

        /**
         * Gets the screen space event handler.
         * @memberof Viewer.prototype
         * @returns {ScreenSpaceEventHandler}
         */
        screenSpaceEventHandler : {
            get : function() {
                return this._cesiumWidget.screenSpaceEventHandler;
            }
        },

        /**
         * Gets the event that will be raised when an error is encountered during the default render loop.
         * The viewer instance and the generated exception are the only two parameters passed to the event handler.
         * <code>useDefaultRenderLoop</code> will be set to false whenever an exception is generated and must
         * be set back to true to continue rendering after an exception.
         * @memberof Viewer.prototype
         * @type {Event}
         */
        renderLoopError : {
            get : function() {
                return this._renderLoopError;
            }
        },

        /**
         * Gets or sets whether or not this widget should control the render loop.
         * If set to true the widget will use {@link requestAnimationFrame} to
         * perform rendering and resizing of the widget, as well as drive the
         * simulation clock. If set to false, you must manually call the
         * <code>resize</code>, <code>render</code> methods
         * as part of a custom render loop.
         * @memberof Viewer.prototype
         *
         * @type {Boolean}
         */
        useDefaultRenderLoop : {
            get : function() {
                return this._useDefaultRenderLoop;
            },
            set : function(value) {
                if (this._useDefaultRenderLoop !== value) {
                    this._useDefaultRenderLoop = value;
                    if (value && !this._renderLoopRunning) {
                        startRenderLoop(this);
                    }
                }
            }
        }
    });

    /**
     * Extends the base viewer functionality with the provided mixin.
     * A mixin may add additional properties, functions, or other behavior
     * to the provided viewer instance.
     * @memberof Viewer
     *
     * @param mixin The Viewer mixin to add to this instance.
     * @param options The options object to be passed to the mixin function.
     *
     * @see viewerDragDropMixin
     * @see viewerDynamicObjectMixin
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
     * @memberof Viewer
     */
    Viewer.prototype.resize = function() {
        var cesiumWidget = this._cesiumWidget;
        cesiumWidget.resize();

        var container = this._container;
        var width = container.clientWidth;
        var height = container.clientHeight;
        if (width === this._lastWidth && height === this._lastHeight) {
            return;
        }

        var panelMaxHeight = height - 125;
        var baseLayerPickerDropDown = this._baseLayerPickerDropDown;

        if (defined(baseLayerPickerDropDown)) {
            baseLayerPickerDropDown.style.maxHeight = panelMaxHeight + 'px';
        }

        if (defined(this._infoBox)) {
            this._infoBox.viewModel.maxHeight = panelMaxHeight;
        }

        var timeline = this._timeline;
        var timelineExists = defined(timeline);
        var animationExists = defined(this._animation);
        var animationContainer;
        var resizeWidgets = !animationExists;
        var animationWidth = 0;

        if (animationExists) {
            var lastWidth = this._lastWidth;
            animationContainer = this._animation.container;
            if (width > 900) {
                if (lastWidth <= 900) {
                    animationWidth = 169;
                    animationContainer.style.width = '169px';
                    animationContainer.style.height = '112px';
                    resizeWidgets = true;
                    this._animation.resize();
                }
            } else if (width >= 600) {
                if (lastWidth < 600 || lastWidth > 900) {
                    animationWidth = 136;
                    animationContainer.style.width = '136px';
                    animationContainer.style.height = '90px';
                    resizeWidgets = true;
                    this._animation.resize();
                }
            } else if (lastWidth > 600 || lastWidth === 0) {
                animationWidth = 106;
                animationContainer.style.width = '106px';
                animationContainer.style.height = '70px';
                resizeWidgets = true;
                this._animation.resize();
            }
        }

        if (resizeWidgets) {
            var logoBottom = 0;
            var logoLeft = animationWidth + 5;
            if (timelineExists) {
                var fullscreenButton = this._fullscreenButton;
                var timelineContainer = timeline.container;
                var timelineStyle = timelineContainer.style;

                logoBottom = timelineContainer.clientHeight + 3;
                timelineStyle.left = animationWidth + 'px';

                if (defined(fullscreenButton)) {
                    timelineStyle.right = fullscreenButton.container.clientWidth + 'px';
                }
            }
            if (timelineExists || animationExists) {
                var creditContainer = cesiumWidget.creditContainer;
                creditContainer.style.bottom = logoBottom + 'px';
                creditContainer.style.left = logoLeft + 'px';
            }
        }

        if (timelineExists) {
            timeline.resize();
        }

        this._lastWidth = width;
        this._lastHeight = height;
    };

    /**
     * Renders the scene.  This function is called automatically
     * unless <code>useDefaultRenderLoop</code> is set to false;
     * @memberof Viewer
     */
    Viewer.prototype.render = function() {
        this._cesiumWidget.render();
    };

    /**
     * @memberof Viewer
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    Viewer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof Viewer
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

        this._dataSourceCollection = this._dataSourceCollection.destroy();

        return destroyObject(this);
    };

    return Viewer;
});
