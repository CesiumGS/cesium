/*global require*/
require({
    baseUrl : '../../Source',
    paths : {
        CesiumViewer : '../Apps/CesiumViewer',
        domReady : '../ThirdParty/requirejs-2.1.9/domReady'
    }
}, [
        'CesiumViewer/CesiumViewer'
    ], function() {
});