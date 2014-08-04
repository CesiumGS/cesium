/*global define*/
define([
        '../Core/AssociativeArray',
    ], function(
        AssociativeArray) {
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
        this._layerHash = {};
        this._entitiesToVisualize = new AssociativeArray();

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
        var layerHash = this._layerHash;
        var scene = this._scene;
        var imageryLayers = scene.imageryLayers;

        for (var i = 0, len = entities.length; i < len; i++) {
            var entity = entities[i];
            var imageryGraphics = entity._imageryLayer;

            var url;
            var layers;
            var layerData = layerHash[entity.id];
            var show = entity.isAvailable(time) && Property.getValueOrDefault(imageryGraphics._show, time, true) && imageryGraphics.imageryProvider;

            if (show) {
                url = Property.getValueOrUndefined(imageryGraphics._url, time);
                layers = Property.getValueOrUndefined(imageryGraphics._layers, time);
                show = defined(url) && defined(layers);
            }

            if (!show) {
                if (defined(layerData)) {
                    layerData.layer.alpha = 0.0;
                }
                continue;
            }

            var layer = defined(layerData) ? modelData.layer : undefined;
            if (!defined(layer) || url !== layerData.url || layers !== layerData.layers) {
                if (defined(layer)) {
                    imageryLayers.remove(layer);
                    delete layerHash[entity.id];
                }

                var imageryProvider = new WebMapServiceImageryProvider({
                    url : url,
                    layers : layers
                })

                layer = imageryLayers.addImageryProvider(imageryProvider);

                layerData = {
                    layer : layer,
                    url : url,
                    layers : layers
                };
                layerHash[entity.id] = layerData;
            }

            layer.alpha = defaultValue(Property.getValueOrDefault(wmsGraphics._alpha, time, 1.0));
        }
        return true;
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
            if (defined(entity._webMapService)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._webMapService)) {
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

    return ImageryLayerVisualizer;
});
