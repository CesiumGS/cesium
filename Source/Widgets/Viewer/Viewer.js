/*global define*/
define(['./viewHome',
        '../../Core/Cartesian2',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
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
                DeveloperError,
                destroyObject,
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
    var Viewer = function(container) {
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

        //Animation
        var clockViewModel = new ClockViewModel(clock);
        var animationContainer = document.createElement('div');
        animationContainer.className = 'cesium-viewer-animationContainer';
        container.appendChild(animationContainer);
        var animationWidget = new Animation(animationContainer, new AnimationViewModel(clockViewModel));

        //Timeline
        var timelineContainer = document.createElement('div');
        timelineContainer.className = 'cesium-viewer-timelineContainer';
        container.appendChild(timelineContainer);
        var timelineWidget = new Timeline(timelineContainer, clock);

        function onTimelineScrub(e) {
            clock.currentTime = e.timeJulian;
            clock.shouldAnimate = false;
        }
        timelineWidget.addEventListener('settime', onTimelineScrub, false);
        timelineWidget.zoomTo(clock.startTime, clock.stopTime);

        //Fullscreen
        var fullscreenContainer = document.createElement('div');
        fullscreenContainer.className = 'cesium-viewer-fullscreenContainer';
        container.appendChild(fullscreenContainer);
        var fullscreenWidget = new FullscreenWidget(fullscreenContainer, container);

        var toolbar = document.createElement('div');
        toolbar.className = 'cesium-viewer-viewButtons';
        container.appendChild(toolbar);

        //View home
        var homeButton = document.createElement('div');
        homeButton.className = 'cesium-viewer-home';
        toolbar.appendChild(homeButton);
        var camera3D = cesiumWidget.scene.getCamera().clone();
        homeButton.addEventListener('click', function() {
            viewHome(cesiumWidget.scene, cesiumWidget.transitioner, cesiumWidget.canvas, cesiumWidget.centralBody.getEllipsoid(), camera3D);
        });

        //SceneModePicker
        var sceneModePickerContainer = document.createElement('div');
        sceneModePickerContainer.className = 'cesium-viewer-sceneModePickerContainer';
        toolbar.appendChild(sceneModePickerContainer);
        var sceneModePicker = new SceneModePicker(sceneModePickerContainer, cesiumWidget.transitioner);

        //BaseLayerPicker
        var baseLayerPickerContainer = document.createElement('div');
        baseLayerPickerContainer.className = 'cesium-viewer-baseLayerPickerContainer';
        toolbar.appendChild(baseLayerPickerContainer);
        var providerViewModels = createDefaultBaseLayers();
        var baseLayerPicker = new BaseLayerPicker(baseLayerPickerContainer, cesiumWidget.centralBody.getImageryLayers(), providerViewModels);
        baseLayerPicker.viewModel.selectedItem(providerViewModels[0]);

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
         * Gets the Animation widget instance.
         * @memberof Viewer
         * @type {Animation}
         */
        this.animationWidget = animationWidget;

        /**
         * Gets the Timeline widget instance.
         * @memberof Viewer
         * @type {Timeline}
         */
        this.timelineWidget = timelineWidget;

        /**
         * Gets the SceneModePicker instance.
         * @memberof Viewer
         * @type {SceneModePicker}
         */
        this.sceneModePicker = sceneModePicker;

        /**
         * Gets the FullscreenWidget instance.
         * @memberof Viewer
         * @type {FullscreenWidget}
         */
        this.fullscreenWidget = fullscreenWidget;

        /**
         * Gets the BaseLayerPicker instance.
         * @memberof Viewer
         * @type {BaseLayerPicker}
         */
        this.baseLayerPicker = baseLayerPicker;
    };

    /**
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof Viewer
     */
    Viewer.prototype.destroy = function() {
        this.cesiumWidget = this.cesiumWidget.destroy();
        this.animationWidget = this.animationWidget.destroy();
        this.timelineWidget = this.timelineWidget.destroy();
        this.sceneModePicker = this.sceneModePicker.destroy();
        this.fullscreenWidget = this.fullscreenWidget.destroy();
        return destroyObject(this);
    };

    return Viewer;
});