/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        '../Scene/Model',
        '../Scene/ModelAnimationLoop',
        './Property'
    ], function(
        AssociativeArray,
        Cartesian3,
        defined,
        destroyObject,
        DeveloperError,
        Matrix4,
        Model,
        ModelAnimationLoop,
        Property) {
    "use strict";

    var defaultScale = 1.0;
    var defaultMinimumPixelSize = 0.0;

    /**
     * A {@link Visualizer} which maps {@link Entity#model} to a {@link Model}.
     * @alias ModelVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var ModelVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(ModelVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._primitives = scene.primitives;
        this._entityCollection = entityCollection;
        this._modelHash = {};
        this._entitiesToVisualize = new AssociativeArray();
        this._modelMatrixScratch = new Matrix4();
        this._onCollectionChanged(entityCollection, entityCollection.entities, [], []);
    };

    /**
     * Updates models created this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    ModelVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var context = this._scene.context;
        var entities = this._entitiesToVisualize.values;
        var modelHash = this._modelHash;
        var primitives = this._primitives;
        var scene = this._scene;

        for (var i = 0, len = entities.length; i < len; i++) {
            var entity = entities[i];
            var modelGraphics = entity._model;

            var uri;
            var modelData = modelHash[entity.id];
            var show = entity.isAvailable(time) && Property.getValueOrDefault(modelGraphics._show, time, true);

            var modelMatrix;
            if (show) {
                modelMatrix = entity._getModelMatrix(time, this._modelMatrixScratch);
                uri = Property.getValueOrUndefined(modelGraphics._uri, time);
                show = defined(modelMatrix) && defined(uri);
            }

            if (!show) {
                if (defined(modelData)) {
                    modelData.modelPrimitive.show = false;
                }
                continue;
            }

            var model = defined(modelData) ? modelData.modelPrimitive : undefined;
            if (!defined(model) || uri !== modelData.uri) {
                if (defined(model)) {
                    primitives.removeAndDestroy(model);
                    delete modelHash[entity.id];
                }
                model = Model.fromGltf({
                    url : uri
                });

                model.readyToRender.addEventListener(readyToRender, this);

                model.id = entity;
                primitives.add(model);

                modelData = {
                    modelPrimitive : model,
                    uri : uri
                };
                modelHash[entity.id] = modelData;
            }

            model.show = true;
            model.scale = Property.getValueOrDefault(modelGraphics._scale, time, defaultScale);
            model.minimumPixelSize = Property.getValueOrDefault(modelGraphics._minimumPixelSize, time, defaultMinimumPixelSize);
            model.modelMatrix = Matrix4.clone(modelMatrix, model.modelMatrix);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    ModelVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    ModelVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(ModelVisualizer.prototype._onCollectionChanged, this);
        var entities = this._entitiesToVisualize.values;
        var modelHash = this._modelHash;
        var primitives = this._primitives;
        for (var i = entities.length - 1; i > -1; i--) {
            removeModel(this, entities[i], modelHash, primitives);
        }
        return destroyObject(this);
    };

    /**
     * @private
     */
    ModelVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var entities = this._entitiesToVisualize;
        var modelHash = this._modelHash;
        var primitives = this._primitives;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._model) && defined(entity._position)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._model) && defined(entity._position)) {
                entities.set(entity.id, entity);
            } else {
                removeModel(this, entity, modelHash, primitives);
                entities.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            removeModel(this, entity, modelHash, primitives);
            entities.remove(entity.id);
        }
    };

    function removeModel(visualizer, entity, modelHash, primitives) {
        var modelData = modelHash[entity.id];
        if (defined(modelData)) {
            var model = modelData.modelPrimitive;
            model.readyToRender.removeEventListener(readyToRender, visualizer);
            primitives.removeAndDestroy(model);
            delete modelHash[entity.id];
        }
    }

    function readyToRender(model) {
        model.activeAnimations.addAll({
            loop : ModelAnimationLoop.REPEAT
        });
    }
    return ModelVisualizer;
});
