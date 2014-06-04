/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/Material',
        '../Scene/PolylineCollection'
    ], function(
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        Material,
        PolylineCollection) {
    "use strict";

    /**
     * A {@link Visualizer} which maps {@link DynamicObject#vector} to a {@link Polyline}.
     * @alias DynamicVectorVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamicObjectCollection to visualize.
     */
    var DynamicVectorVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        //>>includeEnd('debug');

        dynamicObjectCollection.collectionChanged.addEventListener(DynamicVectorVisualizer.prototype._onObjectsRemoved, this);
        var polylineCollection = new PolylineCollection();
        scene.primitives.add(polylineCollection);

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._polylineCollection = polylineCollection;
        this._dynamicObjectCollection = dynamicObjectCollection;
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    DynamicVectorVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (var i = 0, len = dynamicObjects.length; i < len; i++) {
            updateObject(this, time, dynamicObjects[i]);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    DynamicVectorVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    DynamicVectorVisualizer.prototype.destroy = function() {
        var dynamicObjectCollection = this._dynamicObjectCollection;
        dynamicObjectCollection.collectionChanged.removeEventListener(DynamicVectorVisualizer.prototype._onObjectsRemoved, this);

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (var i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i]._vectorVisualizerIndex = undefined;
        }

        this._scene.primitives.remove(this._polylineCollection);
        return destroyObject(this);
    };

    function updateObject(dynamicVectorVisualizer, time, dynamicObject) {
        var dynamicVector = dynamicObject._vector;
        if (!defined(dynamicVector)) {
            return;
        }

        var polyline;
        var showProperty = dynamicVector._show;
        var positionProperty = dynamicObject._position;
        var directionProperty = dynamicVector._direction;
        var lengthProperty = dynamicVector._length;
        var vectorVisualizerIndex = dynamicObject._vectorVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show || !defined(directionProperty) || !defined(positionProperty) || !defined(lengthProperty)) {
            //Remove the existing primitive if we have one
            if (defined(vectorVisualizerIndex)) {
                polyline = dynamicVectorVisualizer._polylineCollection.get(vectorVisualizerIndex);
                polyline.show = false;
                dynamicObject._vectorVisualizerIndex = undefined;
                dynamicVectorVisualizer._unusedIndexes.push(vectorVisualizerIndex);
            }
            return;
        }

        var uniforms;
        if (!defined(vectorVisualizerIndex)) {
            var unusedIndexes = dynamicVectorVisualizer._unusedIndexes;
            if (unusedIndexes.length > 0) {
                vectorVisualizerIndex = unusedIndexes.pop();
                polyline = dynamicVectorVisualizer._polylineCollection.get(vectorVisualizerIndex);
            } else {
                vectorVisualizerIndex = dynamicVectorVisualizer._polylineCollection.length;
                polyline = dynamicVectorVisualizer._polylineCollection.add();
                polyline._visualizerPositions = [new Cartesian3(), new Cartesian3()];
            }
            dynamicObject._vectorVisualizerIndex = vectorVisualizerIndex;
            polyline.id = dynamicObject;

            polyline.width = 1;
            var material = polyline.material;
            if (!defined(material) || (material.type !== Material.PolylineArrowType)) {
                material = Material.fromType(Material.PolylineArrowType);
                polyline.material = material;
            }
            uniforms = material.uniforms;
            Color.clone(Color.WHITE, uniforms.color);
        } else {
            polyline = dynamicVectorVisualizer._polylineCollection.get(vectorVisualizerIndex);
            uniforms = polyline.material.uniforms;
        }

        polyline.show = true;

        var positions = polyline._visualizerPositions;
        var position = positionProperty.getValue(time, positions[0]);
        var direction = directionProperty.getValue(time, positions[1]);
        var length = lengthProperty.getValue(time);
        if (defined(position) && defined(direction) && defined(length)) {
            Cartesian3.add(position, Cartesian3.multiplyByScalar(Cartesian3.normalize(direction, direction), length, direction), direction);
            polyline.positions = positions;
        }

        var property = dynamicVector._color;
        if (defined(property)) {
            uniforms.color = property.getValue(time, uniforms.color);
        }

        property = dynamicVector._width;
        if (defined(property)) {
            var width = property.getValue(time);
            if (defined(width)) {
                polyline.width = width;
            }
        }
    }

    DynamicVectorVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var vectorVisualizerIndex = dynamicObject._vectorVisualizerIndex;
            if (defined(vectorVisualizerIndex)) {
                var polyline = thisPolylineCollection.get(vectorVisualizerIndex);
                polyline.show = false;
                thisUnusedIndexes.push(vectorVisualizerIndex);
                dynamicObject._vectorVisualizerIndex = undefined;
            }
        }
    };

    return DynamicVectorVisualizer;
});
