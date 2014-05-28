/*global define*/
define([
        '../../Core/BoundingSphere',
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../Core/Math',
        '../../Core/Matrix3',
        '../../Core/Matrix4',
        '../../Core/ScreenSpaceEventType',
        '../../Core/Transforms',
        '../../Core/wrapFunction',
        '../../DynamicScene/DynamicObject',
        '../../DynamicScene/DynamicObjectView',
        '../../DynamicScene/StoredViewCameraRotationMode',
        '../../Scene/CameraFlightPath',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout',
        '../subscribeAndEvaluate'
    ], function(
        BoundingSphere,
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        EventHelper,
        CesiumMath,
        Matrix3,
        Matrix4,
        ScreenSpaceEventType,
        Transforms,
        wrapFunction,
        DynamicObject,
        DynamicObjectView,
        StoredViewCameraRotationMode,
        CameraFlightPath,
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
        var cameraControlViewModel = defined(viewer.cameraControl) ? viewer.cameraControl.viewModel : undefined;

        var enableInfoOrSelection = defined(infoBox) || defined(selectionIndicator);

        var knockoutSubscriptions = [];
        var eventHelper = new EventHelper();
        var dynamicObjectView;
        var useIcrf = false;

        function trackSelectedObject() {
            viewer.trackedObject = viewer.selectedObject;
        }

        function clearTrackedObject() {
            useIcrf = false;
            viewer.trackedObject = undefined;
        }

        function clearSelectedObject() {
            viewer.selectedObject = undefined;
        }

        function clearObjects() {
            useIcrf = false;
            viewer.trackedObject = undefined;
            viewer.selectedObject = undefined;
        }

        if (defined(infoBoxViewModel)) {
            eventHelper.add(infoBoxViewModel.cameraClicked, trackSelectedObject);
            eventHelper.add(infoBoxViewModel.closeClicked, clearSelectedObject);
        }

        var scratchVertexPositions;
        var scratchBoundingSphere;
        var scratchInertialToFixed3x3 = new Matrix3();
        var scratchInertialToFixed4x4= new Matrix4();

        function computeInertialToFixed() {
            if (!defined(Transforms.computeIcrfToFixedMatrix(viewer.clock.currentTime, scratchInertialToFixed3x3))) {
                Transforms.computeTemeToPseudoFixedMatrix(viewer.clock.currentTime, scratchInertialToFixed3x3);
            }

            return Matrix4.fromRotationTranslation(scratchInertialToFixed3x3, Cartesian3.ZERO, scratchInertialToFixed4x4);
        }

        function switchToIcrf() {
            viewer.scene.camera.setTransform(computeInertialToFixed());
            useIcrf = true;
        }

        function clearIcrf() {
            useIcrf = false;
        }

        // Subscribe to onTick so that we can update the view each update.
        function onTick(clock) {
            var time = clock.currentTime;
            if (defined(dynamicObjectView)) {
                dynamicObjectView.update(time);
            } else if (useIcrf && viewer.scene.mode === SceneMode.SCENE3D) {
                Matrix4.clone(computeInertialToFixed(), viewer.scene.camera.transform);
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
                infoBoxViewModel.showInfo = showSelection && (defined(cameraControlViewModel) ? !cameraControlViewModel.anyDropdown : true);
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

        if (defined(cameraControlViewModel)) {
            knockoutSubscriptions.push(subscribeAndEvaluate(cameraControlViewModel, 'timeRotateMode', function(value) {
                if (value === StoredViewCameraRotationMode.ICRF) {
                    switchToIcrf();
                } else {
                    clearIcrf();
                }

                if (defined(dynamicObjectView)) {
                    dynamicObjectView.rotationMode = value;
                }
            }));

            eventHelper.add(cameraControlViewModel.visitStoredView.beforeExecute, function(commandInfo) {
                var viewName = commandInfo.args[0];
                var storedView = cameraControlViewModel.storedViewCollection.getByName(viewName);
                if (defined(storedView)) {
                    var scene = viewer.scene;
                    var camera = scene.camera;
                    var canUseFlight = true;

                    cameraControlViewModel.currentViewName = storedView.name;

                    // TODO: Make sure object still exists, is not destroyed etc.
                    if (defined(viewer.trackedObject) || defined(storedView.foregroundObject)) {
                        viewer.trackedObject = storedView.foregroundObject;
                        canUseFlight = false;
                    }

                    // FOV
                    var fovRadians = CesiumMath.toRadians(storedView.fieldOfView);
                    if (!CesiumMath.equalsEpsilon(camera.frustum.fovy, fovRadians, 0.005)) {
                        // Don't fly if FOV is more than a quarter of a degree different.
                        canUseFlight = false;
                    }
                    cameraControlViewModel.fieldOfView = storedView.fieldOfView;
                    camera.frustum.fovy = fovRadians;

                    // constrainedAxis
                    cameraControlViewModel.constrainedAxis = storedView.constrainedAxis;
                    camera.constrainedAxis = storedView.constrainedAxis;

                    // Camera rotation over time
                    cameraControlViewModel.timeRotateMode = storedView.cameraRotationMode;
                    // Set current camera transform.
                    camera.transform = Matrix4.IDENTITY.clone();
                    onTick(viewer.clock);

                    if (canUseFlight) {
                        // Camera flight
                        var viewDescription = {
                            destination : storedView.position,
                            duration : 1500,
                            up : storedView.up,
                            direction : storedView.direction,
                            endReferenceFrame : camera.transform
                        };
                        var flight = CameraFlightPath.createAnimation(scene, viewDescription);
                        scene.animations.add(flight);
                    } else {
                        camera.position = Cartesian3.clone(storedView.position, camera.position);
                        camera.direction = Cartesian3.clone(storedView.direction, camera.direction);
                        camera.right = Cartesian3.normalize(Cartesian3.cross(storedView.direction, storedView.up, camera.right), camera.right);
                        camera.up = Cartesian3.cross(camera.right, camera.direction, camera.up);
                    }
                }
            });

            eventHelper.add(cameraControlViewModel.saveStoredView.afterExecute, function() {
                var viewName = cameraControlViewModel.currentViewName;
                var storedView = cameraControlViewModel.storedViewCollection.getByName(viewName);
                if (defined(storedView)) {
                    var camera = viewer.scene.camera;

                    storedView.foregroundObject = viewer.trackedObject;

                    storedView.position = Cartesian3.clone(camera.position);
                    storedView.direction = Cartesian3.clone(camera.direction);
                    storedView.up = Cartesian3.clone(camera.up);

                    storedView.fieldOfView = CesiumMath.toDegrees(camera.frustum.fovy);
                    storedView.cameraRotationMode = cameraControlViewModel.timeRotateMode;
                    storedView.constrainedAxis = camera.constrainedAxis;

                    // TODO: more things: sceneMode, backgroundObject
                }
            });
        }

        knockoutSubscriptions.push(subscribeAndEvaluate(viewer, 'trackedObject', function(value) {
            var scene = viewer.scene;
            var sceneMode = scene.frameState.mode;
            var isTracking = defined(value);
            var rotationMode = StoredViewCameraRotationMode.LVLH;

            clearIcrf();

            if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE2D) {
                scene.screenSpaceCameraController.enableTranslate = !isTracking;
            }

            if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE3D) {
                scene.screenSpaceCameraController.enableTilt = !isTracking;
            }

            if (defined(cameraControlViewModel)) {
                if (defined(value)) {
                    cameraControlViewModel.isTrackingObject = true;
                    cameraControlViewModel.cameraFollows = defined(value.name) ? value.name : value.id;
                } else {
                    cameraControlViewModel.isTrackingObject = false;
                    cameraControlViewModel.cameraFollows = 'Earth';
                }
                // Note that timeRotateMode can be reset if isTrackingObject changed value above.
                rotationMode = cameraControlViewModel.timeRotateMode;
            }

            if (isTracking && defined(value.position)) {
                dynamicObjectView = new DynamicObjectView(value, rotationMode, scene, viewer.scene.globe.ellipsoid);
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
