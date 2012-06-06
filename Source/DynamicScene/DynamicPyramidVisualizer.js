/*global define*/
define([
        '../Core/Color',
        '../Core/Matrix4',
        '../Scene/CustomSensorVolume',
        '../Scene/ColorMaterial'
       ], function(
        Color,
        Matrix4,
        CustomSensorVolume,
        ColorMaterial) {
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

    function DynamicPyramidVisualizer(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._pyramidCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    DynamicPyramidVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    DynamicPyramidVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    DynamicPyramidVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicPyramidVisualizer.prototype._onObjectsRemoved);
                this.removeAll();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicPyramidVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    DynamicPyramidVisualizer.prototype.update = function(time) {
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
            this.updateObject(time, dynamicObjects[i]);
        }
    };

    DynamicPyramidVisualizer.prototype.updateObject = function(time, dynamicObject) {
        var dynamicPyramid = dynamicObject.pyramid;
        if (typeof dynamicPyramid === 'undefined') {
            return;
        }

        var directionsProperty = dynamicPyramid.directions;
        if (typeof directionsProperty === 'undefined') {
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

        var pyramid;
        var objectId = dynamicObject.id;
        var showProperty = dynamicPyramid.show;
        var pyramidVisualizerIndex = dynamicObject.pyramidVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof pyramidVisualizerIndex !== 'undefined') {
                pyramid = this._pyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                dynamicObject.pyramidVisualizerIndex = undefined;
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
            dynamicObject.pyramidVisualizerIndex = pyramidVisualizerIndex;
            pyramid.id = objectId;

            // CZML_TODO Determine official defaults
            pyramid.radius = Number.POSITIVE_INFINITY;
            pyramid.showIntersection = true;
            pyramid.intersectionColor = Color.YELLOW;
            pyramid.material = new ColorMaterial();
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

    DynamicPyramidVisualizer.prototype.removeAll = function() {
        var i, len;
        for (i = 0, len = this._pyramidCollection.length; i < len; i++) {
            this._primitives.remove(this._pyramidCollection[i]);
        }

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i].pyramidVisualizerIndex = undefined;
        }

        this._unusedIndexes = [];
        this._pyramidCollection = [];
    };

    DynamicPyramidVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisPyramidCollection = this._pyramidCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var pyramidVisualizerIndex = dynamicObject.pyramidVisualizerIndex;
            if (typeof pyramidVisualizerIndex !== 'undefined') {
                var pyramid = thisPyramidCollection[pyramidVisualizerIndex];
                pyramid.show = false;
                thisUnusedIndexes.push(pyramidVisualizerIndex);
                dynamicObject.pyramidVisualizerIndex = undefined;
            }
        }
    };


    return DynamicPyramidVisualizer;
});