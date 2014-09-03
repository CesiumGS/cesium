/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../Core/ScreenSpaceEventType',
        '../../Core/wrapFunction',
        '../../DataSources/ConstantPositionProperty',
        '../../DataSources/Entity',
        '../../DataSources/EntityView',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when',
        '../subscribeAndEvaluate'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        EventHelper,
        ScreenSpaceEventType,
        wrapFunction,
        ConstantPositionProperty,
        Entity,
        EntityView,
        SceneMode,
        knockout,
        when,
        subscribeAndEvaluate) {
    "use strict";

    /**
     * A mixin which adds behavior to the Viewer widget for dealing with Entity instances.
     * This allows for entities to be tracked with the camera, either by the viewer clicking
     * on them, or by setting the trackedEntity property.
     * Rather than being called directly, this function is normally passed as
     * a parameter to {@link Viewer#extend}, as shown in the example below.
     * @exports viewerEntityMixin
     *
     * @param {Viewer} viewer The viewer instance.
     *
     * @exception {DeveloperError} trackedEntity is already defined by another mixin.
     * @exception {DeveloperError} selectedEntity is already defined by another mixin.
     *
     * @example
     * // Add support for working with Entity instances to the Viewer.
     * var entity = ... //A Cesium.Entity instance
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.extend(Cesium.viewerEntityMixin);
     * viewer.trackedEntity = entity; //Camera will now track entity
     * viewer.selectedEntity = entity; //Selection will now appear over object
     */
    var viewerEntityMixin = function(viewer) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(viewer)) {
            throw new DeveloperError('viewer is required.');
        }
        if (viewer.hasOwnProperty('trackedEntity')) {
            throw new DeveloperError('trackedEntity is already defined by another mixin.');
        }
        if (viewer.hasOwnProperty('selectedEntity')) {
            throw new DeveloperError('selectedEntity is already defined by another mixin.');
        }
        //>>includeEnd('debug');

        var infoBox = viewer.infoBox;
        var infoBoxViewModel = defined(infoBox) ? infoBox.viewModel : undefined;

        var selectionIndicator = viewer.selectionIndicator;
        var selectionIndicatorViewModel = defined(selectionIndicator) ? selectionIndicator.viewModel : undefined;

        var enableInfoOrSelection = defined(infoBox) || defined(selectionIndicator);

        var eventHelper = new EventHelper();
        var entityView;

        function trackSelectedEntity() {
            viewer.trackedEntity = viewer.selectedEntity;
        }

        function clearTrackedObject() {
            viewer.trackedEntity = undefined;
        }

        function clearSelectedEntity() {
            viewer.selectedEntity = undefined;
        }

        function clearObjects() {
            viewer.trackedEntity = undefined;
            viewer.selectedEntity = undefined;
        }

        if (defined(infoBoxViewModel)) {
            eventHelper.add(infoBoxViewModel.cameraClicked, trackSelectedEntity);
            eventHelper.add(infoBoxViewModel.closeClicked, clearSelectedEntity);
        }

        // Subscribe to onTick so that we can update the view each update.
        function onTick(clock) {
            var time = clock.currentTime;
            if (defined(entityView)) {
                entityView.update(time);
            }

            var selectedEntity = viewer.selectedEntity;
            var showSelection = defined(selectedEntity) && enableInfoOrSelection;
            if (showSelection) {
                var oldPosition = defined(selectionIndicatorViewModel) ? selectionIndicatorViewModel.position : undefined;
                var position;
                var enableCamera = false;


                if (selectedEntity.isAvailable(time)) {
                    if (defined(selectedEntity.position)) {
                        position = selectedEntity.position.getValue(time, oldPosition);
                        enableCamera = defined(position) && (viewer.trackedEntity !== viewer.selectedEntity);
                    }
                    // else "position" is undefined and "enableCamera" is false.
                }
                // else "position" is undefined and "enableCamera" is false.

                if (defined(selectionIndicatorViewModel)) {
                    selectionIndicatorViewModel.position = position;
                }

                if (defined(infoBoxViewModel)) {
                    infoBoxViewModel.enableCamera = enableCamera;
                    infoBoxViewModel.isCameraTracking = (viewer.trackedEntity === viewer.selectedEntity);

                    if (defined(selectedEntity.description)) {
                        infoBoxViewModel.descriptionRawHtml = defaultValue(selectedEntity.description.getValue(time), '');
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

        function pickEntity(e) {
            var picked = viewer.scene.pick(e.position);
            if (defined(picked)) {
                var id = defaultValue(picked.id, picked.primitive.id);
                if (id instanceof Entity) {
                    return id;
                }
            }

            // No regular entity picked.  Try picking features from imagery layers.
            return pickImageryLayerFeature(viewer, e.position);
        }

        function trackObject(entity) {
            if (defined(entity) && defined(entity.position)) {
                viewer.trackedEntity = entity;
            }
        }

        function pickAndTrackObject(e) {
            var entity = pickEntity(e);
            if (defined(entity)) {
                trackObject(entity);
            }
        }

        function pickAndSelectObject(e) {
            viewer.selectedEntity = pickEntity(e);
        }

        // Subscribe to the home button beforeExecute event if it exists,
        // so that we can clear the trackedEntity.
        if (defined(viewer.homeButton)) {
            eventHelper.add(viewer.homeButton.viewModel.command.beforeExecute, clearTrackedObject);
        }

        // Subscribe to the geocoder search if it exists, so that we can
        // clear the trackedEntity when it is clicked.
        if (defined(viewer.geocoder)) {
            eventHelper.add(viewer.geocoder.viewModel.search.beforeExecute, clearObjects);
        }

        // We need to subscribe to the data sources and collections so that we can clear the
        // tracked object when it is removed from the scene.
        function onEntityCollectionChanged(collection, added, removed) {
            var length = removed.length;
            for (var i = 0; i < length; i++) {
                var removedObject = removed[i];
                if (viewer.trackedEntity === removedObject) {
                    viewer.homeButton.viewModel.command();
                }
                if (viewer.selectedEntity === removedObject) {
                    viewer.selectedEntity = undefined;
                }
            }
        }

        function dataSourceAdded(dataSourceCollection, dataSource) {
            var entityCollection = dataSource.entities;
            entityCollection.collectionChanged.addEventListener(onEntityCollectionChanged);
        }

        function dataSourceRemoved(dataSourceCollection, dataSource) {
            var entityCollection = dataSource.entities;
            entityCollection.collectionChanged.removeEventListener(onEntityCollectionChanged);

            if (defined(viewer.trackedEntity)) {
                if (entityCollection.getById(viewer.trackedEntity.id) === viewer.trackedEntity) {
                    viewer.homeButton.viewModel.command();
                }
            }

            if (defined(viewer.selectedEntity)) {
                if (entityCollection.getById(viewer.selectedEntity.id) === viewer.selectedEntity) {
                    viewer.selectedEntity = undefined;
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
         * Gets or sets the Entity instance currently being tracked by the camera.
         * @memberof viewerEntityMixin.prototype
         * @type {Entity}
         */
        viewer.trackedEntity = undefined;

        /**
         * Gets or sets the object instance for which to display a selection indicator.
         * @memberof viewerEntityMixin.prototype
         * @type {Entity}
         */
        viewer.selectedEntity = undefined;

        knockout.track(viewer, ['trackedEntity', 'selectedEntity']);

        var knockoutSubscriptions = [];

        knockoutSubscriptions.push(subscribeAndEvaluate(viewer, 'trackedEntity', function(value) {
            var scene = viewer.scene;
            var sceneMode = scene.mode;
            var isTracking = defined(value);

            if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE2D) {
                scene.screenSpaceCameraController.enableTranslate = !isTracking;
            }

            if (sceneMode === SceneMode.COLUMBUS_VIEW || sceneMode === SceneMode.SCENE3D) {
                scene.screenSpaceCameraController.enableTilt = !isTracking;
            }

            if (isTracking && defined(value.position)) {
                entityView = new EntityView(value, scene, viewer.scene.globe.ellipsoid);
            } else {
                entityView = undefined;
            }
        }));

        knockoutSubscriptions.push(subscribeAndEvaluate(viewer, 'selectedEntity', function(value) {
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

    var cartesian3Scratch = new Cartesian3();

    function pickImageryLayerFeature(viewer, windowPosition) {
        var scene = viewer.scene;
        var pickRay = scene.camera.getPickRay(windowPosition);
        var imageryLayerFeaturePromise = scene.imageryLayers.pickImageryLayerFeatures(pickRay, scene);
        if (!defined(imageryLayerFeaturePromise)) {
            return;
        }

        // Imagery layer feature picking is asynchronous, so put up a message while loading.
        var loadingMessage = new Entity('Loading...');
        loadingMessage.description = {
            getValue : function() {
                return 'Loading feature information...';
            }
        };

        when(imageryLayerFeaturePromise, function(features) {
            // Has this async pick been superseded by a later one?
            if (viewer.selectedEntity !== loadingMessage) {
                return;
            }

            if (!defined(features) || features.length === 0) {
                viewer.selectedEntity = createNoFeaturesEntity();
                return;
            }

            // Select the first feature.
            var feature = features[0];

            var entity = new Entity(feature.name);
            entity.description = {
                getValue : function() {
                    return feature.description;
                }
            };

            if (defined(feature.position)) {
                var ecfPosition = viewer.scene.globe.ellipsoid.cartographicToCartesian(feature.position, cartesian3Scratch);
                entity.position = new ConstantPositionProperty(ecfPosition);
            }

            viewer.selectedEntity = entity;
        }, function() {
            // Has this async pick been superseded by a later one?
            if (viewer.selectedEntity !== loadingMessage) {
                return;
            }

            var entity = new Entity('None');
            entity.description = {
                getValue : function() {
                    return 'No features found.';
                }
            };

            viewer.selectedEntity = createNoFeaturesEntity();
        });

        return loadingMessage;
    }

    function createNoFeaturesEntity() {
        var entity = new Entity('None');
        entity.description = {
            getValue : function() {
                return 'No features found.';
            }
        };
        return entity;
    }

    return viewerEntityMixin;
});
