/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Rectangle',
        '../Scene/ImageryLayer',
        '../Scene/WebMapServiceImageryProvider',
        './Property'
    ], function(
        AssociativeArray,
        defined,
        destroyObject,
        DeveloperError,
        Rectangle,
        ImageryLayer,
        WebMapServiceImageryProvider,
        Property) {
    "use strict";

    /**
     * A {@link Visualizer} that maps {@link Entity#imageryLayer} to an {@link ImageryLayer}.
     *
     * @alias ImageryLayerVisualizer
     * @constructor
     * 
     * @param {Scene} scene The scene the imagery provider will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var ImageryLayerVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(ImageryLayerVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._entityCollection = entityCollection;
        this._imageryProviderHash = {};
        this._entitiesToVisualize = new AssociativeArray();
        this._imageryProviderUpdaters = {
            WebMapServiceImageryProvider : updateWebMapServiceImageryProvider
        };

        this._onCollectionChanged(entityCollection, entityCollection.entities, [], []);
    };

    /**
     * Updates imagery layers created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    ImageryLayerVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }
        //>>includeEnd('debug');

        var context = this._scene.context;
        var entities = this._entitiesToVisualize.values;
        var imageryProviderHash = this._imageryProviderHash;
        var scene = this._scene;

        for (var i = 0, len = entities.length; i < len; i++) {
            var entity = entities[i];
            var layerGraphics = entity._imageryLayer;

            var imageryProviderData = imageryProviderHash[entity.id];
            if (!defined(imageryProviderData)) {
                imageryProviderData = imageryProviderHash[entity.id] = {};
            }

            var imageryProvider = Property.getValueOrUndefined(layerGraphics._imageryProvider, time);

            if (defined(imageryProvider)) {
                var type = imageryProvider.getType(time);
                this._imageryProviderUpdaters[type](imageryProvider, time, scene, entity, layerGraphics, imageryProviderData);
            } else {
                imageryProviderData.imageryProvider = undefined;
            }

            if (defined(imageryProviderData.imageryProvider)) {
                var currentRectangle = Property.getValueOrDefault(layerGraphics._rectangle, time, Rectangle.MAX_VALUE);

                // TODO: Insert the imagery layer in the right z-order, especially when
                //       replacing an existing ImageryLayer instance.
                var layer = imageryProviderData.layer;
                if (defined(layer) &&
                    (layer.imageryProvider !== imageryProviderData.imageryProvider ||
                     !Rectangle.equals(layer.rectangle, currentRectangle))) {

                    // Layer exists but refers to the wrong ImageryProvider or has the wrong rectangle,
                    // so remove the old layer and create a new one.
                    scene.imageryLayers.remove(layer);
                    layer = imageryProviderData.layer = undefined;
                }

                if (!defined(layer)) {
                    layer = imageryProviderData.layer = new ImageryLayer(imageryProviderData.imageryProvider, {
                        rectangle : Rectangle.clone(currentRectangle)
                    });
                    scene.imageryLayers.add(layer);
                }

                layer.show = Property.getValueOrDefault(layerGraphics._show, time, true);
                layer.zIndex = Property.getValueOrDefault(layerGraphics._zIndex, time, 0);
                layer.alpha = Property.getValueOrDefault(layerGraphics._alpha, time, 1.0);
                layer.brightness = Property.getValueOrDefault(layerGraphics._brightness, time, 1.0);
                layer.contrast = Property.getValueOrDefault(layerGraphics._contrast, time, 1.0);
                layer.hue = Property.getValueOrDefault(layerGraphics._hue, time, 0.0);
                layer.saturation = Property.getValueOrDefault(layerGraphics._saturation, time, 1.0);
                layer.gamma = Property.getValueOrDefault(layerGraphics._gamma, time, 1.0);
            } else if (defined(imageryProviderData.layer)) {
                scene.imageryLayers.remove(imageryProviderData.layer);
                imageryProviderData.layer = undefined;
            }
        }
        return true;
    };

    /**
     * Removes and destroys all imagery layers created by this instance.
     */
    ImageryLayerVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(ImageryLayerVisualizer.prototype._onCollectionChanged, this);
        var entities = this._entitiesToVisualize.values;
        var imageryProviderHash = this._imageryProviderHash;
        var imageryLayers = this._scene.imageryLayers;
        for (var i = entities.length - 1; i > -1; i--) {
            removeLayer(this, entities[i], imageryProviderHash, imageryLayers);
        }
        return destroyObject(this);
    };

    /**
     * @private
     */
    ImageryLayerVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var entities = this._entitiesToVisualize;
        var layerHash = this._layerHash;
        var imageryLayers = this._scene.imageryLayers;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._imageryLayer)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._imageryLayer)) {
                entities.set(entity.id, entity);
            } else {
                removeLayer(this, entity, layerHash, imageryLayers);
                entities.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            removeLayer(this, entity, layerHash, imageryLayers);
            entities.remove(entity.id);
        }
    };

    function removeLayer(visualizer, entity, layerHash, imageryLayers) {
        var layerData = layerHash[entity.id];
        if (defined(layerData)) {
            imageryLayers.remove(layerData.layer);
            delete layerHash[entity.id];
        }
    }

    var parametersScratch = {};

    function updateWebMapServiceImageryProvider(imageryProviderProperty, time, scene, entity, layerGraphics, imageryProviderData) {
        var url = Property.getValueOrUndefined(imageryProviderProperty._url, time);
        var layers = Property.getValueOrUndefined(imageryProviderProperty._layers, time);
        var parameters = Property.getValueOrUndefined(imageryProviderProperty._parameters, time, imageryProviderData.lastParameters);
        imageryProviderData.lastParameters = parameters;

        if (defined(url) && defined(layers)) {
            var imageryProvider = imageryProviderData.imageryProvider;
            if (!defined(imageryProvider) ||
                imageryProvider.url !== url ||
                imageryProvider.layers !== layers ||
                parameters.propertyBagChanged) {

                imageryProvider = imageryProviderData.imageryProvider = new WebMapServiceImageryProvider({
                    url : url,
                    layers : layers,
                    parameters : parameters
                });
            }
        } else {
            imageryProviderData.imageryProvider = undefined;
        }
    }

    return ImageryLayerVisualizer;
});
