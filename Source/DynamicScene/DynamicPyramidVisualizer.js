/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Scene/CustomSensorVolume',
        '../Scene/ColorMaterial'
       ], function(
         DeveloperError,
         destroyObject,
         Color,
         Matrix3,
         Matrix4,
         CustomSensorVolume,
         ColorMaterial) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicPyramid instance
     * in DynamicObject.pyramid to a Pyramid primitive.
     * @alias DynamicPyramidVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicPyramid
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
     *
     */
    var DynamicPyramidVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._pyramidCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPyramidVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPyramidVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPyramidVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicPyramidVisualizer.prototype._onObjectsRemoved);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicPyramidVisualizer.prototype._onObjectsRemoved, this);
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
    DynamicPyramidVisualizer.prototype.update = function(time) {
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
    DynamicPyramidVisualizer.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._pyramidCollection.length; i < len; i++) {
            this._primitives.remove(this._pyramidCollection[i]);
        }

        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._pyramidVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
        this._pyramidCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPyramidVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPyramidVisualizer#destroy
     */
    DynamicPyramidVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicPyramidVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPyramidVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPyramidVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    var position;
    var orientation;
    DynamicPyramidVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var dynamicPyramid = dynamicObject.pyramid;
        if (typeof dynamicPyramid === 'undefined') {
            return;
        }

        var directionsProperty = dynamicPyramid.directions;
        if (typeof directionsProperty === 'undefined') {
            return;
        }

        var positionProperty = dynamicObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var orientationProperty = dynamicObject.orientation;
        if (typeof orientationProperty === 'undefined') {
            return;
        }

        var pyramid;
        var showProperty = dynamicPyramid.show;
        var pyramidVisualizerIndex = dynamicObject._pyramidVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof pyramidVisualizerIndex !== 'undefined') {
                pyramid = this._pyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                dynamicObject._pyramidVisualizerIndex = undefined;
                this._unusedIndexes.push(pyramidVisualizerIndex);
            }
            return;
        }

        if (typeof pyramidVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pyramidVisualizerIndex = unusedIndexes.pop();
                pyramid = this._pyramidCollection[pyramidVisualizerIndex];
            } else {
                pyramidVisualizerIndex = this._pyramidCollection.length;
                pyramid = new CustomSensorVolume();
                this._pyramidCollection.push(pyramid);
                this._primitives.add(pyramid);
            }
            dynamicObject._pyramidVisualizerIndex = pyramidVisualizerIndex;
            pyramid.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            pyramid.radius = Number.POSITIVE_INFINITY;
            pyramid.showIntersection = true;
            pyramid.intersectionColor = Color.YELLOW;
            pyramid.material = new ColorMaterial();
        } else {
            pyramid = this._pyramidCollection[pyramidVisualizerIndex];
        }

        pyramid.show = true;

        var directions = directionsProperty.getValueSpherical(time);
        if (typeof directions !== 'undefined' && pyramid._visualizerDirections !== directions) {
            pyramid.setDirections(directions);
            pyramid._visualizerDirections = directions;
        }

        position = positionProperty.getValueCartesian(time, position) || pyramid._visualizerPosition;
        orientation = orientationProperty.getValue(time, orientation) || pyramid._visualizerOrientation;

        if (typeof position !== 'undefined' &&
            typeof orientation !== 'undefined' &&
            (!position.equals(pyramid._visualizerPosition) ||
             !orientation.equals(pyramid._visualizerOrientation))) {
            pyramid.modelMatrix = new Matrix4(Matrix3.fromQuaternion(orientation.conjugate(orientation)), position);
            position.clone(pyramid._visualizerPosition);
            orientation.clone(pyramid._visualizerOrientation);
        }

        var material = dynamicPyramid.material;
        if (typeof material !== 'undefined') {
            pyramid.material = material.getValue(time, this._scene.getContext(), pyramid.material);
        }

        var property = dynamicPyramid.intersectionColor;
        if (typeof property !== 'undefined') {
            var intersectionColor = property.getValue(time, intersectionColor);
            if (typeof intersectionColor !== 'undefined') {
                pyramid.intersectionColor = intersectionColor;
            }
        }

        property = dynamicPyramid.radius;
        if (typeof property !== 'undefined') {
            var radius = property.getValue(time, radius);
            if (typeof radius !== 'undefined') {
                pyramid.radius = radius;
            }
        }
    };

    DynamicPyramidVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisPyramidCollection = this._pyramidCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var pyramidVisualizerIndex = dynamicObject._pyramidVisualizerIndex;
            if (typeof pyramidVisualizerIndex !== 'undefined') {
                var pyramid = thisPyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                thisUnusedIndexes.push(pyramidVisualizerIndex);
                dynamicObject._pyramidVisualizerIndex = undefined;
            }
        }
    };

    return DynamicPyramidVisualizer;
});