/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/requestAnimationFrame',
        '../CesiumInspector/CesiumInspector'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        requestAnimationFrame,
        CesiumInspector) {
    "use strict";
    /*global console*/

    function startRenderLoop(viewer) {
        viewer._renderLoopRunning = true;

        function render() {
            if (viewer.isDestroyed()) {
                return;
            }
            try {
                viewer.resize();
                viewer.render();
                viewer.cesiumInspector.viewModel.update();
                requestAnimationFrame(render);
            } catch (e) {
                viewer._useDefaultRenderLoop = false;
                viewer._renderLoopRunning = false;
                viewer._renderLoopError.raiseEvent(viewer, e);
                if (viewer._showRenderLoopErrors) {
                    /*global console*/
                    viewer.cesiumWidget.showErrorPanel('An error occurred while rendering.  Rendering has stopped.', e);
                    console.error(e);
                }
            }
        }

        requestAnimationFrame(render);
    }

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

        viewer.useDefaultRenderLoop = false;

        defineProperties(viewer, {
            cesiumInspector : {
                get : function() {
                    return cesiumInspector;
                }
            }
        });

        startRenderLoop(viewer);
    };

    return viewerCesiumInspectorMixin;
});
