/*global define*/
define([
        '../ClockViewModel',
        '../../Core/buildModuleUrl',
        '../../Core/Cartesian2',
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
        ClockViewModel,
        buildModuleUrl,
        Cartesian2,
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
     * @param {Clock} [options.clockViewModel=new ClockViewModel()] The clock to use to control current time.
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

        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this.clockViewModel = options.clockViewModel;
        if (typeof this.clockViewModel === 'undefined') {
            this.clockViewModel = new ClockViewModel();
            this.clockViewModel.clock.multiplier = 10000;
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

        var centralBody = new CentralBody(this._ellipsoid);
        centralBody.logoOffset = new Cartesian2(125, 0);
        this.scene.getPrimitives().setCentralBody(centralBody);
        this.centralBody = centralBody;

        var imageryProvider = options.imageryProvider;
        if (typeof imageryProvider === 'undefined') {
            imageryProvider = new BingMapsImageryProvider({
                url : 'http://dev.virtualearth.net',
                // Some versions of Safari support WebGL, but don't correctly implement
                // cross-origin image loading, so we need to load Bing imagery using a proxy.
                proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('http://cesium.agi.com/proxy/')
            });
        }
        centralBody.getImageryLayers().addImageryProvider(imageryProvider);

        if (typeof options.terrainProvider !== 'undefined') {
            centralBody.terrainProvider = options.terrainProvider;
        }

        this.transitioner = new SceneTransitioner(this.scene, this._ellipsoid);

        this.resize();

        this._needResize = false;
        var autoResize = defaultValue(options.autoResize, true);
        if (autoResize) {
            window.addEventListener('resize', function() {
                widget._needResize = true;
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
     * Update and re-render the scene.  This function is called automatically.
     */
    CesiumWidget.prototype.render = function() {
        if (this._needResize) {
            this.resize();
            this._needResize = false;
        }

        if (this._showSkyAtmosphere !== this.showSkyAtmosphere) {
            if (this.showSkyAtmosphere) {
                this.scene.skyAtmosphere = new SkyAtmosphere(this._ellipsoid);
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
            } else if (typeof this.scene.skyBox !== 'undefined') {
                this.scene.skyBox = this.scene.skyBox.destroy();
            }
            this._showStars = this.showStars;
        }

        var currentTime = this.clockViewModel.clock.tick();
        this.scene.initializeFrame();
        this.scene.render(currentTime);
    };

    return CesiumWidget;
});
