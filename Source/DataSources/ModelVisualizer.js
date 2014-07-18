/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Scene/Model',
        './Property'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        Matrix3,
        Matrix4,
        Quaternion,
        Model,
        Property) {
    "use strict";

    var defaultScale = 1.0;
    var defaultMinimumPixelSize = 0.0;
    var defaultOrientation = Quaternion.IDENTITY;
    var matrix3Scratch = new Matrix3();

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

        entityCollection.collectionChanged.addEventListener(ModelVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._primitives = scene.primitives;
        this._entityCollection = entityCollection;
        this._modelHash = {};
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
            throw new DeveloperError('time is requied.');
        }
        //>>includeEnd('debug');

        var entities = this._entityCollection.entities;
        for (var i = 0, len = entities.length; i < len; i++) {
            this._updateObject(time, entities[i]);
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
        var entities = this._entityCollection.entities;
        for (var i = entities.length - 1; i > -1; i--) {
            var entity = entities[i];
            var model = entity._modelPrimitive;
            if (defined(model)) {
                this._primitives.remove(model);
                if (!model.isDestroyed()) {
                    model.destroy();
                }
                entity._modelPrimitive = undefined;
            }
        }
        return destroyObject(this);
    };

    var position = new Cartesian3();
    var orientation = new Quaternion();
    /**
     * @private
     */
    ModelVisualizer.prototype._updateObject = function(time, entity) {
        var context = this._scene.context;
        var modelGraphics = entity._model;
        if (!defined(modelGraphics)) {
            return;
        }

        var uri;
        var modelHash = this._modelHash;
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
            return;
        }

        var model = defined(modelData) ? modelData.modelPrimitive : undefined;
        if (!defined(model) || uri !== modelData.uri) {
            if (defined(model)) {
                this._primitives.remove(model);
                if (!model.isDestroyed()) {
                    model.destroy();
                }
                delete modelHash[entity.id];
            }
            model = Model.fromGltf({
                url : uri
            });

            model.id = entity;
            this._primitives.add(model);
            entity._modelPrimitive = model;

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

        orientation = Property.getValueOrDefault(entity._orientation, time, defaultOrientation, orientation);
        if ((!Cartesian3.equals(position, modelData.position) || !Quaternion.equals(orientation, modelData.orientation))) {
            Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, model.modelMatrix);
            modelData.position = Cartesian3.clone(position, modelData.position);
            modelData.orientation = Quaternion.clone(orientation, modelData.orientation);
        }
    };

    /**
     * @private
     */
    ModelVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, removed) {
        for (var i = removed.length - 1; i > -1; i--) {
            var entity = removed[i];
            var model = entity._modelPrimitive;
            if (defined(model)) {
                this._primitives.remove(model);
                if (!model.isDestroyed()) {
                    model.destroy();
                }
                delete this._modelHash[entity.id];
            }
        }
    };

    return ModelVisualizer;
});