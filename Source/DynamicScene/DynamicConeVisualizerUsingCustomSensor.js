/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Spherical',
        '../Scene/CustomSensorVolume',
        '../Scene/Material'
       ], function(
         defaultValue,
         DeveloperError,
         destroyObject,
         Color,
         CesiumMath,
         Matrix3,
         Matrix4,
         Spherical,
         CustomSensorVolume,
         Material) {
    "use strict";

    //CZML_TODO DynamicConeVisualizerUsingCustomSensor is a temporary workaround
    //because ComplexConicSensor has major performance issues.  As soon as
    //ComplexConicSensor is working, this class can be deleted and
    //DynamicConeVisualizer is a drop in replacement that already does things
    //"the right way".

    var matrix3Scratch = new Matrix3();

    function assignSpherical(index, array, clock, cone) {
        var spherical = array[index];
        if (typeof spherical === 'undefined') {
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
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicCone
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPolylineVisualizer
     * @see DynamicPyramidVisualizer
     *
     */
    var DynamicConeVisualizerUsingCustomSensor = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
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
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved, this);
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
    DynamicConeVisualizerUsingCustomSensor.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is requied.');
        }
        if (typeof this._dynamicObjectCollection !== 'undefined') {
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

        if (typeof this._dynamicObjectCollection !== 'undefined') {
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
     * @return {Boolean} True if this object was destroyed; otherwise, false.
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
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicConeVisualizerUsingCustomSensor#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    var position;
    var orientation;
    var intersectionColor;
    var intersectionWidth;
    function updateObject(dynamicConeVisualizerUsingCustomSensor, time, dynamicObject) {
        var context = dynamicConeVisualizerUsingCustomSensor._scene.getContext();
        var dynamicCone = dynamicObject.cone;
        if (typeof dynamicCone === 'undefined') {
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

        var cone;
        var showProperty = dynamicCone.show;
        var coneVisualizerIndex = dynamicObject._coneVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof coneVisualizerIndex !== 'undefined') {
                cone = dynamicConeVisualizerUsingCustomSensor._coneCollection[coneVisualizerIndex];
                cone.show = false;
                dynamicObject._coneVisualizerIndex = undefined;
                dynamicConeVisualizerUsingCustomSensor._unusedIndexes.push(coneVisualizerIndex);
            }
            return;
        }

        if (typeof coneVisualizerIndex === 'undefined') {
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
            cone.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            cone.material = Material.fromType(context, Material.ColorType);
            cone.intersectionColor = Color.YELLOW;
            cone.intersectionWidth = 5.0;
            cone.radius = Number.POSITIVE_INFINITY;
            cone.showIntersection = true;
        } else {
            cone = dynamicConeVisualizerUsingCustomSensor._coneCollection[coneVisualizerIndex];
        }

        cone.show = true;

        var minimumClockAngle;
        var property = dynamicCone.minimumClockAngle;
        if (typeof property !== 'undefined') {
            minimumClockAngle = property.getValue(time);
        }
        if (typeof minimumClockAngle === 'undefined') {
            minimumClockAngle = 0;
        }

        var maximumClockAngle;
        property = dynamicCone.maximumClockAngle;
        if (typeof property !== 'undefined') {
            maximumClockAngle = property.getValue(time);
        }
        if (typeof maximumClockAngle === 'undefined') {
            maximumClockAngle = CesiumMath.TWO_PI;
        }

        var innerHalfAngle;
        property = dynamicCone.innerHalfAngle;
        if (typeof property !== 'undefined') {
            innerHalfAngle = property.getValue(time);
        }
        if (typeof innerHalfAngle === 'undefined') {
            innerHalfAngle = 0;
        }

        var outerHalfAngle;
        property = dynamicCone.outerHalfAngle;
        if (typeof property !== 'undefined') {
            outerHalfAngle = property.getValue(time);
        }
        if (typeof outerHalfAngle === 'undefined') {
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

        property = dynamicCone.radius;
        if (typeof property !== 'undefined') {
            var radius = property.getValue(time);
            if (typeof radius !== 'undefined') {
                cone.radius = radius;
            }
        }

        position = defaultValue(positionProperty.getValueCartesian(time, position), cone._visualizerPosition);
        orientation = defaultValue(orientationProperty.getValue(time, orientation), cone._visualizerOrientation);

        if (typeof position !== 'undefined' &&
            typeof orientation !== 'undefined' &&
            (!position.equals(cone._visualizerPosition) ||
             !orientation.equals(cone._visualizerOrientation))) {
            Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, cone.modelMatrix);
            position.clone(cone._visualizerPosition);
            orientation.clone(cone._visualizerOrientation);
        }

        var material = dynamicCone.outerMaterial;
        if (typeof material !== 'undefined') {
            cone.material = material.getValue(time, context, cone.material);
        }

        property = dynamicCone.intersectionColor;
        if (typeof property !== 'undefined') {
            intersectionColor = property.getValue(time, intersectionColor);
            if (typeof intersectionColor !== 'undefined') {
                cone.intersectionColor = intersectionColor;
            }
        }

        property = dynamicCone.intersectionWidth;
        if (typeof property !== 'undefined') {
            intersectionWidth = property.getValue(time, intersectionWidth);
            if (typeof intersectionWidth !== 'undefined') {
                cone.intersectionWidth = intersectionWidth;
            }
        }
    }

    DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisConeCollection = this._coneCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var coneVisualizerIndex = dynamicObject._coneVisualizerIndex;
            if (typeof coneVisualizerIndex !== 'undefined') {
                var cone = thisConeCollection[coneVisualizerIndex];
                cone.show = false;
                thisUnusedIndexes.push(coneVisualizerIndex);
                dynamicObject._coneVisualizerIndex = undefined;
            }
        }
    };

    return DynamicConeVisualizerUsingCustomSensor;
});
