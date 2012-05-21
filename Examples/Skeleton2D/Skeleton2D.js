/*global require*/
require({
    baseUrl : '../../Source'
}, ['Cesium'], function(Cesium) {
    "use strict";
    //A real application should require only the subset of modules that
    //are actually used, instead of requiring the Cesium module, which
    //includes everything.

    var ellipsoid = Cesium.Ellipsoid.WGS84;

    var scene3D = new Cesium.Scene(document.getElementById("canvas3D"));
    var scene2D = new Cesium.Scene(document.getElementById("canvas2D"));

    function isSafari() {
        return (/safari/i).test(navigator.userAgent) && !(/chrome/i).test(navigator.userAgent);
    }

    var bing = new Cesium.BingMapsTileProvider({
        server : "dev.virtualearth.net",
        mapStyle : Cesium.BingMapsStyle.AERIAL,
        //Safari does not currently implement CORS properly, so we need to load Bing imagery
        //through a proxy.  Other browsers work correctly without the proxy.
        proxy : isSafari() ? new Cesium.DefaultProxy('/proxy/') : undefined
    });

    function create(scene) {
        var primitives = scene.getPrimitives();
        var cb = new Cesium.CentralBody(scene.getCamera(), ellipsoid);
        cb.dayTileProvider = bing;
        cb.nightImageSource = "../../Images/land_ocean_ice_lights_2048.jpg";
        cb.specularMapSource = "../../Images/earthspec1k.jpg";
        cb.bumpMapSource = "../../Images/earthbump1k.jpg";
        primitives.setCentralBody(cb);

        ///////////////////////////////////////////////////////////////////////////
        // Add examples from the Sandbox here:

        scene.setAnimation(function() {
            scene.setSunPosition(Cesium.SunPosition.compute().position);
        });
    }

    create(scene3D);
    scene3D.getCamera().getControllers().addSpindle();
    scene3D.getCamera().getControllers().addFreeLook();

    create(scene2D);

    var transitioner = new Cesium.SceneTransitioner(scene2D);
    transitioner.to2D();

    (function tick() {
        scene3D.render();
        scene2D.render();
        Cesium.requestAnimationFrame(tick);
    }());

    document.oncontextmenu = function() {
        return false;
    };
});