/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/Transforms',
        '../Scene/Model',
        '../Scene/ModelAnimationLoop',
        './Property'
    ], function(
        AssociativeArray,
        Cartesian3,
        defined,
        destroyObject,
        DeveloperError,
        Matrix3,
        Matrix4,
        Quaternion,
        Transforms,
        Model,
        ModelAnimationLoop,
        Property) {
    "use strict";

    var defaultScale = 1.0;
    var defaultMinimumPixelSize = 0.0;
    var matrix3Scratch = new Matrix3();

    var position = new Cartesian3();
    var orientation = new Quaternion();

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

            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                uri = Property.getValueOrUndefined(modelGraphics._uri, time);
                show = defined(position) && defined(uri);
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
                    primitives.remove(model);
                    if (!model.isDestroyed()) {
                        model.destroy();
                    }
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
                    uri : uri,
                    position : undefined,
                    orientation : undefined
                };
                modelHash[entity.id] = modelData;
            }

            model.show = true;
            model.scale = Property.getValueOrDefault(modelGraphics._scale, time, defaultScale);
            model.minimumPixelSize = Property.getValueOrDefault(modelGraphics._minimumPixelSize, time, defaultMinimumPixelSize);

            orientation = Property.getValueOrUndefined(entity._orientation, time, orientation);
            if (!Cartesian3.equals(position, modelData.position) || !Quaternion.equals(orientation, modelData.orientation)) {
                if (!defined(orientation)) {
                    Transforms.eastNorthUpToFixedFrame(position, scene.globe.ellipsoid, model.modelMatrix);
                } else {
                    Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, model.modelMatrix);
                }
                modelData.position = Cartesian3.clone(position, modelData.position);
                modelData.orientation = Quaternion.clone(orientation, modelData.orientation);
            }
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
            primitives.remove(model);
            if (!model.isDestroyed()) {
                model.destroy();
            }
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
