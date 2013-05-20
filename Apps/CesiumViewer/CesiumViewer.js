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
    /*global console alert*/

    function onError(viewer, name, error) {
        console.log(error);
        alert(error);
    }

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var container = document.getElementById('cesiumContainer');
        var widget = new Viewer(container);
        widget.enableDragAndDrop(document.body, onError);

        domClass.remove(win.body(), 'loading');
    });
});