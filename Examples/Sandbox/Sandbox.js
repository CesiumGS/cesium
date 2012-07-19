var Sandbox = Sandbox || {};
(function() {
    "use strict";
    /*global Cesium,console*/

    /**
     * @constructor
     */
    Cesium.Sandbox = function() {
        var canvas = document.getElementById('glCanvas');
        var scene = new Cesium.Scene(canvas);
        var primitives = scene.getPrimitives();
        var ellipsoid = Cesium.Ellipsoid.WGS84;

        // TODO: make multiple tile providers available
        var bing = new Cesium.BingMapsTileProvider({
            server : 'dev.virtualearth.net',
            mapStyle : Cesium.BingMapsStyle.AERIAL,
            // Some versions of Safari support WebGL, but don't correctly implement
            // cross-origin image loading, so we need to load Bing imagery using a proxy.
            proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
        });

        var cb = new Cesium.CentralBody(ellipsoid);
        cb.dayTileProvider = bing;
        cb.nightImageSource = 'Images/land_ocean_ice_lights_2048.jpg';
        cb.specularMapSource = 'Images/earthspec1k.jpg';
        cb.cloudsMapSource = 'Images/earthcloudmaptrans.jpg';
        cb.bumpMapSource = 'Images/earthbump1k.jpg';
        cb.showSkyAtmosphere = true;
        cb.showGroundAtmosphere = true;

        primitives.setCentralBody(cb);

        scene.getCamera().getControllers().addSpindle();
        scene.getCamera().getControllers().get(0).constrainedAxis = Cesium.Cartesian3.UNIT_Z;

        scene.getCamera().getControllers().addFreeLook();

        scene.getCamera().frustum.near = 100.0;

        this._scene = scene;
        this._ellipsoid = ellipsoid;

        scene.setAnimation(function() {
            var camera = scene.getCamera();
            var cameraPosition = new Cesium.Cartesian4(camera.position.x, camera.position.y, camera.position.z, 1.0);
            scene.setSunPosition(camera.transform.multiplyByVector(cameraPosition));

            //  In case of canvas resize
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            scene.getContext().setViewport({
                x : 0,
                y : 0,
                width : canvas.width,
                height : canvas.height
            });

            scene.getCamera().frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;

            var s = Cesium.Sandbox.getCurrentCodeSnippet();
            if (s && s.animate) {
                s.animate();
            }
        });

        (function tick() {
            try {
                scene.render();
            } catch (e) {
                // Live editing can create invalid states, e.g., a conic sensor with inner half-angle
                // greater than outer half-angle, which cause exceptions.  We swallow the exceptions
                // to avoid losing the animation frame.
                console.log(e.message);
            }

            Cesium.requestAnimationFrame(tick);
        }());

        canvas.oncontextmenu = function(e) {
            e.preventDefault();
        };
        canvas.onselectstart = function(e) {
            e.preventDefault();
        };
    };

    Cesium.Sandbox.prototype.getScene = function() {
        return this._scene;
    };

    Cesium.Sandbox.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    Cesium.Sandbox.prototype.clearScene = function() {
        var scene = this._scene;
        scene.getPrimitives().removeAll();
        scene.getAnimations().removeAll();
    };
}());
