/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Quaternion',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
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
        Quaternion,
        CesiumMath,
        Matrix3,
        Matrix4,
        Spherical,
        CustomSensorVolume,
        Material,
        MaterialProperty) {
    "use strict";

    //CZML_TODO DynamicConeVisualizerUsingCustomSensor is a temporary workaround
    //because ComplexConicSensor has major performance issues.  As soon as
    //ComplexConicSensor is working, this class can be deleted and
    //DynamicConeVisualizer is a drop in replacement that already does things
    //"the right way".

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
     * A DynamicObject visualizer which maps the DynamicCone instance
     * in DynamicObject.cone to a CustomSensor primitive.
     * @alias DynamicConeVisualizerUsingCustomSensor
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @see DynamicCone
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPyramidVisualizer
     */
    var DynamicConeVisualizerUsingCustomSensor = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._coneCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.update = function(time) {
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
    DynamicConeVisualizerUsingCustomSensor.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._coneCollection.length; i < len; i++) {
            this._primitives.remove(this._coneCollection[i]);
        }

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._coneVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
        this._coneCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicConeVisualizerUsingCustomSensor
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicConeVisualizerUsingCustomSensor#destroy
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.isDestroyed = function() {
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
     * @memberof DynamicConeVisualizerUsingCustomSensor
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicConeVisualizerUsingCustomSensor#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
        return destroyObject(this);
    };

    var cachedPosition = new Cartesian3();
    var cachedOrientation = new Quaternion();
    function updateObject(dynamicConeVisualizerUsingCustomSensor, time, dynamicObject) {
        var dynamicCone = dynamicObject._cone;
        if (!defined(dynamicCone)) {
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

        var cone;
        var showProperty = dynamicCone._show;
        var coneVisualizerIndex = dynamicObject._coneVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(coneVisualizerIndex)) {
                cone = dynamicConeVisualizerUsingCustomSensor._coneCollection[coneVisualizerIndex];
                cone.show = false;
                dynamicObject._coneVisualizerIndex = undefined;
                dynamicConeVisualizerUsingCustomSensor._unusedIndexes.push(coneVisualizerIndex);
            }
            return;
        }

        if (!defined(coneVisualizerIndex)) {
            var unusedIndexes = dynamicConeVisualizerUsingCustomSensor._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                coneVisualizerIndex = unusedIndexes.pop();
                cone = dynamicConeVisualizerUsingCustomSensor._coneCollection[coneVisualizerIndex];
            } else {
                coneVisualizerIndex = dynamicConeVisualizerUsingCustomSensor._coneCollection.length;
                cone = new CustomSensorVolume();
                cone._directionsScratch = [];
                dynamicConeVisualizerUsingCustomSensor._coneCollection.push(cone);
                dynamicConeVisualizerUsingCustomSensor._primitives.add(cone);
            }
            dynamicObject._coneVisualizerIndex = coneVisualizerIndex;
            cone.id = dynamicObject;

            // CZML_TODO Determine official defaults
            cone.material = Material.fromType(Material.ColorType);
            cone.intersectionColor = Color.clone(Color.YELLOW);
            cone.intersectionWidth = 5.0;
            cone.radius = Number.POSITIVE_INFINITY;
            cone.showIntersection = true;
        } else {
            cone = dynamicConeVisualizerUsingCustomSensor._coneCollection[coneVisualizerIndex];
        }

        cone.show = true;

        var minimumClockAngle;
        var property = dynamicCone._minimumClockAngle;
        if (defined(property)) {
            minimumClockAngle = property.getValue(time);
        }
        if (!defined(minimumClockAngle)) {
            minimumClockAngle = 0;
        }

        var maximumClockAngle;
        property = dynamicCone._maximumClockAngle;
        if (defined(property)) {
            maximumClockAngle = property.getValue(time);
        }
        if (!defined(maximumClockAngle)) {
            maximumClockAngle = CesiumMath.TWO_PI;
        }

        var innerHalfAngle;
        property = dynamicCone._innerHalfAngle;
        if (defined(property)) {
            innerHalfAngle = property.getValue(time);
        }
        if (!defined(innerHalfAngle)) {
            innerHalfAngle = 0;
        }

        var outerHalfAngle;
        property = dynamicCone._outerHalfAngle;
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

        property = dynamicCone._radius;
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

        cone.material = MaterialProperty.getValue(time, dynamicCone._outerMaterial, cone.material);

        property = dynamicCone._intersectionColor;
        if (defined(property)) {
            property.getValue(time, cone.intersectionColor);
        }

        property = dynamicCone._intersectionWidth;
        if (defined(property)) {
            var intersectionWidth = property.getValue(time);
            if (defined(intersectionWidth)) {
                cone.intersectionWidth = intersectionWidth;
            }
        }
    }

    DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisConeCollection = this._coneCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var coneVisualizerIndex = dynamicObject._coneVisualizerIndex;
            if (defined(coneVisualizerIndex)) {
                var cone = thisConeCollection[coneVisualizerIndex];
                cone.show = false;
                thisUnusedIndexes.push(coneVisualizerIndex);
                dynamicObject._coneVisualizerIndex = undefined;
            }
        }
    };

    return DynamicConeVisualizerUsingCustomSensor;
});
