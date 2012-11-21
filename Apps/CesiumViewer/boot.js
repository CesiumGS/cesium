/*global require*/
require({
    baseUrl : '../..',
    packages : [{
        name : 'dojo',
        location : 'ThirdParty/dojo-release-1.7.2-src/dojo'
    }, {
        name : 'dijit',
        location : 'ThirdParty/dojo-release-1.7.2-src/dijit'
    }, {
        name : 'Assets',
        location : 'Source/Assets'
    }, {
        name : 'Core',
        location : 'Source/Core'
    }, {
        name : 'DynamicScene',
        location : 'Source/DynamicScene'
    }, {
        name : 'Renderer',
        location : 'Source/Renderer'
    }, {
        name : 'Scene',
        location : 'Source/Scene'
    }, {
        name : 'Shaders',
        location : 'Source/Shaders'
    }, {
        name : 'ThirdParty',
        location : 'Source/ThirdParty'
    }, {
        name : 'Widgets',
        location : 'Source/Widgets'
    }, {
        name : 'Workers',
        location : 'Source/Workers'
    }, {
        name : 'CesiumViewer',
        location : 'Apps/CesiumViewer'
    }]
}, [
    'Widgets/Dojo/checkForChromeFrame',
    'dojo/parser',
    'dojo/dom-class',
    'dojo/_base/window',
    'CesiumViewer/CesiumViewer',
    'dojo/domReady!'
], function(
    checkForChromeFrame,
    parser,
    domClass,
    win) {
    "use strict";

    checkForChromeFrame();
    parser.parse();
    domClass.remove(win.body(), 'loading');
});