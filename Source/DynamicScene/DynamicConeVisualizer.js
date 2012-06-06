/*global define*/
define([
        '../Core/Color',
        '../Core/Math',
        '../Core/Matrix4',
        '../Scene/ComplexConicSensorVolume',
        '../Scene/ColorMaterial'
       ], function(
         Color,
         CesiumMath,
         Matrix4,
         ComplexConicSensorVolume,
         ColorMaterial) {
    "use strict";

    var setModelMatrix = function(sensor,  position, orientation)
    {
        position = position || sensor.dynamicConeVisualizerLastPosition;
        orientation = orientation || sensor.dynamicConeVisualizerLastOrientation;

        if (typeof position !== 'undefined' && typeof orientation !== 'undefined' && (position !== sensor.dynamicConeVisualizerLastPosition || orientation !== sensor.dynamicConeVisualizerLastOrientation)) {
            var w = orientation.w,
            x = -orientation.x,
            y = -orientation.y,
            z = -orientation.z,
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

            sensor.modelMatrix = new Matrix4(
                                    x2 - y2 - z2 + w2,  2 * (xy + zw),      2 * (xz - yw),      position.x,
                                    2 * (xy - zw),      -x2 + y2 - z2 + w2, 2 * (yz + xw),      position.y,
                                    2 * (xz + yw),      2 * (yz - xw),      -x2 - y2 + z2 + w2, position.z,
                                    0,                  0,                  0,                  1);

            sensor.dynamicConeVisualizerLastPosition = position;
            sensor.dynamicConeVisualizerLastOrientation = orientation;
        }
    };

    function DynamicConeVisualizer(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._coneCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    DynamicConeVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    DynamicConeVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    DynamicConeVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicConeVisualizer.prototype._onObjectsRemoved);
                this.removeAll();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicConeVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    DynamicConeVisualizer.prototype.update = function(time) {
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
            this.updateObject(time, dynamicObjects[i]);
        }
    };

    DynamicConeVisualizer.prototype.updateObject = function(time, dynamicObject) {
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
        var objectId = dynamicObject.id;
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
                cone = new ComplexConicSensorVolume();
                cone.innerHalfAngle = 0;
                cone.minimumClockAngle = 0;
                this._coneCollection.push(cone);
                this._primitives.add(cone);
            }
            dynamicObject.coneVisualizerIndex = coneVisualizerIndex;
            cone.id = objectId;

            // CZML_TODO Determine official defaults
            cone.capMaterial = new ColorMaterial();
            cone.innerHalfAngle = CesiumMath.PI_OVER_TWO;
            cone.innerMaterial = new ColorMaterial();
            cone.intersectionColor = Color.YELLOW;
            cone.maximumClockAngle =  Math.PI;
            cone.minimumClockAngle = -Math.PI;
            cone.outerHalfAngle = CesiumMath.PI_OVER_TWO;
            cone.outerMaterial = new ColorMaterial();
            cone.radius = Number.POSITIVE_INFINITY;
            cone.showIntersection = true;
            cone.silhouetteMaterial = new ColorMaterial();
        } else {
            cone = this._coneCollection[coneVisualizerIndex];
        }

        cone.show = true;
        var value;
        var property = dynamicCone.minimumClockAngle;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                cone.minimumClockAngle = value;
            }
        }

        value = maximumClockAngleProperty.getValue(time) || Math.pi;
        if (typeof value !== 'undefined') {
            cone.maximumClockAngle = value;
        }

        property = dynamicCone.innerHalfAngle;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                cone.innerHalfAngle = value;
            }
        }

        value = outerHalfAngleProperty.getValue(time) || Math.pi;
        if (typeof value !== 'undefined') {
            cone.outerHalfAngle = value;
        }

        property = dynamicCone.radius;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                cone.radius = value;
            }
        }

        setModelMatrix(cone, positionProperty.getValueCartesian(time), orientationProperty.getValue(time));

        var material = dynamicCone.capMaterial;
        if (typeof material !== 'undefined') {
            cone.capMaterial = material.applyToMaterial(time, cone.capMaterial);
        }

        material = dynamicCone.innerMaterial;
        if (typeof material !== 'undefined') {
            cone.innerMaterial = material.applyToMaterial(time, cone.innerMaterial);
        }

        material = dynamicCone.outerMaterial;
        if (typeof material !== 'undefined') {
            cone.outerMaterial = material.applyToMaterial(time, cone.outerMaterial);
        }

        material = dynamicCone.silhouetteMaterial;
        if (typeof material !== 'undefined') {
            cone.silhouetteMaterial = material.applyToMaterial(time, cone.silhouetteMaterial);
        }

        property = dynamicCone.intersectionColor;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                cone.intersectionColor = value;
            }
        }
    };

    DynamicConeVisualizer.prototype.removeAll = function() {
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

    DynamicConeVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
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

    return DynamicConeVisualizer;
});