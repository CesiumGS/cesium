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

    function computeDirections(minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle, result) {
        var angle;
        var i = 0;
        var angleStep = CesiumMath.toRadians(2.0);
        if (minimumClockAngle === 0.0 && maximumClockAngle === CesiumMath.TWO_PI) {
            // No clock angle limits, so this is just a circle.
            // There might be a hole but we're ignoring it for now.
            for (angle = 0.0; angle < CesiumMath.TWO_PI; angle += angleStep) {
                assignSpherical(i++, result, angle, outerHalfAngle);
            }
        } else {
            // There are clock angle limits.
            for (angle = minimumClockAngle; angle < maximumClockAngle; angle += angleStep) {
                assignSpherical(i++, result, angle, outerHalfAngle);
            }
            assignSpherical(i++, result, maximumClockAngle, outerHalfAngle);
            if (innerHalfAngle) {
                for (angle = maximumClockAngle; angle > minimumClockAngle; angle -= angleStep) {
                    assignSpherical(i++, result, angle, innerHalfAngle);
                }
                assignSpherical(i++, result, minimumClockAngle, innerHalfAngle);
            } else {
                assignSpherical(i++, result, maximumClockAngle, 0.0);
            }
        }
        result.length = i;
        return result;
    }

    /**
     * A {@link Visualizer} which maps {@link Entity#cone} to a {@link CustomSensor}.
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
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._coneCollection = [];
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

        var i;
        var entities = entityCollection.entities;
        var length = entities.length;
        for (i = 0; i < length; i++) {
            entities[i]._coneVisualizerIndex = undefined;
        }

        length = this._coneCollection.length;
        for (i = 0; i < length; i++) {
            this._primitives.remove(this._coneCollection[i]);
        }

        return destroyObject(this);
    };

    var cachedPosition = new Cartesian3();
    var cachedOrientation = new Quaternion();
    function updateObject(coneVisualizer, time, entity) {
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

        var cone;
        var showProperty = coneGraphics._show;
        var coneVisualizerIndex = entity._coneVisualizerIndex;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(coneVisualizerIndex)) {
                cone = coneVisualizer._coneCollection[coneVisualizerIndex];
                cone.show = false;
                entity._coneVisualizerIndex = undefined;
                coneVisualizer._unusedIndexes.push(coneVisualizerIndex);
            }
            return;
        }

        if (!defined(coneVisualizerIndex)) {
            var unusedIndexes = coneVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                coneVisualizerIndex = unusedIndexes.pop();
                cone = coneVisualizer._coneCollection[coneVisualizerIndex];
            } else {
                coneVisualizerIndex = coneVisualizer._coneCollection.length;
                cone = new CustomSensorVolume();
                cone._directionsScratch = [];
                coneVisualizer._coneCollection.push(cone);
                coneVisualizer._primitives.add(cone);
            }
            entity._coneVisualizerIndex = coneVisualizerIndex;
            cone.id = entity;

            cone.material = Material.fromType(Material.ColorType);
            cone.intersectionColor = Color.clone(Color.YELLOW);
            cone.intersectionWidth = 5.0;
            cone.radius = Number.POSITIVE_INFINITY;
            cone.showIntersection = true;
        } else {
            cone = coneVisualizer._coneCollection[coneVisualizerIndex];
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

            cone.setDirections(computeDirections(minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle, cone._directionsScratch));
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

        cone.material = MaterialProperty.getValue(time, coneGraphics._outerMaterial, cone.material);

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

    ConeVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, entities) {
        var thisConeCollection = this._coneCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = entities.length - 1; i > -1; i--) {
            var entity = entities[i];
            var coneVisualizerIndex = entity._coneVisualizerIndex;
            if (defined(coneVisualizerIndex)) {
                var cone = thisConeCollection[coneVisualizerIndex];
                cone.show = false;
                thisUnusedIndexes.push(coneVisualizerIndex);
                entity._coneVisualizerIndex = undefined;
            }
        }
    };

    return ConeVisualizer;
});
