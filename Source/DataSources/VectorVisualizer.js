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
     * A {@link Visualizer} which maps {@link Entity#vector} to a {@link Polyline}.
     * @alias VectorVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var VectorVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(VectorVisualizer.prototype._onObjectsRemoved, this);
        var polylineCollection = new PolylineCollection();
        scene.primitives.add(polylineCollection);

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._polylineCollection = polylineCollection;
        this._entityCollection = entityCollection;
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    VectorVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var entities = this._entityCollection.getObjects();
        for (var i = 0, len = entities.length; i < len; i++) {
            updateObject(this, time, entities[i]);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    VectorVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    VectorVisualizer.prototype.destroy = function() {
        var entityCollection = this._entityCollection;
        entityCollection.collectionChanged.removeEventListener(VectorVisualizer.prototype._onObjectsRemoved, this);

        var entities = this._entityCollection.getObjects();
        for (var i = entities.length - 1; i > -1; i--) {
            entities[i]._vectorVisualizerIndex = undefined;
        }

        this._scene.primitives.remove(this._polylineCollection);
        return destroyObject(this);
    };

    function updateObject(vectorVisualizer, time, entity) {
        var vectorGraphics = entity._vector;
        if (!defined(vectorGraphics)) {
            return;
        }

        var polyline;
        var showProperty = vectorGraphics._show;
        var positionProperty = entity._position;
        var directionProperty = vectorGraphics._direction;
        var lengthProperty = vectorGraphics._length;
        var vectorVisualizerIndex = entity._vectorVisualizerIndex;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show || !defined(directionProperty) || !defined(positionProperty) || !defined(lengthProperty)) {
            //Remove the existing primitive if we have one
            if (defined(vectorVisualizerIndex)) {
                polyline = vectorVisualizer._polylineCollection.get(vectorVisualizerIndex);
                polyline.show = false;
                entity._vectorVisualizerIndex = undefined;
                vectorVisualizer._unusedIndexes.push(vectorVisualizerIndex);
            }
            return;
        }

        var uniforms;
        if (!defined(vectorVisualizerIndex)) {
            var unusedIndexes = vectorVisualizer._unusedIndexes;
            if (unusedIndexes.length > 0) {
                vectorVisualizerIndex = unusedIndexes.pop();
                polyline = vectorVisualizer._polylineCollection.get(vectorVisualizerIndex);
            } else {
                vectorVisualizerIndex = vectorVisualizer._polylineCollection.length;
                polyline = vectorVisualizer._polylineCollection.add();
                polyline._visualizerPositions = [new Cartesian3(), new Cartesian3()];
            }
            entity._vectorVisualizerIndex = vectorVisualizerIndex;
            polyline.id = entity;

            polyline.width = 1;
            var material = polyline.material;
            if (!defined(material) || (material.type !== Material.PolylineArrowType)) {
                material = Material.fromType(Material.PolylineArrowType);
                polyline.material = material;
            }
            uniforms = material.uniforms;
            Color.clone(Color.WHITE, uniforms.color);
        } else {
            polyline = vectorVisualizer._polylineCollection.get(vectorVisualizerIndex);
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

        var property = vectorGraphics._color;
        if (defined(property)) {
            uniforms.color = property.getValue(time, uniforms.color);
        }

        property = vectorGraphics._width;
        if (defined(property)) {
            var width = property.getValue(time);
            if (defined(width)) {
                polyline.width = width;
            }
        }
    }

    VectorVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, entities) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = entities.length - 1; i > -1; i--) {
            var entity = entities[i];
            var vectorVisualizerIndex = entity._vectorVisualizerIndex;
            if (defined(vectorVisualizerIndex)) {
                var polyline = thisPolylineCollection.get(vectorVisualizerIndex);
                polyline.show = false;
                thisUnusedIndexes.push(vectorVisualizerIndex);
                entity._vectorVisualizerIndex = undefined;
            }
        }
    };

    return VectorVisualizer;
});
