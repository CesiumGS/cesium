/*global require*/
require({ baseUrl : '../../Source' }, [
        'Core/Ellipsoid',
        'Core/SunPosition',
        'Core/EventHandler',
        'Core/MouseEventType',
        'Core/requestAnimationFrame',
        'Scene/Scene',
        'Scene/CentralBody',
        'Scene/BingMapsTileProvider',
        'Scene/BingMapsStyle'
    ], function(
        Ellipsoid,
        SunPosition,
        EventHandler,
        MouseEventType,
        requestAnimationFrame,
        Scene,
        CentralBody,
        BingMapsTileProvider,
        BingMapsStyle) {
    "use strict";
    /*global document*/

    var canvas = document.getElementById("glCanvas");
    var ellipsoid = Ellipsoid.getWgs84(); // Used in many Sandbox examples
    var scene = new Scene(canvas);
    var primitives = scene.getPrimitives();

    // Bing Maps
    var bing = new BingMapsTileProvider({
        server : "dev.virtualearth.net",
        mapStyle : BingMapsStyle.AERIAL
    });

    var cb = new CentralBody(scene.getCamera(), ellipsoid);
    cb.dayTileProvider = bing;
    cb.nightImageSource = "../../../Images/land_ocean_ice_lights_2048.jpg";
    cb.specularMapSource = "../../../Images/earthspec1k.jpg";
    if (scene.getContext().getMaximumTextureSize() > 2048) {
        cb.cloudsMapSource = "../../../Images/earthcloudmaptrans.jpg";
        cb.bumpMapSource = "../../../Images/earthbump1k.jpg";
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
        scene.setSunPosition(SunPosition.compute().position);

        // Add code here to update primitives based on changes to animation time, camera parameters, etc.
    });

    (function tick() {
        scene.render();
        requestAnimationFrame(tick);
    }());

    ///////////////////////////////////////////////////////////////////////////
    // Example keyboard and Mouse handlers

    var handler = new EventHandler(canvas);

    handler.setKeyAction(function() {
        /* ... */
        // Handler for key press
    }, "1");

    handler.setMouseAction(function(movement) {
        /* ... */
        // Use movement.startX, movement.startY, movement.endX, movement.endY
    }, MouseEventType.MOVE);

    document.oncontextmenu = function() {
        return false;
    };
});