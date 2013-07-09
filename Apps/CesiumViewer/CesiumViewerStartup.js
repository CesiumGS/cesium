/*global require*/
require({
    baseUrl : '../../Source',
    paths : {
        CesiumViewer : '../Apps/CesiumViewer',
        domReady : '../ThirdParty/requirejs-2.1.6/domReady'
    }
}, ['CesiumViewer/CesiumViewer'], function() {
});