/*global define*/
define([
        '../Scene/ComplexConicSensorVolume',
        '../Core/Matrix4'
    ], function(
            ComplexConicSensorVolume,
         Matrix4) {
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

    //FIXME This class currently relies on storing data onto each CZML object
    //These objects may be transient and therefore storing data on them is bad.
    //We may need a slower "fallback" layer of storage in case the data doesn't exist.
    function DynamicConeVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._coneCollection = [];
    }

    DynamicConeVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    DynamicConeVisualizer.prototype.updateObject = function(time, czmlObject) {
        var dynamicCone = czmlObject.cone;
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

        var positionProperty = czmlObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var orientationProperty = czmlObject.orientation;
        if (typeof orientationProperty === 'undefined') {
            return;
        }

        var cone;
        var objectId = czmlObject.id;
        var showProperty = dynamicCone.show;
        var coneVisualizerIndex = czmlObject.coneVisualizerIndex;
        var show = typeof showProperty === 'undefined' || showProperty.getValue(time);

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof coneVisualizerIndex !== 'undefined') {
                cone = this._coneCollection[coneVisualizerIndex];
                cone.show = false;
                czmlObject.coneVisualizerIndex = undefined;
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
            czmlObject.coneVisualizerIndex = coneVisualizerIndex;
            cone.id = objectId;
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

    DynamicConeVisualizer.prototype.removeAll = function(czmlObjects) {
        var i, len;
        for (i = 0, len = this._coneCollection.length; i < len; i++) {
            this._primitives.remove(this._coneCollection[i]);
        }

        for (i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.coneVisualizerIndex = undefined;
        }

        this._unusedIndexes = [];
        this._coneCollection = [];
    };

    return DynamicConeVisualizer;
});