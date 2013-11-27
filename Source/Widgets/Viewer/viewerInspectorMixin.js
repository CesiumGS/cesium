/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/Event',
        '../../Core/wrapFunction',
        '../../DynamicScene/CzmlDataSource',
        '../../DynamicScene/GeoJsonDataSource',
        '../CesiumInspector/CesiumInspector',
        '../../ThirdParty/when',
        '../getElement'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        defineProperties,
        Event,
        wrapFunction,
        CzmlDataSource,
        GeoJsonDataSource,
        CesiumInspector,
        when,
        getElement) {
    "use strict";
    /*global console*/

    /**

     */
    var viewerInspectorMixin = function(viewer, options) {
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }

        var cesiumInspectorContainer = document.createElement('div');
        cesiumInspectorContainer.className = 'cesium-viewer-cesiumInspectorContainer';
        viewer.container.appendChild(cesiumInspectorContainer);
        var cesiumInspector = new CesiumInspector(cesiumInspectorContainer, viewer.cesiumWidget.scene, viewer.cesiumWidget.canvas);

        defineProperties(viewer, {
            cesiumInspector : {
                get : function() {
                    return cesiumInspector;
                }
            }
        });
    };

    return viewerInspectorMixin;
});
