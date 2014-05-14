/*global define*/
define([
        '../../Core/BoundingSphere',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../Core/ScreenSpaceEventType',
        '../../Core/wrapFunction',
        '../../DynamicScene/DynamicObject',
        '../../DynamicScene/DynamicObjectView',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout',
        '../subscribeAndEvaluate'
    ], function(
        BoundingSphere,
        defaultValue,
        defined,
        DeveloperError,
        EventHelper,
        ScreenSpaceEventType,
        wrapFunction,
        DynamicObject,
        DynamicObjectView,
        SceneMode,
        knockout,
        subscribeAndEvaluate) {
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
     * @exception {DeveloperError} trackedObject is already defined by another mixin.
     * @exception {DeveloperError} selectedObject is already defined by another mixin.
     *
     * @example
     * // Add support for working with DynamicObject instances to the Viewer.
     * var dynamicObject = ... //A Cesium.DynamicObject instance
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.extend(Cesium.viewerDynamicObjectMixin);
     * viewer.trackedObject = dynamicObject; //Camera will now track dynamicObject
     * viewer.selectedObject = object; //Selection will now appear over object
     */

    var viewerDynamicObjectMixin = function(viewer) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }
        if (viewer.hasOwnProperty('trackedObject')) {
            throw new DeveloperError('trackedObject is already defined by another mixin.');
        }
        if (viewer.hasOwnProperty('selectedObject')) {
            throw new DeveloperError('selectedObject is already defined by another mixin.');
        }
        //>>includeEnd('debug');

        var infoBox = viewer.infoBox;
        var infoBoxViewModel = defined(infoBox) ? infoBox.viewModel : undefined;

        var selectionIndicator = viewer.selectionIndicator;
        var selectionIndicatorViewModel = defined(selectionIndicator) ? selectionIndicator.viewModel : undefined;

        var enableInfoOrSelection = defined(infoBox) || defined(selectionIndicator);

        var eventHelper = new EventHelper();
        var dynamicObjectView;

        function trackSelectedObject() {
            viewer.trackedObject = viewer.selectedObject;
        }

        function clearTrackedObject() {
            viewer.trackedObject = undefined;
        }

        function clearSelectedObject() {
            viewer.selectedObject = undefined;
        }

        function clearObjects() {
            viewer.trackedObject = undefined;
            viewer.selectedObject = undefined;
        }

        if (defined(infoBoxViewModel)) {
            eventHelper.add(infoBoxViewModel.cameraClicked, trackSelectedObject);
            eventHelper.add(infoBoxViewModel.closeClicked, clearSelectedObject);
        }

        var scratchVertexPositions;
        var scratchBoundingSphere;

        // Subscribe to onTick so that we can update the view each update.
        function onTick(clock) {
            var time = clock.currentTime;
            if (defined(dynamicObjectView)) {
                dynamicObjectView.update(time);
            }

            var selectedObject = viewer.selectedObject;
            var showSelection = defined(selectedObject) && enableInfoOrSelection;
            if (showSelection) {
                var oldPosition = defined(selectionIndicatorViewModel) ? selectionIndicatorViewModel.position : undefined;
                var position;
                var enableCamera = false;

                if (selectedObject.isAvailable(time)) {
                    if (defined(selectedObject.position)) {
                        position = selectedObject.position.getValue(time, oldPosition);
                        enableCamera = defined(position) && (viewer.trackedObject !== viewer.selectedObject);
                    } else if (defined(selectedObject.vertexPositions)) {
                        scratchVertexPositions = selectedObject.vertexPositions.getValue(time, scratchVertexPositions);
                        scratchBoundingSphere = BoundingSphere.fromPoints(scratchVertexPositions, scratchBoundingSphere);
                        position = scratchBoundingSphere.center;
                        // Can't track scratch positions: "enableCamera" is false.
                    }
                    // else "position" is undefined and "enableCamera" is false.
                }
                // else "position" is undefined and "enableCamera" is false.

                if (defined(selectionIndicatorViewModel)) {
                    selectionIndicatorViewModel.position = position;
                }

                if (defined(infoBoxViewModel)) {
                    infoBoxViewModel.enableCamera = enableCamera;
                    infoBoxViewModel.isCameraTracking = (viewer.trackedObject === viewer.selectedObject);

                    if (defined(selectedObject.description)) {
                        infoBoxViewModel.descriptionRawHtml = defaultValue(selectedObject.description.getValue(time), '');
                    } else {
                        infoBoxViewModel.descriptionRawHtml = '';
                    }
                }
            }

            if (defined(selectionIndicatorViewModel)) {
                selectionIndicatorViewModel.showSelection = showSelection;
                selectionIndicatorViewModel.update();
            }

            if (defined(infoBoxViewModel)) {
                infoBoxViewModel.showInfo = showSelection;
            }
        }
        eventHelper.add(viewer.clock.onTick, onTick);

        function pickDynamicObject(e) {
            var picked = viewer.scene.pick(e.position);
            if (defined(picked)) {
                var id = defaultValue(picked.id, picked.primitive.id);
                if (id instanceof DynamicObject) {
                    return id;
                }
            }
        }

        function trackObject(dynamicObject) {
            if (defined(dynamicObject) && defined(dynamicObject.position)) {
                viewer.trackedObject = dynamicObject;
            }
        }

        function pickAndTrackObject(e) {
            var dynamicObject = pickDynamicObject(e);
            if (defined(dynamicObject)) {
                trackObject(dynamicObject);
            }
        }

        function pickAndSelectObject(e) {
            viewer.selectedObject = pickDynamicObject(e);
        }

        // Subscribe to the home button beforeExecute event if it exists,
        // so that we can clear the trackedObject.
        if (defined(viewer.homeButton)) {
            eventHelper.add(viewer.homeButton.viewModel.command.beforeExecute, clearTrackedObject);
        }

        // Subscribe to the geocoder search if it exists, so that we can
        // clear the trackedObject when it is clicked.
        if (defined(viewer.geocoder)) {
            eventHelper.add(viewer.geocoder.viewModel.search.beforeExecute, clearObjects);
        }

        // We need to subscribe to the data sources and collections so that we can clear the
        // tracked object when it is removed from the scene.
        function onDynamicCollectionChanged(collection, added, removed) {
            var length = removed.length;
            for (var i = 0; i < length; i++) {
                var removedObject = removed[i];
                if (viewer.trackedObject === removedObject) {
                    viewer.homeButton.viewModel.command();
                }
                if (viewer.selectedObject === removedObject) {
                    viewer.selectedObject = undefined;
                }
            }
        }

        function dataSourceAdded(dataSourceCollection, dataSource) {
            var dynamicObjectCollection = dataSource.dynamicObjects;
            dynamicObjectCollection.collectionChanged.addEventListener(onDynamicCollectionChanged);
        }

        function dataSourceRemoved(dataSourceCollection, dataSource) {
            var dynamicObjectCollection = dataSource.dynamicObjects;
            dynamicObjectCollection.collectionChanged.removeEventListener(onDynamicCollectionChanged);

            if (defined(viewer.trackedObject)) {
                if (dynamicObjectCollection.getById(viewer.trackedObject.id) === viewer.trackedObject) {
                    viewer.homeButton.viewModel.command();
                }
            }

            if (defined(viewer.selectedObject)) {
                if (dynamicObjectCollection.getById(viewer.selectedObject.id) === viewer.selectedObject) {
                    viewer.selectedObject = undefined;
                }
            }
        }

        // Subscribe to current data sources
        var dataSources = viewer.dataSources;
        var dataSourceLength = dataSources.length;
        for (var i = 0; i < dataSourceLength; i++) {
            dataSourceAdded(dataSources, dataSources.get(i));
        }

        // Hook up events so that we can subscribe to future sources.
        eventHelper.add(viewer.dataSources.dataSourceAdded, dataSourceAdded);
        eventHelper.add(viewer.dataSources.dataSourceRemoved, dataSourceRemoved);

        // Subscribe to left clicks and zoom to the picked object.
        viewer.screenSpaceEventHandler.setInputAction(pickAndSelectObject, ScreenSpaceEventType.LEFT_CLICK);
        viewer.screenSpaceEventHandler.setInputAction(pickAndTrackObject, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        /**
         * Gets or sets the DynamicObject instance currently being tracked by the camera.
         * @memberof viewerDynamicObjectMixin.prototype
         * @type {DynamicObject}
         */
        viewer.trackedObject = undefined;

        /**
         * Gets or sets the object instance for which to display a selection indicator.
         * @memberof viewerDynamicObjectMixin.prototype
         * @type {DynamicObject}
         */
        viewer.selectedObject = undefined;

        knockout.track(viewer, ['trackedObject', 'selectedObject']);

        var knockoutSubscriptions = [];

        knockoutSubscriptions.push(subscribeAndEvaluate(viewer, 'trackedObject', function(value) {
            var scene = viewer.scene;
            var sceneMode = scene.frameState.mode;
            var isTracking = defined(value);

            if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE2D) {
                scene.screenSpaceCameraController.enableTranslate = !isTracking;
            }

            if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE3D) {
                scene.screenSpaceCameraController.enableTilt = !isTracking;
            }

            if (isTracking && defined(value.position)) {
                dynamicObjectView = new DynamicObjectView(value, scene, viewer.scene.globe.ellipsoid);
            } else {
                dynamicObjectView = undefined;
            }
        }));

        knockoutSubscriptions.push(subscribeAndEvaluate(viewer, 'selectedObject', function(value) {
            if (defined(value)) {
                if (defined(infoBoxViewModel)) {
                    infoBoxViewModel.titleText = defined(value.name) ? value.name : value.id;
                }

                if (defined(selectionIndicatorViewModel)) {
                    selectionIndicatorViewModel.animateAppear();
                }
            } else {
                // Leave the info text in place here, it is needed during the exit animation.
                if (defined(selectionIndicatorViewModel)) {
                    selectionIndicatorViewModel.animateDepart();
                }
            }
        }));

        // Wrap destroy to clean up event subscriptions.
        viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
            eventHelper.removeAll();

            var i;
            for (i = 0; i < knockoutSubscriptions.length; i++) {
                knockoutSubscriptions[i].dispose();
            }

            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

            // Unsubscribe from data sources
            var dataSources = viewer.dataSources;
            var dataSourceLength = dataSources.length;
            for (i = 0; i < dataSourceLength; i++) {
                dataSourceRemoved(dataSources, dataSources.get(i));
            }
        });
    };

    return viewerDynamicObjectMixin;
});
