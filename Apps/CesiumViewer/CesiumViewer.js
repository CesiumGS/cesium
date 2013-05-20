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

    function stop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

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

        //Set up drag and drop.
        container.addEventListener('drop', function(event) {
            stop(event);
            widget.handleDrop(event, onError);
        }, false);
        container.addEventListener('dragenter', stop, false);
        container.addEventListener('dragover', stop, false);
        container.addEventListener('dragexit', stop, false);

        domClass.remove(win.body(), 'loading');
    });
});