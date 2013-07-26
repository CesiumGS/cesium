/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/EventHelper',
        '../../Core/ScreenSpaceEventType',
        '../../Core/wrapFunction',
        '../Balloon/Balloon',
        '../../DynamicScene/DynamicObjectView'
    ], function(
        defaultValue,
        DeveloperError,
        defineProperties,
        EventHelper,
        ScreenSpaceEventType,
        wrapFunction,
        Balloon,
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


        //Balloon
        var balloonContainer = document.createElement('div');
        balloonContainer.className = 'cesium-viewer-balloonContainer';
        viewer._viewerContainer.appendChild(balloonContainer);
        var balloon = new Balloon(balloonContainer, viewer.scene);

        viewer._balloon = balloon;

        var eventHelper = new EventHelper();
        var trackedObject;
        var dynamicObjectView;
        var balloonedObject;

        //Subscribe to onTick so that we can update the view each update.
        function updateView(clock) {
            if (typeof dynamicObjectView !== 'undefined') {
                dynamicObjectView.update(clock.currentTime);
            }

            if (typeof balloonedObject !== 'undefined') {
                viewer._balloon.viewModel.update();
            }
        }
        eventHelper.add(viewer.clock.onTick, updateView);

        function pickAndTrackObject(e) {
            var pickedPrimitive = viewer.scene.pick(e.position);
            if (typeof pickedPrimitive !== 'undefined' &&
                typeof pickedPrimitive.dynamicObject !== 'undefined' &&
                typeof pickedPrimitive.dynamicObject.position !== 'undefined') {
                viewer.trackedObject = pickedPrimitive.dynamicObject;
            }
        }

        function showBalloon(e) {
            var pickedPrimitive = viewer.scene.pick(e.position);
            if (typeof pickedPrimitive !== 'undefined') {
                viewer.balloonedObject = pickedPrimitive;
            }
        }

        function clearTrackedObject() {
            viewer.trackedObject = undefined;
        }

        //Subscribe to the home button click if it exists, so that we can
        //clear the trackedObject when it is clicked.
        if (typeof viewer.homeButton !== 'undefined') {
            eventHelper.add(viewer.homeButton.viewModel.command.beforeExecute, clearTrackedObject);
        }

        //Subscribe to left clicks and zoom to the picked object.
        viewer.screenSpaceEventHandler.setInputAction(showBalloon, ScreenSpaceEventType.LEFT_CLICK);
        viewer.screenSpaceEventHandler.setInputAction(pickAndTrackObject, ScreenSpaceEventType.RIGHT_CLICK);

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
            },
            /**
             * Gets or sets the object instance for which to display a balloon
             * @memberof viewerDynamicObjectMixin.prototype
             * @type {Object}
             */
            balloonedObject: {
                get: function() {
                    return balloonedObject;
                },
                set: function(value) {
                    if (balloonedObject !== value || !viewer._balloon.viewModel.balloonVisible) {
                        balloonedObject = value;
                        viewer._balloon.viewModel.pickObject = balloonedObject;
                    }
                }
            }
        });

        //Wrap destroy to clean up event subscriptions.
        viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
            eventHelper.removeAll();

            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
        });
    };

    return viewerDynamicObjectMixin;
});