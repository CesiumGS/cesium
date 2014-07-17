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
        this._primitives = scene.primitives;
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
        var entityCollection = this._entityCollection;
        entityCollection.collectionChanged.removeEventListener(PyramidVisualizer.prototype._onObjectsRemoved, this);
        this._onObjectsRemoved(entityCollection, undefined, entityCollection.entities);
        return destroyObject(this);
    };

    var position;
    var orientation;
    function updateObject(visualizer, time, entity) {
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

        var pyramid = entity._pyramidPrimitive;
        var showProperty = pyramidGraphics._show;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pyramid)) {
                pyramid.show = false;
            }
            return;
        }

        if (!defined(pyramid)) {
            pyramid = new CustomSensorVolume();
            pyramid.id = entity;
            pyramid.lateralSurfaceMaterial = Material.fromType(Material.ColorType);
            entity._pyramidPrimitive = pyramid;
            visualizer._primitives.add(pyramid);
        }
        pyramid.show = true;

        var directions = directionsProperty.getValue(time);
        if (defined(directions) && pyramid._visualizerDirections !== directions) {
            pyramid.directions = directions;
            pyramid._visualizerDirections = directions;
        }

        var property = pyramidGraphics._radius;
        if (defined(property)) {
            var radius = property.getValue(time);
            if (defined(radius)) {
                pyramid.radius = radius;
            }
        }

        position = defaultValue(positionProperty.getValue(time, position), pyramid._visualizerPosition);
        orientation = defaultValue(orientationProperty.getValue(time, orientation), pyramid._visualizerOrientation);

        if (defined(position) &&
            defined(orientation) &&
            (!Cartesian3.equals(position, pyramid._visualizerPosition) ||
             !Quaternion.equals(orientation, pyramid._visualizerOrientation))) {
            Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, pyramid.modelMatrix);
            pyramid._visualizerPosition = Cartesian3.clone(position, pyramid._visualizerPosition);
            pyramid._visualizerOrientation = Quaternion.clone(orientation, pyramid._visualizerOrientation);
        }

        pyramid.lateralSurfaceMaterial = MaterialProperty.getValue(time, pyramidGraphics._lateralSurfaceMaterial, pyramid.lateralSurfaceMaterial);

        property = pyramidGraphics._intersectionColor;
        if (defined(property)) {
            var intersectionColor = property.getValue(time, pyramid.intersectionColor);
            if (defined(intersectionColor)) {
                pyramid.intersectionColor = intersectionColor;
            }
        }

        property = pyramidGraphics._intersectionWidth;
        if (defined(property)) {
            var intersectionWidth = property.getValue(time);
            if (defined(intersectionWidth)) {
                pyramid.intersectionWidth = intersectionWidth;
            }
        }
    }

    PyramidVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, removed) {
        var primitives = this._primitives;
        for (var i = removed.length - 1; i > -1; i--) {
            var entity = removed[i];
            var pyramid = entity._pyramidPrimitive;
            if (defined(pyramid)) {
                primitives.remove(pyramid);
                entity._pyramidPrimitive = undefined;
            }
        }
    };

    return PyramidVisualizer;
});
