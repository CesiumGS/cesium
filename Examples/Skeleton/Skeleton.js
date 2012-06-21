/*global require*/
require({
    baseUrl : '../../Source'
}, ['Cesium'], function(Cesium) {
    "use strict";
    //A real application should require only the subset of modules that
    //are actually used, instead of requiring the Cesium module, which
    //includes everything.

    var canvas = document.getElementById('glCanvas');
    var ellipsoid = Cesium.Ellipsoid.WGS84; // Used in many Sandbox examples
    var scene = new Cesium.Scene(canvas);
    var primitives = scene.getPrimitives();

    var cb = new Cesium.CentralBody(ellipsoid);

    var aerial = new Cesium.ImageryLayer(cb, new Cesium.BingMapsTileProvider({
        server : 'dev.virtualearth.net',
        mapStyle : Cesium.BingMapsStyle.AERIAL,
        // Some versions of Safari support WebGL, but don't correctly implement
        // cross-origin image loading, so we need to load Bing imagery using a proxy.
        proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
    }));
    cb.getImageLayers().add(aerial);

    var road = new Cesium.ImageryLayer(cb, new Cesium.BingMapsTileProvider({
        server : 'dev.virtualearth.net',
        mapStyle : Cesium.BingMapsStyle.ROAD,
        // Some versions of Safari support WebGL, but don't correctly implement
        // cross-origin image loading, so we need to load Bing imagery using a proxy.
        proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
    }));
    cb.getImageLayers().add(road);

    var esri = new Cesium.ImageryLayer(cb, new Cesium.ArcGISMapServerTileProvider({
        url : 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        proxy : new Cesium.DefaultProxy('/proxy/')
    }));
    cb.getImageLayers().add(esri);

    cb.nightImageSource = '../../Images/land_ocean_ice_lights_2048.jpg';
    cb.specularMapSource = '../../Images/earthspec1k.jpg';
    if (scene.getContext().getMaximumTextureSize() > 2048) {
        cb.cloudsMapSource = '../../Images/earthcloudmaptrans.jpg';
        cb.bumpMapSource = '../../Images/earthbump1k.jpg';
    }
    cb.showSkyAtmosphere = false;
    cb.showGroundAtmosphere = false;
    cb.showNight = false;
    cb.affectedByLighting = false;
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

    var handler = new Cesium.EventHandler();

    handler.setKeyAction(function() {
        cb.getImageLayers().raise(aerial);
    }, '1');

    handler.setKeyAction(function() {
        cb.getImageLayers().lower(aerial);
    }, '2');

    handler.setKeyAction(function() {
        cb.getImageLayers().raise(esri);
    }, '3');

    handler.setKeyAction(function() {
        cb.getImageLayers().lower(esri);
    }, '4');

    canvas.oncontextmenu = function() {
        return false;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Example resize handler

    window.onresize = function () {
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        if (canvas.width === width && canvas.height === height) {
            return;
        }

        canvas.width = width;
        canvas.height = height;

        scene.getContext().setViewport({
            x: 0,
            y: 0,
            width: width,
            height: height
        });

        scene.getCamera().frustum.aspectRatio = width / height;
    };
    window.onresize();
});