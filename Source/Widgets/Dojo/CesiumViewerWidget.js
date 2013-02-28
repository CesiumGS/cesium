/*global define,console*/
define([
        'require',
        'dojo/_base/declare',
        'dojo/ready',
        'dojo/_base/lang',
        'dojo/_base/event',
        'dojo/dom-style',
        'dojo/on',
        'dijit/_WidgetBase',
        'dijit/_TemplatedMixin',
        'dijit/_WidgetsInTemplateMixin',
        'dijit/form/Button',
        'dijit/form/ToggleButton',
        'dijit/form/DropDownButton',
        'dijit/TooltipDialog',
        '../Timeline/Timeline',
        '../Animation/Animation',
        '../Animation/AnimationViewModel',
        '../Fullscreen/FullscreenWidget',
        '../ClockViewModel',
        '../../Core/defaultValue',
        '../../Core/loadJson',
        '../../Core/binarySearch',
        '../../Core/BoundingRectangle',
        '../../Core/Clock',
        '../../Core/ClockStep',
        '../../Core/ClockRange',
        '../../Core/Extent',
        '../../Core/Ellipsoid',
        '../../Core/Iso8601',
        '../../Core/computeSunPosition',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/FeatureDetection',
        '../../Core/ScreenSpaceEventType',
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/JulianDate',
        '../../Core/DefaultProxy',
        '../../Core/Transforms',
        '../../Core/requestAnimationFrame',
        '../../Core/Color',
        '../../Core/Matrix4',
        '../../Core/Math',
        '../../Scene/PerspectiveFrustum',
        '../../Scene/Material',
        '../../Scene/Scene',
        '../../Scene/CameraColumbusViewMode',
        '../../Scene/CentralBody',
        '../../Scene/BingMapsImageryProvider',
        '../../Scene/BingMapsStyle',
        '../../Scene/SceneTransitioner',
        '../../Scene/SingleTileImageryProvider',
        '../../Scene/PerformanceDisplay',
        '../../Scene/SceneMode',
        '../../Scene/SkyBox',
        '../../Scene/SkyAtmosphere',
        '../../DynamicScene/processCzml',
        '../../DynamicScene/DynamicObjectView',
        '../../DynamicScene/DynamicObjectCollection',
        '../../DynamicScene/VisualizerCollection',
        'dojo/text!./CesiumViewerWidget.html'
    ], function (
        require,
        declare,
        ready,
        lang,
        event,
        domStyle,
        on,
        _WidgetBase,
        _TemplatedMixin,
        _WidgetsInTemplateMixin,
        Button,
        ToggleButton,
        DropDownButton,
        TooltipDialog,
        Timeline,
        Animation,
        AnimationViewModel,
        FullscreenWidget,
        ClockViewModel,
        defaultValue,
        loadJson,
        binarySearch,
        BoundingRectangle,
        Clock,
        ClockStep,
        ClockRange,
        Extent,
        Ellipsoid,
        Iso8601,
        computeSunPosition,
        ScreenSpaceEventHandler,
        FeatureDetection,
        ScreenSpaceEventType,
        Cartesian2,
        Cartesian3,
        JulianDate,
        DefaultProxy,
        Transforms,
        requestAnimationFrame,
        Color,
        Matrix4,
        CesiumMath,
        PerspectiveFrustum,
        Material,
        Scene,
        CameraColumbusViewMode,
        CentralBody,
        BingMapsImageryProvider,
        BingMapsStyle,
        SceneTransitioner,
        SingleTileImageryProvider,
        PerformanceDisplay,
        SceneMode,
        SkyBox,
        SkyAtmosphere,
        processCzml,
        DynamicObjectView,
        DynamicObjectCollection,
        VisualizerCollection,
        template) {
    "use strict";

    /**
     * This Dojo widget wraps the full functionality of Cesium Viewer.
     *
     * @class CesiumViewerWidget
     * @param {Object} options - A list of options to pre-configure the widget.  Names matching member fields/functions will override the default values.
     */
    return declare('Cesium.CesiumViewerWidget', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
    /** @lends CesiumViewerWidget */
    {
        // for Dojo use only
        templateString : template,

        /**
         * Enable streaming Imagery.  This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see CesiumViewerWidget#enableStreamingImagery
         */
        useStreamingImagery : true,
        /**
         * The map style for streaming imagery.  This is read-only after construction.
         *
         * @type {BingMapsStyle}
         * @memberof CesiumViewerWidget.prototype
         * @default {@link BingMapsStyle.AERIAL}
         * @see CesiumViewerWidget#setStreamingImageryMapStyle
         */
        mapStyle : BingMapsStyle.AERIAL,
        /**
         * The URL for a daytime image on the globe.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        dayImageUrl : undefined,
        /**
         * The base URL for the sky box.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        skyBoxBaseUrl : undefined,
        /**
         * Determines if a sky box with stars is drawn around the globe.  This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see SkyBox
         */
        showSkyBox : true,
        /**
         * An object containing settings supplied by the end user, typically from the query string
         * of the URL of the page with the widget.
         *
         * @type {Object}
         * @memberof CesiumViewerWidget.prototype
         * @example
         * var ioQuery = require('dojo/io-query');
         * var endUserOptions = {};
         * if (window.location.search) {
         *     endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
         * }
         *
         * @example
         * var endUserOptions = {
         *     'source' : 'file.czml', // The relative URL of the CZML file to load at startup.
         *     'lookAt' : '123abc',    // The CZML ID of the object to track at startup.
         *     'theme'  : 'light',     // Use the dark-text-on-light-background theme.
         *     'loop'   : 0,           // Disable looping at end time, pause there instead.
         *     'stats'  : 1,           // Enable the FPS performance display.
         *     'debug'  : 1,           // Full WebGL error reporting at substantial performance cost.
         * };
         */
        endUserOptions : {},
        /**
         * Check for WebGL errors after every WebGL API call.  Enabling this debugging feature
         * comes at a substantial performance cost, halting and restarting the graphics
         * pipeline hundreds of times per frame.  But it can uncover problems that are otherwise
         * very difficult to diagnose.
         * This property is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default false
         */
        enableWebGLDebugging: false,
        /**
         * Allow the user to drag-and-drop CZML files into this widget.
         * This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default false
         */
        enableDragDrop: false,
        /**
         * Register this widget's resize handler to get called every time the browser window
         * resize event fires.  This is read-only after construction.  Generally this should
         * be true for full-screen widgets, and true for
         * fluid layouts where the widget is likely to change size at the same time as the
         * window.  The exception is, if you use a Dojo layout where this widget exists inside
         * a Dojo ContentPane or similar, you should set this to false, because Dojo will perform
         * its own layout calculations and call this widget's resize handler automatically.
         * This can also be false for a fixed-size widget.
         *
         * If unsure, test the widget with this set to false, and if window resizes cause the
         * globe to stretch, change this to true.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see CesiumViewerWidget#resize
         */
        resizeWidgetOnWindowResize: true,

        /**
         * The fullscreen widget, configured to put only the viewer widget
         * into fullscreen mode by default.
         *
         * @type {FullscreenWidget}
         * @memberof CesiumViewerWidget.prototype
         */
        fullscreen: undefined,

        /**
         * The animation widget.
         *
         * @type {Animation}
         * @memberof CesiumViewerWidget.prototype
         */
        animation: undefined,

        /**
         * The timeline widget.
         *
         * @type {Timeline}
         * @memberof CesiumViewerWidget.prototype
         */
        timeline: undefined,

        // for Dojo use only
        constructor : function() {
            this.ellipsoid = Ellipsoid.WGS84;
        },

        /**
         * This function will get a callback in the event of setup failure, likely indicating
         * a problem with WebGL support or the availability of a GL context.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} widget - A reference to this widget
         * @param {Object} error - The exception that was thrown during setup
         */
        onSetupError : function(widget, error) {
            console.error(error);
        },

        /**
         * This function must be called when the widget changes size.  It updates the canvas
         * size, camera aspect ratio, and viewport size.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see CesiumViewerWidget#resizeWidgetOnWindowResize
         */
        resize : function() {
            var width = this.canvas.clientWidth, height = this.canvas.clientHeight;

            if (typeof this.scene === 'undefined' || (this.canvas.width === width && this.canvas.height === height)) {
                return;
            }

            this.canvas.width = width;
            this.canvas.height = height;

            var frustum = this.scene.getCamera().frustum;
            if (typeof frustum.aspectRatio !== 'undefined') {
                frustum.aspectRatio = width / height;
            } else {
                frustum.top = frustum.right * (height / width);
                frustum.bottom = -frustum.top;
            }

            this.setLogoOffset(this.cesiumLogo.offsetWidth + this.cesiumLogo.offsetLeft + 10, 28);
        },

        /**
         * Have the camera track a particular object based on the result of a pick.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to track, or <code>undefined</code> to stop tracking.
         */
        centerCameraOnPick : function(selectedObject) {
            this.centerCameraOnObject(typeof selectedObject !== 'undefined' ? selectedObject.dynamicObject : undefined);
        },

        _viewFromTo : undefined,

        /**
         * Have the camera track a particular object.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to track, or <code>undefined</code> to stop tracking.
         */
        centerCameraOnObject : function(selectedObject) {
            if (typeof selectedObject !== 'undefined' && typeof selectedObject.position !== 'undefined') {
                var viewFromTo = this._viewFromTo;
                if (typeof viewFromTo === 'undefined') {
                    this._viewFromTo = viewFromTo = new DynamicObjectView(selectedObject, this.scene, this.ellipsoid);
                } else {
                    viewFromTo.dynamicObject = selectedObject;
                }
            } else {
                this._viewFromTo = undefined;
            }
        },

        /**
         * Override this function to be notified when an object is selected (left-click).
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectSelected : undefined,
        /**
         * Override this function to be notified when an object is right-clicked.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectRightClickSelected : undefined,
        /**
         * Override this function to be notified when an object is left-double-clicked.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectLeftDoubleClickSelected : undefined,
        /**
         * Override this function to be notified when an object hovered by the mouse.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was hovered, or <code>undefined</code> if the mouse moved off.
         */
        onObjectMousedOver : undefined,
        /**
         * Override this function to be notified when the left mouse button is pressed down.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onLeftMouseDown : undefined,
        /**
         * Override this function to be notified when the left mouse button is released.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onLeftMouseUp : undefined,
        /**
         * Override this function to be notified when the right mouse button is pressed down.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onRightMouseDown : undefined,
        /**
         * Override this function to be notified when the right mouse button is released.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onRightMouseUp : undefined,
        /**
         * Override this function to be notified when the left mouse button is dragged.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the start and end position of the mouse.
         */
        onLeftDrag : undefined,
        /**
         * Override this function to be notified when the right mouse button is dragged or mouse wheel is zoomed.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the start and end position of the mouse.
         */
        onZoom : undefined,

        _camera3D : undefined,

        _handleLeftClick : function(e) {
            if (typeof this.onObjectSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectSelected(this.selectedObject);
            }
        },

        _handleRightClick : function(e) {
            if (typeof this.onObjectRightClickSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectRightClickSelected(this.selectedObject);
            }
        },

        _handleLeftDoubleClick : function(e) {
            if (typeof this.onObjectLeftDoubleClickSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectLeftDoubleClickSelected(this.selectedObject);
            }
        },

        _handleMouseMove : function(movement) {
            if (typeof this.onObjectMousedOver !== 'undefined') {
                // Don't fire multiple times for the same object as the mouse travels around the screen.
                var mousedOverObject = this.scene.pick(movement.endPosition);
                if (this.mousedOverObject !== mousedOverObject) {
                    this.mousedOverObject = mousedOverObject;
                    this.onObjectMousedOver(mousedOverObject);
                }
            }
            if (true === this.leftDown && typeof this.onLeftDrag !== 'undefined') {
                this.onLeftDrag(movement);
            } else if (true === this.rightDown && typeof this.onZoom !== 'undefined') {
                this.onZoom(movement);
            }
        },

        _handleRightDown : function(e) {
            this.rightDown = true;
            if (typeof this.onRightMouseDown !== 'undefined') {
                this.onRightMouseDown(e);
            }
        },

        _handleRightUp : function(e) {
            this.rightDown = false;
            if (typeof this.onRightMouseUp !== 'undefined') {
                this.onRightMouseUp(e);
            }
        },

        _handleLeftDown : function(e) {
            this.leftDown = true;
            if (typeof this.onLeftMouseDown !== 'undefined') {
                this.onLeftMouseDown(e);
            }
        },

        _handleLeftUp : function(e) {
            this.leftDown = false;
            if (typeof this.onLeftMouseUp !== 'undefined') {
                this.onLeftMouseUp(e);
            }
        },

        _handleWheel : function(e) {
            if (typeof this.onZoom !== 'undefined') {
                this.onZoom(e);
            }
        },

        /**
         * Apply the animation settings from a CZML buffer.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        setTimeFromBuffer : function() {
            var clock = this.clock;
            var shuttleRingTicks = AnimationViewModel.defaultTicks.slice(0);

            var availability = this.dynamicObjectCollection.computeAvailability();
            if (availability.start.equals(Iso8601.MINIMUM_VALUE)) {
                clock.startTime = new JulianDate();
                clock.stopTime = clock.startTime.addDays(1);
                clock.clockRange = ClockRange.UNBOUNDED;
                clock.multiplier = 60.0;
            } else {
                clock.startTime = availability.start;
                clock.stopTime = availability.stop;
                if (typeof this.endUserOptions.loop === 'undefined' || this.endUserOptions.loop === '1') {
                    clock.clockRange = ClockRange.LOOP_STOP;
                } else {
                    clock.clockRange = ClockRange.CLAMPED;
                }
                var totalSeconds = clock.startTime.getSecondsDifference(clock.stopTime);
                var multiplier = Math.round(totalSeconds / 120.0);
                if (multiplier < 1) {
                    multiplier = 1;
                }

                var index = binarySearch(shuttleRingTicks, multiplier, function(left, right) {
                    return left - right;
                });
                if (index < 0) {
                    index = ~index;
                }
                if (index !== shuttleRingTicks.length) {
                    clock.multiplier = shuttleRingTicks[index];
                } else {
                    shuttleRingTicks.push(multiplier);
                    clock.multiplier = multiplier;
                }

                var fastestSpeed = Math.round(totalSeconds / 10.0);
                if (fastestSpeed > shuttleRingTicks[shuttleRingTicks.length - 1]) {
                    shuttleRingTicks.push(fastestSpeed);
                }
            }

            this.animationViewModel.setShuttleRingTicks(shuttleRingTicks);

            clock.currentTime = clock.startTime;
            clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            this.timeline.zoomTo(clock.startTime, clock.stopTime);
        },

        /**
         * Removes all CZML data from the viewer.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        removeAllCzml : function() {
            this.centerCameraOnObject(undefined);
            //CZML_TODO visualizers.removeAllPrimitives(); is not really needed here, but right now visualizers
            //cache data indefinitely and removeAll is the only way to get rid of it.
            //while there are no visual differences, removeAll cleans the cache and improves performance
            this.visualizers.removeAllPrimitives();
            this.dynamicObjectCollection.clear();
        },

        /**
         * Add CZML data to the viewer.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {CZML} czml - The CZML (as objects) to be processed and added to the viewer.
         * @param {string} source - The filename or URI that was the source of the CZML collection.
         * @param {string} lookAt - Optional.  The ID of the object to center the camera on.
         * @see CesiumViewerWidget#loadCzml
         */
        addCzml : function(czml, source, lookAt) {
            processCzml(czml, this.dynamicObjectCollection, source);
            this.setTimeFromBuffer();
            if (typeof lookAt !== 'undefined') {
                var lookAtObject = this.dynamicObjectCollection.getObject(lookAt);
                this.centerCameraOnObject(lookAtObject);
            }
        },

        /**
         * Asynchronously load and add CZML data to the viewer.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {string} source - The URI to load the CZML from.
         * @param {string} lookAt - Optional.  The ID of the object to center the camera on.
         * @see CesiumViewerWidget#addCzml
         */
        loadCzml : function(source, lookAt) {
            var widget = this;
            widget._setLoading(true);
            loadJson(source).then(function(czml) {
                widget.addCzml(czml, source, lookAt);
                widget._setLoading(false);
            },
            function(error) {
                widget._setLoading(false);
                console.error(error);
                window.alert(error);
            });
        },

        /**
         * This function is called when files are dropped on the widget, if drag-and-drop is enabled.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} event - The drag-and-drop event containing the dropped file(s).
         */
        handleDrop : function(event) {
            event.stopPropagation(); // Stops some browsers from redirecting.
            event.preventDefault();

            var widget = this;
            widget._setLoading(true);
            widget.removeAllCzml();

            var files = event.dataTransfer.files;
            var f = files[0];
            var reader = new FileReader();
            reader.onload = function(evt) {
                widget.addCzml(JSON.parse(evt.target.result), f.name);
                widget._setLoading(false);
            };
            reader.readAsText(f);
        },

        _started : false,

        /**
         * Call this after placing the widget in the DOM, to initialize the WebGL context,
         * wire up event callbacks, begin requesting CZML, imagery, etc.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see CesiumViewerWidget#autoStartRenderLoop
         */
        startup : function() {
            if (this._started) {
                return;
            }

            var canvas = this.canvas, ellipsoid = this.ellipsoid, scene, widget = this;

            try {
                scene = this.scene = new Scene(canvas);
            } catch (ex) {
                if (typeof this.onSetupError !== 'undefined') {
                    this.onSetupError(this, ex);
                }
                return;
            }
            this._started = true;

            on(canvas, 'contextmenu', event.stop);
            on(canvas, 'selectstart', event.stop);

            if (typeof widget.endUserOptions.theme === 'undefined' || widget.endUserOptions.theme !== 'light') {
                widget.cesiumNode.className += ' cesium-darker';
            }

            if (typeof widget.endUserOptions.debug !== 'undefined' && widget.endUserOptions.debug) {
                this.enableWebGLDebugging = true;
            }

            var context = scene.getContext();
            if (this.enableWebGLDebugging) {
                context.setValidateShaderProgram(true);
                context.setValidateFramebuffer(true);
                context.setLogShaderCompilation(true);
                context.setThrowOnWebGLError(true);
            }

            var imageryUrl = require.toUrl('../../Assets/Textures/');
            this.dayImageUrl = defaultValue(this.dayImageUrl, imageryUrl + 'NE2_LR_LC_SR_W_DR_2048.jpg');
            this.skyBoxBaseUrl = defaultValue(this.skyBoxBaseUrl, imageryUrl + 'SkyBox/tycho2t3_80');

            var centralBody = this.centralBody = new CentralBody(ellipsoid);

            this._configureCentralBodyImagery();

            scene.getPrimitives().setCentralBody(centralBody);

            if (this.showSkyBox) {
                scene.skyBox = new SkyBox({
                    positiveX: this.skyBoxBaseUrl + '_px.jpg',
                    negativeX: this.skyBoxBaseUrl + '_mx.jpg',
                    positiveY: this.skyBoxBaseUrl + '_py.jpg',
                    negativeY: this.skyBoxBaseUrl + '_my.jpg',
                    positiveZ: this.skyBoxBaseUrl + '_pz.jpg',
                    negativeZ: this.skyBoxBaseUrl + '_mz.jpg'
                });
            }

            scene.skyAtmosphere = new SkyAtmosphere(ellipsoid);

            var camera = scene.getCamera();
            camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

            var handler = new ScreenSpaceEventHandler(canvas);
            handler.setInputAction(lang.hitch(this, '_handleLeftClick'), ScreenSpaceEventType.LEFT_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleRightClick'), ScreenSpaceEventType.RIGHT_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleLeftDoubleClick'), ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleMouseMove'), ScreenSpaceEventType.MOUSE_MOVE);
            handler.setInputAction(lang.hitch(this, '_handleLeftDown'), ScreenSpaceEventType.LEFT_DOWN);
            handler.setInputAction(lang.hitch(this, '_handleLeftUp'), ScreenSpaceEventType.LEFT_UP);
            handler.setInputAction(lang.hitch(this, '_handleWheel'), ScreenSpaceEventType.WHEEL);
            handler.setInputAction(lang.hitch(this, '_handleRightDown'), ScreenSpaceEventType.RIGHT_DOWN);
            handler.setInputAction(lang.hitch(this, '_handleRightUp'), ScreenSpaceEventType.RIGHT_UP);

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (typeof this.highlightColor === 'undefined') {
                this.highlightColor = new Color(0.0, 1.0, 0.0);
            }

            if (typeof this.highlightMaterial === 'undefined') {
                this.highlightMaterial = Material.fromType(scene.getContext(), Material.ColorType);
                this.highlightMaterial.uniforms.color = this.highlightColor;
            }

            if (typeof this.onObjectSelected === 'undefined') {
                this.onObjectSelected = function(selectedObject) {
                    if (typeof selectedObject !== 'undefined' && typeof selectedObject.dynamicObject !== 'undefined') {
                        this.centerCameraOnPick(selectedObject);
                    }
                };
            }

            if (this.enableDragDrop) {
                var dropBox = this.cesiumNode;
                on(dropBox, 'drop', lang.hitch(widget, 'handleDrop'));
                on(dropBox, 'dragenter', event.stop);
                on(dropBox, 'dragover', event.stop);
                on(dropBox, 'dragexit', event.stop);
            }

            this.fullscreen = new FullscreenWidget(this.fullscreenContainer, this.cesiumNode);

            var animationViewModel = this.animationViewModel;
            if (typeof animationViewModel === 'undefined') {
                var clockViewModel = new ClockViewModel();
                clockViewModel.owner = this;
                clockViewModel.shouldAnimate(true);
                animationViewModel = new AnimationViewModel(clockViewModel);
            }
            this.animationViewModel = animationViewModel;
            this.clockViewModel = animationViewModel.clockViewModel;

            this.clock = this.clockViewModel.clock;
            var clock = this.clock;

            this.animation = new Animation(this.animationContainer, animationViewModel);

            var dynamicObjectCollection = this.dynamicObjectCollection = new DynamicObjectCollection();
            var transitioner = this.sceneTransitioner = new SceneTransitioner(scene);
            this.visualizers = VisualizerCollection.createCzmlStandardCollection(scene, dynamicObjectCollection);

            if (typeof widget.endUserOptions.source !== 'undefined') {
                widget.loadCzml(widget.endUserOptions.source, widget.endUserOptions.lookAt);
            }

            if (typeof widget.endUserOptions.stats !== 'undefined' && widget.endUserOptions.stats) {
                widget.enableStatistics(true);
            }

            function onTimelineScrub(e) {
                widget.clock.currentTime = e.timeJulian;
                widget.clock.shouldAnimate = false;
            }

            var timeline = new Timeline(this.timelineContainer, widget.clock);
            widget.timeline = timeline;
            timeline.addEventListener('settime', onTimelineScrub, false);
            timeline.zoomTo(clock.startTime, clock.stopTime);

            var viewHomeButton = widget.viewHomeButton;
            var view2D = widget.view2D;
            var view3D = widget.view3D;
            var viewColumbus = widget.viewColumbus;

            view2D.set('checked', false);
            view3D.set('checked', true);
            viewColumbus.set('checked', false);

            on(viewHomeButton, 'Click', function() {
                widget.viewHome();
            });
            on(view2D, 'Click', function() {
                view2D.set('checked', true);
                view3D.set('checked', false);
                viewColumbus.set('checked', false);
                transitioner.morphTo2D();
            });
            on(view3D, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', true);
                viewColumbus.set('checked', false);
                transitioner.morphTo3D();
            });
            on(viewColumbus, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', false);
                viewColumbus.set('checked', true);
                transitioner.morphToColumbusView();
            });

            var imagery = widget.imagery;
            var imageryAerial = widget.imageryAerial;
            var imageryAerialWithLabels = widget.imageryAerialWithLabels;
            var imageryRoad = widget.imageryRoad;
            var imagerySingleTile = widget.imagerySingleTile;
            var imageryOptions = [imageryAerial, imageryAerialWithLabels, imageryRoad, imagerySingleTile];

            imagery.startup();

            function createImageryClickFunction(control, style) {
                return function() {
                    if (style) {
                        widget.setStreamingImageryMapStyle(style);
                    } else {
                        widget.enableStreamingImagery(false);
                    }

                    imageryOptions.forEach(function(o) {
                        o.set('checked', o === control);
                    });
                };
            }

            on(imageryAerial, 'Click', createImageryClickFunction(imageryAerial, BingMapsStyle.AERIAL));
            on(imageryAerialWithLabels, 'Click', createImageryClickFunction(imageryAerialWithLabels, BingMapsStyle.AERIAL_WITH_LABELS));
            on(imageryRoad, 'Click', createImageryClickFunction(imageryRoad, BingMapsStyle.ROAD));
            on(imagerySingleTile, 'Click', createImageryClickFunction(imagerySingleTile, undefined));

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (widget.resizeWidgetOnWindowResize) {
                on(window, 'resize', function() {
                    widget.resize();
                });
            }

            this._camera3D = this.scene.getCamera().clone();

            this.resize();

            if (this.autoStartRenderLoop) {
                this.startRenderLoop();
            }
        },

        /**
         * Reset the camera to the home view for the current scene mode.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        viewHome : function() {
            this._viewFromTo = undefined;

            var scene = this.scene;
            var mode = scene.mode;

            var camera = scene.getCamera();
            camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

            var controller = scene.getScreenSpaceCameraController();
            controller.enableTranslate = true;
            controller.enableTilt = true;
            controller.setEllipsoid(Ellipsoid.WGS84);
            controller.columbusViewMode = CameraColumbusViewMode.FREE;

            if (mode === SceneMode.SCENE2D) {
                camera.controller.viewExtent(Extent.MAX_VALUE);
            } else if (mode === SceneMode.SCENE3D) {
                var camera3D = this._camera3D;
                camera3D.position.clone(camera.position);
                camera3D.direction.clone(camera.direction);
                camera3D.up.clone(camera.up);
                camera3D.right.clone(camera.right);
                camera3D.transform.clone(camera.transform);
                camera3D.frustum.clone(camera.frustum);
            } else if (mode === SceneMode.COLUMBUS_VIEW) {
                var transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                            1.0, 0.0, 0.0, 0.0,
                                            0.0, 1.0, 0.0, 0.0,
                                            0.0, 0.0, 0.0, 1.0);

                var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
                var position = new Cartesian3(0.0, -1.0, 1.0).normalize().multiplyByScalar(5.0 * maxRadii);
                var direction = Cartesian3.ZERO.subtract(position).normalize();
                var right = direction.cross(Cartesian3.UNIT_Z);
                var up = right.cross(direction);
                right = direction.cross(up);
                direction = up.cross(right);

                var frustum = new PerspectiveFrustum();
                frustum.fovy = CesiumMath.toRadians(60.0);
                frustum.aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;

                camera.position = position;
                camera.direction = direction;
                camera.up = up;
                camera.right = right;
                camera.frustum = frustum;
                camera.transform = transform;
            }
        },

        /**
         * Enable or disable the FPS (Frames Per Second) perfomance display.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} showStatistics - <code>true</code> to enable it.
         */
        enableStatistics : function(showStatistics) {
            if (typeof this._performanceDisplay === 'undefined' && showStatistics) {
                this._performanceDisplay = new PerformanceDisplay();
                this.scene.getPrimitives().add(this._performanceDisplay);
            } else if (typeof this._performanceDisplay !== 'undefined' && !showStatistics) {
                this.scene.getPrimitives().remove(this._performanceDisplay);
                this._performanceDisplay = undefined;
            }
        },

        /**
         * Enable or disable the "sky atmosphere" effect, which displays the limb
         * of the Earth (seen from space) or blue sky (seen from inside the atmosphere).
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} show - <code>true</code> to enable the effect.
         */
        showSkyAtmosphere : function(show) {
            this.scene.skyAtmosphere.show = show;
        },

        /**
         * Enable or disable streaming imagery, and update the globe.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} value - <code>true</code> to enable streaming imagery.
         * @see CesiumViewerWidget#useStreamingImagery
         */
        enableStreamingImagery : function(value) {
            this.useStreamingImagery = value;
            this._configureCentralBodyImagery();
        },

        /**
         * Change the streaming imagery type, and update the globe.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {BingMapsStyle} value - the new map style to use.
         * @see CesiumViewerWidget#mapStyle
         */
        setStreamingImageryMapStyle : function(value) {
            if (!this.useStreamingImagery || this.mapStyle !== value) {
                this.useStreamingImagery = true;
                this.mapStyle = value;
                this._configureCentralBodyImagery();
            }
        },

        /**
         * Set the positional offset of the logo of the streaming imagery provider.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Integer} logoOffsetX - The horizontal offset in screen space
         * @param {Integer} logoOffsetY - The vertical offset in screen space
         */
        setLogoOffset : function(logoOffsetX, logoOffsetY) {
            var logoOffset = this.centralBody.logoOffset;
            if ((logoOffsetX !== logoOffset.x) || (logoOffsetY !== logoOffset.y)) {
                this.centralBody.logoOffset = new Cartesian2(logoOffsetX, logoOffsetY);
            }
        },

        /**
         * Highlight an object in the scene, usually in response to a click or hover.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to highlight, or <code>undefined</code> to un-highlight.
         */
        highlightObject : function(selectedObject) {
            if (this.highlightedObject !== selectedObject) {
                if (typeof this.highlightedObject !== 'undefined' &&
                        (typeof this.highlightedObject.isDestroyed !== 'function' || !this.highlightedObject.isDestroyed())) {
                    if (typeof this.highlightedObject.material !== 'undefined') {
                        this.highlightedObject.material = this._originalMaterial;
                    } else if (typeof this.highlightedObject.outerMaterial !== 'undefined') {
                        this.highlightedObject.outerMaterial = this._originalMaterial;
                    } else if (typeof this.highlightedObject.setColor !== 'undefined') {
                        this.highlightedObject.setColor(this._originalColor);
                    }
                }
                this.highlightedObject = selectedObject;
                if (typeof selectedObject !== 'undefined') {
                    if (typeof selectedObject.material !== 'undefined') {
                        this._originalMaterial = selectedObject.material;
                        selectedObject.material = this.highlightMaterial;
                    } else if (typeof selectedObject.outerMaterial !== 'undefined') {
                        this._originalMaterial = selectedObject.outerMaterial;
                        selectedObject.outerMaterial = this.highlightMaterial;
                    } else if (typeof this.highlightedObject.setColor !== 'undefined') {
                        this._originalColor = Color.clone(selectedObject.getColor(), this._originalColor);
                        selectedObject.setColor(this.highlightColor);
                    }
                }
            }
        },

        /**
         * Initialize the current frame.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        initializeFrame : function() {
            this.scene.initializeFrame();
        },

        /**
         * Call this function prior to rendering each animation frame, to prepare
         * all CZML objects and other settings for the next frame.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {JulianDate} currentTime - The date and time in the scene of the frame to be rendered
         */
        update : function() {
            var currentTime;
            if (this.clockViewModel.owner === this) {
                currentTime = this.clock.tick();
            } else {
                currentTime = this.clock.currentTime;
            }
            this.visualizers.update(currentTime);

            // Update the camera to stay centered on the selected object, if any.
            var viewFromTo = this._viewFromTo;
            if (typeof viewFromTo !== 'undefined') {
                viewFromTo.update(currentTime);
            }
            return currentTime;
        },

        /**
         * Render the widget's scene.
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {JulianDate} currentTime - The date and time in the scene of the frame to be rendered
         */
        render : function(currentTime) {
            this.scene.render(currentTime);
        },

        _setLoading : function(isLoading) {
            this.loading.style.display = isLoading ? 'block' : 'none';
        },

        _configureCentralBodyImagery : function() {
            var centralBody = this.centralBody;

            var imageLayers = centralBody.getImageryLayers();

            var existingImagery;
            if (imageLayers.getLength() !== 0) {
                existingImagery = imageLayers.get(0).imageryProvider;
            }

            var newLayer;

            if (this.useStreamingImagery) {
                if (!(existingImagery instanceof BingMapsImageryProvider) ||
                    existingImagery.getMapStyle() !== this.mapStyle) {

                    newLayer = imageLayers.addImageryProvider(new BingMapsImageryProvider({
                        url : 'http://dev.virtualearth.net',
                        mapStyle : this.mapStyle,
                        // Some versions of Safari support WebGL, but don't correctly implement
                        // cross-origin image loading, so we need to load Bing imagery using a proxy.
                        proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('/proxy/')
                    }));
                    if (imageLayers.getLength() > 1) {
                        imageLayers.remove(imageLayers.get(0));
                    }
                    imageLayers.lowerToBottom(newLayer);
                }
            } else {
                if (!(existingImagery instanceof SingleTileImageryProvider) ||
                    existingImagery.getUrl() !== this.dayImageUrl) {

                    newLayer = imageLayers.addImageryProvider(new SingleTileImageryProvider({url : this.dayImageUrl}));
                    if (imageLayers.getLength() > 1) {
                        imageLayers.remove(imageLayers.get(0));
                    }
                    imageLayers.lowerToBottom(newLayer);
                }
            }
        },

        /**
         * If true, {@link CesiumViewerWidget#startRenderLoop} will be called automatically
         * at the end of {@link CesiumViewerWidget#startup}.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         */
        autoStartRenderLoop : true,

        /**
         * Updates and renders the scene to reflect the current time.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        updateAndRender : function() {
            this.initializeFrame();
            this.render(this.update());
        },

        /**
         * This is a simple render loop that can be started if there is only one <code>CesiumViewerWidget</code>
         * on your page.  If you wish to customize your render loop, avoid this function and instead
         * use code similar to the following example.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see requestAnimationFrame
         * @see CesiumViewerWidget#autoStartRenderLoop
         * @example
         * // This takes the place of startRenderLoop for a single widget.
         *  var widget = this;
         *  function updateAndRender() {
         *      widget.updateAndRender();
         *      requestAnimationFrame(updateAndRender);
         *  }
         *  requestAnimationFrame(updateAndRender);
         */
        startRenderLoop : function() {
            var widget = this;
            function updateAndRender() {
                widget.updateAndRender();
                requestAnimationFrame(updateAndRender);
            }
            requestAnimationFrame(updateAndRender);
        }
    });
});
