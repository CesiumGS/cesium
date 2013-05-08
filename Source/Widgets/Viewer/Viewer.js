/*global define*/
define(['./viewHome',
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../DynamicScene/DataSourceDisplay',
        '../ClockViewModel',
        '../Animation/Animation',
        '../Animation/AnimationViewModel',
        '../BaseLayerPicker/BaseLayerPicker',
        '../BaseLayerPicker/createDefaultBaseLayers',
        '../CesiumWidget/CesiumWidget',
        '../Fullscreen/FullscreenWidget',
        '../SceneModePicker/SceneModePicker',
        '../Timeline/Timeline'
        ], function(
                viewHome,
                Cartesian2,
                defaultValue,
                DeveloperError,
                destroyObject,
                DataSourceDisplay,
                ClockViewModel,
                Animation,
                AnimationViewModel,
                BaseLayerPicker,
                createDefaultBaseLayers,
                CesiumWidget,
                FullscreenWidget,
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
     * A simple viewer.
     *
     * @alias Viewer
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
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
        var cesiumWidget = new CesiumWidget(cesiumWidgetContainer);

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
        toolbar.className = 'cesium-viewer-viewButtons';
        container.appendChild(toolbar);

        //View home
        var homeButton;
        if (typeof options.homeButton === 'undefined' || options.homeButton !== false) {
            homeButton = document.createElement('div');
            homeButton.className = 'cesium-viewer-home';
            toolbar.appendChild(homeButton);
            var camera3D = cesiumWidget.scene.getCamera().clone();
            homeButton.addEventListener('click', function() {
                viewHome(cesiumWidget.scene, cesiumWidget.transitioner, cesiumWidget.canvas, cesiumWidget.centralBody.getEllipsoid(), camera3D);
            });
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
            var providerViewModels = createDefaultBaseLayers();
            baseLayerPicker = new BaseLayerPicker(baseLayerPickerContainer, cesiumWidget.centralBody.getImageryLayers(), providerViewModels);
            baseLayerPicker.viewModel.selectedItem(providerViewModels[0]);
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
        var fullscreenWidget;
        if (typeof options.fullscreenWidget === 'undefined' || options.fullscreenWidget !== false) {
            var fullscreenContainer = document.createElement('div');
            fullscreenContainer.className = 'cesium-viewer-fullscreenContainer';
            container.appendChild(fullscreenContainer);
            fullscreenWidget = new FullscreenWidget(fullscreenContainer, container);
        }

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
         * Gets the FullscreenWidget instance.
         * @memberof Viewer
         * @type {FullscreenWidget}
         */
        this.fullscreenWidget = fullscreenWidget;

        /**
         * Gets the set of {@link DataSource} instances to be visualized.
         * @memberof Viewer
         * @type {DataSourceCollection}
         */
        this.dataSources = dataSourceDisplay.getDataSources();
    };

    Viewer.prototype._onTick = function(clock) {
        this._dataSourceDisplay.update(clock.currentTime);
    };

    /**
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof Viewer
     */
    Viewer.prototype.destroy = function() {
        this.container.removeChild(this._toolbar);

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

        if (typeof this.fullscreenWidget !== 'undefined') {
            this.container.removeChild(this.fullscreenWidget.container);
            this.fullscreenWidget = this.fullscreenWidget.destroy();
        }

        this.cesiumWidget.clock.onTick.removeEventListener(this._onTick, this);
        this.cesiumWidget = this.cesiumWidget.destroy();
        this._dataSourceDisplay = this._dataSourceDisplay.destroy();
        return destroyObject(this);
    };

    return Viewer;
});