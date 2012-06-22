/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Spherical',
        '../Scene/CustomSensorVolume',
        '../Scene/ColorMaterial'
       ], function(
         DeveloperError,
         destroyObject,
         Color,
         CesiumMath,
         Matrix4,
         Spherical,
         CustomSensorVolume,
         ColorMaterial) {
    "use strict";

    //CZML_TODO DynamicConeVisualizerUsingCustomSensor is a temporary workaround
    //because ComplexConicSensor has major performance issues.  As soon as
    //ComplexConicSensor is working, this class can be deleted and
    //DynamicConeVisualizer is a drop in replacement that already does things
    //"the right way".

    function computeDirections(minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle) {
        var angle;
        var directions = [];
        var angleStep = CesiumMath.toRadians(2.0);
        if (minimumClockAngle === 0.0 && maximumClockAngle === CesiumMath.TWO_PI) {
            // No clock angle limits, so this is just a circle.
            // There might be a hole but we're ignoring it for now.
            for (angle = 0.0; angle < CesiumMath.TWO_PI; angle += angleStep) {
                directions.push(new Spherical(angle, outerHalfAngle));
            }
        } else {
            // There are clock angle limits.
            for (angle = minimumClockAngle; angle < maximumClockAngle; angle += angleStep) {
                directions.push(new Spherical(angle, outerHalfAngle));
            }
            directions.push(new Spherical(maximumClockAngle, outerHalfAngle));
            if (innerHalfAngle) {
                directions.push(new Spherical(maximumClockAngle, innerHalfAngle));
                for (angle = maximumClockAngle; angle > minimumClockAngle; angle -= angleStep) {
                    directions.push(new Spherical(angle, innerHalfAngle));
                }
                directions.push(new Spherical(minimumClockAngle, innerHalfAngle));
            } else {
                directions.push(new Spherical(maximumClockAngle, 0.0));
            }
        }
        return directions;
    }

    /**
     * A DynamicObject visualizer which maps the DynamicCone instance
     * in DynamicObject.cone to a CustomSensor primitive.
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
    function DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._coneCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

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
                oldCollection.objectsRemoved.removeEventListener(DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved);
                this.removeAll();
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
                this._updateObject(time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicConeVisualizerUsingCustomSensor.prototype.removeAll = function() {
        var i, len;
        for (i = 0, len = this._coneCollection.length; i < len; i++) {
            this._primitives.remove(this._coneCollection[i]);
        }

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i].coneVisualizerIndex = undefined;
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
        this.removeAll();
        return destroyObject(this);
    };

    var position;
    var orientation;
    var intersectionColor;
    DynamicConeVisualizerUsingCustomSensor.prototype._updateObject = function(time, dynamicObject) {
        var dynamicCone = dynamicObject.cone;
        if (typeof dynamicCone === 'undefined') {
            return;
        }

        var maximumClockAngleProperty = dynamicCone.maximumClockAngle;
        if (typeof maximumClockAngleProperty === 'undefined') {
            return;
        }

        var outerHalfAngleProperty = dynamicCone.outerHalfAngle;
        if (typeof outerHalfAngleProperty === 'undefined') {
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
        var coneVisualizerIndex = dynamicObject.coneVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof coneVisualizerIndex !== 'undefined') {
                cone = this._coneCollection[coneVisualizerIndex];
                cone.show = false;
                dynamicObject.coneVisualizerIndex = undefined;
                this._unusedIndexes.push(coneVisualizerIndex);
            }
            return;
        }

        if (typeof coneVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                coneVisualizerIndex = unusedIndexes.pop();
                cone = this._coneCollection[coneVisualizerIndex];
            } else {
                coneVisualizerIndex = this._coneCollection.length;
                //cone = new ComplexConicSensorVolume();
                cone = new CustomSensorVolume();
                cone.innerHalfAngle = 0;
                cone.minimumClockAngle = 0;
                this._coneCollection.push(cone);
                this._primitives.add(cone);
            }
            dynamicObject.coneVisualizerIndex = coneVisualizerIndex;
            cone.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            cone.capMaterial = new ColorMaterial();
            cone.innerHalfAngle = 0;
            cone.outerHalfAngle = Math.PI;
            cone.innerMaterial = new ColorMaterial();
            cone.intersectionColor = Color.YELLOW;
            cone.minimumClockAngle = -CesiumMath.TWO_PI;
            cone.maximumClockAngle =  CesiumMath.TWO_PI;
            cone.outerMaterial = new ColorMaterial();
            cone.radius = Number.POSITIVE_INFINITY;
            cone.showIntersection = true;
            cone.silhouetteMaterial = new ColorMaterial();
        } else {
            cone = this._coneCollection[coneVisualizerIndex];
        }

        cone.show = true;

        var innerHalfAngle = 0;
        var outerHalfAngle = Math.PI;
        var maximumClockAngle =  CesiumMath.TWO_PI;
        var minimumClockAngle = -CesiumMath.TWO_PI;

        var property = dynamicCone.minimumClockAngle;
        if (typeof property !== 'undefined') {
            var tmpClock = property.getValue(time);
            if (typeof tmpClock !== 'undefined') {
                minimumClockAngle = tmpClock;
            }
        }

        maximumClockAngle = maximumClockAngleProperty.getValue(time) || Math.pi;

        property = dynamicCone.innerHalfAngle;
        if (typeof property !== 'undefined') {
            var tmpAngle = property.getValue(time);
            if (typeof tmpAngle !== 'undefined') {
                innerHalfAngle = tmpAngle;
            }
        }

        outerHalfAngle = outerHalfAngleProperty.getValue(time) || Math.pi;

        if (minimumClockAngle !== cone.minimumClockAngle ||
            maximumClockAngle !== cone.maximumClockAngle ||
            innerHalfAngle !== cone.innerHalfAngle ||
            outerHalfAngle !== cone.outerHalfAngle) {
            cone.setDirections(computeDirections(minimumClockAngle, maximumClockAngle, innerHalfAngle, outerHalfAngle));
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

        position = positionProperty.getValueCartesian(time, position) || cone.dynamicConeVisualizerLastPosition;
        orientation = orientationProperty.getValue(time, orientation) || cone.dynamicConeVisualizerLastOrientation;

        if (typeof position !== 'undefined' &&
            typeof orientation !== 'undefined' &&
            (!position.equals(cone.dynamicConeVisualizerLastPosition) ||
             !orientation.equals(cone.dynamicConeVisualizerLastOrientation))) {
            cone.modelMatrix = DynamicConeVisualizerUsingCustomSensor._computeModelMatrix(position, orientation);
            position.clone(cone.dynamicConeVisualizerLastPosition);
            orientation.clone(cone.dynamicConeVisualizerLastOrientation);
        }

        var scene = this._scene;
        var material = dynamicCone.outerMaterial;
        if (typeof material !== 'undefined') {
            cone.material = material.getValue(time, scene, cone.material);
        }

        property = dynamicCone.intersectionColor;
        if (typeof property !== 'undefined') {
            intersectionColor = property.getValue(time, intersectionColor);
            if (typeof intersectionColor !== 'undefined') {
                cone.intersectionColor = intersectionColor;
            }
        }
    };

    DynamicConeVisualizerUsingCustomSensor.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisConeCollection = this._coneCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var coneVisualizerIndex = dynamicObject.coneVisualizerIndex;
            if (typeof coneVisualizerIndex !== 'undefined') {
                var cone = thisConeCollection[coneVisualizerIndex];
                cone.show = false;
                thisUnusedIndexes.push(coneVisualizerIndex);
                dynamicObject.coneVisualizerIndex = undefined;
            }
        }
    };

    DynamicConeVisualizerUsingCustomSensor._computeModelMatrix = function(position, orientation) {
        var w = orientation.w,
        x = orientation.x,
        y = orientation.y,
        z = orientation.z,
        x2 = x * x,
        xy = x * y,
        xz = x * z,
        xw = x * w,
        y2 = y * y,
        yz = y * z,
        yw = y * w,
        z2 = z * z,
        zw = z * w,
        w2 = w * w;

        return new Matrix4(
                x2 - y2 - z2 + w2,  2 * (xy + zw),      2 * (xz - yw),      position.x,
                2 * (xy - zw),      -x2 + y2 - z2 + w2, 2 * (yz + xw),      position.y,
                2 * (xz + yw),      2 * (yz - xw),      -x2 - y2 + z2 + w2, position.z,
                0,                  0,                  0,                  1);
    };

    return DynamicConeVisualizerUsingCustomSensor;
});