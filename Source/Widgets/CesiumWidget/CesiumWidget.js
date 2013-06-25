/*global define*/
define([
        '../../Core/buildModuleUrl',
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/Clock',
        '../../Core/DefaultProxy',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/FeatureDetection',
        '../../Core/requestAnimationFrame',
        '../../Core/ScreenSpaceEventHandler',
        '../../Scene/BingMapsImageryProvider',
        '../../Scene/CentralBody',
        '../../Scene/Scene',
        '../../Scene/SceneMode',
        '../../Scene/SceneTransitioner',
        '../../Scene/SkyAtmosphere',
        '../../Scene/SkyBox',
        '../../Scene/Sun',
        '../getElement'
    ], function(
        buildModuleUrl,
        Cartesian2,
        Cartesian3,
        Clock,
        DefaultProxy,
        defaultValue,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        FeatureDetection,
        requestAnimationFrame,
        ScreenSpaceEventHandler,
        BingMapsImageryProvider,
        CentralBody,
        Scene,
        SceneMode,
        SceneTransitioner,
        SkyAtmosphere,
        SkyBox,
        Sun,
        getElement) {
    "use strict";

    function getDefaultSkyBoxUrl(suffix) {
        return buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_' + suffix + '.jpg');
    }

    function startRenderLoop(widget) {
        widget._renderLoopRunning = true;

        function render() {
            try {
                if (widget._useDefaultRenderLoop) {
                    widget.resize();
                    widget.render();
                    requestAnimationFrame(render);
                } else {
                    widget._renderLoopRunning = false;
                }
            } catch (e) {
                widget._useDefaultRenderLoop = false;
                widget._renderLoopRunning = false;
                widget.onRenderLoopError.raiseEvent(widget, e);
            }
        }

        requestAnimationFrame(render);
    }

    /**
     * A widget containing a Cesium scene.
     *
     * @alias CesiumWidget
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Object} [options] Configuration options for the widget.
     * @param {Clock} [options.clock=new Clock()] The clock to use to control current time.
     * @param {ImageryProvider} [options.imageryProvider=new BingMapsImageryProvider()] The imagery provider to serve as the base layer. If set to false, no imagery provider will be added.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider] The terrain provider.
     * @param {SceneMode} [options.sceneMode=SceneMode.SCENE3D] The initial scene mode.
     * @param {Object} [options.useDefaultRenderLoop=true] True if this widget should control the render loop, false otherwise.
     * @param {Object} [options.contextOptions=undefined] Properties corresponding to <a href='http://www.khronos.org/registry/webgl/specs/latest/#5.2'>WebGLContextAttributes</a> used to create the WebGL context.  This object will be passed to the {@link Scene} constructor.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @example
     * // For each example, include a link to CesiumWidget.css stylesheet in HTML head,
     * // and in the body, include: &lt;div id="cesiumContainer"&gt;&lt;/div&gt;
     *
     * //Widget with no terrain and default Bing Maps imagery provider.
     * var widget = new Cesium.CesiumWidget('cesiumContainer');
     *
     * //Widget with OpenStreetMaps imagery provider and Cesium terrain provider hosted by AGI.
     * var widget = new Cesium.CesiumWidget('cesiumContainer', {
     *     imageryProvider : new Cesium.OpenStreetMapImageryProvider(),
     *     terrainProvider : new Cesium.CesiumTerrainProvider({
     *         url : 'http://cesium.agi.com/smallterrain',
     *         credit : 'Terrain data courtesy Analytical Graphics, Inc.'
     *     })
     * });
     */
    var CesiumWidget = function(container, options) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        options = defaultValue(options, {});

        //Configure the widget DOM elements
        var widgetNode = document.createElement('div');
        widgetNode.className = 'cesium-widget';
        container.appendChild(widgetNode);

        var canvas = document.createElement('canvas');
        canvas.oncontextmenu = function() {
            return false;
        };
        canvas.onselectstart = function() {
            return false;
        };
        widgetNode.appendChild(canvas);

        var cesiumLogo = document.createElement('a');
        cesiumLogo.href = 'http://cesium.agi.com/';
        cesiumLogo.target = '_blank';
        cesiumLogo.className = 'cesium-widget-logo';
        widgetNode.appendChild(cesiumLogo);

        var scene = new Scene(canvas, options.contextOptions);
        scene.getCamera().controller.constrainedAxis = Cartesian3.UNIT_Z;

        var ellipsoid = Ellipsoid.WGS84;

        var centralBody = new CentralBody(ellipsoid);
        centralBody.logoOffset = new Cartesian2(125, 0);
        scene.getPrimitives().setCentralBody(centralBody);

        scene.skyBox = new SkyBox({
            positiveX : getDefaultSkyBoxUrl('px'),
            negativeX : getDefaultSkyBoxUrl('mx'),
            positiveY : getDefaultSkyBoxUrl('py'),
            negativeY : getDefaultSkyBoxUrl('my'),
            positiveZ : getDefaultSkyBoxUrl('pz'),
            negativeZ : getDefaultSkyBoxUrl('mz')
        });
        scene.skyAtmosphere = new SkyAtmosphere(ellipsoid);
        scene.sun = new Sun();

        //Set the base imagery layer
        var imageryProvider = options.imageryProvider;
        if (typeof imageryProvider === 'undefined') {
            imageryProvider = new BingMapsImageryProvider({
                url : 'http://dev.virtualearth.net',
                // Some versions of Safari support WebGL, but don't correctly implement
                // cross-origin image loading, so we need to load Bing imagery using a proxy.
                proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('http://cesium.agi.com/proxy/')
            });
        }

        if (imageryProvider !== false) {
            centralBody.getImageryLayers().addImageryProvider(imageryProvider);
        }

        //Set the terrain provider if one is provided.
        if (typeof options.terrainProvider !== 'undefined') {
            centralBody.terrainProvider = options.terrainProvider;
        }

        this._element = widgetNode;
        this._container = container;
        this._canvas = canvas;
        this._canvasWidth = canvas.width;
        this._canvasHeight = canvas.height;
        this._cesiumLogo = cesiumLogo;
        this._scene = scene;
        this._centralBody = centralBody;
        this._clock = defaultValue(options.clock, new Clock());
        this._transitioner = new SceneTransitioner(scene, ellipsoid);
        this._screenSpaceEventHandler = new ScreenSpaceEventHandler(canvas);
        this._useDefaultRenderLoop = undefined;
        this._renderLoopRunning = false;
        this._canRender = false;

        if (options.sceneMode) {
            if (options.sceneMode === SceneMode.SCENE2D) {
                this._transitioner.to2D();
            }
            if (options.sceneMode === SceneMode.COLUMBUS_VIEW) {
                this._transitioner.toColumbusView();
            }
        }

        this.useDefaultRenderLoop = defaultValue(options.useDefaultRenderLoop, true);
    };

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
         * Gets the scene transitioner.
         * @memberof CesiumWidget.prototype
         *
         * @type {SceneTransitioner}
         */
        sceneTransitioner : {
            get : function() {
                return this._transitioner;
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
         * Gets the Cesium logo element.
         * @memberof CesiumWidget.prototype
         *
         * @type {Element}
         */
        cesiumLogo : {
            get : function() {
                return this._cesiumLogo;
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
         * Gets the primary central body.
         * @memberof CesiumWidget.prototype
         *
         * @type {CentralBody}
         */
        centralBody : {
            get : function() {
                return this._centralBody;
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
         * Gets the event that will be raised when an error is encountered during the default render loop.
         * The widget instance and the generated exception are the only two parameters passed to the event handler.
         * <code>useDefaultRenderLoop</code> will be set to false whenever an exception is generated and must
         * be set back to true to continue rendering after an exception.
         * @memberof Viewer.prototype
         * @type {Event}
         */
        onRenderLoopError : {
            get : function() {
                return this._onRenderLoopError;
            }
        },

        /**
         * Gets or sets whether or not this widget should control the render loop.
         * If set to true the widget will use {@link requestAnimationFrame} to
         * perform rendering and resizing of the widget, as well as drive the
         * simulation clock. If set to false, you must manually call the
         * <code>resize</code>, <code>render</code> methods as part of a custom
         * render loop.
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
        }
    });

    /**
     * @memberof CesiumWidget
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CesiumWidget.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof CesiumWidget
     */
    CesiumWidget.prototype.destroy = function() {
        this._container.removeChild(this._element);
        destroyObject(this);
    };

    /**
     * Updates the canvas size, camera aspect ratio, and viewport size.
     * This function is called automatically as needed unless
     * <code>useDefaultRenderLoop</code> is set to false.
     * @memberof CesiumWidget
     */
    CesiumWidget.prototype.resize = function() {
        var canvas = this._canvas;
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;
        if (this._canvasWidth === width && this._canvasHeight === height) {
            return;
        }

        canvas.width = this._canvasWidth = width;
        canvas.height = this._canvasHeight = height;

        var canRender = width !== 0 && height !== 0;
        this._canRender = canRender;

        if (canRender) {
            var frustum = this._scene.getCamera().frustum;
            if (typeof frustum.aspectRatio !== 'undefined') {
                frustum.aspectRatio = width / height;
            } else {
                frustum.top = frustum.right * (height / width);
                frustum.bottom = -frustum.top;
            }
        }
    };

    /**
     * Renders the scene.  This function is called automatically
     * unless <code>useDefaultRenderLoop</code> is set to false;
     * @memberof CesiumWidget
     */
    CesiumWidget.prototype.render = function() {
        var currentTime = this._clock.tick();
        this._scene.initializeFrame();
        if (this._canRender) {
            this._scene.render(currentTime);
        }
    };

    return CesiumWidget;
});
