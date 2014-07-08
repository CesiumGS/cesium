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
        '../Scene/Model'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        Matrix3,
        Matrix4,
        Quaternion,
        Model) {
    "use strict";

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
        this._entityCollection = undefined;
        this._entityCollection = entityCollection;
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

    /**
     * @private
     */
    ModelVisualizer.prototype._updateObject = function(time, entity) {
        var context = this._scene.context;
        var modelGraphics = entity._model;
        if (!defined(modelGraphics)) {
            return;
        }

        var uriProperty = modelGraphics._uri;
        if (!defined(uriProperty)) {
            return;
        }

        var positionProperty = entity._position;
        if (!defined(positionProperty)) {
            return;
        }

        var model = entity._modelPrimitive;
        var showProperty = modelGraphics._show;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        var uri = uriProperty.getValue(time, context);
        if (!show || !defined(uri)) {
            if (defined(model)) {
                model.show = false;
            }
            return;
        }

        if (!defined(model) || uri !== entity._modelPrimitiveUri) {
            if (defined(model)) {
                this._primitives.remove(model);
                if (!model.isDestroyed()) {
                    model.destroy();
                }
            }
            model = Model.fromGltf({
                url : uri
            });

            entity._modelPrimitiveUri = uri;
            model.id = entity;
            model._visualizerOrientation = Quaternion.clone(Quaternion.IDENTITY);
            this._primitives.add(model);
            entity._modelPrimitive = model;
        }
        model.show = true;

        var position = defaultValue(positionProperty.getValue(time, position), model._visualizerPosition);
        var orientationProperty = entity._orientation;
        var orientation;
        if (defined(orientationProperty)) {
            orientation = defaultValue(orientationProperty.getValue(time, orientation), model._visualizerOrientation);
        } else {
            orientation = model._visualizerOrientation;
        }

        if (defined(position) && defined(orientation) && (!Cartesian3.equals(position, model._visualizerPosition) || !Quaternion.equals(orientation, model._visualizerOrientation))) {
            Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, model.modelMatrix);
            model._visualizerPosition = Cartesian3.clone(position, model._visualizerPosition);
            model._visualizerOrientation = Quaternion.clone(orientation, model._visualizerOrientation);
        }

        var scaleProperty = modelGraphics._scale;
        if (defined(scaleProperty)) {
            var scale = scaleProperty.getValue(time);
            if (defined(scale)) {
                model.scale = scale;
            }
        }

        var minimumPixelSizeProperty = modelGraphics._minimumPixelSize;
        if (defined(minimumPixelSizeProperty)) {
            var minimumPixelSize = minimumPixelSizeProperty.getValue(time);
            if (defined(minimumPixelSize)) {
                model.minimumPixelSize = minimumPixelSize;
            }
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
                entity._modelPrimitive = undefined;
            }
        }
    };

    return ModelVisualizer;
});