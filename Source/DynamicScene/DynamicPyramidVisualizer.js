/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Matrix4',
        '../Scene/CustomSensorVolume',
        '../Scene/ColorMaterial',
        './DynamicConeVisualizer'
       ], function(
         destroyObject,
         Color,
         Matrix4,
         CustomSensorVolume,
         ColorMaterial,
         DynamicConeVisualizer) {
    "use strict";

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

    var position;
    var orientation;
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
            pyramid.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            pyramid.radius = Number.POSITIVE_INFINITY;
            pyramid.showIntersection = true;
            pyramid.intersectionColor = Color.YELLOW;
            pyramid.material = new ColorMaterial();
        } else {
            pyramid = this._pyramidCollection[pyramidVisualizerIndex];
        }

        pyramid.show = true;

        var directions = directionsProperty.getValueSpherical(time);
        if (typeof directions !== 'undefined' && pyramid.last_directions !== directions) {
            pyramid.setDirections(directions);
            pyramid.last_directions = directions;
        }

        position = positionProperty.getValueCartesian(time, position) || pyramid.dynamicPyramidVisualizerLastPosition;
        orientation = orientationProperty.getValue(time, orientation) || pyramid.dynamicPyramidVisualizerLastOrientation;

        if (typeof position !== 'undefined' &&
            typeof orientation !== 'undefined' &&
            (!position.equals(pyramid.dynamicPyramidVisualizerLastPosition) ||
             !orientation.equals(pyramid.dynamicPyramidVisualizerLastOrientation))) {
            pyramid.modelMatrix = DynamicConeVisualizer._computeModelMatrix(position, orientation);
            position.clone(pyramid.dynamicPyramidVisualizerLastPosition);
            orientation.clone(pyramid.dynamicPyramidVisualizerLastOrientation);
        }

        var material = dynamicPyramid.material;
        if (typeof material !== 'undefined') {
            pyramid.material = material.getValue(time, this._scene, pyramid.material);
        }

        var property = dynamicPyramid.intersectionColor;
        if (typeof property !== 'undefined') {
            var intersectionColor = property.getValue(time, intersectionColor);
            if (typeof intersectionColor !== 'undefined') {
                pyramid.intersectionColor = intersectionColor;
            }
        }

        property = dynamicPyramid.radius;
        if (typeof property !== 'undefined') {
            var radius = property.getValue(time, radius);
            if (typeof radius !== 'undefined') {
                pyramid.radius = radius;
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

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPyramidVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPyramidVisualizer#destroy
     */
    DynamicPyramidVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicPyramidVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPyramidVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPyramidVisualizer.prototype.destroy = function() {
        this.removeAll();
        return destroyObject(this);
    };

    return DynamicPyramidVisualizer;
});