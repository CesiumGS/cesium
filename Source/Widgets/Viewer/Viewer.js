/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
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
        '../Timeline/Timeline'
    ], function(
        Cartesian2,
        defaultValue,
        DeveloperError,
        defineProperties,
        destroyObject,
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
     * @param {Object} [options] Configuration options for the widget.
     * @param {Boolean} [options.animation=true] If set to false, the Animation widget will not be created.
     * @param {Boolean} [options.baselayerPicker=true] If set to false, the BaseLayerPicker widget will not be created.
     * @param {Boolean} [options.fullscreenButton=true] If set to false, the FullscreenButton widget will not be created.
     * @param {Boolean} [options.homeButton=true] If set to false, the HomeButton widget will not be created.
     * @param {Boolean} [options.sceneModePicker=true] If set to false, the SceneModePicker widget will not be created.
     * @param {Boolean} [options.timeline=true] If set to false, the Timeline widget will not be created.
     * @param {ImageryProviderViewModel} [options.selectedImageryProviderViewModel] The view model for the current base imagery layer, it not supplied the first available base layer is used.
     * @param {Array} [options.imageryProviderViewModels=createDefaultBaseLayers()] The array of ImageryProviderViewModels to be selectable from the BaseLayerPicker.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider()] The terrain provider to use
     * @param {Element} [options.fullscreenElement=container] The element to make full screen when the full screen button is pressed.
     * @param {Object} [options.contextOptions=undefined] Properties corresponding to <a href='http://www.khronos.org/registry/webgl/specs/latest/#5.2'>WebGLContextAttributes</a> used to create the WebGL context.  This object will be passed to the {@link Scene} constructor.
     * @param {SceneMode} [options.sceneMode=SceneMode.SCENE3D] The initial scene mode.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
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
     *     baselayerPicker : false,
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

        var viewerContainer = document.createElement('div');
        viewerContainer.className = 'cesium-viewer';
        container.appendChild(viewerContainer);

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var createBaseLayerPicker = typeof options.baseLayerPicker === 'undefined' || options.baseLayerPicker !== false;
        var imageryProvider;
        if (createBaseLayerPicker) {
            // BaseLayerPicker will add the base layer later
            imageryProvider = false;
        }

        //Cesium widget
        var cesiumWidgetContainer = document.createElement('div');
        cesiumWidgetContainer.className = 'cesium-viewer-cesiumWidgetContainer';
        viewerContainer.appendChild(cesiumWidgetContainer);
        var cesiumWidget = new CesiumWidget(cesiumWidgetContainer, {
            terrainProvider : options.terrainProvider,
            imageryProvider : imageryProvider,
            sceneMode : options.sceneMode,
            contextOptions : options.contextOptions
        });

        //Subscribe for resize events and set the initial size.
        var that = this;
        this._needResize = true;
        this._resizeCallback = function() {
            that._needResize = true;
        };
        window.addEventListener('resize', this._resizeCallback, false);

        var clock = cesiumWidget.clock;

        //Data source display
        var dataSourceDisplay = new DataSourceDisplay(cesiumWidget.scene);
        this._dataSourceDisplay = dataSourceDisplay;
        clock.onTick.addEventListener(this._onTick, this);

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
            var clockViewModel = new ClockViewModel(clock);
            var animationContainer = document.createElement('div');
            animationContainer.className = 'cesium-viewer-animationContainer';
            viewerContainer.appendChild(animationContainer);
            animation = new Animation(animationContainer, new AnimationViewModel(clockViewModel));
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
        }
    });

    /**
     * @memberof Viewer
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    Viewer.prototype.isDestroyed = function() {
        return false;
    };

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
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof Viewer
     */
    Viewer.prototype.destroy = function() {
        this._container.removeChild(this._viewerContainer);
        this._viewerContainer.removeChild(this._toolbar);

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
            this._viewerContainer.removeChild(this._fullscreenButton.container);
            this._fullscreenButton = this._fullscreenButton.destroy();
        }

        this._cesiumWidget.clock.onTick.removeEventListener(this._onTick, this);
        this._cesiumWidget = this._cesiumWidget.destroy();
        this._dataSourceDisplay = this._dataSourceDisplay.destroy();
        return destroyObject(this);
    };

    Viewer.prototype._onTick = function(clock) {
        if (this._needResize) {
            this._needResize = false;

            var cesiumWidget = this._cesiumWidget;
            var widgetWidth = cesiumWidget.canvas.clientWidth;

            var timelineExists = typeof this._timeline !== 'undefined';
            var animationExists = typeof this._animation !== 'undefined';
            var animationContainer;

            var animationWidth = 0;
            if (animationExists) {
                animationContainer = this._animation.container;

                if (widgetWidth > 900) {
                    animationWidth = 169;
                    animationContainer.style.width = '169px';
                    animationContainer.style.height = '112px';
                } else if (widgetWidth >= 600) {
                    animationWidth = 136;
                    animationContainer.style.width = '136px';
                    animationContainer.style.height = '90px';
                } else {
                    animationWidth = 106;
                    animationContainer.style.width = '106px';
                    animationContainer.style.height = '70px';
                }
                this._animation._resizeCallback();
            }

            var logoBottom = timelineExists ? 28 : 0;
            var logoLeft = animationExists ? animationWidth : 0;

            var logo = cesiumWidget.cesiumLogo;
            var logoStyle = logo.style;
            logoStyle.bottom = logoBottom + 'px';
            logoStyle.left = logoLeft + 'px';

            var logoOffset = cesiumWidget.centralBody.logoOffset;
            logoOffset.x = logoLeft + 123;
            logoOffset.y = logoBottom;

            if (timelineExists) {
                this._timeline.container.style.left = animationExists ? animationWidth + 'px' : 0;
            }

            var baseLayerPickerDropDown = this._baseLayerPickerDropDown;
            if (typeof baseLayerPickerDropDown !== 'undefined') {
                var baseLayerPickerMaxHeight = cesiumWidget.canvas.height - 100;
                baseLayerPickerDropDown.style.maxHeight = baseLayerPickerMaxHeight + 'px';
            }
        }

        var currentTime = clock.currentTime;
        this._dataSourceDisplay.update(currentTime);
    };

    return Viewer;
});