/*global define*/
define(['../../Core/BoundingSphere',
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
        '../SelectionIndicator/SelectionIndicator',
        '../../DynamicScene/DynamicObjectView',
        '../../ThirdParty/knockout'
    ], function(
        BoundingSphere,
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
        SelectionIndicator,
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

        //SelectionIndicator
        var selectionIndicatorContainer = document.createElement('div');
        var viewerElement = viewer.container.firstChild;
        if (viewerElement.children.length > 1) {
            // The first (rear-most) child of "viewer" will always be "cesiumWidget".  Insert the
            // selection as the second child, prior to any other UI elements.
            viewerElement.insertBefore(selectionIndicatorContainer, viewerElement.children[1]);
        } else {
            // If all other subwidgets are turned off, just append after cesiumWidget.
            viewerElement.appendChild(selectionIndicatorContainer);
        }

        var selectionIndicator = new SelectionIndicator(selectionIndicatorContainer, viewer.scene);

        var selectionIndicatorViewModel = selectionIndicator.viewModel;
        viewer._selectionIndicator = selectionIndicator;

        var eventHelper = new EventHelper();
        var selectedObjectObservable = knockout.observable();
        var trackedObjectObservable = knockout.observable();
        var dynamicObjectView;

        function selectionInfoClosed() {
            viewer.selectedObject = undefined;
        }

        eventHelper.add(selectionIndicatorViewModel.onCloseInfo, selectionInfoClosed);

        var scratchVertexPositions;
        var scratchBoundingSphere;

        //Subscribe to onTick so that we can update the view each update.
        function onTick(clock) {
            var time = clock.currentTime;
            if (defined(dynamicObjectView)) {
                dynamicObjectView.update(time);
            }

            var selectedObject = viewer.selectedObject;
            var showSelection = defined(selectedObject);
            if (showSelection) {
                if (selectedObject.isAvailable(time)) {
                    if (defined(selectedObject.position)) {
                        selectionIndicatorViewModel.position = selectedObject.position.getValue(time, selectionIndicatorViewModel.position);
                    } else if (defined(selectedObject.vertexPositions)) {
                        scratchVertexPositions = selectedObject.vertexPositions.getValue(time, scratchVertexPositions);
                        scratchBoundingSphere = BoundingSphere.fromPoints(scratchVertexPositions, scratchBoundingSphere);
                        selectionIndicatorViewModel.position = scratchBoundingSphere.center;
                    } else {
                        selectionIndicatorViewModel.position = undefined;
                    }
                } else {
                    selectionIndicatorViewModel.position = undefined;
                }

                if (defined(selectedObject.description)) {
                    selectionIndicatorViewModel.descriptionHtml = selectedObject.description.getValue(time) || '';
                } else {
                    selectionIndicatorViewModel.descriptionHtml = '';
                }
            }

            selectionIndicatorViewModel.update();
            selectionIndicatorViewModel.showSelection = showSelection;
        }
        eventHelper.add(viewer.clock.onTick, onTick);

        function pickAndTrackObject(e) {
            var picked = viewer.scene.pick(e.position);
            if (defined(picked) && defined(picked.primitive) && defined(picked.primitive.dynamicObject)) {
                viewer.trackedObject = picked.primitive.dynamicObject;
            }
        }

        function pickAndShowSelection(e) {
            var picked = viewer.scene.pick(e.position);
            if (defined(picked) && defined(picked.primitive) && defined(picked.primitive.dynamicObject)) {
                viewer.selectedObject = picked.primitive.dynamicObject;
            } else {
                viewer.selectedObject = undefined;
            }
        }

        function clearTrackedObject() {
            viewer.trackedObject = undefined;
        }

        function clearObjects() {
            viewer.trackedObject = undefined;
            viewer.selectedObject = undefined;
        }

        //Subscribe to the home button beforeExecute event if it exists,
        // so that we can clear the trackedObject.
        if (defined(viewer.homeButton)) {
            eventHelper.add(viewer.homeButton.viewModel.command.beforeExecute, clearTrackedObject);
        }

        //Subscribe to the geocoder search if it exists, so that we can
        //clear the trackedObject when it is clicked.
        if (defined(viewer.geocoder)) {
            eventHelper.add(viewer.geocoder.viewModel.search.beforeExecute, clearObjects);
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
                if (viewer.selectedObject === removedObject) {
                    viewer.selectedObject = undefined;
                }
            }
        }

        function dataSourceAdded(dataSourceCollection, dataSource) {
            dataSource.getDynamicObjectCollection().collectionChanged.addEventListener(onDynamicCollectionChanged);
        }

        function dataSourceRemoved(dataSourceCollection, dataSource) {
            dataSource.getDynamicObjectCollection().collectionChanged.removeEventListener(onDynamicCollectionChanged);

            if (defined(viewer.trackedObject)) {
                if (dataSource.getDynamicObjectCollection().getById(viewer.trackedObject.id) === viewer.trackedObject) {
                    viewer.homeButton.viewModel.command();
                }
            }
            if (defined(viewer.selectedObject)) {
                if (dataSource.getDynamicObjectCollection().getById(viewer.selectedObject.id) === viewer.selectedObject) {
                    viewer.selectedObject = undefined;
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
        viewer.screenSpaceEventHandler.setInputAction(pickAndShowSelection, ScreenSpaceEventType.LEFT_CLICK);
        viewer.screenSpaceEventHandler.setInputAction(pickAndTrackObject, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        /**
         * Gets or sets the DynamicObject instance currently being tracked by the camera.
         * @memberof viewerDynamicObjectMixin.prototype
         * @type {DynamicObject}
         */
        viewer.trackedObject = undefined;
        knockout.defineProperty(viewer, 'trackedObject', {
            get : function() {
                return trackedObjectObservable();
            },
            set : function(value) {
                var sceneMode = viewer.scene.getFrameState().mode;

                if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE2D) {
                    viewer.scene.getScreenSpaceCameraController().enableTranslate = !defined(value);
                }

                if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE3D) {
                    viewer.scene.getScreenSpaceCameraController().enableTilt = !defined(value);
                }

                if (trackedObjectObservable() !== value) {
                    dynamicObjectView = defined(value) ? new DynamicObjectView(value, viewer.scene, viewer.centralBody.getEllipsoid()) : undefined;
                    trackedObjectObservable(value);
                }
            }
        });

        /**
         * Gets or sets the object instance for which to display a selection indicator
         * @memberof viewerDynamicObjectMixin.prototype
         * @type {DynamicObject}
         */
        viewer.selectedObject = undefined;
        knockout.defineProperty(viewer, 'selectedObject', {
            get : function() {
                return selectedObjectObservable();
            },
            set : function(value) {
                if (selectedObjectObservable() !== value) {
                    if (defined(value)) {
                        selectionIndicatorViewModel.titleText = defined(value.name) ? value.name : '';
                        selectionIndicatorViewModel.animateAppear();
                    } else {
                        // Leave the info text in place here, it is needed during the exit animation.
                        selectionIndicatorViewModel.animateDepart();
                    }
                    selectedObjectObservable(value);
                }
            }
        });

        //Wrap destroy to clean up event subscriptions.
        viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
            eventHelper.removeAll();
            selectionIndicator.destroy();
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
