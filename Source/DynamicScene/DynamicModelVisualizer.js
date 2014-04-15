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
     * A {@link Visualizer} which maps the {@link DynamicModel} instance
     * in {@link DynamicObject.model} to a {@link Model} primitive.
     * @alias DynamicModelVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamicObjectCollection to visualize.
     */
    var DynamicModelVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._primitives = scene.primitives;
        this._modelCollection = [];
        this._dynamicObjectCollection = undefined;
        this._dynamicObjectCollection = dynamicObjectCollection;
        dynamicObjectCollection.collectionChanged.addEventListener(DynamicModelVisualizer.prototype._onObjectsRemoved, this);
    };

    /**
     * Updates all models created this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    DynamicModelVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }
        //>>includeEnd('debug');

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (var i = 0, len = dynamicObjects.length; i < len; i++) {
                this._updateObject(time, dynamicObjects[i]);
            }
        }
        return true;
    };

    /**
     * Removes and destroys all models created by this instance.
     * @memberof DynamicModelVisualizer
     */
    DynamicModelVisualizer.prototype.destroy = function() {
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (var i = dynamicObjects.length - 1; i > -1; i--) {
            var model = dynamicObjects[i]._modelPrimitive;
            if (defined(model)) {
                this._primitives.remove(model);
                if (!model.isDestroyed()) {
                    model.destroy();
                }
                model = undefined;
            }
        }
        return destroyObject(this);
    };

    /**
     * @private
     */
    DynamicModelVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var context = this._scene._context;
        var dynamicModel = dynamicObject._model;
        if (!defined(dynamicModel)) {
            return;
        }

        var uriProperty = dynamicModel._uri;
        if (!defined(uriProperty)) {
            return;
        }

        var positionProperty = dynamicObject._position;
        if (!defined(positionProperty)) {
            return;
        }

        var model = dynamicObject._modelPrimitive;
        var showProperty = dynamicModel._show;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        var uri = uriProperty.getValue(time, context);
        if (!show || !defined(uri)) {
            if (defined(model)) {
                model.show = false;
            }
            return;
        }

        if (!defined(model) || uri !== dynamicObject._modelPrimitiveUri) {
            if (defined(model)) {
                this._primitives.remove(model);
                if (!model.isDestroyed()) {
                    model.destroy();
                }
            }
            model = Model.fromGltf({
                url : uri
            });

            dynamicObject._modelPrimitiveUri = uri;
            model.id = dynamicObject;
            model.scale = 1.0;
            model._visualizerOrientation = Quaternion.clone(Quaternion.IDENTITY);
            this._primitives.add(model);
            dynamicObject._modelPrimitive = model;
        }
        model.show = true;

        var position = defaultValue(positionProperty.getValue(time, position), model._visualizerPosition);
        var orientationProperty = dynamicObject._orientation;
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

        var scaleProperty = dynamicModel._scale;
        if (defined(scaleProperty)) {
            var scale = scaleProperty.getValue(time);
            if (defined(scale)) {
                model.scale = scale;
            }
        }
    };

    /**
     * @private
     */
    DynamicModelVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, removed) {
        for (var i = removed.length - 1; i > -1; i--) {
            var dynamicObject = removed[i];
            var model = dynamicObject._modelPrimitive;
            if (defined(model)) {
                this._primitives.remove(model);
                if (!model.isDestroyed()) {
                    model.destroy();
                }
                dynamicObject._modelPrimitive = undefined;
            }
        }
    };

    return DynamicModelVisualizer;
});