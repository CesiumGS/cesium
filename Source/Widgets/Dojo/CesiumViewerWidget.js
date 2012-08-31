/*global define*/
define([
        'require',
        'dojo/_base/declare',
        'dojo/ready',
        'dojo/_base/lang',
        'dojo/_base/event',
        'dojo/on',
        'dijit/_WidgetBase',
        'dijit/_TemplatedMixin',
        'dijit/_WidgetsInTemplateMixin',
        'dijit/form/Button',
        'dijit/form/ToggleButton',
        'dijit/form/DropDownButton',
        'dijit/TooltipDialog',
        './getJson',
        './TimelineWidget',
        '../../Core/Clock',
        '../../Core/ClockStep',
        '../../Core/ClockRange',
        '../../Core/AnimationController',
        '../../Core/Ellipsoid',
        '../../Core/Iso8601',
        '../../Core/FullScreen',
        '../../Core/SunPosition',
        '../../Core/EventHandler',
        '../../Core/FeatureDetection',
        '../../Core/MouseEventType',
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/JulianDate',
        '../../Core/DefaultProxy',
        '../../Core/Transforms',
        '../../Core/requestAnimationFrame',
        '../../Core/Color',
        '../../Scene/Material',
        '../../Scene/Scene',
        '../../Scene/CentralBody',
        '../../Scene/BingMapsTileProvider',
        '../../Scene/BingMapsStyle',
        '../../Scene/SceneTransitioner',
        '../../Scene/SingleTileProvider',
        '../../Scene/PerformanceDisplay',
        '../../DynamicScene/processCzml',
        '../../DynamicScene/DynamicObjectCollection',
        '../../DynamicScene/VisualizerCollection',
        'dojo/text!./CesiumViewerWidget.html'
    ], function (
        require,
        declare,
        ready,
        lang,
        event,
        on,
        _WidgetBase,
        _TemplatedMixin,
        _WidgetsInTemplateMixin,
        Button,
        ToggleButton,
        DropDownButton,
        TooltipDialog,
        getJson,
        TimelineWidget,
        Clock,
        ClockStep,
        ClockRange,
        AnimationController,
        Ellipsoid,
        Iso8601,
        FullScreen,
        SunPosition,
        EventHandler,
        FeatureDetection,
        MouseEventType,
        Cartesian2,
        Cartesian3,
        JulianDate,
        DefaultProxy,
        Transforms,
        requestAnimationFrame,
        Color,
        Material,
        Scene,
        CentralBody,
        BingMapsTileProvider,
        BingMapsStyle,
        SceneTransitioner,
        SingleTileProvider,
        PerformanceDisplay,
        processCzml,
        DynamicObjectCollection,
        VisualizerCollection,
        template) {
    "use strict";

    return declare('Cesium.CesiumViewerWidget', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString : template,
        preRender : undefined,
        postSetup : undefined,
        useStreamingImagery : true,
        mapStyle : BingMapsStyle.AERIAL,
        defaultCamera : undefined,
        dayImageUrl : undefined,
        nightImageUrl : undefined,
        specularMapUrl : undefined,
        cloudsMapUrl : undefined,
        bumpMapUrl : undefined,
        endUserOptions : {},
        enableDragDrop: false,
        resizeWidgetOnWindowResize: true,

        constructor : function() {
            this.ellipsoid = Ellipsoid.WGS84;
        },

        postCreate : function() {
            ready(this, '_setupCesium');
        },

        resize : function() {
            var width = this.canvas.clientWidth, height = this.canvas.clientHeight;

            if (typeof this.scene === 'undefined' || (this.canvas.width === width && this.canvas.height === height)) {
                return;
            }

            this.canvas.width = width;
            this.canvas.height = height;

            this.scene.getContext().setViewport({
                x : 0,
                y : 0,
                width : width,
                height : height
            });

            this.scene.getCamera().frustum.aspectRatio = width / height;
        },

        centerCameraOnObject : function(selectedObject) {
            if (selectedObject && selectedObject.dynamicObject) {
                this.cameraCenteredObjectID = selectedObject.dynamicObject.id;
            } else {
                this.cameraCenteredObjectID = undefined;
            }
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

        updateSpeedIndicator : function() {
            if (this.animationController.isAnimating()) {
                this.speedIndicator.innerHTML = this.clock.multiplier + 'x realtime';
            } else {
                this.speedIndicator.innerHTML = this.clock.multiplier + 'x realtime (paused)';
            }
        },

        setTimeFromBuffer : function() {
            var clock = this.clock;

            this.animReverse.set('checked', false);
            this.animPause.set('checked', true);
            this.animPlay.set('checked', false);

            var availability = this.dynamicObjectCollection.computeAvailability();
            if (availability.start.equals(Iso8601.MINIMUM_VALUE)) {
                clock.startTime = new JulianDate();
                clock.stopTime = clock.startTime.addDays(1);
                clock.clockRange = ClockRange.UNBOUNDED;
            } else {
                clock.startTime = availability.start;
                clock.stopTime = availability.stop;
                clock.clockRange = ClockRange.LOOP;
            }

            clock.multiplier = 60;
            clock.currentTime = clock.startTime;
            this.timelineControl.zoomTo(clock.startTime, clock.stopTime);
            this.updateSpeedIndicator();
        },

        handleDrop : function(e) {
            e.stopPropagation(); // Stops some browsers from redirecting.
            e.preventDefault();

            var files = e.dataTransfer.files;
            var f = files[0];
            var reader = new FileReader();
            var widget = this;
            reader.onload = function(evt) {
                //CZML_TODO visualizers.removeAllPrimitives(); is not really needed here, but right now visualizers
                //cache data indefinitely and removeAll is the only way to get rid of it.
                //while there are no visual differences, removeAll cleans the cache and improves performance
                widget.visualizers.removeAllPrimitives();
                widget.dynamicObjectCollection.clear();
                processCzml(JSON.parse(evt.target.result), widget.dynamicObjectCollection, f.name);
                widget.setTimeFromBuffer();
            };
            reader.readAsText(f);
        },

        _setupCesium : function() {
            var canvas = this.canvas, ellipsoid = this.ellipsoid, scene, widget = this;

            try {
                scene = this.scene = new Scene(canvas);
            } catch (ex) {
                if (typeof this.onSetupError !== 'undefined') {
                    this.onSetupError(this, ex);
                }
                return;
            }

            this.resize();

            on(canvas, 'contextmenu', event.stop);
            on(canvas, 'selectstart', event.stop);

            var maxTextureSize = scene.getContext().getMaximumTextureSize();
            if (maxTextureSize < 4095) {
                // Mobile, or low-end card
                this.dayImageUrl = this.dayImageUrl || require.toUrl('Images/NE2_50M_SR_W_2048.jpg');
                this.nightImageUrl = this.nightImageUrl || require.toUrl('Images/land_ocean_ice_lights_512.jpg');
            } else {
                // Desktop
                this.dayImageUrl = this.dayImageUrl || require.toUrl('Images/NE2_50M_SR_W_4096.jpg');
                this.nightImageUrl = this.nightImageUrl || require.toUrl('Images/land_ocean_ice_lights_2048.jpg');
                this.specularMapUrl = this.specularMapUrl || require.toUrl('Images/earthspec1k.jpg');
                this.cloudsMapUrl = this.cloudsMapUrl || require.toUrl('Images/earthcloudmaptrans.jpg');
                this.bumpMapUrl = this.bumpMapUrl || require.toUrl('Images/earthbump1k.jpg');
            }

            var centralBody = this.centralBody = new CentralBody(ellipsoid);
            centralBody.showSkyAtmosphere = true;
            centralBody.showGroundAtmosphere = true;
            // This logo is replicated by the imagery selector button, so it's hidden here.
            centralBody.logoOffset = new Cartesian2(-100, -100);

            this._configureCentralBodyImagery();

            scene.getPrimitives().setCentralBody(centralBody);

            var camera = scene.getCamera(), maxRadii = ellipsoid.getMaximumRadius();

            camera.position = camera.position.multiplyByScalar(1.5);
            camera.frustum.near = 0.0002 * maxRadii;
            camera.frustum.far = 50.0 * maxRadii;

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

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (typeof this.highlightColor === 'undefined') {
                this.highlightColor = new Color(0.0, 1.0, 0.0);
            }

            if (typeof this.highlightMaterial === 'undefined') {
                this.highlightMaterial = Material.fromType(scene.getContext(), Material.ColorType);
                this.highlightMaterial.uniforms.color = this.highlightColor;
            }

            if (typeof this.onObjectRightClickSelected === 'undefined') {
                this.onObjectRightClickSelected = this.centerCameraOnObject;
            }

            if (this.enableDragDrop) {
                var dropBox = this.cesiumNode;
                on(dropBox, 'drop', lang.hitch(widget, 'handleDrop'));
                on(dropBox, 'dragenter', event.stop);
                on(dropBox, 'dragover', event.stop);
                on(dropBox, 'dragexit', event.stop);
            }

            var currentTime = new JulianDate();
            if (typeof this.animationController === 'undefined') {
                if (typeof this.clock === 'undefined') {
                    this.clock = new Clock({
                        startTime : currentTime.addDays(-0.5),
                        stopTime : currentTime.addDays(0.5),
                        currentTime : currentTime,
                        clockStep : ClockStep.SYSTEM_CLOCK_DEPENDENT,
                        multiplier : 1
                    });
                }
                this.animationController = new AnimationController(this.clock);
            } else {
                this.clock = this.animationController.clock;
            }

            var animationController = this.animationController;
            var dynamicObjectCollection = this.dynamicObjectCollection = new DynamicObjectCollection();
            var clock = this.clock;
            var transitioner = this.sceneTransitioner = new SceneTransitioner(scene);
            this.visualizers = VisualizerCollection.createCzmlStandardCollection(scene, dynamicObjectCollection);

            if (typeof widget.endUserOptions.source !== 'undefined') {
                getJson(widget.endUserOptions.source).then(function(czmlData) {
                    processCzml(czmlData, widget.dynamicObjectCollection, widget.endUserOptions.source);
                    widget.setTimeFromBuffer();
                },
                function(error) {
                    window.alert(error);
                });
            }

            if (typeof widget.endUserOptions.lookAt !== 'undefined') {
                widget.cameraCenteredObjectID = widget.endUserOptions.lookAt;
            }

            if (typeof widget.endUserOptions.stats !== 'undefined' && widget.endUserOptions.stats) {
                widget.enableStatistics(true);
            }

            this._lastTimeLabelClock = clock.currentTime;
            this._lastTimeLabelDate = Date.now();
            this.timeLabelElement = this.timeLabel.containerNode;
            this.timeLabelElement.innerHTML = clock.currentTime.toDate().toUTCString();

            this.updateSpeedIndicator();

            var animReverse = this.animReverse;
            var animPause = this.animPause;
            var animPlay = this.animPlay;

            on(this.animReset, 'Click', function() {
                animationController.reset();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
                widget.updateSpeedIndicator();
            });

            function onAnimPause() {
                animationController.pause();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
                widget.updateSpeedIndicator();
            }

            on(animPause, 'Click', onAnimPause);

            on(animReverse, 'Click', function() {
                animationController.playReverse();
                animReverse.set('checked', true);
                animPause.set('checked', false);
                animPlay.set('checked', false);
                widget.updateSpeedIndicator();
            });

            on(animPlay, 'Click', function() {
                animationController.play();
                animReverse.set('checked', false);
                animPause.set('checked', false);
                animPlay.set('checked', true);
                widget.updateSpeedIndicator();
            });

            on(widget.animSlow, 'Click', function() {
                animationController.slower();
                widget.updateSpeedIndicator();
            });

            on(widget.animFast, 'Click', function() {
                animationController.faster();
                widget.updateSpeedIndicator();
            });

            function onTimelineScrub(e) {
                widget.clock.currentTime = e.timeJulian;
                onAnimPause();
            }

            var timelineWidget = widget.timelineWidget;
            timelineWidget.clock = widget.clock;
            timelineWidget.setupCallback = function(t) {
                widget.timelineControl = t;
                t.addEventListener('settime', onTimelineScrub, false);
                t.zoomTo(clock.startTime, clock.stopTime);
            };
            timelineWidget.setupTimeline();

            var viewHomeButton = widget.viewHomeButton;
            var view2D = widget.view2D;
            var view3D = widget.view3D;
            var viewColumbus = widget.viewColumbus;
            var viewFullScreen = widget.viewFullScreen;

            view2D.set('checked', false);
            view3D.set('checked', true);
            viewColumbus.set('checked', false);

            on(viewFullScreen, 'Click', function() {
                if (FullScreen.isFullscreenEnabled()) {
                    FullScreen.exitFullscreen();
                } else {
                    FullScreen.requestFullScreen(document.body);
                }
            });

            on(viewHomeButton, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', true);
                viewColumbus.set('checked', false);
                transitioner.morphTo3D();
                widget.viewHome();
                widget.showSkyAtmosphere(true);
                widget.showGroundAtmosphere(true);
            });
            on(view2D, 'Click', function() {
                widget.cameraCenteredObjectID = undefined;
                view2D.set('checked', true);
                view3D.set('checked', false);
                viewColumbus.set('checked', false);
                widget.showSkyAtmosphere(false);
                widget.showGroundAtmosphere(false);
                transitioner.morphTo2D();
            });
            on(view3D, 'Click', function() {
                widget.cameraCenteredObjectID = undefined;
                view2D.set('checked', false);
                view3D.set('checked', true);
                viewColumbus.set('checked', false);
                transitioner.morphTo3D();
                widget.showSkyAtmosphere(true);
                widget.showGroundAtmosphere(true);
            });
            on(viewColumbus, 'Click', function() {
                widget.cameraCenteredObjectID = undefined;
                view2D.set('checked', false);
                view3D.set('checked', false);
                viewColumbus.set('checked', true);
                widget.showSkyAtmosphere(false);
                widget.showGroundAtmosphere(false);
                transitioner.morphToColumbusView();
            });

            var cbLighting = widget.cbLighting;
            on(cbLighting, 'Change', function(value) {
                widget.centralBody.affectedByLighting = !value;
            });

            var imagery = widget.imagery;
            var imageryAerial = widget.imageryAerial;
            var imageryAerialWithLabels = widget.imageryAerialWithLabels;
            var imageryRoad = widget.imageryRoad;
            var imagerySingleTile = widget.imagerySingleTile;
            var imageryOptions = [imageryAerial, imageryAerialWithLabels, imageryRoad, imagerySingleTile];
            var bingHtml = imagery.containerNode.innerHTML;

            imagery.startup();

            function createImageryClickFunction(control, style) {
                return function() {
                    if (style) {
                        widget.setStreamingImageryMapStyle(style);
                        imagery.containerNode.innerHTML = bingHtml;
                    } else {
                        widget.enableStreamingImagery(false);
                        imagery.containerNode.innerHTML = 'Imagery';
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

            if (widget.resizeWidgetOnWindowResize) {
                on(window, 'resize', function() {
                    widget.resize();
                });
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (typeof this.postSetup !== 'undefined') {
                this.postSetup(this);
            }

            this.defaultCamera = camera.clone();
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

        highlightObject : function(selectedObject) {
            if (this.highlightedObject !== selectedObject) {
                if (typeof this.highlightedObject !== 'undefined') {
                    if (typeof this.highlightedObject.material !== 'undefined') {
                        this.highlightedObject.material = this._originalMaterial;
                    } else {
                        this.highlightedObject.color = this._originalColor;
                    }
                }
                this.highlightedObject = selectedObject;
                if (typeof selectedObject !== 'undefined') {
                    if (typeof selectedObject.material !== 'undefined') {
                        this._originalMaterial = selectedObject.material;
                        selectedObject.material = this.highlightMaterial;
                    } else {
                        this._originalColor = selectedObject.color;
                        selectedObject.color = this.highlightColor;
                    }
                }
            }
        },

        _cameraCenteredObjectIDPosition : new Cartesian3(),

        update : function(currentTime) {
            var cameraCenteredObjectID = this.cameraCenteredObjectID;
            var cameraCenteredObjectIDPosition = this._cameraCenteredObjectIDPosition;

            this.timelineControl.updateFromClock();
            this.scene.setSunPosition(SunPosition.compute(currentTime).position);
            this.visualizers.update(currentTime);

            if ((Math.abs(currentTime.getSecondsDifference(this._lastTimeLabelClock)) >= 1.0) ||
                    ((Date.now() - this._lastTimeLabelDate) > 200)) {
                this.timeLabelElement.innerHTML = currentTime.toDate().toUTCString();
                this._lastTimeLabelClock = currentTime;
                this._lastTimeLabelDate = Date.now();
            }

            // Update the camera to stay centered on the selected object, if any.
            if (cameraCenteredObjectID) {
                var dynamicObject = this.dynamicObjectCollection.getObject(cameraCenteredObjectID);
                if (dynamicObject && dynamicObject.position) {
                    cameraCenteredObjectIDPosition = dynamicObject.position.getValueCartesian(currentTime, cameraCenteredObjectIDPosition);
                    if (typeof cameraCenteredObjectIDPosition !== 'undefined') {
                        // If we're centering on an object for the first time, zoom to within 2km of it.
                        if (this._lastCameraCenteredObjectID !== cameraCenteredObjectID) {
                            var camera = this.scene.getCamera();
                            camera.position = camera.position.normalize().multiplyByScalar(5000.0);

                            var controllers = camera.getControllers();
                            controllers.removeAll();
                            this.objectSpindleController = controllers.addSpindle();
                            this.objectSpindleController.constrainedAxis = Cartesian3.UNIT_Z;
                        }

                        if (typeof spindleController !== 'undefined' && !this.objectSpindleController.isDestroyed()) {
                            var transform = Transforms.eastNorthUpToFixedFrame(cameraCenteredObjectIDPosition, this.ellipsoid);
                            this.objectSpindleController.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
                        }
                    }
                }
            }
            this._lastCameraCenteredObjectID = cameraCenteredObjectID;
        },

        render : function() {
            this.scene.render();
        },

        _configureCentralBodyImagery : function() {
            var centralBody = this.centralBody;

            if (this.useStreamingImagery) {
                centralBody.dayTileProvider = new BingMapsTileProvider({
                    server : 'dev.virtualearth.net',
                    mapStyle : this.mapStyle,
                    // Some versions of Safari support WebGL, but don't correctly implement
                    // cross-origin image loading, so we need to load Bing imagery using a proxy.
                    proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('/proxy/')
                });
            } else {
                centralBody.dayTileProvider = new SingleTileProvider(this.dayImageUrl);
            }

            centralBody.nightImageSource = this.nightImageUrl;
            centralBody.specularMapSource = this.specularMapUrl;
            centralBody.cloudsMapSource = this.cloudsMapUrl;
            centralBody.bumpMapSource = this.bumpMapUrl;
        },

        startRenderLoop : function() {
            var widget = this;
            var animationController = widget.animationController;

            // Note that clients are permitted to use their own custom render loop.
            // At a minimum it should include lines similar to the following:

            function updateAndRender() {
                var currentTime = animationController.update();
                widget.update(currentTime);
                widget.render();
                requestAnimationFrame(updateAndRender);
            }
            updateAndRender();
        }
    });
});
