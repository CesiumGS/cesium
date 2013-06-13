/*global define*/
define(['../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/Event',
        '../../Core/ScreenSpaceEventType',
        '../../Core/wrapFunction',
        '../../DynamicScene/DynamicObjectView'
        ], function(
                defaultValue,
                DeveloperError,
                defineProperties,
                Event,
                ScreenSpaceEventType,
                wrapFunction,
                DynamicObjectView) {
    "use strict";

    /**
     * A mixin which adds behavior to the Viewer widget for dealing with DynamicObject instances.
     * This allows for DynamicObjects to be tracked with the camera, either by the viewer clicking
     * on them, or by setting the trackedObject property.
     * Rather than being called directly, this function is normally passed as
     * a parameter to {@link Viewer#extend}, as shown in the example below.
     * @exports viewerDynamicObjectMixin
     *
     * @param {Viewer} viewer The viewer instance.
     *
     * @exception {DeveloperError} viewer is required.
     * @exception {DeveloperError} trackedObject is already defined by another mixin.
     *
     * @example
     * // Add support for working with DynamicObject instances to the Viewer.
     * var dynamicObject = ... //A DynamicObject instance
     * var viewer = new Viewer('cesiumContainer');
     * viewer.extend(viewerDynamicObjectMixin);
     * viewer.trackedObject = dynamicObject; //Camera will now track dynamicObject
     */
    var viewerDynamicObjectMixin = function(viewer) {
        if (typeof viewer === 'undefined') {
            throw new DeveloperError('viewer is required.');
        }
        if (viewer.hasOwnProperty('trackedObject')) {
            throw new DeveloperError('trackedObject is already defined by another mixin.');
        }

        var dynamicObjectView;

        //Subscribe to onTick so that we can update the view each update.
        function onTick(clock) {
            if (typeof dynamicObjectView !== 'undefined') {
                dynamicObjectView.update(clock.currentTime);
            }
        }
        viewer.clock.onTick.addEventListener(onTick, viewer);

        //Subscribe to the home button click if it exists, so that we can
        //cancel the trackedObject when it is clicked.
        function onHomeButton() {
            viewer.trackedObject = undefined;
        }
        if (typeof viewer.homeButton !== 'undefined') {
            viewer.homeButton.viewModel.command.beforeExecute.addEventListener(onHomeButton, viewer);
        }

        //Subscribe to left clicks and zoom to the picked object.
        function _onLeftClick(e) {
            var pickedPrimitive = viewer.scene.pick(e.position);
            if (typeof pickedPrimitive !== 'undefined' && typeof pickedPrimitive.dynamicObject !== 'undefined') {
                viewer.trackedObject = pickedPrimitive.dynamicObject;
            }
        }
        viewer.screenSpaceEventHandler.setInputAction(_onLeftClick, ScreenSpaceEventType.LEFT_CLICK);

        //Local variables to be closed over by defineProperties.
        var trackedObject;

        defineProperties(viewer, {
            /**
             * Gets or sets the DynamicObject instance currently being tracked by the camera.
             * @memberof viewerDynamicObjectMixin.prototype
             * @type {DynamicObject}
             */
            trackedObject : {
                get : function() {
                    return trackedObject;
                },
                set : function(value) {
                    if (trackedObject !== value) {
                        trackedObject = value;
                        dynamicObjectView = typeof value !== 'undefined' ? new DynamicObjectView(value, viewer.scene, viewer.centralBody.getEllipsoid()) : undefined;
                    }
                    viewer.scene.getScreenSpaceCameraController().enableTilt = typeof value === 'undefined';
                }
            }
        });

        //Wrap destroy to clean up event subscriptions.
        viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
            viewer.clock.onTick.removeEventListener(onTick, viewer);
            if (typeof viewer.homeButton !== 'undefined') {
                viewer.homeButton.viewModel.command.beforeExecute.removeEventListener(onHomeButton, viewer);
            }
            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
        });
    };

    return viewerDynamicObjectMixin;
});