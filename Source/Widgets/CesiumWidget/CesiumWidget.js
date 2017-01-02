/*global define*/
define([
        '../../Core/buildModuleUrl',
        '../../Core/Cartesian3',
        '../../Core/Clock',
        '../../Core/Credit',
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
        '../../Scene/BingMapsImageryProvider',
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
        Credit,
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
        BingMapsImageryProvider,
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

    var cesiumLogoData = 'data:image/png;base64,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';

    /**
     * A widget containing a Cesium scene.
     *
     * @alias CesiumWidget
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Object} [options] Object with the following properties:
     * @param {Clock} [options.clock=new Clock()] The clock to use to control current time.
     * @param {ImageryProvider} [options.imageryProvider=new BingMapsImageryProvider()] The imagery provider to serve as the base layer. If set to <code>false</code>, no imagery provider will be added.
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
     * @param {Number} [options.terrainExaggeration=1.0] A scalar used to exaggerate the terrain. Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
     * @param {Boolean} [options.shadows=false] Determines if shadows are cast by the sun.
     * @param {ShadowMode} [options.terrainShadows=ShadowMode.RECEIVE_ONLY] Determines if the terrain casts or receives shadows from the sun.
     * @param {MapMode2D} [options.mapMode2D=MapMode2D.INFINITE_SCROLL] Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cesium%20Widget.html|Cesium Sandcastle Cesium Widget Demo}
     *
     * @example
     * // For each example, include a link to CesiumWidget.css stylesheet in HTML head,
     * // and in the body, include: <div id="cesiumContainer"></div>
     *
     * //Widget with no terrain and default Bing Maps imagery provider.
     * var widget = new Cesium.CesiumWidget('cesiumContainer');
     *
     * //Widget with OpenStreetMaps imagery provider and Cesium terrain provider hosted by AGI.
     * var widget = new Cesium.CesiumWidget('cesiumContainer', {
     *     imageryProvider : Cesium.createOpenStreetMapImageryProvider(),
     *     terrainProvider : new Cesium.CesiumTerrainProvider({
     *         url : 'https://assets.agi.com/stk-terrain/world'
     *     }),
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

        var creditContainer = document.createElement('div');
        creditContainer.className = 'cesium-widget-credits';

        var creditContainerContainer = defined(options.creditContainer) ? getElement(options.creditContainer) : element;
        creditContainerContainer.appendChild(creditContainer);

        var showRenderLoopErrors = defaultValue(options.showRenderLoopErrors, true);

        this._element = element;
        this._container = container;
        this._canvas = canvas;
        this._canvasWidth = 0;
        this._canvasHeight = 0;
        this._creditContainer = creditContainer;
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
                creditContainer : creditContainer,
                mapProjection : options.mapProjection,
                orderIndependentTranslucency : options.orderIndependentTranslucency,
                scene3DOnly : defaultValue(options.scene3DOnly, false),
                terrainExaggeration : options.terrainExaggeration,
                shadows : options.shadows,
                mapMode2D : options.mapMode2D
            });
            this._scene = scene;

            scene.camera.constrainedAxis = Cartesian3.UNIT_Z;

            configureCameraFrustum(this);

            var ellipsoid = defaultValue(scene.mapProjection.ellipsoid, Ellipsoid.WGS84);
            var creditDisplay = scene.frameState.creditDisplay;

            var cesiumCredit = new Credit('Cesium', cesiumLogoData, 'http://cesiumjs.org/');
            creditDisplay.addDefaultCredit(cesiumCredit);

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
                imageryProvider = new BingMapsImageryProvider({
                    url : 'https://dev.virtualearth.net'
                });
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
