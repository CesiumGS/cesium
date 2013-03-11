/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Ellipsoid',
        '../Core/Shapes',
        '../Scene/Polygon',
        '../Scene/Polyline',
        '../Scene/PolylineCollection',
        '../Scene/Material'
       ], function (
               defaultValue,
               DeveloperError,
               destroyObject,
               Color,
               Ellipsoid,
               Shapes,
               Polygon,
               Polyline,
               PolylineCollection,
               Material) {
    "use strict";


        /**
         * A DynamicObject visualizer which maps the DynamicEllipse instance
         * in DynamicObject.ellipse to a Polyline primitive.
         * @alias DynamicEllipseVisualizer
         * @constructor
         *
         * @param {Scene} scene The scene the primitives will be rendered in.
         * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
         *
         * @exception {DeveloperError} scene is required.
         *
         * @see DynamicEllipse
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
         * @see DynamicPolylineVisualizer
         */
        var DynamicEllipseVisualizer = function (scene, dynamicObjectCollection) {
            if (typeof scene === 'undefined') {
                throw new DeveloperError('scene is required.');
            }
            this._scene = scene;
            this._unusedIndexes = [];
            this._primitives = scene.getPrimitives();
            this._innerPolygonCollection = [];
            this._ellipseCollection = new PolylineCollection();
            this._dynamicObjectCollection = undefined;
            this.setDynamicObjectCollection(dynamicObjectCollection);
            var cb = scene._primitives.getCentralBody();
            this._ellipsoid = (typeof cb !== 'undefined') ? cb.getEllipsoid() : Ellipsoid.WGS84;
        };

        /**
         * Returns the scene being used by this visualizer.
         *
         * @returns {Scene} The scene being used by this visualizer.
         */
        DynamicEllipseVisualizer.prototype.getScene = function () {
            return this._scene;
        };

        /**
         * Gets the DynamicObjectCollection being visualized.
         *
         * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
         */
        DynamicEllipseVisualizer.prototype.getDynamicObjectCollection = function () {
            return this._dynamicObjectCollection;
        };

        /**
         * Sets the DynamicObjectCollection to visualize.
         *
         * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
         */
        DynamicEllipseVisualizer.prototype.setDynamicObjectCollection = function (dynamicObjectCollection) {
            var oldCollection = this._dynamicObjectCollection;
            if (oldCollection !== dynamicObjectCollection) {
                if (typeof oldCollection !== 'undefined') {
                    oldCollection.objectsRemoved.removeEventListener(DynamicEllipseVisualizer.prototype._onObjectsRemoved, this);
                    this.removeAllPrimitives();
                }
                this._dynamicObjectCollection = dynamicObjectCollection;
                if (typeof dynamicObjectCollection !== 'undefined') {
                    dynamicObjectCollection.objectsRemoved.addEventListener(DynamicEllipseVisualizer.prototype._onObjectsRemoved, this);
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
        DynamicEllipseVisualizer.prototype.update = function (time) {
            if (typeof time === 'undefined') {
                throw new DeveloperError('time is requied.');
            }
            if (typeof this._dynamicObjectCollection !== 'undefined') {
                var dynamicObjects = this._dynamicObjectCollection.getObjects();
                for (var i = 0, len = dynamicObjects.length; i < len; i++) {
                    this._updateObject(time, dynamicObjects[i]);
                }
            }
        };

        /**
         * Removes all primitives from the scene.
         */
        DynamicEllipseVisualizer.prototype.removeAllPrimitives = function () {
            var i;
            var primitives = this._primitives;
            this._ellipseCollection.removeAll();
            primitives.remove(this._ellipseCollection);
            this._ellipseCollection = new PolylineCollection();

            var innerPolygonCollection = this._innerPolygonCollection;
            for(i = innerPolygonCollection.length - 1; i > -1; i--){
                primitives.remove(innerPolygonCollection[i]);
            }
            this._innerPolygonCollection = [];
            if (typeof this._dynamicObjectCollection !== 'undefined') {
                var dynamicObjects = this._dynamicObjectCollection.getObjects();
                for (i = dynamicObjects.length - 1; i > -1; i--) {
                    dynamicObjects[i]._ellipseVisualizerIndex = undefined;
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
         * @memberof DynamicEllipseVisualizer
         *
         * @return {Boolean} True if this object was destroyed; otherwise, false.
         *
         * @see DynamicEllipseVisualizer#destroy
         */
        DynamicEllipseVisualizer.prototype.isDestroyed = function () {
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
         * @memberof DynamicEllipseVisualizer
         *
         * @return {undefined}
         *
         * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
         *
         * @see DynamicEllipseVisualizer#isDestroyed
         *
         * @example
         * visualizer = visualizer && visualizer.destroy();
         */
        DynamicEllipseVisualizer.prototype.destroy = function () {
            this.removeAllPrimitives();
            return destroyObject(this);
        };

        var position;
        var semiMajorAxis;
        var semiMinorAxis;
        var bearing;
        DynamicEllipseVisualizer.prototype._updateObject = function (time, dynamicObject) {
            var context = this._scene.getContext();
            var dynamicEllipse = dynamicObject.ellipse;
            if (typeof dynamicEllipse === 'undefined') {
                return;
            }
            var semiMajorAxisProperty = dynamicEllipse.semiMajorAxis;
            if (typeof semiMajorAxisProperty === 'undefined') {
                return;
            }

            var semiMinorAxisProperty = dynamicEllipse.semiMinorAxis;
            if (typeof semiMinorAxisProperty === 'undefined') {
                return;
            }

            var positionProperty = dynamicObject.position;
            if (typeof positionProperty === 'undefined') {
                return;
            }

            var bearingProperty = dynamicEllipse.bearing;
            if (typeof bearingProperty === 'undefined') {
                return;
            }


            var ellipse;
            var innerPolygon;
            var showProperty = dynamicEllipse.show;
            var ellipseVisualizerIndex = dynamicObject._ellipseVisualizerIndex;
            var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

            if (!show) {
                //don't bother creating or updating anything else
                if (typeof ellipseVisualizerIndex !== 'undefined') {
                    ellipse = this._ellipseCollection.get(ellipseVisualizerIndex);
                    ellipse.setShow(false);
                    dynamicObject._ellipseVisualizerIndex = undefined;
                    this._unusedIndexes.push(ellipseVisualizerIndex);
                }
                return;
            }

            if (typeof ellipseVisualizerIndex === 'undefined') {
                var unusedIndexes = this._unusedIndexes;
                var length = unusedIndexes.length;
                if (length > 0) {
                    ellipseVisualizerIndex = unusedIndexes.pop();
                    ellipse = this._ellipseCollection.get(ellipseVisualizerIndex);
                    innerPolygon = this._innerPolygonCollection[ellipseVisualizerIndex];
                } else {
                    ellipseVisualizerIndex = this._ellipseCollection.getLength();
                    this._primitives.add(this._ellipseCollection);
                    innerPolygon = new Polygon();
                    innerPolygon.show = false;
                    this._innerPolygonCollection.push(innerPolygon);
                    this._primitives.add(innerPolygon);
                    ellipse = this._ellipseCollection.add();
                }
                dynamicObject._ellipseVisualizerIndex = ellipseVisualizerIndex;
                ellipse.dynamicObject = dynamicObject;
                innerPolygon.material = Material.fromType(context, Material.ColorType);

            } else {
                ellipse = this._ellipseCollection.get(ellipseVisualizerIndex);
                innerPolygon = this._innerPolygonCollection[ellipseVisualizerIndex];
            }

            ellipse.setShow(true);

            position = defaultValue(positionProperty.getValueCartesian(time, position), ellipse._visualizerPosition);
            semiMajorAxis = defaultValue(semiMajorAxisProperty.getValue(time, semiMajorAxis), ellipse._visualizerSemiMajorAxis);
            semiMinorAxis = defaultValue(semiMinorAxisProperty.getValue(time, semiMinorAxis), ellipse._visualizerSemiMinorAxis);
            bearing = defaultValue(bearingProperty.getValue(time, bearing), ellipse._visualizerBearing);

            if (typeof position !== 'undefined' &&
                    typeof bearing !== 'undefined' &&
                    typeof semiMajorAxis !== 'undefined' &&
                    typeof semiMinorAxis !== 'undefined' &&
                    semiMajorAxis !== 0.0 &&
                    semiMinorAxis !== 0.0 &&
                    (!position.equals(ellipse._visualizerPosition) ||
                            !bearing.equals(ellipse._visualizerBearing) ||
                            !semiMajorAxis.equals(ellipse._visualizerSemiMajorAxis) ||
                            !semiMinorAxis.equals(ellipse._visualizerSemiMinorAxis))) {
                var positions = Shapes.computeEllipseBoundary(this._ellipsoid, position, semiMajorAxis, semiMinorAxis, bearing);
                ellipse.setPositions(positions);
                innerPolygon.setPositions(positions);
            }
            var property = dynamicEllipse.color;
            if (typeof property !== 'undefined') {
                ellipse.setColor(property.getValue(time, ellipse.getColor()));
            }

            var material = dynamicEllipse.material;
            if (typeof material !== 'undefined') {
                innerPolygon.show = true;
                innerPolygon.material = material.getValue(time, context, ellipse.material);
            }

        };

        DynamicEllipseVisualizer.prototype._onObjectsRemoved = function (dynamicObjectCollection, dynamicObjects) {
            var thisEllipseCollection = this._ellipseCollection;
            var thisPolygonCollection = this._innerPolygonCollection;
            var thisUnusedIndexes = this._unusedIndexes;
            for (var i = dynamicObjects.length - 1; i > -1; i--) {
                var dynamicObject = dynamicObjects[i];
                var ellipseVisualizerIndex = dynamicObject._ellipseVisualizerIndex;
                if (typeof ellipseVisualizerIndex !== 'undefined') {
                    var ellipse = thisEllipseCollection.get(ellipseVisualizerIndex);
                    ellipse.setShow(false);
                    var polygon = thisPolygonCollection[ellipseVisualizerIndex];
                    polygon.show = false;
                    thisUnusedIndexes.push(ellipseVisualizerIndex);
                    dynamicObject._ellipseVisualizerIndex = undefined;
                }
            }
        };

        return DynamicEllipseVisualizer;
});