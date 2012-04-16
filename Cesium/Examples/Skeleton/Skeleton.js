(function() {
    "use strict";
    /*global document, Cesium*/

    var canvas = document.getElementById("glCanvas");
    var ellipsoid = Cesium.Ellipsoid.getWgs84(); // Used in many Sandbox examples
    var scene = new Cesium.Scene(canvas);
    var primitives = scene.getPrimitives();

    // Bing Maps
    var bing = new Cesium.BingMapsTileProvider({
        server : "dev.virtualearth.net",
        mapStyle : Cesium.BingMapsStyle.AERIAL
    });

    var cb = new Cesium.CentralBody(scene.getCamera(), ellipsoid);
    cb.dayTileProvider = bing;
    cb.nightImageSource = "Images/land_ocean_ice_lights_2048.jpg";
    cb.specularMapSource = "Images/earthspec1k.jpg";
    if (scene.getContext().getMaximumTextureSize() > 2048) {
        cb.cloudsMapSource = "Images/earthcloudmaptrans.jpg";
        cb.bumpMapSource = "Images/earthbump1k.jpg";
    }
    cb.showSkyAtmosphere = true;
    cb.showGroundAtmosphere = true;
    primitives.setCentralBody(cb);

    scene.getCamera().frustum.near = 1.0;

    scene.getCamera().getControllers().addSpindle();
    scene.getCamera().getControllers().addFreeLook();

    ///////////////////////////////////////////////////////////////////////////
    // Add examples from the Sandbox here:

    ///////////////////////////////////////////////////////////////////////////

    scene.setAnimation(function() {
        //scene.setSunPosition(scene.getCamera().position);
        scene.setSunPosition(Cesium.SunPosition.compute().position);

        // Add code here to update primitives based on changes to animation time, camera parameters, etc.
    });

    (function tick() {
        scene.render();
        Cesium.requestAnimationFrame(tick);
    }());

    ///////////////////////////////////////////////////////////////////////////
    // Example keyboard and Mouse handlers

    var handler = new Cesium.EventHandler(canvas);

    handler.setKeyAction(function() {
        /* ... */
        // Handler for key press
    }, "1");

    handler.setMouseAction(function(movement) {
        /* ... */
        // Use movement.startX, movement.startY, movement.endX, movement.endY
    }, Cesium.MouseEventType.MOVE);

    document.oncontextmenu = function() {
        return false;
    };
}());
