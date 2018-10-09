define([
        '../../Core/buildModuleUrl',
        '../../Core/Cartesian3',
        '../../Core/Clock',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/FeatureDetection',
        '../../Core/formatError',
        '../../Core/requestAnimationFrame',
        '../../Core/ScreenSpaceEventHandler',
        '../../Scene/createWorldImagery',
        '../../Scene/Globe',
        '../../Scene/Moon',
        '../../Scene/Scene',
        '../../Scene/SceneMode',
        '../../Scene/ShadowMode',
        '../../Scene/SkyAtmosphere',
        '../../Scene/SkyBox',
        '../../Scene/Sun',
        '../getElement'
    ], function(
        buildModuleUrl,
        Cartesian3,
        Clock,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        FeatureDetection,
        formatError,
        requestAnimationFrame,
        ScreenSpaceEventHandler,
        createWorldImagery,
        Globe,
        Moon,
        Scene,
        SceneMode,
        ShadowMode,
        SkyAtmosphere,
        SkyBox,
        Sun,
        getElement) {
    'use strict';

    function getDefaultSkyBoxUrl(suffix) {
        return buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_' + suffix + '.jpg');
    }

    function startRenderLoop(widget) {
        widget._renderLoopRunning = true;

        var lastFrameTime = 0;
        function render(frameTime) {
            if (widget.isDestroyed()) {
                return;
            }

            if (widget._useDefaultRenderLoop) {
                try {
                    var targetFrameRate = widget._targetFrameRate;
                    if (!defined(targetFrameRate)) {
                        widget.resize();
                        widget.render();
                        requestAnimationFrame(render);
                    } else {
                        var interval = 1000.0 / targetFrameRate;
                        var delta = frameTime - lastFrameTime;

                        if (delta > interval) {
                            widget.resize();
                            widget.render();
                            lastFrameTime = frameTime - (delta % interval);
                        }
                        requestAnimationFrame(render);
                    }
                } catch (error) {
                    widget._useDefaultRenderLoop = false;
                    widget._renderLoopRunning = false;
                    if (widget._showRenderLoopErrors) {
                        var title = 'An error occurred while rendering.  Rendering has stopped.';
                        widget.showErrorPanel(title, undefined, error);
                    }
                }
            } else {
                widget._renderLoopRunning = false;
            }
        }

        requestAnimationFrame(render);
    }

    function configureCanvasSize(widget) {
        var canvas = widget._canvas;
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;
        var resolutionScale = widget._resolutionScale;
        if (!widget._supportsImageRenderingPixelated) {
            resolutionScale *= defaultValue(window.devicePixelRatio, 1.0);
        }

        widget._canvasWidth = width;
        widget._canvasHeight = height;

        width *= resolutionScale;
        height *= resolutionScale;

        canvas.width = width;
        canvas.height = height;

        widget._canRender = width !== 0 && height !== 0;
    }

    function configureCameraFrustum(widget) {
        var canvas = widget._canvas;
        var width = canvas.width;
        var height = canvas.height;
        if (width !== 0 && height !== 0) {
            var frustum = widget._scene.camera.frustum;
            if (defined(frustum.aspectRatio)) {
                frustum.aspectRatio = width / height;
            } else {
                frustum.top = frustum.right * (height / width);
                frustum.bottom = -frustum.top;
            }
        }
    }

    /**
     * A widget containing a Cesium scene.
     *
     * @alias CesiumWidget
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Object} [options] Object with the following properties:
     * @param {Clock} [options.clock=new Clock()] The clock to use to control current time.
     * @param {ImageryProvider} [options.imageryProvider=createWorldImagery()] The imagery provider to serve as the base layer. If set to <code>false</code>, no imagery provider will be added.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider] The terrain provider.
     * @param {SkyBox} [options.skyBox] The skybox used to render the stars.  When <code>undefined</code>, the default stars are used. If set to <code>false</code>, no skyBox, Sun, or Moon will be added.
     * @param {SkyAtmosphere} [options.skyAtmosphere] Blue sky, and the glow around the Earth's limb.  Set to <code>false</code> to turn it off.
     * @param {SceneMode} [options.sceneMode=SceneMode.SCENE3D] The initial scene mode.
     * @param {Boolean} [options.scene3DOnly=false] When <code>true</code>, each geometry instance will only be rendered in 3D to save GPU memory.
     * @param {Boolean} [options.orderIndependentTranslucency=true] If true and the configuration supports it, use order independent translucency.
     * @param {MapProjection} [options.mapProjection=new GeographicProjection()] The map projection to use in 2D and Columbus View modes.
     * @param {Globe} [options.globe=new Globe(mapProjection.ellipsoid)] The globe to use in the scene.  If set to <code>false</code>, no globe will be added.
     * @param {Boolean} [options.useDefaultRenderLoop=true] True if this widget should control the render loop, false otherwise.
     * @param {Number} [options.targetFrameRate] The target frame rate when using the default render loop.
     * @param {Boolean} [options.showRenderLoopErrors=true] If true, this widget will automatically display an HTML panel to the user containing the error, if a render loop error occurs.
     * @param {Object} [options.contextOptions] Context and WebGL creation properties corresponding to <code>options</code> passed to {@link Scene}.
     * @param {Element|String} [options.creditContainer] The DOM element or ID that will contain the {@link CreditDisplay}.  If not specified, the credits are added
     *        to the bottom of the widget itself.
     * @param {Element|String} [options.creditViewport] The DOM element or ID that will contain the credit pop up created by the {@link CreditDisplay}.  If not specified, it will appear over the widget itself.
     * @param {Number} [options.terrainExaggeration=1.0] A scalar used to exaggerate the terrain. Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
     * @param {Boolean} [options.shadows=false] Determines if shadows are cast by the sun.
     * @param {ShadowMode} [options.terrainShadows=ShadowMode.RECEIVE_ONLY] Determines if the terrain casts or receives shadows from the sun.
     * @param {MapMode2D} [options.mapMode2D=MapMode2D.INFINITE_SCROLL] Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
     * @param {Boolean} [options.requestRenderMode=false] If true, rendering a frame will only occur when needed as determined by changes within the scene. Enabling improves performance of the application, but requires using {@link Scene#requestRender} to render a new frame explicitly in this mode. This will be necessary in many cases after making changes to the scene in other parts of the API. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
     * @param {Number} [options.maximumRenderTimeChange=0.0] If requestRenderMode is true, this value defines the maximum change in simulation time allowed before a render is requested. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cesium%20Widget.html|Cesium Sandcastle Cesium Widget Demo}
     *
     * @example
     * // For each example, include a link to CesiumWidget.css stylesheet in HTML head,
     * // and in the body, include: <div id="cesiumContainer"></div>
     *
     * //Widget with no terrain and default Bing Maps imagery provider.
     * var widget = new Cesium.CesiumWidget('cesiumContainer');
     *
     * //Widget with OpenStreetMaps imagery provider and Cesium World Terrain.
     * var widget = new Cesium.CesiumWidget('cesiumContainer', {
     *     imageryProvider : Cesium.createOpenStreetMapImageryProvider(),
     *     terrainProvider : Cesium.createWorldTerrain(),
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
     *     }),
     *     // Show Columbus View map with Web Mercator projection
     *     sceneMode : Cesium.SceneMode.COLUMBUS_VIEW,
     *     mapProjection : new Cesium.WebMercatorProjection()
     * });
     */
    function CesiumWidget(container, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);

        options = defaultValue(options, {});

        //Configure the widget DOM elements
        var element = document.createElement('div');
        element.className = 'cesium-widget';
        container.appendChild(element);

        var canvas = document.createElement('canvas');
        var supportsImageRenderingPixelated = FeatureDetection.supportsImageRenderingPixelated();
        this._supportsImageRenderingPixelated = supportsImageRenderingPixelated;
        if (supportsImageRenderingPixelated) {
            canvas.style.imageRendering = FeatureDetection.imageRenderingValue();
        }

        canvas.oncontextmenu = function() {
            return false;
        };
        canvas.onselectstart = function() {
            return false;
        };
        element.appendChild(canvas);

        var innerCreditContainer = document.createElement('div');
        innerCreditContainer.className = 'cesium-widget-credits';

        var creditContainer = defined(options.creditContainer) ? getElement(options.creditContainer) : element;
        creditContainer.appendChild(innerCreditContainer);

        var creditViewport = defined(options.creditViewport) ? getElement(options.creditViewport) : element;

        var showRenderLoopErrors = defaultValue(options.showRenderLoopErrors, true);

        this._element = element;
        this._container = container;
        this._canvas = canvas;
        this._canvasWidth = 0;
        this._canvasHeight = 0;
        this._creditViewport = creditViewport;
        this._creditContainer = creditContainer;
        this._innerCreditContainer = innerCreditContainer;
        this._canRender = false;
        this._renderLoopRunning = false;
        this._showRenderLoopErrors = showRenderLoopErrors;
        this._resolutionScale = 1.0;
        this._forceResize = false;
        this._clock = defined(options.clock) ? options.clock : new Clock();

        configureCanvasSize(this);

        try {
            var scene = new Scene({
                canvas : canvas,
                contextOptions : options.contextOptions,
                creditContainer : innerCreditContainer,
                creditViewport: creditViewport,
                mapProjection : options.mapProjection,
                orderIndependentTranslucency : options.orderIndependentTranslucency,
                scene3DOnly : defaultValue(options.scene3DOnly, false),
                terrainExaggeration : options.terrainExaggeration,
                shadows : options.shadows,
                mapMode2D : options.mapMode2D,
                requestRenderMode : options.requestRenderMode,
                maximumRenderTimeChange : options.maximumRenderTimeChange
            });
            this._scene = scene;

            scene.camera.constrainedAxis = Cartesian3.UNIT_Z;

            configureCameraFrustum(this);

            var ellipsoid = defaultValue(scene.mapProjection.ellipsoid, Ellipsoid.WGS84);

            var globe = options.globe;
            if (!defined(globe)) {
                globe = new Globe(ellipsoid);
            }
            if (globe !== false) {
                scene.globe = globe;
                scene.globe.shadows = defaultValue(options.terrainShadows, ShadowMode.RECEIVE_ONLY);
            }

            var skyBox = options.skyBox;
            if (!defined(skyBox)) {
                skyBox = new SkyBox({
                    sources : {
                        positiveX : getDefaultSkyBoxUrl('px'),
                        negativeX : getDefaultSkyBoxUrl('mx'),
                        positiveY : getDefaultSkyBoxUrl('py'),
                        negativeY : getDefaultSkyBoxUrl('my'),
                        positiveZ : getDefaultSkyBoxUrl('pz'),
                        negativeZ : getDefaultSkyBoxUrl('mz')
                    }
                });
            }
            if (skyBox !== false) {
                scene.skyBox = skyBox;
                scene.sun = new Sun();
                scene.moon = new Moon();
            }

            // Blue sky, and the glow around the Earth's limb.
            var skyAtmosphere = options.skyAtmosphere;
            if (!defined(skyAtmosphere)) {
                skyAtmosphere = new SkyAtmosphere(ellipsoid);
            }
            if (skyAtmosphere !== false) {
                scene.skyAtmosphere = skyAtmosphere;
            }

            //Set the base imagery layer
            var imageryProvider = (options.globe === false) ? false : options.imageryProvider;
            if (!defined(imageryProvider)) {
                imageryProvider = createWorldImagery();
            }

            if (imageryProvider !== false) {
                scene.imageryLayers.addImageryProvider(imageryProvider);
            }

            //Set the terrain provider if one is provided.
            if (defined(options.terrainProvider) && options.globe !== false) {
                scene.terrainProvider = options.terrainProvider;
            }

            this._screenSpaceEventHandler = new ScreenSpaceEventHandler(canvas, false);

            if (defined(options.sceneMode)) {
                if (options.sceneMode === SceneMode.SCENE2D) {
                    this._scene.morphTo2D(0);
                }
                if (options.sceneMode === SceneMode.COLUMBUS_VIEW) {
                    this._scene.morphToColumbusView(0);
                }
            }

            this._useDefaultRenderLoop = undefined;
            this.useDefaultRenderLoop = defaultValue(options.useDefaultRenderLoop, true);

            this._targetFrameRate = undefined;
            this.targetFrameRate = options.targetFrameRate;

            var that = this;
            scene.renderError.addEventListener(function(scene, error) {
                that._useDefaultRenderLoop = false;
                that._renderLoopRunning = false;
                if (that._showRenderLoopErrors) {
                    var title = 'An error occurred while rendering.  Rendering has stopped.';
                    that.showErrorPanel(title, undefined, error);
                }
            });
        } catch (error) {
            if (showRenderLoopErrors) {
                var title = 'Error constructing CesiumWidget.';
                var message = 'Visit <a href="http://get.webgl.org">http://get.webgl.org</a> to verify that your web browser and hardware support WebGL.  Consider trying a different web browser or updating your video drivers.  Detailed error information is below:';
                this.showErrorPanel(title, message, error);
            }
            throw error;
        }
    }

    defineProperties(CesiumWidget.prototype, {
        /**
         * Gets the parent container.
         * @memberof CesiumWidget.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the canvas.
         * @memberof CesiumWidget.prototype
         *
         * @type {Canvas}
         */
        canvas : {
            get : function() {
                return this._canvas;
            }
        },

        /**
         * Gets the credit container.
         * @memberof CesiumWidget.prototype
         *
         * @type {Element}
         */
        creditContainer: {
            get : function() {
                return this._creditContainer;
            }
        },

        /**
         * Gets the credit viewport
         * @memberof CesiumWidget.prototype
         *
         * @type {Element}
         */
        creditViewport: {
            get: function() {
                return this._creditViewport;
            }
        },

        /**
         * Gets the scene.
         * @memberof CesiumWidget.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the collection of image layers that will be rendered on the globe.
         * @memberof CesiumWidget.prototype
         *
         * @type {ImageryLayerCollection}
         * @readonly
         */
        imageryLayers : {
            get : function() {
                return this._scene.imageryLayers;
            }
        },

        /**
         * The terrain provider providing surface geometry for the globe.
         * @memberof CesiumWidget.prototype
         *
         * @type {TerrainProvider}
         */
        terrainProvider : {
            get : function() {
                return this._scene.terrainProvider;
            },
            set : function(terrainProvider) {
                this._scene.terrainProvider = terrainProvider;
            }
        },

        /**
         * Gets the camera.
         * @memberof CesiumWidget.prototype
         *
         * @type {Camera}
         * @readonly
         */
        camera : {
            get : function() {
                return this._scene.camera;
            }
        },

        /**
         * Gets the clock.
         * @memberof CesiumWidget.prototype
         *
         * @type {Clock}
         */
        clock : {
            get : function() {
                return this._clock;
            }
        },

        /**
         * Gets the screen space event handler.
         * @memberof CesiumWidget.prototype
         *
         * @type {ScreenSpaceEventHandler}
         */
        screenSpaceEventHandler : {
            get : function() {
                return this._screenSpaceEventHandler;
            }
        },

        /**
         * Gets or sets the target frame rate of the widget when <code>useDefaultRenderLoop</code>
         * is true. If undefined, the browser's {@link requestAnimationFrame} implementation
         * determines the frame rate.  If defined, this value must be greater than 0.  A value higher
         * than the underlying requestAnimationFrame implementation will have no effect.
         * @memberof CesiumWidget.prototype
         *
         * @type {Number}
         */
        targetFrameRate : {
            get : function() {
                return this._targetFrameRate;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (value <= 0) {
                    throw new DeveloperError('targetFrameRate must be greater than 0, or undefined.');
                }
                //>>includeEnd('debug');
                this._targetFrameRate = value;
            }
        },

        /**
         * Gets or sets whether or not this widget should control the render loop.
         * If set to true the widget will use {@link requestAnimationFrame} to
         * perform rendering and resizing of the widget, as well as drive the
         * simulation clock. If set to false, you must manually call the
         * <code>resize</code>, <code>render</code> methods as part of a custom
         * render loop.  If an error occurs during rendering, {@link Scene}'s
         * <code>renderError</code> event will be raised and this property
         * will be set to false.  It must be set back to true to continue rendering
         * after the error.
         * @memberof CesiumWidget.prototype
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
        },

        /**
         * Gets or sets a scaling factor for rendering resolution.  Values less than 1.0 can improve
         * performance on less powerful devices while values greater than 1.0 will render at a higher
         * resolution and then scale down, resulting in improved visual fidelity.
         * For example, if the widget is laid out at a size of 640x480, setting this value to 0.5
         * will cause the scene to be rendered at 320x240 and then scaled up while setting
         * it to 2.0 will cause the scene to be rendered at 1280x960 and then scaled down.
         * @memberof CesiumWidget.prototype
         *
         * @type {Number}
         * @default 1.0
         */
        resolutionScale : {
            get : function() {
                return this._resolutionScale;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (value <= 0) {
                    throw new DeveloperError('resolutionScale must be greater than 0.');
                }
                //>>includeEnd('debug');
                this._resolutionScale = value;
                this._forceResize = true;
            }
        }
    });

    /**
     * Show an error panel to the user containing a title and a longer error message,
     * which can be dismissed using an OK button.  This panel is displayed automatically
     * when a render loop error occurs, if showRenderLoopErrors was not false when the
     * widget was constructed.
     *
     * @param {String} title The title to be displayed on the error panel.  This string is interpreted as text.
     * @param {String} message A helpful, user-facing message to display prior to the detailed error information.  This string is interpreted as HTML.
     * @param {String} [error] The error to be displayed on the error panel.  This string is formatted using {@link formatError} and then displayed as text.
     */
    CesiumWidget.prototype.showErrorPanel = function(title, message, error) {
        var element = this._element;
        var overlay = document.createElement('div');
        overlay.className = 'cesium-widget-errorPanel';

        var content = document.createElement('div');
        content.className = 'cesium-widget-errorPanel-content';
        overlay.appendChild(content);

        var errorHeader = document.createElement('div');
        errorHeader.className = 'cesium-widget-errorPanel-header';
        errorHeader.appendChild(document.createTextNode(title));
        content.appendChild(errorHeader);

        var errorPanelScroller = document.createElement('div');
        errorPanelScroller.className = 'cesium-widget-errorPanel-scroll';
        content.appendChild(errorPanelScroller);
        function resizeCallback() {
            errorPanelScroller.style.maxHeight = Math.max(Math.round(element.clientHeight * 0.9 - 100), 30) + 'px';
        }
        resizeCallback();
        if (defined(window.addEventListener)) {
            window.addEventListener('resize', resizeCallback, false);
        }

        if (defined(message)) {
            var errorMessage = document.createElement('div');
            errorMessage.className = 'cesium-widget-errorPanel-message';
            errorMessage.innerHTML = '<p>' + message + '</p>';
            errorPanelScroller.appendChild(errorMessage);
        }

        var errorDetails = '(no error details available)';
        if (defined(error)) {
            errorDetails = formatError(error);
        }

        var errorMessageDetails = document.createElement('div');
        errorMessageDetails.className = 'cesium-widget-errorPanel-message';
        errorMessageDetails.appendChild(document.createTextNode(errorDetails));
        errorPanelScroller.appendChild(errorMessageDetails);

        var buttonPanel = document.createElement('div');
        buttonPanel.className = 'cesium-widget-errorPanel-buttonPanel';
        content.appendChild(buttonPanel);

        var okButton = document.createElement('button');
        okButton.setAttribute('type', 'button');
        okButton.className = 'cesium-button';
        okButton.appendChild(document.createTextNode('OK'));
        okButton.onclick = function() {
            if (defined(resizeCallback) && defined(window.removeEventListener)) {
                window.removeEventListener('resize', resizeCallback, false);
            }
            element.removeChild(overlay);
        };

        buttonPanel.appendChild(okButton);

        element.appendChild(overlay);

        //IE8 does not have a console object unless the dev tools are open.
        if (typeof console !== 'undefined') {
            console.error(title + '\n' + message + '\n' + errorDetails);
        }
    };

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CesiumWidget.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    CesiumWidget.prototype.destroy = function() {
        this._scene = this._scene && this._scene.destroy();
        this._container.removeChild(this._element);
        this._creditContainer.removeChild(this._innerCreditContainer);
        destroyObject(this);
    };

    /**
     * Updates the canvas size, camera aspect ratio, and viewport size.
     * This function is called automatically as needed unless
     * <code>useDefaultRenderLoop</code> is set to false.
     */
    CesiumWidget.prototype.resize = function() {
        var canvas = this._canvas;
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;
        if (!this._forceResize && this._canvasWidth === width && this._canvasHeight === height) {
            return;
        }
        this._forceResize = false;

        configureCanvasSize(this);
        configureCameraFrustum(this);

        this._scene.requestRender();
    };

    /**
     * Renders the scene.  This function is called automatically
     * unless <code>useDefaultRenderLoop</code> is set to false;
     */
    CesiumWidget.prototype.render = function() {
        if (this._canRender) {
            this._scene.initializeFrame();
            var currentTime = this._clock.tick();
            this._scene.render(currentTime);
        } else {
            this._clock.tick();
        }
    };

    return CesiumWidget;
});
