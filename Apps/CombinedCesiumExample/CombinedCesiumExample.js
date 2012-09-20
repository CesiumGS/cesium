function startCesium() {
    "use strict";
    /*global Cesium*/

    // After including the combined Cesium.js, all of Cesium is available as a global.
    // For more control over what is loaded, Cesium is also defined as modules for use
    // with an AMD loader, such as RequireJS or Dojo:  https://github.com/amdjs/amdjs-api/wiki/AMD

    var canvas = document.getElementById('glCanvas');
    var scene = new Cesium.Scene(canvas);

    var cb = new Cesium.CentralBody();
    cb.getImageLayers().addImageryProvider(new Cesium.SingleTileImageryProvider({
        url : '../../Images/NE2_50M_SR_W_4096.jpg'
    }));

    cb.nightImageSource = '../../Images/land_ocean_ice_lights_2048.jpg';
    cb.specularMapSource = '../../Images/earthspec1k.jpg';
    if (scene.getContext().getMaximumTextureSize() > 2048) {
        cb.cloudsMapSource = '../../Images/earthcloudmaptrans.jpg';
        cb.bumpMapSource = '../../Images/earthbump1k.jpg';
    }
    cb.showSkyAtmosphere = true;
    cb.showGroundAtmosphere = true;

    scene.getPrimitives().setCentralBody(cb);

    scene.getCamera().getControllers().addCentralBody();

    scene.setAnimation(function() {
        scene.setSunPosition(Cesium.computeSunPosition(new Cesium.JulianDate()));
    });

    // Prevent right-click from opening a context menu.
    canvas.oncontextmenu = function() {
        return false;
    };

    function onResize() {
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        if (canvas.width === width && canvas.height === height) {
            return;
        }

        canvas.width = width;
        canvas.height = height;
        scene.getCamera().frustum.aspectRatio = width / height;
    }
    window.addEventListener('resize', onResize, false);
    onResize();

    function tick() {
        scene.render();
        Cesium.requestAnimationFrame(tick);
    }
    tick();
}

window.addEventListener('load', startCesium, false);