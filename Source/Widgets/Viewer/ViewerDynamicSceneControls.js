/*global define*/
define(['../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/Event',
        '../../Core/ScreenSpaceEventType',
        '../../Core/wrapFunction',
        '../../DynamicScene/DynamicObjectView'
        ], function(
                defaultValue,
                DeveloperError,
                defineProperties,
                destroyObject,
                Event,
                ScreenSpaceEventType,
                wrapFunction,
                DynamicObjectView) {
    "use strict";

    /**
     * Adds default mouse interaction for DynamicScene objects to the Viewer widget.
     *
     * @alias ViewerDynamicSceneControls
     * @constructor
     */
    var ViewerDynamicSceneControls = {
        initialize : function(viewer) {
            var dynamicObjectView;
            var trackedObject;

            function _onTick(clock) {
                if (typeof dynamicObjectView !== 'undefined') {
                    dynamicObjectView.update(clock.currentTime);
                }
            }

            function _onHomeButton() {
                viewer.trackedObject = undefined;
            }

            function _onLeftClick(e) {
                var pickedPrimitive = viewer.scene.pick(e.position);
                if (typeof pickedPrimitive !== 'undefined' && typeof pickedPrimitive.dynamicObject !== 'undefined') {
                    viewer.trackedObject = pickedPrimitive.dynamicObject;
                }
            }

            viewer.clock.onTick.addEventListener(_onTick);
            if (typeof viewer.homeButton !== 'undefined') {
                viewer.homeButton.viewModel.command.beforeExecute.addEventListener(_onHomeButton);
            }
            viewer.screenSpaceEventHandler.setInputAction(_onLeftClick, ScreenSpaceEventType.LEFT_CLICK);

            defineProperties(viewer, {
                /**
                 * Gets or sets the DynamicObject instance currently being tracked by the camera.
                 * @memberof ViewerDynamicSceneControls.prototype
                 * @type {DynamicObject}
                 */
                trackedObject : {
                    get : function() {
                        return trackedObject;
                    },
                    set : function(value) {
                        trackedObject = value;
                        dynamicObjectView = typeof value !== 'undefined' ? new DynamicObjectView(value, viewer.scene, viewer.centralBody.getEllipsoid()) : undefined;
                    }
                }
            });

            viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
                viewer.clock.onTick.removeEventListener(_onTick, viewer);
                if (typeof viewer.homeButton !== 'undefined') {
                    viewer.homeButton.viewModel.command.beforeExecute.removeEventListener(_onHomeButton, viewer);
                }
                viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            });
            return viewer;
        }
    };

    return ViewerDynamicSceneControls;
});