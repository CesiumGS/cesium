/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Viewer/Viewer'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        checkForChromeFrame,
        Viewer) {
    "use strict";
    /*global console*/

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var widget = new Viewer('cesiumContainer');
        domClass.remove(win.body(), 'loading');
    });
});