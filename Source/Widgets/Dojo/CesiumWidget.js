/*global define,console*/
define([
        'require',
        'dojo/_base/declare',
        'dojo/ready',
        'dojo/_base/lang',
        'dojo/_base/event',
        'dojo/on',
        'dijit/_WidgetBase',
        'dijit/_TemplatedMixin',
        '../../Core/defaultValue',
        '../../Core/BoundingRectangle',
        '../../Core/Ellipsoid',
        '../../Core/computeSunPosition',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/FeatureDetection',
        '../../Core/ScreenSpaceEventType',
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/JulianDate',
        '../../Core/DefaultProxy',
        '../../Core/requestAnimationFrame',
        '../../Scene/Scene',
        '../../Scene/CentralBody',
        '../../Scene/BingMapsImageryProvider',
        '../../Scene/BingMapsStyle',
        '../../Scene/SingleTileImageryProvider',
        '../../Scene/PerformanceDisplay',
        '../../Scene/SkyBox',
        '../../Scene/SkyAtmosphere',
        'dojo/text!./CesiumWidget.html'
    ], function (
        require,
        declare,
        ready,
        lang,
        event,
        on,
        _WidgetBase,
        _TemplatedMixin,
        defaultValue,
        BoundingRectangle,
        Ellipsoid,
        computeSunPosition,
        ScreenSpaceEventHandler,
        FeatureDetection,
        ScreenSpaceEventType,
        Cartesian2,
        Cartesian3,
        JulianDate,
        DefaultProxy,
        requestAnimationFrame,
        Scene,
        CentralBody,
        BingMapsImageryProvider,
        BingMapsStyle,
        SingleTileImageryProvider,
        PerformanceDisplay,
        SkyBox,
        SkyAtmosphere,
        template) {
    "use strict";

    return declare('Cesium.CesiumWidget', [_WidgetBase, _TemplatedMixin], {
        templateString : template,
        useStreamingImagery : true,
        mapStyle : BingMapsStyle.AERIAL,
        defaultCamera : undefined,
        dayImageUrl : undefined,
        /**
         * Determines if a sky box with stars is drawn around the globe.  This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see SkyBox
         */
        showSkyBox : true,
        resizeWidgetOnWindowResize : true,

        constructor : function() {
            this.ellipsoid = Ellipsoid.WGS84;
        },

        postCreate : function() {
            this.cesiumLogo.style.backgroundImage = 'url(' + require.toUrl('../Images/Cesium_Logo_overlay.png') + ')';
        },

        onSetupError : function(widget, error) {
            console.error(error);
        },

        resize : function() {
            var width = this.canvas.clientWidth, height = this.canvas.clientHeight;

            if (typeof this.scene === 'undefined' || (this.canvas.width === width && this.canvas.height === height)) {
                return;
            }

            this.canvas.width = width;
            this.canvas.height = height;
            this.scene.getCamera().frustum.aspectRatio = width / height;
        },

        onObjectSelected : undefined,
        onObjectRightClickSelected : undefined,
        onObjectMousedOver : undefined,
        onLeftMouseDown : undefined,
        onLeftMouseUp : undefined,
        onRightMouseDown : undefined,
        onRightMouseUp : undefined,
        onLeftDrag : undefined,
        onZoom : undefined,
        onCameraToggled : undefined,

        _handleLeftClick : function(e) {
            if (typeof this.onObjectSelected !== 'undefined') {
                // If the user left-clicks, we re-send the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectSelected(this.selectedObject);
            }
        },

        _handleRightClick : function(e) {
            if (typeof this.onObjectRightClickSelected !== 'undefined') {
                // If the user right-clicks, we re-send the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectRightClickSelected(this.selectedObject);
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
            if (typeof this.leftDown !== 'undefined' && this.leftDown && typeof this.onLeftDrag !== 'undefined') {
                this.onLeftDrag(movement);
            } else if (typeof this.rightDown !== 'undefined' && this.rightDown && typeof this.onZoom !== 'undefined') {
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

        _started : false,

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

            this.resize();

            on(canvas, 'contextmenu', event.stop);
            on(canvas, 'selectstart', event.stop);

            var imageryUrl = require.toUrl('../../Assets/Textures/');
            this.dayImageUrl = defaultValue(this.dayImageUrl, imageryUrl + 'NE2_LR_LC_SR_W_DR_2048.jpg');

            var centralBody = this.centralBody = new CentralBody(ellipsoid);
            centralBody.logoOffset = new Cartesian2(125, 0);

            this._configureCentralBodyImagery();

            scene.getPrimitives().setCentralBody(centralBody);

            if (this.showSkyBox) {
                scene.skyBox = new SkyBox({
                    positiveX: imageryUrl + 'SkyBox/tycho8_px_80.jpg',
                    negativeX: imageryUrl + 'SkyBox/tycho8_mx_80.jpg',
                    positiveY: imageryUrl + 'SkyBox/tycho8_py_80.jpg',
                    negativeY: imageryUrl + 'SkyBox/tycho8_my_80.jpg',
                    positiveZ: imageryUrl + 'SkyBox/tycho8_pz_80.jpg',
                    negativeZ: imageryUrl + 'SkyBox/tycho8_mz_80.jpg'
                });
            }

            scene.skyAtmosphere = new SkyAtmosphere(ellipsoid);

            var camera = scene.getCamera();
            camera.position = camera.position.multiplyByScalar(1.5);
            camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

            var handler = new ScreenSpaceEventHandler(canvas);
            handler.setInputAction(lang.hitch(this, '_handleLeftClick'), ScreenSpaceEventType.LEFT_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleRightClick'), ScreenSpaceEventType.RIGHT_CLICK);
            handler.setInputAction(lang.hitch(this, '_handleMouseMove'), ScreenSpaceEventType.MOUSE_MOVE);
            handler.setInputAction(lang.hitch(this, '_handleLeftDown'), ScreenSpaceEventType.LEFT_DOWN);
            handler.setInputAction(lang.hitch(this, '_handleLeftUp'), ScreenSpaceEventType.LEFT_UP);
            handler.setInputAction(lang.hitch(this, '_handleWheel'), ScreenSpaceEventType.WHEEL);
            handler.setInputAction(lang.hitch(this, '_handleRightDown'), ScreenSpaceEventType.RIGHT_DOWN);
            handler.setInputAction(lang.hitch(this, '_handleRightUp'), ScreenSpaceEventType.RIGHT_UP);

            if (widget.resizeWidgetOnWindowResize) {
                on(window, 'resize', function() {
                    widget.resize();
                });
            }

            this.defaultCamera = camera.clone();

            if (this.autoStartRenderLoop) {
                this.startRenderLoop();
            }
        },

        viewHome : function() {
            var camera = this.scene.getCamera();
            camera.position = this.defaultCamera.position;
            camera.direction = this.defaultCamera.direction;
            camera.up = this.defaultCamera.up;
            camera.transform = this.defaultCamera.transform;
            camera.frustum = this.defaultCamera.frustum.clone();
            camera.controller.constrainedAxis = Cartesian3.UNIT_Z;
        },

        enableStatistics : function(showStatistics) {
            if (typeof this._performanceDisplay === 'undefined' && showStatistics) {
                this._performanceDisplay = new PerformanceDisplay();
                this.scene.getPrimitives().add(this._performanceDisplay);
            } else if (typeof this._performanceDisplay !== 'undefined' && !showStatistics) {
                this.scene.getPrimitives().remove(this._performanceDisplay);
                this._performanceDisplay = undefined;
            }
        },

        showSkyAtmosphere : function(show) {
            this.scene.skyAtmosphere.show = show;
        },

        enableStreamingImagery : function(value) {
            this.useStreamingImagery = value;
            this._configureCentralBodyImagery();
        },

        setStreamingImageryMapStyle : function(value) {
            this.useStreamingImagery = true;

            if (this.mapStyle !== value) {
                this.mapStyle = value;
                this._configureCentralBodyImagery();
            }
        },

        setLogoOffset : function(logoOffsetX, logoOffsetY) {
            var logoOffset = this.centralBody.logoOffset;
            if ((logoOffsetX !== logoOffset.x) || (logoOffsetY !== logoOffset.y)) {
                this.centralBody.logoOffset = new Cartesian2(logoOffsetX, logoOffsetY);
            }
        },

        initializeFrame : function(currentTime) {
            this.scene.initializeFrame(currentTime);
        },

        update : function(currentTime) {
        },

        render : function() {
            this.scene.render();
        },

        _configureCentralBodyImagery : function() {
            var centralBody = this.centralBody;

            if (this.useStreamingImagery) {
                centralBody.getImageryLayers().addImageryProvider(new BingMapsImageryProvider({
                    server : 'dev.virtualearth.net',
                    mapStyle : this.mapStyle,
                    // Some versions of Safari support WebGL, but don't correctly implement
                    // cross-origin image loading, so we need to load Bing imagery using a proxy.
                    proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('/proxy/')
                }));
            } else {
                centralBody.getImageryLayers().addImageryProvider(new SingleTileImageryProvider({url : this.dayImageUrl}));
            }
        },

        autoStartRenderLoop : true,

        startRenderLoop : function() {
            var widget = this;

            // Note that clients are permitted to use their own custom render loop.
            // At a minimum it should include lines similar to the following:

            function updateAndRender() {
                var currentTime = new JulianDate();
                widget.initializeFrame(currentTime);
                widget.update(currentTime);
                widget.render();
                requestAnimationFrame(updateAndRender);
            }
            updateAndRender();
        }
    });
});
