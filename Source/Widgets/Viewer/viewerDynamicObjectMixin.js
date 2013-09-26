/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/Event',
        '../../Core/EventHelper',
        '../../Core/ScreenSpaceEventType',
        '../../Core/wrapFunction',
        '../../Scene/SceneMode',
        '../Balloon/Balloon',
        '../../DynamicScene/DynamicObjectView'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        DeveloperError,
        defineProperties,
        Event,
        EventHelper,
        ScreenSpaceEventType,
        wrapFunction,
        SceneMode,
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
     * @exception {DeveloperError} balloonedObject is already defined by another mixin.
     *
     * @example
     * // Add support for working with DynamicObject instances to the Viewer.
     * var dynamicObject = ... //A Cesium.DynamicObject instance
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.extend(Cesium.viewerDynamicObjectMixin);
     * viewer.trackedObject = dynamicObject; //Camera will now track dynamicObject
     * viewer.balloonedObject = object; //Balloon will now appear over object
     */

    var viewerDynamicObjectMixin = function(viewer) {
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }
        if (viewer.hasOwnProperty('trackedObject')) {
            throw new DeveloperError('trackedObject is already defined by another mixin.');
        }
        if (viewer.hasOwnProperty('onObjectTracked')) {
            throw new DeveloperError('onObjectTracked is already defined by another mixin.');
        }
        if (viewer.hasOwnProperty('balloonedObject')) {
            throw new DeveloperError('balloonedObject is already defined by another mixin.');
        }

        //Balloon
        var balloonContainer = document.createElement('div');
        balloonContainer.className = 'cesium-viewer-balloonContainer';
        viewer.container.appendChild(balloonContainer);

        var balloon = new Balloon(balloonContainer, viewer.scene);
        var balloonViewModel = balloon.viewModel;
        viewer._balloon = balloon;

        var eventHelper = new EventHelper();
        var onObjectTracked = new Event();
        var trackedObject;
        var dynamicObjectView;
        var balloonedObject;

        //Subscribe to onTick so that we can update the view each update.
        function onTick(clock) {
            if (defined(dynamicObjectView)) {
                dynamicObjectView.update(clock.currentTime);
            }
            if (defined(balloonedObject) && defined(balloonedObject.position)) {
                balloonViewModel.position = balloonedObject.position.getValue(clock.currentTime, balloonViewModel.position);
                balloonViewModel.update();
            }
        }
        eventHelper.add(viewer.clock.onTick, onTick);

        function trackObject(dynamicObject) {
            if (defined(dynamicObject) && defined(dynamicObject.position)) {
                viewer.trackedObject = dynamicObject;
            }
        }

        function pickAndTrackObject(e) {
            var picked = viewer.scene.pick(e.position);
            if (defined(picked) &&
                defined(picked.primitive) &&
                defined(picked.primitive.dynamicObject)) {
                trackObject(picked.primitive.dynamicObject);
            }
        }

        function showBalloon(dynamicObject) {
            if (defined(dynamicObject) && defined(dynamicObject.position)) {
                viewer.balloonedObject = dynamicObject;
            }
        }

        function pickAndShowBalloon(e) {
            var p = viewer.scene.pick(e.position);
            if (defined(p) && defined(p.primitive) && defined(p.primitive.dynamicObject)) {
                viewer.balloonedObject = p.primitive.dynamicObject;
            }
        }

        function onHomeButtonClicked() {
            viewer.trackedObject = undefined;
            viewer.balloonedObject = undefined;
        }

        //Subscribe to the home button beforeExecute event if it exists,
        // so that we can clear the trackedObject and balloon.
        if (defined(viewer.homeButton)) {
            eventHelper.add(viewer.homeButton.viewModel.command.beforeExecute, onHomeButtonClicked);
        }

        //Subscribe to left clicks and zoom to the picked object.
        viewer.screenSpaceEventHandler.setInputAction(pickAndShowBalloon, ScreenSpaceEventType.LEFT_CLICK);
        viewer.screenSpaceEventHandler.setInputAction(pickAndTrackObject, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        if (defined(viewer.dataSourceBrowser)) {
            eventHelper.add(viewer.dataSourceBrowser.viewModel.onObjectSelected, showBalloon);
        }

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
                    var sceneMode = viewer.scene.getFrameState().mode;
                    if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE2D) {
                        viewer.scene.getScreenSpaceCameraController().enableTranslate = !defined(value);
                    }

                    if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE3D) {
                        viewer.scene.getScreenSpaceCameraController().enableTilt = !defined(value);
                    }

                    if (trackedObject !== value) {
                        trackedObject = value;
                        dynamicObjectView = defined(value) ? new DynamicObjectView(value, viewer.scene, viewer.centralBody.getEllipsoid()) : undefined;
                        onObjectTracked.raiseEvent(viewer, value);
                        //Hide the balloon if it's not the object we are following.
                        balloonViewModel.showBalloon = balloonedObject === trackedObject;
                    }
                }
            },

            /**
             * Gets an event that will be raised when an object is tracked by the camera.  The event
             * has two parameters: a reference to the viewer instance, and the newly tracked object.
             *
             * @memberof viewerDynamicObjectMixin.prototype
             * @type {Event}
             */
            onObjectTracked : {
                get : function() {
                    return onObjectTracked;
                }
            },
            /**
             * Gets or sets the object instance for which to display a balloon
             * @memberof viewerDynamicObjectMixin.prototype
             * @type {DynamicObject}
             */
            balloonedObject : {
                get : function() {
                    return balloonedObject;
                },
                set : function(value) {
                    var content;
                    var position;
                    if (defined(value)) {
                        if (defined(value.position)) {
                            position = value.position.getValue(viewer.clock.currentTime);
                        }

                        if (defined(value.balloon)) {
                            content = value.balloon.getValue(viewer.clock.currentTime);
                        }

                        var heading = value.name;
                        if (defined(content) && defined(heading)) {
                            content = '<h3>' + heading + '</h3>' + content;
                        } else if (!defined(content)) {
                            content = '<h3>' + defaultValue(heading, value.id) + '</h3>';
                        }
                        balloonViewModel.content = content;
                    }
                    balloonedObject = value;
                    balloonViewModel.position = position;
                    balloonViewModel.showBalloon = defined(content);
                }
            }
        });

        //Wrap destroy to clean up event subscriptions.
        viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
            eventHelper.removeAll();
            balloon.destroy();
            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        });
    };

    return viewerDynamicObjectMixin;
});
