define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CorridorGeometry',
        '../Core/CorridorOutlineGeometry',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
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
        CorridorGeometry,
        CorridorOutlineGeometry,
        defined,
        destroyObject,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GeometryInstance,
        Iso8601,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        ColorMaterialProperty,
        dynamicGeometryGetBoundingSphere,
        GeometryUpdater,
        MaterialProperty,
        Property) {
    'use strict';

    var scratchColor = new Color();

    function CorridorGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.width = undefined;
        this.cornerType = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
    }

    /**
     * A {@link GeometryUpdater} for corridors.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias CorridorGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function CorridorGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new CorridorGeometryOptions(entity),
            geometryPropertyName : 'corridor',
            observedPropertyNames : ['availability', 'corridor']
        });
    }

    if (defined(Object.create)) {
        CorridorGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        CorridorGeometryUpdater.prototype.constructor = CorridorGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    CorridorGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
        var distanceDisplayCondition = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(this._distanceDisplayConditionProperty.getValue(time));
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor = Color.WHITE;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time);
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayCondition,
                color : color
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayCondition
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new CorridorGeometry(this._options),
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
    CorridorGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._outlineEnabled) {
            throw new DeveloperError('This instance does not represent an outlined geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK);

        return new GeometryInstance({
            id : entity,
            geometry : new CorridorOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(this._distanceDisplayConditionProperty.getValue(time))
            }
        });
    };

    CorridorGeometryUpdater.prototype._isHidden = function(entity, corridor) {
        return !defined(corridor.positions) || GeometryUpdater.prototype._isHidden.call(this, entity, corridor);
    };

    CorridorGeometryUpdater.prototype._isOnTerrain = function(entity, corridor) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        return this._fillEnabled && !defined(corridor.height) && !defined(corridor.extrudedHeight) &&
               isColorMaterial && GroundPrimitive.isSupported(this._scene);
    };

    CorridorGeometryUpdater.prototype._getIsClosed = function(entity, corridor) {
        return defined(corridor.extrudedHeight) || this._onTerrain;
    };

    CorridorGeometryUpdater.prototype._isDynamic = function(entity, corridor) {
        return !corridor.positions.isConstant || //
               !Property.isConstant(corridor.height) || //
               !Property.isConstant(corridor.extrudedHeight) || //
               !Property.isConstant(corridor.granularity) || //
               !Property.isConstant(corridor.width) || //
               !Property.isConstant(corridor.outlineWidth) || //
               !Property.isConstant(corridor.cornerType) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    CorridorGeometryUpdater.prototype._setStaticOptions = function(entity, corridor) {
        var height = corridor.height;
        var extrudedHeight = corridor.extrudedHeight;
        var granularity = corridor.granularity;
        var width = corridor.width;
        var cornerType = corridor.cornerType;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.positions = corridor.positions.getValue(Iso8601.MINIMUM_VALUE, options.positions);
        options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.width = defined(width) ? width.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.cornerType = defined(cornerType) ? cornerType.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    CorridorGeometryUpdater.DynamicGeometryUpdater = DynamicGeometryUpdater;

    /**
     * @private
     */
    function DynamicGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new CorridorGeometryOptions(geometryUpdater._entity);
        this._entity = geometryUpdater._entity;
    }

    DynamicGeometryUpdater.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var geometryUpdater = this._geometryUpdater;
        var onTerrain = geometryUpdater._onTerrain;

        var primitives = this._primitives;
        var groundPrimitives = this._groundPrimitives;
        if (onTerrain) {
            groundPrimitives.removeAndDestroy(this._primitive);
        } else {
            primitives.removeAndDestroy(this._primitive);
            primitives.removeAndDestroy(this._outlinePrimitive);
            this._outlinePrimitive = undefined;
        }
        this._primitive = undefined;

        var entity = this._entity;
        var corridor = entity.corridor;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(corridor.show, time, true)) {
            return;
        }

        var options = this._options;
        var positions = Property.getValueOrUndefined(corridor.positions, time, options.positions);
        var width = Property.getValueOrUndefined(corridor.width, time);
        if (!defined(positions) || !defined(width)) {
            return;
        }

        options.positions = positions;
        options.width = width;
        options.height = Property.getValueOrUndefined(corridor.height, time);
        options.extrudedHeight = Property.getValueOrUndefined(corridor.extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(corridor.granularity, time);
        options.cornerType = Property.getValueOrUndefined(corridor.cornerType, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);
        var distanceDisplayCondition = this._geometryUpdater.distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);

        if (!defined(corridor.fill) || corridor.fill.getValue(time)) {
            var fillMaterialProperty = geometryUpdater.fillMaterialProperty;
            var material = MaterialProperty.getValue(time, fillMaterialProperty, this._material);
            this._material = material;

            if (onTerrain) {
                var currentColor = Color.WHITE;
                if (defined(fillMaterialProperty.color)) {
                    currentColor = fillMaterialProperty.color.getValue(time);
                }

                this._primitive = groundPrimitives.add(new GroundPrimitive({
                    geometryInstances : new GeometryInstance({
                        id : entity,
                        geometry : new CorridorGeometry(options),
                        attributes: {
                            color: ColorGeometryInstanceAttribute.fromColor(currentColor),
                            distanceDisplayCondition : distanceDisplayConditionAttribute
                        }
                    }),
                    asynchronous : false,
                    shadows : shadows
                }));
            } else {
                var appearance = new MaterialAppearance({
                    material : material,
                    translucent : material.isTranslucent(),
                    closed : defined(options.extrudedHeight)
                });
                options.vertexFormat = appearance.vertexFormat;

                this._primitive = primitives.add(new Primitive({
                    geometryInstances : new GeometryInstance({
                        id : entity,
                        geometry : new CorridorGeometry(options),
                        attributes : {
                            distanceDisplayCondition : distanceDisplayConditionAttribute
                        }
                    }),
                    appearance : appearance,
                    asynchronous : false,
                    shadows : shadows
                }));
            }
        }

        if (!onTerrain && defined(corridor.outline) && corridor.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(corridor.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(corridor.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new CorridorOutlineGeometry(options),
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

    DynamicGeometryUpdater.prototype.getBoundingSphere = function(result) {
        return dynamicGeometryGetBoundingSphere(this._entity, this._primitive, this._outlinePrimitive, result);
    };

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        var primitives = this._primitives;
        var groundPrimitives = this._groundPrimitives;
        if (this._geometryUpdater._onTerrain) {
            groundPrimitives.removeAndDestroy(this._primitive);
        } else {
            primitives.removeAndDestroy(this._primitive);
        }
        primitives.removeAndDestroy(this._outlinePrimitive);
        destroyObject(this);
    };

    return CorridorGeometryUpdater;
});
