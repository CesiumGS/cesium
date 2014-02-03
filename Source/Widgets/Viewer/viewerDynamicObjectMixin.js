/*global define*/
define([
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/defineProperties',
        '../../Core/Event',
        '../../Core/EventHelper',
        '../../Core/ScreenSpaceEventType',
        '../../Core/wrapFunction',
        '../../Scene/SceneMode',
        '../../DynamicScene/DynamicObjectView',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        DeveloperError,
        defineProperties,
        Event,
        EventHelper,
        ScreenSpaceEventType,
        wrapFunction,
        SceneMode,
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
     *
     * @example
     * // Add support for working with DynamicObject instances to the Viewer.
     * var dynamicObject = ... //A Cesium.DynamicObject instance
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.extend(Cesium.viewerDynamicObjectMixin);
     * viewer.trackedObject = dynamicObject; //Camera will now track dynamicObject
     */
    var viewerDynamicObjectMixin = function(viewer) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }
        if (viewer.hasOwnProperty('trackedObject')) {
            throw new DeveloperError('trackedObject is already defined by another mixin.');
        }
        //>>includeEnd('debug');

        var eventHelper = new EventHelper();
        var trackedObjectObservable = knockout.observable();
        var dynamicObjectView;

        //Subscribe to onTick so that we can update the view each update.
        function updateView(clock) {
            if (defined(dynamicObjectView)) {
                dynamicObjectView.update(clock.currentTime);
            }
        }
        eventHelper.add(viewer.clock.onTick, updateView);

        function pickAndTrackObject(e) {
            var p = viewer.scene.pick(e.position);
            if (defined(p) && defined(p.primitive) && defined(p.primitive.dynamicObject) && defined(p.primitive.dynamicObject.position)) {
                viewer.trackedObject = p.primitive.dynamicObject;
            }
        }

        function clearTrackedObject() {
            viewer.trackedObject = undefined;
        }

        //Subscribe to the home button click if it exists, so that we can
        //clear the trackedObject when it is clicked.
        if (defined(viewer.homeButton)) {
            eventHelper.add(viewer.homeButton.viewModel.command.beforeExecute, clearTrackedObject);
        }

        //Subscribe to the geocoder search if it exists, so that we can
        //clear the trackedObject when it is clicked.
        if (defined(viewer.geocoder)) {
            eventHelper.add(viewer.geocoder.viewModel.search.beforeExecute, clearTrackedObject);
        }

        //We need to subscribe to the data sources and collections so that we can clear the
        //tracked object when it is removed from the scene.
        function onDynamicCollectionChanged(collection, added, removed) {
            var length = removed.length;
            for (var i = 0; i < length; i++) {
                var removedObject = removed[i];
                if (viewer.trackedObject === removedObject) {
                    viewer.homeButton.viewModel.command();
                    break;
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
        viewer.screenSpaceEventHandler.setInputAction(pickAndTrackObject, ScreenSpaceEventType.LEFT_CLICK);

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

        //Wrap destroy to clean up event subscriptions.
        viewer.destroy = wrapFunction(viewer, viewer.destroy, function() {
            eventHelper.removeAll();

            viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);

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