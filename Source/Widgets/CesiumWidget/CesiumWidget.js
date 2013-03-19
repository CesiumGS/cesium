/*global define*/
define(['../../Core/buildModuleUrl',
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/Clock',
        '../../Core/DefaultProxy',
        '../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/FeatureDetection',
        '../../Core/requestAnimationFrame',
        '../../Scene/BingMapsImageryProvider',
        '../../Scene/CentralBody',
        '../../Scene/Scene',
        '../../Scene/SceneTransitioner',
        '../../Scene/SkyBox',
        '../../Scene/SkyAtmosphere'
    ], function(
        buildModuleUrl,
        Cartesian2,
        Cartesian3,
        Clock,
        DefaultProxy,
        defaultValue,
        DeveloperError,
        Ellipsoid,
        FeatureDetection,
        requestAnimationFrame,
        BingMapsImageryProvider,
        CentralBody,
        Scene,
        SceneTransitioner,
        SkyBox,
        SkyAtmosphere) {
    "use strict";

    function getDefaultSkyBoxUrl(suffix) {
        return buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_' + suffix + '.jpg');
    }

    /**
     * A widget containing a Cesium scene.
     *
     * @alias CesiumWidget
     * @constructor
     *
     * @param {Element|String} container The DOM element, or ID of a page element, that will contain the widget.
     * @param {Object} [options] Configuration options for the widget.
     * @param {Clock} [options.clock=new Clock()] The clock to use to control current time.
     * @param {ImageryProvider} [options.baseMap=new BingMapsImageryProvider()] The basemap imagery provider.
     * @param {TerrainProvider} [options.terrainProvider=new EllipsoidTerrainProvider] The terrain provider.
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
     * //Widget with OpenStreetMaps baseMap and Cesium terrain provider hosted by AGI.
     * var widget = new Cesium.CesiumWidget('cesiumContainer', {
     *     baseMap : new Cesium.OpenStreetMapImageryProvider(),
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

        if (typeof container === 'string') {
            var tmp = document.getElementById(container);
            if (tmp === null) {
                throw new DeveloperError('Element with id "' + container + '" does not exist in the document.');
            }
            container = tmp;
        }

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
        cesiumLogo.className = 'cesium-logo';
        widgetNode.appendChild(cesiumLogo);

        var scene = new Scene(canvas);
        scene.getCamera().controller.constrainedAxis = Cartesian3.UNIT_Z;

        var _ellipsoid = Ellipsoid.WGS84;

        var centralBody = new CentralBody(_ellipsoid);
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

        scene.skyAtmosphere = new SkyAtmosphere(_ellipsoid);

        //Set the base imagery layer
        var baseMap = options.baseMap;
        if (typeof baseMap === 'undefined') {
            baseMap = new BingMapsImageryProvider({
                url : 'http://dev.virtualearth.net',
                // Some versions of Safari support WebGL, but don't correctly implement
                // cross-origin image loading, so we need to load Bing imagery using a proxy.
                proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('http://cesium.agi.com/proxy/')
            });
        }
        centralBody.getImageryLayers().addImageryProvider(baseMap);

        //And the terrain provider if one is provided.
        if (typeof options.terrainProvider !== 'undefined') {
            centralBody.terrainProvider = options.terrainProvider;
        }

        /**
         * Gets the parent container.
         * @memberof CesiumWidget
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the widget DOM element, which contains the canvas and Cesium logo.
         * @memberof CesiumWidget
         * @type {Element}
         */
        this.widgetNode = widgetNode;

        /**
         * Gets the canvas.
         * @memberof CesiumWidget
         * @type {Canvas}
         */
        this.canvas = canvas;

        /**
         * Gets the Cesium logo.
         * @memberof CesiumWidget
         * @type {Element}
         */
        this.cesiumLogo = cesiumLogo;

        /**
         * Gets the scene.
         * @memberof CesiumWidget
         * @type {Scene}
         */
        this.scene = scene;

        /**
         * Gets the central body.
         * @memberof CesiumWidget
         * @type {CentralBody}
         */
        this.centralBody = centralBody;

        /**
         * Gets the clock view model.
         * @memberof CesiumWidget
         * @type {Clock}
         */
        this.clock = defaultValue(options.clock, new Clock());

        /**
         * Gets the scene transitioner.
         * @memberof CesiumWidget
         * @type {SceneTransitioner}
         */
        this.transitioner = new SceneTransitioner(scene, _ellipsoid);

        var widget = this;
        //Subscribe for resize events and set the initial size.
        this._needResize = false;
        this.resize();
        window.addEventListener('resize', function() {
            widget._needResize = true;
        }, false);

        //Create and start the render loop
        function render() {
            widget.render();
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    };

    /**
     * Call this function when the widget changes size, to update the canvas
     * size, camera aspect ratio, and viewport size. This function is called
     * automatically on window resize.
     */
    CesiumWidget.prototype.resize = function() {
        var width = this.canvas.clientWidth;
        var height = this.canvas.clientHeight;

        if (this.canvas.width === width && this.canvas.height === height) {
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
    };

    /**
     * Forces an update and render of the scene. This function is called
     * automatically.
     */
    CesiumWidget.prototype.render = function() {
        if (this._needResize) {
            this.resize();
            this._needResize = false;
        }

        var currentTime = this.clock.tick();
        this.scene.initializeFrame();
        this.scene.render(currentTime);
    };

    return CesiumWidget;
});
