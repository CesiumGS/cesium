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

//    var terrainProvider = new Cesium.EllipsoidTerrainProvider(new Cesium.WebMercatorTilingScheme({
//        ellipsoid : ellipsoid,
//        numberOfLevelZeroTilesX : 2,
//        numberOfLevelZeroTilesY : 2
//    }));

    var terrainProvider = new Cesium.ArcGisImageServerTerrainProvider({
        url : 'http://elevation.arcgisonline.com/ArcGIS/rest/services/WorldElevation/DTMEllipsoidal/ImageServer',
        token : 'BOYnN62oRWrK_9EGaqz8yi9OnF5vlVdymcTDXB11glKd3Ex8Bzp0VS5QCiJN6nFssS5R1_fFXZiCeML_44JCUA..',
        proxy : new Cesium.DefaultProxy('/terrain/')
    });

    var imageryLayerCollection = new Cesium.ImageryLayerCollection();

    var esriLayer = imageryLayerCollection.addImageryProvider(new Cesium.ArcGisMapServerImageryProvider({
        url : 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        proxy : new Cesium.DefaultProxy('/proxy/')
    }));

    var cesiumLogo = new Cesium.SingleTileImageryProvider(
            '../../Images/TestLayer.png',
            new Cesium.Extent(
                    Cesium.Math.toRadians(-120),
                    Cesium.Math.toRadians(37),
                    Cesium.Math.toRadians(-119),
                    Cesium.Math.toRadians(38)));
    imageryLayerCollection.addImageryProvider(cesiumLogo);

//    var bingAerialLayer = imageryLayerCollection.addImageryProvider(new Cesium.BingMapsImageryProvider({
//        server : 'dev.virtualearth.net',
//        mapStyle : Cesium.BingMapsStyle.AERIAL,
//        // Some versions of Safari support WebGL, but don't correctly implement
//        // cross-origin image loading, so we need to load Bing imagery using a proxy.
//        proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
//    }));
//
//    var bingRoadLayer = imageryLayerCollection.addImageryProvider(new Cesium.BingMapsImageryProvider({
//        server : 'dev.virtualearth.net',
//        mapStyle : Cesium.BingMapsStyle.ROAD,
//        // Some versions of Safari support WebGL, but don't correctly implement
//        // cross-origin image loading, so we need to load Bing imagery using a proxy.
//        proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
//    }));
//
//    var solidColorLayer = imageryLayerCollection.addImageryProvider(new Cesium.SolidColorImageryProvider());

    var cb = new Cesium.CentralBody(ellipsoid, terrainProvider, imageryLayerCollection);

    cb.nightImageSource = '../../Images/land_ocean_ice_lights_2048.jpg';
    cb.specularMapSource = '../../Images/earthspec1k.jpg';
    if (scene.getContext().getMaximumTextureSize() > 2048) {
        cb.cloudsMapSource = '../../Images/earthcloudmaptrans.jpg';
        cb.bumpMapSource = '../../Images/earthbump1k.jpg';
    }
    cb.showSkyAtmosphere = true;
    cb.showGroundAtmosphere = true;
    cb.showNight = false;
    cb.affectedByLighting = false;
    primitives.setCentralBody(cb);

    scene.getCamera().frustum.near = 100.0;
    scene.getCamera().frustum.far = 10000000.0;
    scene.getCamera().getControllers().addCentralBody();

    var transitioner = new Cesium.SceneTransitioner(scene, ellipsoid);

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
    // Example mouse & keyboard handlers

    function keydownHandler(e) {
        switch (e.keyCode) {
        case 'Q'.charCodeAt(0):
            imageryLayerCollection.raise(bingAerialLayer);
            break;
        case 'A'.charCodeAt(0):
            imageryLayerCollection.lower(bingAerialLayer);
            break;
        case 'W'.charCodeAt(0):
            imageryLayerCollection.raise(bingRoadLayer);
            break;
        case 'S'.charCodeAt(0):
            imageryLayerCollection.lower(bingRoadLayer);
            break;
        case 'E'.charCodeAt(0):
            imageryLayerCollection.raise(esriLayer);
            break;
        case 'D'.charCodeAt(0):
            imageryLayerCollection.lower(esriLayer);
            break;
        case "3".charCodeAt(0): // "3" -> 3D globe
            cb.showSkyAtmosphere = true;
            cb.showGroundAtmosphere = true;
            transitioner.morphTo3D();
            break;
        case "2".charCodeAt(0): // "2" -> Columbus View
            cb.showSkyAtmosphere = false;
            cb.showGroundAtmosphere = false;
            transitioner.morphToColumbusView();
            break;
        case "1".charCodeAt(0): // "1" -> 2D map
            cb.showSkyAtmosphere = false;
            cb.showGroundAtmosphere = false;
            transitioner.morphTo2D();
            break;
        }
    }

    document.addEventListener('keydown', keydownHandler, false);

    canvas.oncontextmenu = function() {
        return false;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Example resize handler

    var onResize = function () {
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        if (canvas.width === width && canvas.height === height) {
            return;
        }

        canvas.width = width;
        canvas.height = height;

        scene.getContext().setViewport({
            x : 0,
            y : 0,
            width : width,
            height : height
        });

        scene.getCamera().frustum.aspectRatio = width / height;
    };
    window.addEventListener('resize', onResize, false);
    onResize();
});