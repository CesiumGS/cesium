define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/PolylineVolumeGeometry',
        '../Core/PolylineVolumeOutlineGeometry',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive',
        './ColorMaterialProperty',
        './dynamicGeometryGetBoundingSphere',
        './GeometryUpdater',
        './MaterialProperty',
        './Property'
    ], function(
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        destroyObject,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GeometryInstance,
        Iso8601,
        PolylineVolumeGeometry,
        PolylineVolumeOutlineGeometry,
        ShowGeometryInstanceAttribute,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        ColorMaterialProperty,
        dynamicGeometryGetBoundingSphere,
        GeometryUpdater,
        MaterialProperty,
        Property) {
    'use strict';


    function PolylineVolumeGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.polylinePositions = undefined;
        this.shapePositions = undefined;
        this.cornerType = undefined;
        this.granularity = undefined;
    }

    /**
     * A {@link GeometryUpdater} for polyline volumes.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias PolylineVolumeGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function PolylineVolumeGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new PolylineVolumeGeometryOptions(entity),
            geometryPropertyName : 'polylineVolume',
            observedPropertyNames : ['availability', 'polylineVolume']
        });

        this._isClosed = true;
    }

    if (defined(Object.create)) {
        PolylineVolumeGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        PolylineVolumeGeometryUpdater.prototype.constructor = PolylineVolumeGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    PolylineVolumeGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._fillEnabled) {
            throw new DeveloperError('This instance does not represent a filled geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor = Color.WHITE;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time);
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute,
                color : color
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new PolylineVolumeGeometry(this._options),
            attributes : attributes
        });
    };

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    PolylineVolumeGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._outlineEnabled) {
            throw new DeveloperError('This instance does not represent an outlined geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK);
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);

        return new GeometryInstance({
            id : entity,
            geometry : new PolylineVolumeOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    PolylineVolumeGeometryUpdater.prototype._isHidden = function(entity, polylineVolume) {
        return !defined(polylineVolume.positions) || !defined(polylineVolume.shape) || GeometryUpdater.prototype._isHidden.call(this, entity, polylineVolume);
    };

    PolylineVolumeGeometryUpdater.prototype._isDynamic = function(entity, polylineVolume) {
        return !polylineVolume.positions.isConstant || //
               !polylineVolume.shape.isConstant || //
               !Property.isConstant(polylineVolume.granularity) || //
               !Property.isConstant(polylineVolume.outlineWidth) || //
               !Property.isConstant(polylineVolume.cornerType);
    };

    PolylineVolumeGeometryUpdater.prototype._setStaticOptions = function(entity, polylineVolume) {
        var granularity = polylineVolume.granularity;
        var cornerType = polylineVolume.cornerType;

        var options = this._options;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.polylinePositions = polylineVolume.positions.getValue(Iso8601.MINIMUM_VALUE, options.polylinePositions);
        options.shapePositions = polylineVolume.shape.getValue(Iso8601.MINIMUM_VALUE, options.shape);
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.cornerType = defined(cornerType) ? cornerType.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    PolylineVolumeGeometryUpdater.DynamicGeometryUpdater = DynamicGeometryUpdater;

    /**
     * @private
     */
    function DynamicGeometryUpdater(geometryUpdater, primitives) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = geometryUpdater._options;
        this._material = {};
        this._entity = geometryUpdater._entity;
    }

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
        var polylineVolume = entity.polylineVolume;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(polylineVolume.show, time, true)) {
            return;
        }

        var options = this._options;
        var positions = Property.getValueOrUndefined(polylineVolume.positions, time, options.polylinePositions);
        var shape = Property.getValueOrUndefined(polylineVolume.shape, time);
        if (!defined(positions) || !defined(shape)) {
            return;
        }

        options.polylinePositions = positions;
        options.shapePositions = shape;
        options.granularity = Property.getValueOrUndefined(polylineVolume.granularity, time);
        options.cornerType = Property.getValueOrUndefined(polylineVolume.cornerType, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        if (!defined(polylineVolume.fill) || polylineVolume.fill.getValue(time)) {
            var isColorAppearance = geometryUpdater.fillMaterialProperty instanceof ColorMaterialProperty;
            var appearance;
            if (isColorAppearance) {
                appearance = new PerInstanceColorAppearance({
                    closed: true
                });
            } else {
                var material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
                appearance = new MaterialAppearance({
                    material : material,
                    translucent : material.isTranslucent(),
                    closed : true
                });
            }

            options.vertexFormat = appearance.vertexFormat;

            var fillInstance = this._geometryUpdater.createFillGeometryInstance(time);

            if (isColorAppearance) {
                appearance.translucent = fillInstance.attributes.color.value[3] !== 255;
            }

            this._primitive = primitives.add(new Primitive({
                geometryInstances : fillInstance,
                appearance : appearance,
                asynchronous : false,
                shadows : shadows
            }));
        }

        if (defined(polylineVolume.outline) && polylineVolume.outline.getValue(time)) {
            var outlineInstance = this._geometryUpdater.createOutlineGeometryInstance(time);
            var outlineWidth = Property.getValueOrDefault(polylineVolume.outlineWidth, time, 1.0);

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : outlineInstance,
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : outlineInstance.attributes.color.value[3] !== 255,
                    renderState : {
                        lineWidth : geometryUpdater._scene.clampLineWidth(outlineWidth)
                    }
                }),
                asynchronous : false,
                shadows : shadows
            }));
        }
    };

    DynamicGeometryUpdater.prototype.getBoundingSphere = function(result) {
        return dynamicGeometryGetBoundingSphere(this._entity, this._primitive, this._outlinePrimitive, result);
    };

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        var primitives = this._primitives;
        primitives.removeAndDestroy(this._primitive);
        primitives.removeAndDestroy(this._outlinePrimitive);
        destroyObject(this);
    };

    return PolylineVolumeGeometryUpdater;
});
