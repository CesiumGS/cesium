(function () {
    "use strict";
    /*global Cesium, Sandbox*/

    Sandbox.BingMaps = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // Bing Maps
            var bing = new Cesium.BingMapsTileProvider({
                server : "dev.virtualearth.net",
                mapStyle : Cesium.BingMapsStyle.AERIAL
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

    Sandbox.Single = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // Single texture
            var single = new Cesium.SingleTileProvider("Images/NE2_50M_SR_W_4096.jpg");
            primitives.getCentralBody().dayTileProvider = single;
        };
    };

    Sandbox.WMS = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // WMS
            var wms = new Cesium.WebMapServiceCapabilities({
                url : 'http://wms1.agr.gc.ca/cgi-bin/mapplant1967_f',
                proxy : '/proxy/'
            });
            wms.getCapabilities(function(b) {
                if( b ) {

                }
            });
            //primitives.getCentralBody().dayTileProvider = bing;
        };
    };

}());
