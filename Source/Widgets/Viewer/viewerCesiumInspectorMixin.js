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
     * A mixin which adds the CesiumInspector widget to the Viewer widget.
     * Rather than being called directly, this function is normally passed as
     * a parameter to {@link Viewer#extend}, as shown in the example below.
     * @exports viewerCesiumInspectorMixin
     *
     * @param {Viewer} viewer The viewer instance.
     *
     * @exception {DeveloperError} viewer is required.
     *
     * @example
     * // Add basic drag and drop support and pop up an alert window on error.
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.extend(Cesium.viewerCesiumInspectorMixin);
     */

    var viewerCesiumInspectorMixin = function(viewer) {
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }

        var cesiumInspectorContainer = document.createElement('div');
        cesiumInspectorContainer.className = 'cesium-viewer-cesiumInspectorContainer';
        viewer.container.appendChild(cesiumInspectorContainer);
        var cesiumInspector = new CesiumInspector(cesiumInspectorContainer, viewer.cesiumWidget.scene);

        defineProperties(viewer, {
            cesiumInspector : {
                get : function() {
                    return cesiumInspector;
                }
            }
        });
    };

    return viewerCesiumInspectorMixin;
});
