/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Scene/CesiumTerrainProvider',
        'Scene/PostProcessFilter',
        'Shaders/PostProcessFilters/BlackAndWhite',
        'Shaders/PostProcessFilters/NightVision',
        'Shaders/PostProcessFilters/Toon',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        CesiumTerrainProvider,
        PostProcessFilter,
        BlackAndWhite,
        NightVision,
        Toon,
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
        widget.centralBody.terrainProvider = new CesiumTerrainProvider({
            url : 'http://cesium.agi.com/smallterrain'
        });

        var scene = widget.scene;
//        var filter = new PostProcessFilter({ source : 'void main(void) { gl_FragColor = vec4(1.0); }'});
//        var filter = new PostProcessFilter({ source : 'varying vec2 v_textureCoordinates; uniform sampler2D czm_color; void main(void) { gl_FragColor = texture2D(czm_color, v_textureCoordinates); }'});
//        var filter = new PostProcessFilter({ source : BlackAndWhite });
        var filter = new PostProcessFilter({ source : NightVision });
//        var filter = new PostProcessFilter({ source : Toon });

        scene.postProcessFilters = [filter];

        domClass.remove(win.body(), 'loading');
    });
});