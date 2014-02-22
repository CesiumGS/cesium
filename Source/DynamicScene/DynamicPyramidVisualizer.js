/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Scene/CustomSensorVolume',
        '../Scene/Material',
        './MaterialProperty'
       ], function(
         defaultValue,
         defined,
         DeveloperError,
         destroyObject,
         Cartesian3,
         Color,
         Matrix3,
         Matrix4,
         Quaternion,
         CustomSensorVolume,
         Material,
         MaterialProperty) {
    "use strict";

    var matrix3Scratch = new Matrix3();

    /**
     * A DynamicObject visualizer which maps the DynamicPyramid instance
     * in DynamicObject.pyramid to a Pyramid primitive.
     * @alias DynamicPyramidVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @see DynamicPyramid
     * @see DynamicObject
     * @see CompositeDynamicObjectCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensor
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     */
    var DynamicPyramidVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
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
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicPyramidVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicPyramidVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    DynamicPyramidVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                updateObject(this, time, dynamicObjects[i]);
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

        if (defined(this._dynamicObjectCollection)) {
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
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPyramidVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPyramidVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
        return destroyObject(this);
    };

    var position;
    var orientation;
    function updateObject(dynamicPyramidVisualizer, time, dynamicObject) {
        var dynamicPyramid = dynamicObject._pyramid;
        if (!defined(dynamicPyramid)) {
            return;
        }

        var directionsProperty = dynamicPyramid._directions;
        if (!defined(directionsProperty)) {
            return;
        }

        var positionProperty = dynamicObject._position;
        if (!defined(positionProperty)) {
            return;
        }

        var orientationProperty = dynamicObject._orientation;
        if (!defined(orientationProperty)) {
            return;
        }

        var pyramid;
        var showProperty = dynamicPyramid._show;
        var pyramidVisualizerIndex = dynamicObject._pyramidVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pyramidVisualizerIndex)) {
                pyramid = dynamicPyramidVisualizer._pyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                dynamicObject._pyramidVisualizerIndex = undefined;
                dynamicPyramidVisualizer._unusedIndexes.push(pyramidVisualizerIndex);
            }
            return;
        }

        if (!defined(pyramidVisualizerIndex)) {
            var unusedIndexes = dynamicPyramidVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pyramidVisualizerIndex = unusedIndexes.pop();
                pyramid = dynamicPyramidVisualizer._pyramidCollection[pyramidVisualizerIndex];
            } else {
                pyramidVisualizerIndex = dynamicPyramidVisualizer._pyramidCollection.length;
                pyramid = new CustomSensorVolume();

                dynamicPyramidVisualizer._pyramidCollection.push(pyramid);
                dynamicPyramidVisualizer._primitives.add(pyramid);
            }
            dynamicObject._pyramidVisualizerIndex = pyramidVisualizerIndex;
            pyramid.id = dynamicObject;

            // CZML_TODO Determine official defaults
            pyramid.radius = Number.POSITIVE_INFINITY;
            pyramid.showIntersection = true;
            pyramid.intersectionColor = Color.YELLOW;
            pyramid.intersectionWidth = 5.0;
            pyramid.material = Material.fromType(Material.ColorType);
        } else {
            pyramid = dynamicPyramidVisualizer._pyramidCollection[pyramidVisualizerIndex];
        }

        pyramid.show = true;

        var directions = directionsProperty.getValue(time);
        if (defined(directions) && pyramid._visualizerDirections !== directions) {
            pyramid.setDirections(directions);
            pyramid._visualizerDirections = directions;
        }

        position = defaultValue(positionProperty.getValue(time, position), pyramid._visualizerPosition);
        orientation = defaultValue(orientationProperty.getValue(time, orientation), pyramid._visualizerOrientation);

        if (defined(position) &&
            defined(orientation) &&
            (!Cartesian3.equals(position, pyramid._visualizerPosition) ||
             !Quaternion.equals(orientation, pyramid._visualizerOrientation))) {
            Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, pyramid.modelMatrix);
            Cartesian3.clone(position, pyramid._visualizerPosition);
            Quaternion.clone(orientation, pyramid._visualizerOrientation);
        }

        pyramid.material = MaterialProperty.getValue(time, dynamicPyramid._material, pyramid.material);

        var property = dynamicPyramid._intersectionColor;
        if (defined(property)) {
            var intersectionColor = property.getValue(time, intersectionColor);
            if (defined(intersectionColor)) {
                pyramid.intersectionColor = intersectionColor;
            }
        }

        property = dynamicPyramid._intersectionWidth;
        if (defined(property)) {
            var intersectionWidth = property.getValue(time, intersectionWidth);
            if (defined(intersectionWidth)) {
                pyramid.intersectionWidth = intersectionWidth;
            }
        }

        property = dynamicPyramid._radius;
        if (defined(property)) {
            var radius = property.getValue(time, radius);
            if (defined(radius)) {
                pyramid.radius = radius;
            }
        }
    }

    DynamicPyramidVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisPyramidCollection = this._pyramidCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var pyramidVisualizerIndex = dynamicObject._pyramidVisualizerIndex;
            if (defined(pyramidVisualizerIndex)) {
                var pyramid = thisPyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                thisUnusedIndexes.push(pyramidVisualizerIndex);
                dynamicObject._pyramidVisualizerIndex = undefined;
            }
        }
    };

    return DynamicPyramidVisualizer;
});
