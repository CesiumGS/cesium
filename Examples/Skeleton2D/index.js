/*global require*/
require({ baseUrl : '../../Source' }, [
        'Core/Ellipsoid',
        'Core/SunPosition',
        'Core/requestAnimationFrame',
        'Scene/Scene',
        'Scene/CentralBody',
        'Scene/BingMapsTileProvider',
        'Scene/BingMapsStyle',
        'Scene/SceneTransitioner'
    ], function(
        Ellipsoid,
        SunPosition,
        requestAnimationFrame,
        Scene,
        CentralBody,
        BingMapsTileProvider,
        BingMapsStyle,
        SceneTransitioner) {
    "use strict";

    var ellipsoid = Ellipsoid.WGS84;

    var scene3D = new Scene(document.getElementById("canvas3D"));
    var scene2D = new Scene(document.getElementById("canvas2D"));

    var bing = new BingMapsTileProvider({
        server : "dev.virtualearth.net",
        mapStyle : BingMapsStyle.AERIAL
    });

    function create(scene) {
        var primitives = scene.getPrimitives();
        var cb = new CentralBody(scene.getCamera(), ellipsoid);
        cb.dayTileProvider = bing;
        cb.nightImageSource = "../../Images/land_ocean_ice_lights_2048.jpg";
        cb.specularMapSource = "../../Images/earthspec1k.jpg";
        cb.bumpMapSource = "../../Images/earthbump1k.jpg";
        primitives.setCentralBody(cb);

        ///////////////////////////////////////////////////////////////////////////
        // Add examples from the Sandbox here:

        scene.setAnimation(function() {
            scene.setSunPosition(SunPosition.compute().position);
        });
    }

    create(scene3D);
    scene3D.getCamera().getControllers().addSpindle();
    scene3D.getCamera().getControllers().addFreeLook();

    create(scene2D);

    var transitioner = new SceneTransitioner(scene2D);
    transitioner.to2D();

    (function tick() {
        scene3D.render();
        scene2D.render();
        requestAnimationFrame(tick);
    }());

    document.oncontextmenu = function() {
        return false;
    };
});