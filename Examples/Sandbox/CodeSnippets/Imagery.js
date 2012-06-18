(function () {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.BingMaps = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // Bing Maps
            var bing = new Cesium.BingMapsTileProvider({
                server : 'dev.virtualearth.net',
                mapStyle : Cesium.BingMapsStyle.AERIAL,
                // Some versions of Safari support WebGL, but don't correctly implement
                // cross-origin image loading, so we need to load Bing imagery using a proxy.
                proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
            });

            primitives.getCentralBody().dayTileProvider = bing;
        };
    };

    Sandbox.ArcGIS = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // ArcGIS World Street Maps
            var arcgis = new Cesium.ArcGISTileProvider({
                host : 'server.arcgisonline.com',
                root : 'ArcGIS/rest',
                service : 'World_Street_Map',
                proxy : new Cesium.DefaultProxy('/proxy/')
            });

            primitives.getCentralBody().dayTileProvider = arcgis;
        };
    };

    Sandbox.ArcGISImageServer = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // ArcGIS WorldElevation/DTMEllipsoidal
            // The token below is only valid when the hosted on http://localhost:8080!
            // You can generate a new token by visiting http://elevation.arcgisonline.com/arcgis/REST/services
            // and clicking "Get Token" in the top-right corner.
            var arcgisimage = new Cesium.ArcGISImageServerTileProvider({
                host : 'elevation.arcgisonline.com',
                folder : 'WorldElevation',
                service : 'DTMEllipsoidal',
                token : '2G0dIXqmsH4zKVl7BZqNdsLUHKpCDfetelnSAZPkcC4CeHaL32TezkF9-x3blRiq_30O4FAYFv7ujgydVW-HDQ..',
                proxy : new Cesium.DefaultProxy('/tiffToPng/')
            });

            primitives.getCentralBody().dayTileProvider = arcgisimage;
        };
    };

    Sandbox.OSM = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // OpenStreetMaps
            var osm = new Cesium.OpenStreetMapTileProvider({
                proxy : new Cesium.DefaultProxy('/proxy/')
            });

            primitives.getCentralBody().dayTileProvider = osm;
        };
    };

    Sandbox.MQOSM = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // MapQuest OpenStreetMaps
            var mqOsm = new Cesium.OpenStreetMapTileProvider({
                url : 'http://otile1.mqcdn.com/tiles/1.0.0/osm/',
                proxy : new Cesium.DefaultProxy('/proxy/')
            });

            primitives.getCentralBody().dayTileProvider = mqOsm;
        };
    };

    Sandbox.MQAerialOSM = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // MapQuest Aerial OpenStreetMaps
            var mqAerialOsm = new Cesium.OpenStreetMapTileProvider({
                url : 'http://oatile1.mqcdn.com/naip/',
                proxy : new Cesium.DefaultProxy('/proxy/')
            });

            primitives.getCentralBody().dayTileProvider = mqAerialOsm;
        };
    };

    Sandbox.Stamen = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // Stamen maps: http://maps.stamen.com
            // Other map urls:
            // * http://tile.stamen.com/watercolor/
            // * http://tile.stamen.com/terrain/
            var layer = new Cesium.OpenStreetMapTileProvider({
                url : 'http://tile.stamen.com/toner/',
                fileExtension : 'jpg',
                proxy : new Cesium.DefaultProxy('/proxy/'),
                credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
            });

            primitives.getCentralBody().dayTileProvider = layer;
        };
    };

    Sandbox.Single = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // Single texture
            var single = new Cesium.SingleTileProvider('Images/NE2_50M_SR_W_4096.jpg');

            primitives.getCentralBody().dayTileProvider = single;
        };
    };

    Sandbox.CompositeTiler = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // Bing Maps
            var bing = new Cesium.BingMapsTileProvider({
                server : 'dev.virtualearth.net',
                mapStyle : Cesium.BingMapsStyle.AERIAL,
                // Some versions of Safari support WebGL, but don't correctly implement
                // cross-origin image loading, so we need to load Bing imagery using a proxy.
                proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
            });

            // Single texture
            var single = new Cesium.SingleTileProvider('Images/NE2_50M_SR_W_4096.jpg');

            // Composite tile provider
            var composite = new Cesium.CompositeTileProvider([{
                provider : single,
                height : 1000000
            }, {
                provider : bing,
                height : 0
            }], scene.getCamera(), ellipsoid);

            primitives.getCentralBody().dayTileProvider = composite;
        };
    };

}());
