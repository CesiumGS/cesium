/*global define*/
define([
        '../Scene/CustomSensorVolume',
        '../Core/Matrix4'
    ], function(
         CustomSensorVolume,
         Matrix4) {
    "use strict";

    var setModelMatrix = function(sensor,  position, orientation)
    {
        position = position || sensor.dynamicPyramidVisualizerLastPosition;
        orientation = orientation || sensor.dynamicPyramidVisualizerLastOrientation;

        if (typeof position !== 'undefined' && typeof orientation !== 'undefined' && (position !== sensor.dynamicPyramidVisualizerLastPosition || orientation !== sensor.dynamicPyramidVisualizerLastOrientation)) {
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

            sensor.dynamicPyramidVisualizerLastPosition = position;
            sensor.dynamicPyramidVisualizerLastOrientation = orientation;
        }
    };

    function DynamicPyramidVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._pyramidCollection = [];
    }

    DynamicPyramidVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    DynamicPyramidVisualizer.prototype.updateObject = function(time, czmlObject) {
        var dynamicPyramid = czmlObject.pyramid;
        if (typeof dynamicPyramid === 'undefined') {
            return;
        }

        var directionsProperty = dynamicPyramid.directions;
        if (typeof directionsProperty === 'undefined') {
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

        var pyramid;
        var objectId = czmlObject.id;
        var showProperty = dynamicPyramid.show;
        var pyramidVisualizerIndex = czmlObject.pyramidVisualizerIndex;
        var show = czmlObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof pyramidVisualizerIndex !== 'undefined') {
                pyramid = this._pyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                czmlObject.pyramidVisualizerIndex = undefined;
                this._unusedIndexes.push(pyramidVisualizerIndex);
            }
            return;
        }

        if (typeof pyramidVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pyramidVisualizerIndex = unusedIndexes.pop();
                pyramid = this._pyramidCollection[pyramidVisualizerIndex];
            } else {
                pyramidVisualizerIndex = this._pyramidCollection.length;
                pyramid = new CustomSensorVolume();
                this._pyramidCollection.push(pyramid);
                this._primitives.add(pyramid);
            }
            czmlObject.pyramidVisualizerIndex = pyramidVisualizerIndex;
            pyramid.id = objectId;
        } else {
            pyramid = this._pyramidCollection[pyramidVisualizerIndex];
        }

        pyramid.show = true;

        var value = directionsProperty.getValueSpherical(time);
        if (typeof value !== 'undefined' && pyramid.last_directions !== value) {
            pyramid.setDirections(value);
            pyramid.last_directions = value;
        }

        setModelMatrix(pyramid, positionProperty.getValueCartesian(time), orientationProperty.getValue(time));

        var material = dynamicPyramid.material;
        if (typeof material !== 'undefined') {
            pyramid.material = material.applyToMaterial(time, pyramid.material);
        }

        var property = dynamicPyramid.intersectionColor;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                pyramid.intersectionColor = value;
            }
        }

        property = dynamicPyramid.radius;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                pyramid.radius = value;
            }
        }
    };

    DynamicPyramidVisualizer.prototype.removeAll = function(czmlObjects) {
        var i, len;
        for (i = 0, len = this._pyramidCollection.length; i < len; i++) {
            this._primitives.remove(this._pyramidCollection[i]);
        }

        for (i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.pyramidVisualizerIndex = undefined;
        }

        this._unusedIndexes = [];
        this._pyramidCollection = [];
    };

    return DynamicPyramidVisualizer;
});