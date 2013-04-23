/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Scene/PostProcessFilter',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        PostProcessFilter,
        checkForChromeFrame,
        CesiumViewerWidget) {
    "use strict";
    /*global console*/

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.placeAt('cesiumContainer');
        widget.startup();
        widget.fullscreen.viewModel.fullscreenElement(document.body);

// TODO: remove before pull request
        var scene = widget.scene;
//        var filter = new PostProcessFilter({ source : 'void main(void) { gl_FragColor = vec4(1.0); }'});
        var filter = new PostProcessFilter({ source : 'varying vec2 v_textureCoordinates; uniform sampler2D czm_colorTexture; void main(void) { gl_FragColor = texture2D(czm_colorTexture, v_textureCoordinates); }'});

        scene.postProcessFilters = [filter];

        domClass.remove(win.body(), 'loading');
    });
});