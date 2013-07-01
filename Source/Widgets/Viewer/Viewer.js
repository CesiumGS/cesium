/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/Event',
        '../../Core/EventHelper',
        '../../Core/requestAnimationFrame',
        '../../Core/ScreenSpaceEventType',
        '../../DynamicScene/DataSourceDisplay',
        '../Animation/Animation',
        '../Animation/AnimationViewModel',
        '../BaseLayerPicker/BaseLayerPicker',
        '../BaseLayerPicker/createDefaultBaseLayers',
        '../CesiumWidget/CesiumWidget',
        '../ClockViewModel',
        '../FullscreenButton/FullscreenButton',
        '../getElement',
        '../HomeButton/HomeButton',
        '../SceneModePicker/SceneModePicker',
        '../Timeline/Timeline',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        defaultValue,
        DeveloperError,
        defineProperties,
        destroyObject,
        Event,
        EventHelper,
        requestAnimationFrame,
        ScreenSpaceEventType,
        DataSourceDisplay,
        Animation,
        AnimationViewModel,
        BaseLayerPicker,
        createDefaultBaseLayers,
        CesiumWidget,
        ClockViewModel,
        FullscreenButton,
        getElement,
        HomeButton,
        SceneModePicker,
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
            try {
                if (viewer._useDefaultRenderLoop) {
                    viewer.resize();
                    viewer.render();
                    requestAnimationFrame(render);
                } else {
                    viewer._renderLoopRunning = false;
                }
            } catch (e) {
                viewer._useDefaultRenderLoop = false;
                viewer._renderLoopRunning = false;
                viewer.onRenderLoopError.raiseEvent(viewer, e);
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
     * @param {Boolean} [options.homeButton=true] If set to false, the HomeButton widget will not be created.
     * @param {Boolean} [options.sceneModePicker=true] If set to false, the SceneModePicker widget will not be created.
     * @param {Boolean} [options.timeline=true] If set to false, the Timeline widget will not be created.
     * @param {ImageryProviderViewModel} [options.selectedImageryProviderViewModel] The view model for the current base imagery layer, if not supplied the first available base layer is used.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {Array} [options.imageryProviderViewModels=createDefaultBaseLayers()] The array of ImageryProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if options.baseLayerPicker is set to true.
     * @param {ImageryProvider} [options.imageryProvider=new BingMapsImageryProvider()] The imagery provider to use.  This value is only valid if options.baseLayerPicker is set to false.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider()] The terrain provider to use
     * @param {Element} [options.fullscreenElement=container] The element to make full screen when the full screen button is pressed.
     * @param {Object} [options.useDefaultRenderLoop=true] True if this widget should control the render loop, false otherwise.
     * @param {Object} [options.contextOptions=undefined] Properties corresponding to <a href='http://www.khronos.org/registry/webgl/specs/latest/#5.2'>WebGLContextAttributes</a> used to create the WebGL context.  This object will be passed to the {@link Scene} constructor.
     * @param {SceneMode} [options.sceneMode=SceneMode.SCENE3D] The initial scene mode.
     *
     * @exception {DeveloperError} container is required.
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
     * var viewer = new Viewer('cesiumContainer', {
     *     //Start in Columbus Viewer
     *     sceneMode : SceneMode.COLUMBUS_VIEW,
     *     //Use standard Cesium terrain
     *     terrainProvider : new CesiumTerrainProvider({
     *         url : 'http://cesium.agi.com/smallterrain',
     *         credit : 'Terrain data courtesy Analytical Graphics, Inc.'
     *     }),
     *     //Hide the base layer picker
     *     baseLayerPicker : false,
     *     //Use OpenStreetMaps
     *     selectedImageryProviderViewModel : new ImageryProviderViewModel({
     *         name : 'Open\u00adStreet\u00adMap',
     *         iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
     *         tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable map',
     *         creationFunction : function() {
     *             return new OpenStreetMapImageryProvider({
     *                 url : 'http://tile.openstreetmap.org/'
     *             });
     *         }
     *     })
     * });
     *
     * //Add basic drag and drop functionality
     * viewer.extend(viewerDragDropMixin);
     *
     * //Allow users to zoom and follow objects loaded from CZML by clicking on it.
     * viewer.extend(viewerDynamicObjectMixin);
     *
     * //Show a pop-up alert if we encounter an error when processing a dropped file
     * viewer.onDropError.addEventListener(function(dropHandler, name, error) {
     *     console.log(error);
     *     window.alert(error);
     * });
     */
    var Viewer = function(container, options) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var createBaseLayerPicker = typeof options.baseLayerPicker === 'undefined' || options.baseLayerPicker !== false;

        //If using BaseLayerPicker, imageryProvider is an invalid option
        if (createBaseLayerPicker && typeof options.imageryProvider !== 'undefined') {
            throw new DeveloperError('options.imageryProvider is not available when using the BaseLayerPicker widget. \
Either specify options.selectedImageryProviderViewModel instead or set options.baseLayerPicker to false.');
        }

        //If not using BaseLayerPicker, selectedImageryProviderViewModel is an invalid option
        if (!createBaseLayerPicker && typeof options.selectedImageryProviderViewModel !== 'undefined') {
            throw new DeveloperError('options.selectedImageryProviderViewModel is not available when not using the BaseLayerPicker widget. \
Either specify options.imageryProvider instead or set options.baseLayerPicker to true.');
        }

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
            sceneMode : options.sceneMode,
            contextOptions : options.contextOptions,
            useDefaultRenderLoop : false
        });

        //Data source display
        var dataSourceDisplay = new DataSourceDisplay(cesiumWidget.scene);
        this._dataSourceDisplay = dataSourceDisplay;

        var clock = cesiumWidget.clock;

        this._eventHelper = new EventHelper();

        function updateDataSourceDisplay(clock) {
            dataSourceDisplay.update(clock.currentTime);
        }
        this._eventHelper.add(clock.onTick, updateDataSourceDisplay);

        this._clockViewModel = new ClockViewModel(clock);

        var toolbar = document.createElement('div');
        toolbar.className = 'cesium-viewer-toolbar';
        viewerContainer.appendChild(toolbar);

        //HomeButton
        var homeButton;
        if (typeof options.homeButton === 'undefined' || options.homeButton !== false) {
            var homeButtonContainer = document.createElement('div');
            homeButtonContainer.className = 'cesium-viewer-homeButtonContainer';
            toolbar.appendChild(homeButtonContainer);
            homeButton = new HomeButton(homeButtonContainer, cesiumWidget.scene, cesiumWidget.sceneTransitioner, cesiumWidget.centralBody.getEllipsoid());
        }

        //SceneModePicker
        var sceneModePicker;
        if (typeof options.sceneModePicker === 'undefined' || options.sceneModePicker !== false) {
            var sceneModePickerContainer = document.createElement('div');
            sceneModePickerContainer.className = 'cesium-viewer-sceneModePickerContainer';
            toolbar.appendChild(sceneModePickerContainer);
            sceneModePicker = new SceneModePicker(sceneModePickerContainer, cesiumWidget.sceneTransitioner);
        }

        //BaseLayerPicker
        var baseLayerPicker;
        if (createBaseLayerPicker) {
            var baseLayerPickerContainer = document.createElement('div');
            baseLayerPickerContainer.className = 'cesium-viewer-baseLayerPickerContainer';
            toolbar.appendChild(baseLayerPickerContainer);
            var providerViewModels = defaultValue(options.imageryProviderViewModels, createDefaultBaseLayers());
            baseLayerPicker = new BaseLayerPicker(baseLayerPickerContainer, cesiumWidget.centralBody.getImageryLayers(), providerViewModels);
            baseLayerPicker.viewModel.selectedItem = defaultValue(options.selectedImageryProviderViewModel, providerViewModels[0]);

            //Grab the dropdown for resize code.
            var elements = baseLayerPickerContainer.getElementsByClassName('cesium-baseLayerPicker-dropDown');
            this._baseLayerPickerDropDown = elements[0];
        }

        //Animation
        var animation;
        if (typeof options.animation === 'undefined' || options.animation !== false) {
            var animationContainer = document.createElement('div');
            animationContainer.className = 'cesium-viewer-animationContainer';
            viewerContainer.appendChild(animationContainer);
            animation = new Animation(animationContainer, new AnimationViewModel(this._clockViewModel));
        }

        //Timeline
        var timeline;
        if (typeof options.timeline === 'undefined' || options.timeline !== false) {
            var timelineContainer = document.createElement('div');
            timelineContainer.className = 'cesium-viewer-timelineContainer';
            viewerContainer.appendChild(timelineContainer);
            timeline = new Timeline(timelineContainer, clock);
            timeline.addEventListener('settime', onTimelineScrubfunction, false);
            timeline.zoomTo(clock.startTime, clock.stopTime);
        }

        //Fullscreen
        var fullscreenButton;
        if (typeof options.fullscreenButton === 'undefined' || options.fullscreenButton !== false) {
            var fullscreenContainer = document.createElement('div');
            fullscreenContainer.className = 'cesium-viewer-fullscreenContainer';
            viewerContainer.appendChild(fullscreenContainer);
            fullscreenButton = new FullscreenButton(fullscreenContainer, defaultValue(options.fullscreenElement, container));

            //Subscribe to fullscreenButton.viewModel.isFullscreenEnabled so
            //that we can hide/show the button as well as size the timeline.
            var fullScreenEnabledCallback = function(value) {
                if (value) {
                    fullscreenContainer.style.display = 'block';
                } else {
                    fullscreenContainer.style.display = 'none';
                }
                if (typeof timeline !== 'undefined') {
                    timeline.container.style.right = fullscreenContainer.clientWidth + 'px';
                    timeline.resize();
                }
            };
            this._fullscreenSubscription = knockout.getObservable(fullscreenButton.viewModel, 'isFullscreenEnabled').subscribe(fullScreenEnabledCallback);
            fullScreenEnabledCallback(fullscreenButton.viewModel.isFullscreenEnabled);
        } else if (typeof timeline !== 'undefined') {
            timeline.container.style.right = 0;
        }

        this._container = container;
        this._viewerContainer = viewerContainer;
        this._cesiumWidget = cesiumWidget;
        this._toolbar = toolbar;
        this._homeButton = homeButton;
        this._sceneModePicker = sceneModePicker;
        this._baseLayerPicker = baseLayerPicker;
        this._animation = animation;
        this._timeline = timeline;
        this._fullscreenButton = fullscreenButton;
        this._lastWidth = 0;
        this._lastHeight = 0;
        this._useDefaultRenderLoop = undefined;
        this._renderLoopRunning = false;
        this._onRenderLoopError = new Event();

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
                return this._dataSourceDisplay.getDataSources();
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
        onRenderLoopError : {
            get : function() {
                return this._onRenderLoopError;
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
        if (typeof mixin === 'undefined') {
            throw new DeveloperError('mixin is required.');
        }
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

        var baseLayerPickerDropDown = this._baseLayerPickerDropDown;
        if (typeof baseLayerPickerDropDown !== 'undefined') {
            var baseLayerPickerMaxHeight = height - 125;
            baseLayerPickerDropDown.style.maxHeight = baseLayerPickerMaxHeight + 'px';
        }

        var timelineExists = typeof this._timeline !== 'undefined';
        var animationExists = typeof this._animation !== 'undefined';
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
            var logoLeft = animationWidth;

            if (timelineExists) {
                logoBottom = this._timeline.container.clientHeight + 1;
                this._timeline.container.style.left = animationWidth + 'px';
            }

            if (timelineExists || animationExists) {
                var logo = cesiumWidget.cesiumLogo;
                var logoStyle = logo.style;
                logoStyle.bottom = logoBottom + 'px';
                logoStyle.left = logoLeft + 'px';

                var logoOffset = cesiumWidget.centralBody.logoOffset;
                logoOffset.x = logoLeft + logo.clientWidth + 5;
                logoOffset.y = logoBottom;
            }
        }

        if (timelineExists) {
            this._timeline.resize();
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
        this._container.removeChild(this._viewerContainer);
        this._viewerContainer.removeChild(this._toolbar);

        this._eventHelper.removeAll();

        if (typeof this._homeButton !== 'undefined') {
            this._homeButton = this._homeButton.destroy();
        }

        if (typeof this._sceneModePicker !== 'undefined') {
            this._sceneModePicker = this._sceneModePicker.destroy();
        }

        if (typeof this._baseLayerPicker !== 'undefined') {
            this._baseLayerPicker = this._baseLayerPicker.destroy();
        }

        if (typeof this._animation !== 'undefined') {
            this._viewerContainer.removeChild(this._animation.container);
            this._animation = this._animation.destroy();
        }

        if (typeof this._timeline !== 'undefined') {
            this._timeline.removeEventListener('settime', onTimelineScrubfunction, false);
            this._viewerContainer.removeChild(this._timeline.container);
            this._timeline = this._timeline.destroy();
        }

        if (typeof this._fullscreenButton !== 'undefined') {
            this._fullscreenSubscription.dispose();
            this._viewerContainer.removeChild(this._fullscreenButton.container);
            this._fullscreenButton = this._fullscreenButton.destroy();
        }

        this._clockViewModel = this._clockViewModel.destroy();
        this._dataSourceDisplay = this._dataSourceDisplay.destroy();
        this._cesiumWidget = this._cesiumWidget.destroy();

        return destroyObject(this);
    };

    return Viewer;
});
