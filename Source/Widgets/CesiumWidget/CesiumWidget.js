/*global define*/
define([
        '../../Core/buildModuleUrl',
        '../../Core/Cartesian2',
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
     * @param {DOMElement|String} container The DOM element, or ID of a page element, that will contain the widget.
     * @param {Object} [options={}] Configuration options for the widget.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to use for the central body in the scene.
     * @param {Clock} [options.clock=new Clock()] The clock to use to control current time.
     * @param {Boolean} [options.showStars=true] Whether stars are drawn around the globe.
     * @param {Boolean} [options.showSkyAtmosphere=true] Whether a sky atmosphere is drawn around the globe.
     * @param {Boolean} [options.autoResize=true] Whether to automatically resize the widget when the browser window resizes. This is needed when the widget fills the browser window, or is part of a fluid layout where the size of the widget changes as the window changes size.
     */
    var CesiumWidget = function(container, options) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof container === 'string') {
            this.container = document.getElementById(container);
        } else {
            this.container = container;
        }

        var widget = this;

        options = defaultValue(options, {});

        this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this.clock = options.clock;
        if (typeof this.clock === 'undefined') {
            this.clock = new Clock();
        }

        /**
         * Whether stars are drawn around the globe.
         *
         * @type {Boolean}
         * @default true
         *
         * @see SkyBox
         */
        this.showStars = defaultValue(options.showStars, true);
        this._showStars = undefined;

        /**
         * Whether a sky atmosphere is drawn around the globe.
         *
         * @type {Boolean}
         * @default true
         *
         * @see SkyAtmosphere
         */
        this.showSkyAtmosphere = defaultValue(options.showSkyAtmosphere, true);
        this._showSkyAtmosphere = undefined;

        this.widgetNode = document.createElement('div');
        this.widgetNode.className = 'cesium-widget';
        this.container.appendChild(this.widgetNode);

        this.canvas = document.createElement('canvas');
        this.canvas.oncontextmenu = function() {
            return false;
        };
        this.canvas.onselectstart = function() {
            return false;
        };
        this.widgetNode.appendChild(this.canvas);

        this.cesiumLogo = document.createElement('a');
        this.cesiumLogo.href = 'http://cesium.agi.com/';
        this.cesiumLogo.target = '_blank';
        this.cesiumLogo.className = 'cesium-logo';
        this.widgetNode.appendChild(this.cesiumLogo);

        this.scene = new Scene(this.canvas);

        this.centralBody = new CentralBody(this.ellipsoid);
        this.centralBody.logoOffset = new Cartesian2(125, 0);
        this.scene.getPrimitives().setCentralBody(this.centralBody);

        var imageryProvider = options.imageryProvider;
        if (typeof imageryProvider === 'undefined') {
            imageryProvider = new BingMapsImageryProvider({
                url : 'http://dev.virtualearth.net',
                // Some versions of Safari support WebGL, but don't correctly implement
                // cross-origin image loading, so we need to load Bing imagery using a proxy.
                proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('http://cesium.agi.com/proxy/')
            });
        }

        this.imageryLayer = this.centralBody.getImageryLayers().addImageryProvider(imageryProvider);

        this.transitioner = new SceneTransitioner(this.scene, this.ellipsoid);

        this.resize();

        var autoResize = defaultValue(options.autoResize, true);
        if (autoResize) {
            window.addEventListener('resize', function() {
                widget.resize();
            }, false);
        }

        function render() {
            widget.render();
            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    };

    /**
     * Call this function when the widget changes size, to update the canvas size,
     * camera aspect ratio, and viewport size.
     */
    CesiumWidget.prototype.resize = function() {
        var width = this.canvas.clientWidth;
        var height = this.canvas.clientHeight;

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
    };

    /**
     * Update and re-render the scene.  This function is called automatically.
     */
    CesiumWidget.prototype.render = function() {
        if (this._showSkyAtmosphere !== this.showSkyAtmosphere) {
            if (this.showSkyAtmosphere) {
                this.scene.skyAtmosphere = new SkyAtmosphere();
            } else {
                if (typeof this.scene.skyAtmosphere !== 'undefined') {
                    this.scene.skyAtmosphere.destroy();
                }
                this.scene.skyAtmosphere = undefined;
            }
            this._showSkyAtmosphere = this.showSkyAtmosphere;
        }

        if (this._showStars !== this.showStars) {
            if (this.showStars) {
                this.scene.skyBox = new SkyBox({
                    positiveX : getDefaultSkyBoxUrl('px'),
                    negativeX : getDefaultSkyBoxUrl('mx'),
                    positiveY : getDefaultSkyBoxUrl('py'),
                    negativeY : getDefaultSkyBoxUrl('my'),
                    positiveZ : getDefaultSkyBoxUrl('pz'),
                    negativeZ : getDefaultSkyBoxUrl('mz')
                });
            } else {
                if (typeof this.scene.skyBox !== 'undefined') {
                    this.scene.skyBox.destroy();
                }
                this.scene.skyBox = undefined;
            }
            this._showStars = this.showStars;
        }

        this.clock.tick();

        var currentTime = this.clock.currentTime;
        this.scene.initializeFrame();
        this.scene.render(currentTime);
    };

    return CesiumWidget;
});
