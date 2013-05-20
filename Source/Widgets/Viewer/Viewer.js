/*global define*/
define(['../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../Core/ScreenSpaceEventType',
        '../../DynamicScene/CzmlDataSource',
        '../../DynamicScene/DataSourceDisplay',
        '../ClockViewModel',
        '../Animation/Animation',
        '../Animation/AnimationViewModel',
        '../BaseLayerPicker/BaseLayerPicker',
        '../BaseLayerPicker/createDefaultBaseLayers',
        '../CesiumWidget/CesiumWidget',
        '../FullscreenButton/FullscreenButton',
        '../HomeButton/HomeButton',
        '../SceneModePicker/SceneModePicker',
        '../Timeline/Timeline'
        ], function(
                Cartesian2,
                defaultValue,
                DeveloperError,
                destroyObject,
                ScreenSpaceEventType,
                CzmlDataSource,
                DataSourceDisplay,
                ClockViewModel,
                Animation,
                AnimationViewModel,
                BaseLayerPicker,
                createDefaultBaseLayers,
                CesiumWidget,
                FullscreenButton,
                HomeButton,
                SceneModePicker,
                Timeline) {
    "use strict";

    function setLogoOffset(widget, logoOffsetX, logoOffsetY) {
        var logoOffset = widget.centralBody.logoOffset;
        if ((logoOffsetX !== logoOffset.x) || (logoOffsetY !== logoOffset.y)) {
            widget.centralBody.logoOffset = new Cartesian2(logoOffsetX, logoOffsetY);
        }
    }

    function onTimelineScrubfunction(e) {
        var clock = e.clock;
        clock.currentTime = e.timeJulian;
        clock.shouldAnimate = false;
    }

    /**
     * A base widget for building applications.  It composites all of the standard Cesium widgets into one reusable package.
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
     * @param {Array} [options.imageryProviderViewModels=createDefaultBaseLayers()] The array of ImageryProviderViewModels to be selectable from the BaseLyerPicker.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider()] The terrain provider to use
     * @param {Element} [options.fullscreenElement=container] The element to make full screen when the full screen button is pressed.
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
     */
    var Viewer = function(container, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof container === 'string') {
            var tmp = document.getElementById(container);
            if (tmp === null) {
                throw new DeveloperError('Element with id "' + container + '" does not exist in the document.');
            }
            container = tmp;
        }

        //Cesium widget
        var cesiumWidgetContainer = document.createElement('div');
        cesiumWidgetContainer.className = 'cesium-viewer-node';
        container.appendChild(cesiumWidgetContainer);
        var cesiumWidget = new CesiumWidget(cesiumWidgetContainer, {
            terrainProvider : options.terrainProvider,
            sceneMode : options.sceneMode
        });

        //Subscribe for resize events and set the initial size.
        this._resizeCallback = function() {
            setLogoOffset(cesiumWidget, cesiumWidget.cesiumLogo.offsetWidth + cesiumWidget.cesiumLogo.offsetLeft + 10, 28);
        };
        window.addEventListener('resize', this._resizeCallback, false);
        this._resizeCallback();

        var clock = cesiumWidget.clock;

        //Data source display
        var dataSourceDisplay = new DataSourceDisplay(cesiumWidget.scene);
        this._dataSourceDisplay = dataSourceDisplay;
        cesiumWidget.clock.onTick.addEventListener(this._onTick, this);

        var toolbar = document.createElement('div');
        this._toolbar = toolbar;
        toolbar.className = 'cesium-viewer-toolbar';
        container.appendChild(toolbar);

        //HomeButton
        var homeButton;
        if (typeof options.homeButton === 'undefined' || options.homeButton !== false) {
            var homeButtonContainer = document.createElement('div');
            homeButtonContainer.className = 'cesium-viewer-homeButtonContainer';
            toolbar.appendChild(homeButtonContainer);
            homeButton = new HomeButton(homeButtonContainer, cesiumWidget.scene, cesiumWidget.transitioner, cesiumWidget.centralBody.ellipsoid);
        }

        //SceneModePicker
        var sceneModePicker;
        if (typeof options.sceneModePicker === 'undefined' || options.sceneModePicker !== false) {
            var sceneModePickerContainer = document.createElement('div');
            sceneModePickerContainer.className = 'cesium-viewer-sceneModePickerContainer';
            toolbar.appendChild(sceneModePickerContainer);
            sceneModePicker = new SceneModePicker(sceneModePickerContainer, cesiumWidget.transitioner);
        }

        //BaseLayerPicker
        var baseLayerPicker;
        if (typeof options.baseLayerPicker === 'undefined' || options.baseLayerPicker !== false) {
            var baseLayerPickerContainer = document.createElement('div');
            baseLayerPickerContainer.className = 'cesium-viewer-baseLayerPickerContainer';
            toolbar.appendChild(baseLayerPickerContainer);
            var providerViewModels = defaultValue(options.imageryProviderViewModels, createDefaultBaseLayers());
            baseLayerPicker = new BaseLayerPicker(baseLayerPickerContainer, cesiumWidget.centralBody.getImageryLayers(), providerViewModels);
            baseLayerPicker.viewModel.selectedItem(defaultValue(options.selectedImageryProviderViewModel, providerViewModels[0]));
        }

        //Animation
        var animation;
        if (typeof options.animation === 'undefined' || options.animation !== false) {
            var clockViewModel = new ClockViewModel(clock);
            var animationContainer = document.createElement('div');
            animationContainer.className = 'cesium-viewer-animationContainer';
            container.appendChild(animationContainer);
            animation = new Animation(animationContainer, new AnimationViewModel(clockViewModel));
        }

        //Timeline
        var timeline;
        if (typeof options.timeline === 'undefined' || options.timeline !== false) {
            var timelineContainer = document.createElement('div');
            timelineContainer.className = 'cesium-viewer-timelineContainer';
            container.appendChild(timelineContainer);
            timeline = new Timeline(timelineContainer, clock);
            timeline.addEventListener('settime', onTimelineScrubfunction, false);
            timeline.zoomTo(clock.startTime, clock.stopTime);
        }

        //Fullscreen
        var fullscreenButton;
        if (typeof options.fullscreenButton === 'undefined' || options.fullscreenButton !== false) {
            var fullscreenContainer = document.createElement('div');
            fullscreenContainer.className = 'cesium-viewer-fullscreenContainer';
            container.appendChild(fullscreenContainer);
            fullscreenButton = new FullscreenButton(fullscreenContainer, defaultValue(options.fullscreenElement, container));
        }

        //Drag and drop
        this._handleDrop = undefined;
        this._dropContainer = undefined;

        /**
         * Gets the container element for the widget.
         * @memberof Viewer
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the CesiumWidget instance.
         * @memberof Viewer
         * @type {CesiumWidget}
         */
        this.cesiumWidget = cesiumWidget;

        /**
         * Gets the HomeButton instance.
         * @memberof Viewer
         * @type {HomeButton}
         */
        this.homeButton = homeButton;

        /**
         * Gets the SceneModePicker instance.
         * @memberof Viewer
         * @type {SceneModePicker}
         */
        this.sceneModePicker = sceneModePicker;

        /**
         * Gets the BaseLayerPicker instance.
         * @memberof Viewer
         * @type {BaseLayerPicker}
         */
        this.baseLayerPicker = baseLayerPicker;

        /**
         * Gets the Animation widget instance.
         * @memberof Viewer
         * @type {Animation}
         */
        this.animation = animation;

        /**
         * Gets the Timeline widget instance.
         * @memberof Viewer
         * @type {Timeline}
         */
        this.timeline = timeline;

        /**
         * Gets the FullscreenButton instance.
         * @memberof Viewer
         * @type {FullscreenButton}
         */
        this.fullscreenButton = fullscreenButton;

        /**
         * Gets the set of {@link DataSource} instances to be visualized.
         * @memberof Viewer
         * @type {DataSourceCollection}
         */
        this.dataSources = dataSourceDisplay.getDataSources();
    };

    function createOnLoadCallback(viewer, source, errorCallback, firstTime) {
        return function(evt) {
            var czmlSource = new CzmlDataSource();
            try {
                czmlSource.load(JSON.parse(evt.target.result), source);
                viewer.dataSources.add(czmlSource);
                if (firstTime) {
                    var dataClock = czmlSource.getClock();
                    if (typeof dataClock !== 'undefined') {
                        dataClock.clone(viewer.cesiumWidget.clock);
                        viewer.timeline.zoomTo(dataClock.startTime, dataClock.stopTime);
                    }
                }
            } catch (error) {
                if (typeof errorCallback !== 'undefined') {
                    errorCallback(viewer, source, error);
                }
            }
        };
    }

    function createOnErrorCallback(viewer, source, errorCallback) {
        return function(evt) {
            errorCallback(viewer, source, evt.target.error);
        };
    }

    /**
     * Processes the browser generated drop event.  This method will load any dropped CZML files
     * onto the globe.  If dropping multiple files, the clock configuration of the first file is used.
     * @memberof Viewer
     *
     * @param {MouseEvent} event The browser generated drop event.
     * @param {Function} [errorCallback] A function to be called when any errors are encountered.  It takes three parameters, the widget, the filename, and the error object.
     *
     * @exception {DeveloperError} event is required.
     *
     * @example
     * //Implement drag and drop support for the widget container.
     * function stop(event) {
     *  event.stopPropagation();
     *  event.preventDefault();
     * }
     *
     * var container = viewer.container;
     * container.addEventListener('drop', function(event) {
     *   stop(event);
     *   widget.handleDrop(event);
     * }, false);
     * container.addEventListener('dragenter', stop, false);
     * container.addEventListener('dragover', stop, false);
     * container.addEventListener('dragexit', stop, false);
     */
    Viewer.prototype.handleDrop = function(event, errorCallback) {
        if (typeof event === 'undefined') {
            throw new DeveloperError('event is required.');
        }

        var dataSources = this.dataSources;
        dataSources.removeAll();

        var files = event.dataTransfer.files;
        var length = files.length;
        for ( var i = 0; i < length; i++) {
            var f = files[i];
            var reader = new FileReader();
            reader.onload = createOnLoadCallback(this, f.name, errorCallback, i === 0);
            reader.onerror = typeof errorCallback !== 'undefined' ? createOnErrorCallback(this, f.name, errorCallback) : undefined;
            reader.readAsText(f);
        }
    };

    function stop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    /**
     * Enables default drag and drop behavior for loading data into the widget.
     * @memberof Viewer
     *
     * @param [container=this.container] The container to serve as the drop target.
     * @param {Function} [errorCallback] A function to be called when any errors are encountered.  It takes three parameters, the widget, the filename, and the error object.
     */
    Viewer.prototype.enableDragAndDrop = function(container, errorCallback) {
        this.disableDragAndDrop();

        var that = this;
        this._handleDrop = function(event) {
            stop(event);
            that.handleDrop(event, errorCallback);
        };

        container = defaultValue(container, this.container);
        container.addEventListener('drop', this._handleDrop, false);
        container.addEventListener('dragenter', stop, false);
        container.addEventListener('dragover', stop, false);
        container.addEventListener('dragexit', stop, false);
        this._dropContainer = container;
    };

    /**
     * Disables default drag and drop behavior previously enabled by a call to enableDragAndDrop.
     * If drag and drop is not enabled, this method does nothing.
     * @memberof Viewer
     */
    Viewer.prototype.disableDragAndDrop = function() {
        var currentContainer = this._dropContainer;
        if (typeof currentContainer !== 'undefined') {
            currentContainer.removeEventListener('drop', this._handleDrop, false);
            currentContainer.removeEventListener('dragenter', stop, false);
            currentContainer.removeEventListener('dragover', stop, false);
            currentContainer.removeEventListener('dragexit', stop, false);
            this._dropContainer = undefined;
        }
    };

    /**
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof Viewer
     */
    Viewer.prototype.destroy = function() {
        this.disableDragAndDrop();
        this.container.removeChild(this._toolbar);

        if (typeof this.homeButton !== 'undefined') {
            this.homeButton = this.homeButton.destroy();
        }

        if (typeof this.sceneModePicker !== 'undefined') {
            this.sceneModePicker = this.sceneModePicker.destroy();
        }

        if (typeof this.baseLayerPicker !== 'undefined') {
            this.baseLayerPicker = this.baseLayerPicker.destroy();
        }

        if (typeof this.animation !== 'undefined') {
            this.container.removeChild(this.animation.container);
            this.animation = this.animation.destroy();
        }

        if (typeof this.timeline !== 'undefined') {
            this.timeline.removeEventListener('settime', onTimelineScrubfunction, false);
            this.container.removeChild(this.timeline.container);
            this.timeline = this.timeline.destroy();
        }

        if (typeof this.fullscreenButton !== 'undefined') {
            this.container.removeChild(this.fullscreenButton.container);
            this.fullscreenButton = this.fullscreenButton.destroy();
        }

        this.cesiumWidget.clock.onTick.removeEventListener(this._onTick, this);
        this.cesiumWidget = this.cesiumWidget.destroy();
        this._dataSourceDisplay = this._dataSourceDisplay.destroy();
        return destroyObject(this);
    };

    Viewer.prototype._onTick = function(clock) {
        var currentTime = clock.currentTime;
        this._dataSourceDisplay.update(currentTime);
    };

    return Viewer;
});