(function() {
    "use strict";
    /*global console*/

    if (typeof window.Cesium === 'undefined') {
        console.error('Cesium not built, run the combine build script first.');
        if (window.confirm("Cesium not built, run the combine build script first.\nSee contributor's guide for more info?")) {
            window.location = 'https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide';
        }
    }
}());
