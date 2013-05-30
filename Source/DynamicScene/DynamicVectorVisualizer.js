/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Scene/Material',
        '../Scene/PolylineCollection'
       ], function(
         DeveloperError,
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
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicPolyline
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPyramidVisualizer
     *
     */
    var DynamicVectorVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        var polylineCollection = this._polylineCollection = new PolylineCollection();
        scene.getPrimitives().add(polylineCollection);
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
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicVectorVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicVectorVisualizer.prototype._onObjectsRemoved, this);
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
    DynamicVectorVisualizer.prototype.update = function(time) {
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
    DynamicVectorVisualizer.prototype.removeAllPrimitives = function() {
        var i;
        this._polylineCollection.removeAll();

        if (typeof this._dynamicObjectCollection !== 'undefined') {
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
     * @return {Boolean} True if this object was destroyed; otherwise, false.
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
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicVectorVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicVectorVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        this._scene.getPrimitives().remove(this._polylineCollection);
        return destroyObject(this);
    };

    DynamicVectorVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var dynamicVector = dynamicObject.vector;
        if (typeof dynamicVector === 'undefined') {
            return;
        }

        var polyline;
        var showProperty = dynamicVector.show;
        var positionProperty = dynamicObject.position;
        var directionProperty = dynamicVector.direction;
        var lengthProperty = dynamicVector.length;
        var vectorVisualizerIndex = dynamicObject._vectorVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show || //
           (typeof directionProperty === 'undefined' || typeof positionProperty === 'undefined' || typeof lengthProperty === 'undefined')) {
            //Remove the existing primitive if we have one
            if (typeof vectorVisualizerIndex !== 'undefined') {
                polyline = this._polylineCollection.get(vectorVisualizerIndex);
                polyline.setShow(false);
                dynamicObject._vectorVisualizerIndex = undefined;
                this._unusedIndexes.push(vectorVisualizerIndex);
            }
            return;
        }

        var uniforms;
        if (typeof vectorVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            if (unusedIndexes.length > 0) {
                vectorVisualizerIndex = unusedIndexes.pop();
                polyline = this._polylineCollection.get(vectorVisualizerIndex);
            } else {
                vectorVisualizerIndex = this._polylineCollection.getLength();
                polyline = this._polylineCollection.add();
                polyline._visualizerPositions = [new Cartesian3(), new Cartesian3()];
            }
            dynamicObject._vectorVisualizerIndex = vectorVisualizerIndex;
            polyline.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            polyline.setWidth(1);
            var material = polyline.getMaterial();
            if (typeof material === 'undefined' || (material.type !== Material.PolylineArrowType)) {
                material = Material.fromType(this._scene.getContext(), Material.PolylineArrowType);
                polyline.setMaterial(material);
            }
            uniforms = material.uniforms;
            Color.clone(Color.WHITE, uniforms.color);
        } else {
            polyline = this._polylineCollection.get(vectorVisualizerIndex);
            uniforms = polyline.getMaterial().uniforms;
        }

        polyline.setShow(true);

        var positions = polyline._visualizerPositions;
        var position = positionProperty.getValueCartesian(time, positions[0]);
        var direction = directionProperty.getValue(time, positions[1]);
        var length = lengthProperty.getValue(time);
        if (typeof position !== 'undefined' && typeof direction !== 'undefined' && typeof length !== 'undefined') {
            Cartesian3.add(position, direction.normalize(direction).multiplyByScalar(length, direction), direction);
            polyline.setPositions(positions);
        }

        var property = dynamicVector.color;
        if (typeof property !== 'undefined') {
            uniforms.color = property.getValue(time, uniforms.color);
        }

        property = dynamicVector.width;
        if (typeof property !== 'undefined') {
            var width = property.getValue(time);
            if (typeof width !== 'undefined') {
                polyline.setWidth(width);
            }
        }
    };

    DynamicVectorVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var vectorVisualizerIndex = dynamicObject._vectorVisualizerIndex;
            if (typeof vectorVisualizerIndex !== 'undefined') {
                var polyline = thisPolylineCollection.get(vectorVisualizerIndex);
                polyline.setShow(false);
                thisUnusedIndexes.push(vectorVisualizerIndex);
                dynamicObject._vectorVisualizerIndex = undefined;
            }
        }
    };

    return DynamicVectorVisualizer;
});
