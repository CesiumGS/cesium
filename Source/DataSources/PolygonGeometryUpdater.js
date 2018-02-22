define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/isArray',
        '../Core/Iso8601',
        '../Core/PolygonGeometry',
        '../Core/PolygonHierarchy',
        '../Core/PolygonOutlineGeometry',
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
        defined,
        destroyObject,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GeometryInstance,
        isArray,
        Iso8601,
        PolygonGeometry,
        PolygonHierarchy,
        PolygonOutlineGeometry,
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


    function PolygonGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.polygonHierarchy = undefined;
        this.perPositionHeight = undefined;
        this.closeTop = undefined;
        this.closeBottom = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
    }

    /**
     * A {@link GeometryUpdater} for polygons.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias PolygonGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function PolygonGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new PolygonGeometryOptions(entity),
            geometryPropertyName : 'polygon',
            observedPropertyNames : ['availability', 'polygon']
        });
    }

    if (defined(Object.create)) {
        PolygonGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        PolygonGeometryUpdater.prototype.constructor = PolygonGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    PolygonGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new PolygonGeometry(this._options),
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
    PolygonGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new PolygonOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    PolygonGeometryUpdater.prototype._isHidden = function(entity, polygon) {
        return !defined(polygon.hierarchy) || GeometryUpdater.prototype._isHidden.call(this, entity, polygon);
    };

    PolygonGeometryUpdater.prototype._isOnTerrain = function(entity, polygon) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;
        var perPositionHeightProperty = polygon.perPositionHeight;
        var perPositionHeightEnabled = defined(perPositionHeightProperty) && (perPositionHeightProperty.isConstant ? perPositionHeightProperty.getValue(Iso8601.MINIMUM_VALUE) : true);
        return this._fillEnabled && !defined(polygon.height) && !defined(polygon.extrudedHeight) && isColorMaterial &&
               !perPositionHeightEnabled && GroundPrimitive.isSupported(this._scene);
    };

    PolygonGeometryUpdater.prototype._isDynamic = function(entity, polygon) {
        return !polygon.hierarchy.isConstant || //
               !Property.isConstant(polygon.height) || //
               !Property.isConstant(polygon.extrudedHeight) || //
               !Property.isConstant(polygon.granularity) || //
               !Property.isConstant(polygon.stRotation) || //
               !Property.isConstant(polygon.outlineWidth) || //
               !Property.isConstant(polygon.perPositionHeight) || //
               !Property.isConstant(polygon.closeTop) || //
               !Property.isConstant(polygon.closeBottom) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    PolygonGeometryUpdater.prototype._setStaticOptions = function(entity, polygon) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;

        var hierarchyValue = polygon.hierarchy.getValue(Iso8601.MINIMUM_VALUE);
        if (isArray(hierarchyValue)) {
            hierarchyValue = new PolygonHierarchy(hierarchyValue);
        }

        var heightValue = Property.getValueOrUndefined(polygon.height, Iso8601.MINIMUM_VALUE);
        var closeTopValue = Property.getValueOrDefault(polygon.closeTop, Iso8601.MINIMUM_VALUE, true);
        var closeBottomValue = Property.getValueOrDefault(polygon.closeBottom, Iso8601.MINIMUM_VALUE, true);
        var extrudedHeightValue = Property.getValueOrUndefined(polygon.extrudedHeight, Iso8601.MINIMUM_VALUE);

        options.polygonHierarchy = hierarchyValue;
        options.height = heightValue;
        options.extrudedHeight = extrudedHeightValue;
        options.granularity = Property.getValueOrUndefined(polygon.granularity, Iso8601.MINIMUM_VALUE);
        options.stRotation = Property.getValueOrUndefined(polygon.stRotation, Iso8601.MINIMUM_VALUE);
        options.perPositionHeight = Property.getValueOrUndefined(polygon.perPositionHeight, Iso8601.MINIMUM_VALUE);
        options.closeTop = closeTopValue;
        options.closeBottom = closeBottomValue;
        this._isClosed = defined(extrudedHeightValue) && extrudedHeightValue !== heightValue && closeTopValue && closeBottomValue;
    };

    PolygonGeometryUpdater.DynamicGeometryUpdater = DynamicGeometryUpdater;

    /**
     * @private
     */
    function DynamicGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
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
        var polygon = entity.polygon;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(polygon.show, time, true)) {
            return;
        }

        var options = this._options;
        var hierarchy = Property.getValueOrUndefined(polygon.hierarchy, time);
        if (!defined(hierarchy)) {
            return;
        }

        if (isArray(hierarchy)) {
            options.polygonHierarchy = new PolygonHierarchy(hierarchy);
        } else {
            options.polygonHierarchy = hierarchy;
        }

        var heightValue = Property.getValueOrUndefined(polygon.height, time);
        var extrudedHeightValue = Property.getValueOrUndefined(polygon.extrudedHeight, time);
        var closeTopValue = Property.getValueOrDefault(polygon.closeTop, time, true);
        var closeBottomValue = Property.getValueOrDefault(polygon.closeBottom, time, true);


        options.height = heightValue;
        options.extrudedHeight = extrudedHeightValue;
        options.granularity = Property.getValueOrUndefined(polygon.granularity, time);
        options.stRotation = Property.getValueOrUndefined(polygon.stRotation, time);
        options.perPositionHeight = Property.getValueOrUndefined(polygon.perPositionHeight, time);
        options.closeTop = closeTopValue;
        options.closeBottom = closeBottomValue;

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        if (Property.getValueOrDefault(polygon.fill, time, true)) {
            if (onTerrain) {
                options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

                this._primitive = groundPrimitives.add(new GroundPrimitive({
                    geometryInstances : this._geometryUpdater.createFillGeometryInstance(time),
                    asynchronous : false,
                    shadows : shadows
                }));
            } else {
                var isColorAppearance = geometryUpdater.fillMaterialProperty instanceof ColorMaterialProperty;
                var isClosed = defined(extrudedHeightValue) && extrudedHeightValue !== heightValue && closeTopValue && closeBottomValue;
                var appearance;
                if (isColorAppearance) {
                    appearance = new PerInstanceColorAppearance({
                        closed: isClosed
                    });
                } else {
                    var material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
                    appearance = new MaterialAppearance({
                        material : material,
                        translucent : material.isTranslucent(),
                        closed : defined(options.extrudedHeight) && options.extrudedHeight !== options.height && closeTopValue && closeBottomValue
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
        }

        if (!onTerrain && Property.getValueOrDefault(polygon.outline, time, false)) {
            var outlineInstance = this._geometryUpdater.createOutlineGeometryInstance(time);
            var outlineWidth = Property.getValueOrDefault(polygon.outlineWidth, time, 1.0);

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
        var groundPrimitives = this._groundPrimitives;
        if (this._geometryUpdater._onTerrain) {
            groundPrimitives.removeAndDestroy(this._primitive);
        } else {
            primitives.removeAndDestroy(this._primitive);
        }
        primitives.removeAndDestroy(this._outlinePrimitive);
        destroyObject(this);
    };

    return PolygonGeometryUpdater;
});
