/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Scene/CustomSensorVolume',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        Matrix3,
        Matrix4,
        Quaternion,
        CustomSensorVolume,
        Material,
        MaterialProperty) {
    "use strict";

    var matrix3Scratch = new Matrix3();

    /**
     * A {@link Visualizer} which maps {@link DynamicObject#pyramid} to a {@link CustomSensorVolume}.
     * @alias DynamicPyramidVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamicObjectCollection to visualize.
     */
    var DynamicPyramidVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        //>>includeEnd('debug');

        dynamicObjectCollection.collectionChanged.addEventListener(DynamicPyramidVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._pyramidCollection = [];
        this._dynamicObjectCollection = dynamicObjectCollection;
    };

    /**
     * Updates the sensors created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    DynamicPyramidVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (var i = 0, len = dynamicObjects.length; i < len; i++) {
            updateObject(this, time, dynamicObjects[i]);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    DynamicPyramidVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    DynamicPyramidVisualizer.prototype.destroy = function() {
        var i;
        var length = this._pyramidCollection.length;
        var primitives = this._primitives;
        for (i = 0; i < length; i++) {
            primitives.remove(this._pyramidCollection[i]);
        }

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        length = dynamicObjects.length;
        for (i = 0; i < length; i++) {
            dynamicObjects[i]._pyramidVisualizerIndex = undefined;
        }

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
        for (var i = dynamicObjects.length - 1; i > -1; i--) {
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
