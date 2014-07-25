/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/Spherical',
        '../Scene/CustomSensorVolume',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        Spherical,
        CustomSensorVolume,
        Material,
        MaterialProperty) {
    "use strict";

    var matrix3Scratch = new Matrix3();

    function assignSpherical(index, array, clock, cone) {
        var spherical = array[index];
        if (!defined(spherical)) {
            array[index] = spherical = new Spherical();
        }
        spherical.clock = clock;
        spherical.cone = cone;
        spherical.magnitude = 1.0;
    }

    function computeDirections(cone, minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle) {
        var directions = cone.directions;
        var angle;
        var i = 0;
        var angleStep = CesiumMath.toRadians(2.0);
        if (minimumClockAngle === 0.0 && maximumClockAngle === CesiumMath.TWO_PI) {
            // No clock angle limits, so this is just a circle.
            // There might be a hole but we're ignoring it for now.
            for (angle = 0.0; angle < CesiumMath.TWO_PI; angle += angleStep) {
                assignSpherical(i++, directions, angle, outerHalfAngle);
            }
        } else {
            // There are clock angle limits.
            for (angle = minimumClockAngle; angle < maximumClockAngle; angle += angleStep) {
                assignSpherical(i++, directions, angle, outerHalfAngle);
            }
            assignSpherical(i++, directions, maximumClockAngle, outerHalfAngle);
            if (innerHalfAngle) {
                for (angle = maximumClockAngle; angle > minimumClockAngle; angle -= angleStep) {
                    assignSpherical(i++, directions, angle, innerHalfAngle);
                }
                assignSpherical(i++, directions, minimumClockAngle, innerHalfAngle);
            } else {
                assignSpherical(i++, directions, maximumClockAngle, 0.0);
            }
        }
        directions.length = i;
        cone.directions = directions;
    }

    /**
     * A {@link Visualizer} which maps {@link Entity#cone} to a {@link CustomSensorVolume}.
     * @alias ConeVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var ConeVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(ConeVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._primitives = scene.primitives;
        this._entityCollection = entityCollection;
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    ConeVisualizer.prototype.update = function(time) {
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
    ConeVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    ConeVisualizer.prototype.destroy = function() {
        var entityCollection = this._entityCollection;
        entityCollection.collectionChanged.removeEventListener(ConeVisualizer.prototype._onObjectsRemoved, this);
        this._onObjectsRemoved(entityCollection, undefined, entityCollection.entities);
        return destroyObject(this);
    };

    var cachedPosition = new Cartesian3();
    var cachedOrientation = new Quaternion();
    function updateObject(visualizer, time, entity) {
        var coneGraphics = entity._cone;
        if (!defined(coneGraphics)) {
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

        var cone = entity._conePrimitive;
        var showProperty = coneGraphics._show;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(cone)) {
                cone.show = false;
            }
            return;
        }

        if (!defined(cone)) {
            cone = new CustomSensorVolume();
            cone.id = entity;
            cone.lateralSurfaceMaterial = Material.fromType(Material.ColorType);
            entity._conePrimitive = cone;
            visualizer._primitives.add(cone);
        }
        cone.show = true;

        var minimumClockAngle;
        var property = coneGraphics._minimumClockAngle;
        if (defined(property)) {
            minimumClockAngle = property.getValue(time);
        }
        if (!defined(minimumClockAngle)) {
            minimumClockAngle = 0;
        }

        var maximumClockAngle;
        property = coneGraphics._maximumClockAngle;
        if (defined(property)) {
            maximumClockAngle = property.getValue(time);
        }
        if (!defined(maximumClockAngle)) {
            maximumClockAngle = CesiumMath.TWO_PI;
        }

        var innerHalfAngle;
        property = coneGraphics._innerHalfAngle;
        if (defined(property)) {
            innerHalfAngle = property.getValue(time);
        }
        if (!defined(innerHalfAngle)) {
            innerHalfAngle = 0;
        }

        var outerHalfAngle;
        property = coneGraphics._outerHalfAngle;
        if (defined(property)) {
            outerHalfAngle = property.getValue(time);
        }
        if (!defined(outerHalfAngle)) {
            outerHalfAngle = Math.PI;
        }

        if (minimumClockAngle !== cone.minimumClockAngle ||
            maximumClockAngle !== cone.maximumClockAngle ||
            innerHalfAngle !== cone.innerHalfAngle ||
            outerHalfAngle !== cone.outerHalfAngle) {

            computeDirections(cone, minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle);
            cone.innerHalfAngle = innerHalfAngle;
            cone.maximumClockAngle = maximumClockAngle;
            cone.outerHalfAngle = outerHalfAngle;
            cone.minimumClockAngle = minimumClockAngle;
        }

        property = coneGraphics._radius;
        if (defined(property)) {
            var radius = property.getValue(time);
            if (defined(radius)) {
                cone.radius = radius;
            }
        }

        var position = positionProperty.getValue(time, cachedPosition);
        var orientation = orientationProperty.getValue(time, cachedOrientation);

        if (defined(position) &&
            defined(orientation) &&
            (!Cartesian3.equals(position, cone._visualizerPosition) ||
             !Quaternion.equals(orientation, cone._visualizerOrientation))) {
            Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, cone.modelMatrix);
            cone._visualizerPosition = Cartesian3.clone(position, cone._visualizerPosition);
            cone._visualizerOrientation = Quaternion.clone(orientation, cone._visualizerOrientation);
        }

        cone.lateralSurfaceMaterial = MaterialProperty.getValue(time, coneGraphics._lateralSurfaceMaterial, cone.lateralSurfaceMaterial);

        property = coneGraphics._intersectionColor;
        if (defined(property)) {
            property.getValue(time, cone.intersectionColor);
        }

        property = coneGraphics._intersectionWidth;
        if (defined(property)) {
            var intersectionWidth = property.getValue(time);
            if (defined(intersectionWidth)) {
                cone.intersectionWidth = intersectionWidth;
            }
        }
    }

    ConeVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, removed) {
        var primitives = this._primitives;
        for (var i = removed.length - 1; i > -1; i--) {
            var entity = removed[i];
            var cone = entity._conePrimitive;
            if (defined(cone)) {
                primitives.remove(cone);
                entity._conePrimitive = undefined;
            }
        }
    };

    return ConeVisualizer;
});
