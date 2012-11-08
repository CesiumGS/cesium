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
        '../../Core/BoundingRectangle',
        '../../Core/Ellipsoid',
        '../../Core/computeSunPosition',
        '../../Core/EventHandler',
        '../../Core/FeatureDetection',
        '../../Core/MouseEventType',
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
        BoundingRectangle,
        Ellipsoid,
        computeSunPosition,
        EventHandler,
        FeatureDetection,
        MouseEventType,
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
        template) {
    "use strict";

    return declare('Cesium.CesiumWidget', [_WidgetBase, _TemplatedMixin], {
        templateString : template,
        useStreamingImagery : true,
        mapStyle : BingMapsStyle.AERIAL,
        defaultCamera : undefined,
        dayImageUrl : undefined,
        nightImageUrl : undefined,
        specularMapUrl : undefined,
        cloudsMapUrl : undefined,
        bumpMapUrl : undefined,
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

            var context = scene.getContext();

            var imageryUrl = '../../Assets/Imagery/';
            var maxTextureSize = context.getMaximumTextureSize();
            if (maxTextureSize < 4095) {
                // Mobile, or low-end card
                this.dayImageUrl = this.dayImageUrl || require.toUrl(imageryUrl + 'NE2_50M_SR_W_2048.jpg');
                this.nightImageUrl = this.nightImageUrl || require.toUrl(imageryUrl + 'land_ocean_ice_lights_512.jpg');
            } else {
                // Desktop
                this.dayImageUrl = this.dayImageUrl || require.toUrl(imageryUrl + 'NE2_50M_SR_W_4096.jpg');
                this.nightImageUrl = this.nightImageUrl || require.toUrl(imageryUrl + 'land_ocean_ice_lights_2048.jpg');
                this.specularMapUrl = this.specularMapUrl || require.toUrl(imageryUrl + 'earthspec1k.jpg');
                this.cloudsMapUrl = this.cloudsMapUrl || require.toUrl(imageryUrl + 'earthcloudmaptrans.jpg');
                this.bumpMapUrl = this.bumpMapUrl || require.toUrl(imageryUrl + 'earthbump1k.jpg');
            }

            var centralBody = this.centralBody = new CentralBody(ellipsoid);
            centralBody.showSkyAtmosphere = true;
            centralBody.showGroundAtmosphere = true;
            centralBody.logoOffset = new Cartesian2(125, 0);

            this._configureCentralBodyImagery();

            scene.getPrimitives().setCentralBody(centralBody);

            var camera = scene.getCamera();
            camera.position = camera.position.multiplyByScalar(1.5);

            this.centralBodyCameraController = camera.getControllers().addCentralBody();

            var handler = new EventHandler(canvas);
            handler.setMouseAction(lang.hitch(this, '_handleLeftClick'), MouseEventType.LEFT_CLICK);
            handler.setMouseAction(lang.hitch(this, '_handleRightClick'), MouseEventType.RIGHT_CLICK);
            handler.setMouseAction(lang.hitch(this, '_handleMouseMove'), MouseEventType.MOVE);
            handler.setMouseAction(lang.hitch(this, '_handleLeftDown'), MouseEventType.LEFT_DOWN);
            handler.setMouseAction(lang.hitch(this, '_handleLeftUp'), MouseEventType.LEFT_UP);
            handler.setMouseAction(lang.hitch(this, '_handleWheel'), MouseEventType.WHEEL);
            handler.setMouseAction(lang.hitch(this, '_handleRightDown'), MouseEventType.RIGHT_DOWN);
            handler.setMouseAction(lang.hitch(this, '_handleRightUp'), MouseEventType.RIGHT_UP);

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

            var controllers = camera.getControllers();
            controllers.removeAll();
            this.centralBodyCameraController = controllers.addCentralBody();
        },

        areCloudsAvailable : function() {
            return typeof this.centralBody.cloudsMapSource !== 'undefined';
        },

        enableClouds : function(useClouds) {
            if (this.areCloudsAvailable()) {
                this.centralBody.showClouds = useClouds;
                this.centralBody.showCloudShadows = useClouds;
            }
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
            this.centralBody.showSkyAtmosphere = show;
        },

        showGroundAtmosphere : function(show) {
            this.centralBody.showGroundAtmosphere = show;
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

        _sunPosition : new Cartesian3(),

        update : function(currentTime) {
            this.scene.setSunPosition(computeSunPosition(currentTime, this._sunPosition));
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

            centralBody.nightImageSource = this.nightImageUrl;
            centralBody.specularMapSource = this.specularMapUrl;
            centralBody.cloudsMapSource = this.cloudsMapUrl;
            centralBody.bumpMapSource = this.bumpMapUrl;
        },

        autoStartRenderLoop : true,

        startRenderLoop : function() {
            var widget = this;

            // Note that clients are permitted to use their own custom render loop.
            // At a minimum it should include lines similar to the following:

            function updateAndRender() {
                var currentTime = new JulianDate();
                widget.update(currentTime);
                widget.render();
                requestAnimationFrame(updateAndRender);
            }
            updateAndRender();
        }
    });
});