/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Quaternion',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Scene/Model',
        '../Scene/Material'
       ], function(
         defaultValue,
         DeveloperError,
         destroyObject,
         Color,
         Quaternion,
         Matrix3,
         Matrix4,
         Model,
         Material) {
    "use strict";

    var matrix3Scratch = new Matrix3();

    /**
     * A DynamicObject visualizer which maps the DynamicModel instance
     * in DynamicObject.model to a Model primitive.
     * @alias DynamicModelVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicModel
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPolylineVisualizer
     */
    var DynamicModelVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._primitives = scene.getPrimitives();
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
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicModelVisualizer.prototype._onObjectsRemoved);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicModelVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    DynamicModelVisualizer.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is requied.');
        }
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                this._updateObject(time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicModelVisualizer.prototype.removeAllPrimitives = function() {
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (var i = dynamicObjects.length - 1; i > -1; i--) {
                this._primitives.remove(dynamicObjects[i]._modelPrimitive);
                dynamicObjects[i]._modelPrimitive.destroy();
                dynamicObjects[i]._modelPrimitive = undefined;
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

    var position;
    var orientation;
    DynamicModelVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var context = this._scene.getContext();
        var dynamicModel = dynamicObject.model;
        if (typeof dynamicModel === 'undefined') {
            return;
        }

        var uriProperty = dynamicModel.uri;
        if (typeof uriProperty === 'undefined') {
            return;
        }

        var positionProperty = dynamicObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var model = dynamicObject._modelPrimitive;
        var showProperty = dynamicModel.show;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        var uri = uriProperty.getValue(time, context);
        if (!show || typeof uri === 'undefined') {
            //don't bother creating or updating anything else
            if (typeof model !== 'undefined') {
                model.destroy();
                dynamicObject._modelPrimitive = undefined;
            }
            return;
        }

        if (typeof model === 'undefined' || uri !== dynamicObject._modelPrimitiveUri) {
            dynamicObject._modelPrimitiveUri = uri;

            this._primitives.add(model);
            model = new Model();
            model.dynamicObject = dynamicObject;
            model.show = true;
            model.scale = 1.0;
            model._visualizerOrientation = Quaternion.IDENTITY.clone();
            dynamicObject._modelPrimitive = model;
        } else {
            position = defaultValue(positionProperty.getValueCartesian(time, position), model._visualizerPosition);
            var orientationProperty = dynamicObject.orientation;
            if (typeof orientationProperty !== 'undefined') {
                orientation = defaultValue(orientationProperty.getValue(time, orientation), model._visualizerOrientation);
            } else {
                orientation = model._visualizerOrientation;
            }

            if (typeof position !== 'undefined' && typeof orientation !== 'undefined' && (!position.equals(model._visualizerPosition) || !orientation.equals(model._visualizerOrientation))) {
                Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation.conjugate(orientation), matrix3Scratch), position, model.modelMatrix);
                model._visualizerPosition = position.clone(model._visualizerPosition);
                model._visualizerOrientation = orientation.clone(model._visualizerOrientation);
            }

            var scaleProperty = dynamicModel.scale;
            if (typeof scaleProperty !== 'undefined') {
                model.scale = scaleProperty.getValue(time, model.scale);
            }
        }
    };

    DynamicModelVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var model = dynamicObject._modelPrimitive;
            if (typeof model !== 'undefined') {
                model.destroy();
                dynamicObject._modelPrimitive = undefined;
            }
        }
    };

    return DynamicModelVisualizer;
});