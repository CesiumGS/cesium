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
        '../Core/RectangleGeometry',
        '../Core/RectangleOutlineGeometry',
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
        Iso8601,
        RectangleGeometry,
        RectangleOutlineGeometry,
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

    function RectangleGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.rectangle = undefined;
        this.closeBottom = undefined;
        this.closeTop = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.rotation = undefined;
    }

    /**
     * A {@link GeometryUpdater} for rectangles.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias RectangleGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function RectangleGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new RectangleGeometryOptions(entity),
            geometryPropertyName : 'rectangle',
            observedPropertyNames : ['availability', 'rectangle']
        });
    }

    if (defined(Object.create)) {
        RectangleGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        RectangleGeometryUpdater.prototype.constructor = RectangleGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    RectangleGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new RectangleGeometry(this._options),
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
    RectangleGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new RectangleOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    RectangleGeometryUpdater.prototype._isHidden = function(entity, rectangle) {
        return !defined(rectangle.coordinates) || GeometryUpdater.prototype._isHidden.call(this, entity, rectangle);
    };

    RectangleGeometryUpdater.prototype._isOnTerrain = function(entity, rectangle) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        return this._fillEnabled && !defined(rectangle.height) && !defined(rectangle.extrudedHeight) && isColorMaterial && GroundPrimitive.isSupported(this._scene);
    };

    RectangleGeometryUpdater.prototype._isDynamic = function(entity, rectangle) {
        return !rectangle.coordinates.isConstant || //
               !Property.isConstant(rectangle.height) || //
               !Property.isConstant(rectangle.extrudedHeight) || //
               !Property.isConstant(rectangle.granularity) || //
               !Property.isConstant(rectangle.stRotation) || //
               !Property.isConstant(rectangle.rotation) || //
               !Property.isConstant(rectangle.outlineWidth) || //
               !Property.isConstant(rectangle.closeBottom) || //
               !Property.isConstant(rectangle.closeTop) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    RectangleGeometryUpdater.prototype._setStaticOptions = function(entity, rectangle) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var height = rectangle.height;
        var extrudedHeight = rectangle.extrudedHeight;
        var granularity = rectangle.granularity;
        var stRotation = rectangle.stRotation;
        var rotation = rectangle.rotation;
        var closeBottom = rectangle.closeBottom;
        var closeTop = rectangle.closeTop;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.rectangle = rectangle.coordinates.getValue(Iso8601.MINIMUM_VALUE, options.rectangle);
        options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.closeBottom = defined(closeBottom) ? closeBottom.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.closeTop = defined(closeTop) ? closeTop.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        this._isClosed = defined(extrudedHeight) && defined(options.closeTop) && defined(options.closeBottom) && options.closeTop && options.closeBottom;
    };

    RectangleGeometryUpdater.DynamicGeometryUpdater = DynamicGeometryUpdater;

    /**
     * @private
     */
    function DynamicGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new RectangleGeometryOptions(geometryUpdater._entity);
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
        var rectangle = entity.rectangle;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(rectangle.show, time, true)) {
            return;
        }

        var options = this._options;
        var coordinates = Property.getValueOrUndefined(rectangle.coordinates, time, options.rectangle);
        if (!defined(coordinates)) {
            return;
        }

        options.rectangle = coordinates;
        options.height = Property.getValueOrUndefined(rectangle.height, time);
        options.extrudedHeight = Property.getValueOrUndefined(rectangle.extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(rectangle.granularity, time);
        options.stRotation = Property.getValueOrUndefined(rectangle.stRotation, time);
        options.rotation = Property.getValueOrUndefined(rectangle.rotation, time);
        options.closeBottom = Property.getValueOrUndefined(rectangle.closeBottom, time);
        options.closeTop = Property.getValueOrUndefined(rectangle.closeTop, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        if (Property.getValueOrDefault(rectangle.fill, time, true)) {
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
                        geometry : new RectangleGeometry(options),
                        attributes: {
                            color: ColorGeometryInstanceAttribute.fromColor(currentColor)
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
                        geometry : new RectangleGeometry(options)
                    }),
                    appearance : appearance,
                    asynchronous : false,
                    shadows : shadows
                }));
            }
        }

        if (!onTerrain && Property.getValueOrDefault(rectangle.outline, time, false)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(rectangle.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(rectangle.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new RectangleOutlineGeometry(options),
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(outlineColor)
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

    return RectangleGeometryUpdater;
});
