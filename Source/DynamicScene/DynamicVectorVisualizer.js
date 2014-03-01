/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Scene/Material',
        '../Scene/PolylineCollection'
       ], function(
         DeveloperError,
         defined,
         destroyObject,
         Cartesian3,
         Color,
         Material,
         PolylineCollection) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicPolyline instance
     * in DynamicObject.vector to a Polyline primitive.
     * @alias DynamicVectorVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @see DynamicPolyline
     * @see DynamicObject
     * @see CompositeDynamicObjectCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensor
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPyramidVisualizer
     */
    var DynamicVectorVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        var polylineCollection = this._polylineCollection = new PolylineCollection();
        scene.primitives.add(polylineCollection);
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicVectorVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicVectorVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicVectorVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicVectorVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicVectorVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    DynamicVectorVisualizer.prototype.update = function(time) {
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
    DynamicVectorVisualizer.prototype.removeAllPrimitives = function() {
        var i;
        this._polylineCollection.removeAll();

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._vectorVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicVectorVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicVectorVisualizer#destroy
     */
    DynamicVectorVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicVectorVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicVectorVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicVectorVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
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
                polyline.setShow(false);
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

            // CZML_TODO Determine official defaults
            polyline.setWidth(1);
            var material = polyline.getMaterial();
            if (!defined(material) || (material.type !== Material.PolylineArrowType)) {
                material = Material.fromType(Material.PolylineArrowType);
                polyline.setMaterial(material);
            }
            uniforms = material.uniforms;
            Color.clone(Color.WHITE, uniforms.color);
        } else {
            polyline = dynamicVectorVisualizer._polylineCollection.get(vectorVisualizerIndex);
            uniforms = polyline.getMaterial().uniforms;
        }

        polyline.setShow(true);

        var positions = polyline._visualizerPositions;
        var position = positionProperty.getValue(time, positions[0]);
        var direction = directionProperty.getValue(time, positions[1]);
        var length = lengthProperty.getValue(time);
        if (defined(position) && defined(direction) && defined(length)) {
            Cartesian3.add(position, Cartesian3.multiplyByScalar(Cartesian3.normalize(direction, direction), length, direction), direction);
            polyline.setPositions(positions);
        }

        var property = dynamicVector._color;
        if (defined(property)) {
            uniforms.color = property.getValue(time, uniforms.color);
        }

        property = dynamicVector._width;
        if (defined(property)) {
            var width = property.getValue(time);
            if (defined(width)) {
                polyline.setWidth(width);
            }
        }
    }

    DynamicVectorVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var vectorVisualizerIndex = dynamicObject._vectorVisualizerIndex;
            if (defined(vectorVisualizerIndex)) {
                var polyline = thisPolylineCollection.get(vectorVisualizerIndex);
                polyline.setShow(false);
                thisUnusedIndexes.push(vectorVisualizerIndex);
                dynamicObject._vectorVisualizerIndex = undefined;
            }
        }
    };

    return DynamicVectorVisualizer;
});
