/*global require*/
require({
    baseUrl : '.',
    paths : {
        domReady : '../../ThirdParty/requirejs-2.1.9/domReady',
        Cesium : '../../Source'
    }
}, ['CesiumViewer'], function() {
});