define([
    '../Core/BoxGeometry',
    '../Core/BoxOutlineGeometry',
    '../Core/Check',
    '../Core/Color',
    '../Core/ColorGeometryInstanceAttribute',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/destroyObject',
    '../Core/DeveloperError',
    '../Core/DistanceDisplayCondition',
    '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
    '../Core/Event',
    '../Core/GeometryInstance',
    '../Core/Iso8601',
    '../Core/ShowGeometryInstanceAttribute',
    '../Scene/MaterialAppearance',
    '../Scene/PerInstanceColorAppearance',
    '../Scene/Primitive',
    '../Scene/ShadowMode',
    './ColorMaterialProperty',
    './ConstantProperty',
    './dynamicGeometryGetBoundingSphere',
    './MaterialProperty',
    './Property'
], function(
    BoxGeometry,
    BoxOutlineGeometry,
    Check,
    Color,
    ColorGeometryInstanceAttribute,
    defaultValue,
    defined,
    defineProperties,
    destroyObject,
    DeveloperError,
    DistanceDisplayCondition,
    DistanceDisplayConditionGeometryInstanceAttribute,
    Event,
    GeometryInstance,
    Iso8601,
    ShowGeometryInstanceAttribute,
    MaterialAppearance,
    PerInstanceColorAppearance,
    Primitive,
    ShadowMode,
    ColorMaterialProperty,
    ConstantProperty,
    dynamicGeometryGetBoundingSphere,
    MaterialProperty,
    Property) {
    'use strict';

    var scratchColor = new Color();

    /**
     * Defines the interface for a dynamic geometry updater.  A DynamicGeometryUpdater
     * is responsible for handling visualization of a specific type of geometry
     * that needs to be recomputed based on simulation time.
     * This object is never used directly by client code, but is instead created by
     * {@link GeometryUpdater} implementations which contain dynamic geometry.
     *
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias DynamicGeometryUpdater
     * @constructor
     */
    function DynamicGeometryUpdater(geometryUpdater, geometryOptions, primitives, groundPrimitives) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._entity = geometryUpdater._entity;
        this._options = geometryOptions;
    }

    /**
     * Updates the geometry to the specified time.
     * @memberof DynamicGeometryUpdater
     * @function
     *
     * @param {JulianDate} time The current time.
     */
    DynamicGeometryUpdater.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var primitives = this._primitives;
        primitives.removeAndDestroy(this._primitive);
        primitives.removeAndDestroy(this._outlinePrimitive);
        this._primitive = undefined;
        this._outlinePrimitive = undefined;

        var geometryUpdater = this._geometryUpdater;
        var entity = this._entity;
        var box = entity.box;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(box.show, time, true)) {
            return;
        }

        var options = this._options;
        var modelMatrix = entity.computeModelMatrix(time);
        var dimensions = Property.getValueOrUndefined(box.dimensions, time, options.dimensions);
        if (!defined(modelMatrix) || !defined(dimensions)) {
            return;
        }

        options.dimensions = dimensions;

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        var distanceDisplayConditionProperty = this._geometryUpdater.distanceDisplayConditionProperty;
        var distanceDisplayCondition = distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);

        if (Property.getValueOrDefault(box.fill, time, true)) {
            var material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            this._material = material;

            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : true
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : BoxGeometry.fromDimensions(options),
                    modelMatrix : modelMatrix,
                    attributes : {
                        distanceDisplayCondition : distanceDisplayConditionAttribute
                    }
                }),
                appearance : appearance,
                asynchronous : false,
                shadows : shadows
            }));
        }

        if (Property.getValueOrDefault(box.outline, time, false)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(box.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(box.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : BoxOutlineGeometry.fromDimensions(options),
                    modelMatrix : modelMatrix,
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                        distanceDisplayCondition : distanceDisplayConditionAttribute
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : translucent,
                    renderState : {
                        lineWidth : geometryUpdater._scene.clampLineWidth(outlineWidth)
                    }
                }),
                asynchronous : false,
                shadows : shadows
            }));
        }
    };

    /**
     * Computes a bounding sphere which encloses the visualization produced for the specified entity.
     * The bounding sphere is in the fixed frame of the scene's globe.
     * @function
     *
     * @param {BoundingSphere} result The bounding sphere onto which to store the result.
     * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
     *                       BoundingSphereState.PENDING if the result is still being computed, or
     *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
     * @private
     */

    DynamicGeometryUpdater.prototype.getBoundingSphere = function(result) {
        return dynamicGeometryGetBoundingSphere(this._entity, this._primitive, this._outlinePrimitive, result);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * @memberof DynamicGeometryUpdater
     * @function
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     * @memberof DynamicGeometryUpdater
     * @function
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    DynamicGeometryUpdater.prototype.destroy = function() {
        var primitives = this._primitives;
        primitives.removeAndDestroy(this._primitive);
        primitives.removeAndDestroy(this._outlinePrimitive);
        destroyObject(this);
    };

    return DynamicGeometryUpdater;
});
