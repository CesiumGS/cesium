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
        '../../DynamicScene/DynamicObjectView',
        '../../ThirdParty/knockout'
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
        DynamicObjectView,
        knockout) {
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

        function balloonClosed(value) {
            if (!value) {
                balloonedObject = undefined;
            }
        }
        knockout.getObservable(balloonViewModel, 'userClosed').subscribe(balloonClosed);

        //Subscribe to onTick so that we can update the view each update.
        function onTick(clock) {
            var time = clock.currentTime;
            if (defined(dynamicObjectView)) {
                dynamicObjectView.update(time);
            }

            var showBalloon = defined(balloonedObject) && balloonedObject.isAvailable(time);
            if (showBalloon) {
                if (defined(balloonedObject.position)) {
                    balloonViewModel.position = balloonedObject.position.getValue(time, balloonViewModel.position);
                } else {
                    balloonViewModel.position = undefined;
                    balloonViewModel.defaultPosition = {
                            x : 415,
                            y : viewer._lastHeight - 10
                        };
                }

                var content;
                if (defined(balloonedObject.balloon)) {
                    content = balloonedObject.balloon.getValue(time);
                }

                var heading = balloonedObject.name;
                if (defined(content) && defined(heading)) {
                    content = '<h3>' + heading + '</h3>' + content;
                } else if (!defined(content)) {
                    content = '<h3>' + defaultValue(heading, balloonedObject.id) + '</h3>';
                }
                balloonViewModel.content = content;
            }

            balloonViewModel.update();
            balloonViewModel.showBalloon = showBalloon;
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
            if (defined(dynamicObject)) {
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

        //We need to subscribe to the data sources and collections so that we can clear the
        //tracked object when it is removed from the scene.
        function onDynamicCollectionChanged(collection, added, removed) {
            var length = removed.length;
            for (var i = 0; i < length; i++) {
                var removedObject = removed[i];
                if (viewer.trackedObject === removedObject) {
                    viewer.homeButton.viewModel.command();
                }
                if (viewer.balloonedObject === removedObject) {
                    viewer.balloonedObject = undefined;
                }
            }
        }

        function dataSourceAdded(dataSourceCollection, dataSource) {
            dataSource.getDynamicObjectCollection().collectionChanged.addEventListener(onDynamicCollectionChanged);
        }

        function dataSourceRemoved(dataSourceCollection, dataSource) {
            dataSource.getDynamicObjectCollection().collectionChanged.removeEventListener(onDynamicCollectionChanged);

            if (defined(trackedObject)) {
                if (dataSource.getDynamicObjectCollection().getById(viewer.trackedObject.id) === viewer.trackedObject) {
                    viewer.homeButton.viewModel.command();
                }
            }
            if (defined(balloonedObject)) {
                if (dataSource.getDynamicObjectCollection().getById(viewer.balloonedObject.id) === viewer.balloonedObject) {
                    viewer.balloonedObject = undefined;
                }
            }
        }

        //Subscribe to current data sources
        var dataSources = viewer.dataSources;
        var dataSourceLength = dataSources.getLength();
        for (var i = 0; i < dataSourceLength; i++) {
            dataSourceAdded(dataSources, dataSources.get(i));
        }

        //Hook up events so that we can subscribe to future sources.
        eventHelper.add(viewer.dataSources.dataSourceAdded, dataSourceAdded);
        eventHelper.add(viewer.dataSources.dataSourceRemoved, dataSourceRemoved);

        //Subscribe to left clicks and zoom to the picked object.
        viewer.screenSpaceEventHandler.setInputAction(pickAndShowBalloon, ScreenSpaceEventType.LEFT_CLICK);
        viewer.screenSpaceEventHandler.setInputAction(pickAndTrackObject, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        if (defined(viewer.dataSourceBrowser)) {
            eventHelper.add(viewer.dataSourceBrowser.viewModel.onObjectSelected, showBalloon);
            eventHelper.add(viewer.dataSourceBrowser.viewModel.onObjectDoubleClick, trackObject);
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
                    balloonedObject = value;
                }
            }
        });

        //Wrap destroy to clean up event subscriptions.
        viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
            eventHelper.removeAll();
            balloon.destroy();
            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

            //Unsubscribe from data sources
            var dataSources = viewer.dataSources;
            var dataSourceLength = dataSources.getLength();
            for (var i = 0; i < dataSourceLength; i++) {
                dataSourceRemoved(dataSources, dataSources.get(i));
            }
        });
    };

    return viewerDynamicObjectMixin;
});
