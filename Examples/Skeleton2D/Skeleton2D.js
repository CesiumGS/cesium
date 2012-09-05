/*global require*/
require({
    baseUrl : '../../Source'
}, ['Cesium'], function(Cesium) {
    "use strict";
    //A real application should require only the subset of modules that
    //are actually used, instead of requiring the Cesium module, which
    //includes everything.

    var ellipsoid = Cesium.Ellipsoid.WGS84;

    var canvas3D = document.getElementById('canvas3D');
    var scene3D = new Cesium.Scene(canvas3D);

    var canvas2D = document.getElementById('canvas2D');
    var scene2D = new Cesium.Scene(canvas2D);

    var bing3D = new Cesium.BingMapsTileProvider({
        server : 'dev.virtualearth.net',
        mapStyle : Cesium.BingMapsStyle.AERIAL,
        // Some versions of Safari support WebGL, but don't correctly implement
        // cross-origin image loading, so we need to load Bing imagery using a proxy.
        proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
    });

    var bing2D = new Cesium.BingMapsTileProvider({
        server : 'dev.virtualearth.net',
        mapStyle : Cesium.BingMapsStyle.AERIAL,
        // Some versions of Safari support WebGL, but don't correctly implement
        // cross-origin image loading, so we need to load Bing imagery using a proxy.
        proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
    });

    function create(scene, imagery) {
        var primitives = scene.getPrimitives();
        var cb = new Cesium.CentralBody(ellipsoid);
        cb.dayTileProvider = imagery;
        cb.nightImageSource = '../../Images/land_ocean_ice_lights_2048.jpg';
        cb.specularMapSource = '../../Images/earthspec1k.jpg';
        cb.bumpMapSource = '../../Images/earthbump1k.jpg';
        primitives.setCentralBody(cb);

        ///////////////////////////////////////////////////////////////////////////
        // Add examples from the Sandbox here:

        scene.setAnimation(function() {
            scene.setSunPosition(Cesium.computeSunPosition(new Cesium.JulianDate()));
        });
    }

    create(scene3D, bing3D);
    scene3D.getCamera().getControllers().addSpindle();
    scene3D.getCamera().getControllers().addFreeLook();

    create(scene2D, bing2D);

    var transitioner = new Cesium.SceneTransitioner(scene2D);
    transitioner.to2D();

    (function tick() {
        scene3D.render();
        scene2D.render();
        Cesium.requestAnimationFrame(tick);
    }());

    function keydownHandler(e) {
        var keyCode = e.keyCode;
        if (keyCode === 51) {
            transitioner.morphTo3D();
        } else if (keyCode === 50) {
            transitioner.morphToColumbusView();
        } else if (keyCode === 49) {
            transitioner.morphTo2D();
        }
    }
    document.addEventListener('keydown', keydownHandler, false);

    canvas3D.oncontextmenu = canvas2D.oncontextmenu = function() {
        return false;
    };
});