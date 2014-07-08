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
     * A {@link Visualizer} which maps {@link Entity#pyramid} to a {@link CustomSensorVolume}.
     * @alias PyramidVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var PyramidVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(PyramidVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._pyramidCollection = [];
        this._entityCollection = entityCollection;
    };

    /**
     * Updates the sensors created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    PyramidVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var entities = this._entityCollection.entities;
        for (var i = 0, len = entities.length; i < len; i++) {
            updateObject(this, time, entities[i]);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    PyramidVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    PyramidVisualizer.prototype.destroy = function() {
        var i;
        var length = this._pyramidCollection.length;
        var primitives = this._primitives;
        for (i = 0; i < length; i++) {
            primitives.remove(this._pyramidCollection[i]);
        }

        var entities = this._entityCollection.entities;
        length = entities.length;
        for (i = 0; i < length; i++) {
            entities[i]._pyramidVisualizerIndex = undefined;
        }

        return destroyObject(this);
    };

    var position;
    var orientation;
    function updateObject(pyramidVisualizer, time, entity) {
        var pyramidGraphics = entity._pyramid;
        if (!defined(pyramidGraphics)) {
            return;
        }

        var directionsProperty = pyramidGraphics._directions;
        if (!defined(directionsProperty)) {
            return;
        }

        var positionProperty = entity._position;
        if (!defined(positionProperty)) {
            return;
        }

        var orientationProperty = entity._orientation;
        if (!defined(orientationProperty)) {
            return;
        }

        var pyramid;
        var showProperty = pyramidGraphics._show;
        var pyramidVisualizerIndex = entity._pyramidVisualizerIndex;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pyramidVisualizerIndex)) {
                pyramid = pyramidVisualizer._pyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                entity._pyramidVisualizerIndex = undefined;
                pyramidVisualizer._unusedIndexes.push(pyramidVisualizerIndex);
            }
            return;
        }

        if (!defined(pyramidVisualizerIndex)) {
            var unusedIndexes = pyramidVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pyramidVisualizerIndex = unusedIndexes.pop();
                pyramid = pyramidVisualizer._pyramidCollection[pyramidVisualizerIndex];
            } else {
                pyramidVisualizerIndex = pyramidVisualizer._pyramidCollection.length;
                pyramid = new CustomSensorVolume();

                pyramidVisualizer._pyramidCollection.push(pyramid);
                pyramidVisualizer._primitives.add(pyramid);
            }
            entity._pyramidVisualizerIndex = pyramidVisualizerIndex;
            pyramid.id = entity;

            pyramid.radius = Number.POSITIVE_INFINITY;
            pyramid.showIntersection = true;
            pyramid.intersectionColor = Color.YELLOW;
            pyramid.intersectionWidth = 5.0;
            pyramid.material = Material.fromType(Material.ColorType);
        } else {
            pyramid = pyramidVisualizer._pyramidCollection[pyramidVisualizerIndex];
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

        pyramid.material = MaterialProperty.getValue(time, pyramidGraphics._material, pyramid.material);

        var property = pyramidGraphics._intersectionColor;
        if (defined(property)) {
            var intersectionColor = property.getValue(time, intersectionColor);
            if (defined(intersectionColor)) {
                pyramid.intersectionColor = intersectionColor;
            }
        }

        property = pyramidGraphics._intersectionWidth;
        if (defined(property)) {
            var intersectionWidth = property.getValue(time, intersectionWidth);
            if (defined(intersectionWidth)) {
                pyramid.intersectionWidth = intersectionWidth;
            }
        }

        property = pyramidGraphics._radius;
        if (defined(property)) {
            var radius = property.getValue(time, radius);
            if (defined(radius)) {
                pyramid.radius = radius;
            }
        }
    }

    PyramidVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, entities) {
        var thisPyramidCollection = this._pyramidCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = entities.length - 1; i > -1; i--) {
            var entity = entities[i];
            var pyramidVisualizerIndex = entity._pyramidVisualizerIndex;
            if (defined(pyramidVisualizerIndex)) {
                var pyramid = thisPyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                thisUnusedIndexes.push(pyramidVisualizerIndex);
                entity._pyramidVisualizerIndex = undefined;
            }
        }
    };

    return PyramidVisualizer;
});
