/*global require*/
require({
    baseUrl : '../../Source',
    paths : {
        ModelViewer : '../Apps/ModelViewer',
        domReady : '../ThirdParty/requirejs-2.1.9/domReady'
    }
}, [
        'ModelViewer/ModelViewer'
    ], function() {
});