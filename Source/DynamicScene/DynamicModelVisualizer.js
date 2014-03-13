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
     * A {@link DynamicObject} visualizer which maps the {@link DynamicModel} instance
     * in DynamicObject.model to a {@link Model} primitive.
     * @alias DynamicModelVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     */
    var DynamicModelVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._primitives = scene.primitives;
        this._modelCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicModelVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicModelVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicModelVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicModelVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicModelVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
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
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicModelVisualizer.prototype.removeAllPrimitives = function() {
        if (defined(this._dynamicObjectCollection)) {
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
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicModelVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicModelVisualizer#destroy
     */
    DynamicModelVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof DynamicModelVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicModelVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicModelVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    DynamicModelVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var context = this._scene.context;
        var dynamicModel = dynamicObject.model;
        if (!defined(dynamicModel)) {
            return;
        }

        var uriProperty = dynamicModel._uri;
        if (!defined(uriProperty)) {
            return;
        }

        var positionProperty = dynamicObject.position;
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
        var orientationProperty = dynamicObject.orientation;
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