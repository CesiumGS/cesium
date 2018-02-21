define([
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
        '../Core/EllipseGeometry',
        '../Core/EllipseOutlineGeometry',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/oneTimeWarning',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive',
        '../Scene/ShadowMode',
        './ColorMaterialProperty',
        './ConstantProperty',
        './dynamicGeometryGetBoundingSphere',
        './GeometryUpdater',
        './MaterialProperty',
        './Property'
    ], function(
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
        EllipseGeometry,
        EllipseOutlineGeometry,
        Event,
        GeometryInstance,
        Iso8601,
        oneTimeWarning,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        ShadowMode,
        ColorMaterialProperty,
        ConstantProperty,
        dynamicGeometryGetBoundingSphere,
        GeometryUpdater,
        MaterialProperty,
        Property) {
    'use strict';

    var scratchColor = new Color();

    function EllipseGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.center = undefined;
        this.semiMajorAxis = undefined;
        this.semiMinorAxis = undefined;
        this.rotation = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.numberOfVerticalLines = undefined;
    }

    /**
     * A {@link GeometryUpdater} for ellipses.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias EllipseGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function EllipseGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new EllipseGeometryOptions(entity),
            geometryPropertyName : 'ellipse',
            observedPropertyNames : ['availability', 'position', 'ellipse']
        });
    }

    if (defined(Object.create)) {
        EllipseGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        EllipseGeometryUpdater.prototype.constructor = EllipseGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    EllipseGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new EllipseGeometry(this._options),
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
    EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new EllipseOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    EllipseGeometryUpdater.prototype._isHidden = function(entity, ellipse) {
        var position = entity.position;

        return !defined(position) || !defined(ellipse.semiMajorAxis) || !defined(ellipse.semiMinorAxis) || GeometryUpdater.prototype._isHidden.call(this, entity, ellipse);
    };

    EllipseGeometryUpdater.prototype._isOnTerrain = function(entity, ellipse) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        return this._fillEnabled && !defined(ellipse.height) && !defined(ellipse.extrudedHeight) && isColorMaterial && GroundPrimitive.isSupported(this._scene);
    };

    EllipseGeometryUpdater.prototype._getIsClosed = function(entity, ellipse) {
        return defined(ellipse.extrudedHeight) || this._onTerrain;
    };

    EllipseGeometryUpdater.prototype._isDynamic = function(entity, ellipse) {
        return !entity.position.isConstant || //
               !ellipse.semiMajorAxis.isConstant || //
               !ellipse.semiMinorAxis.isConstant || //
               !Property.isConstant(ellipse.rotation) || //
               !Property.isConstant(ellipse.height) || //
               !Property.isConstant(ellipse.extrudedHeight) || //
               !Property.isConstant(ellipse.granularity) || //
               !Property.isConstant(ellipse.stRotation) || //
               !Property.isConstant(ellipse.outlineWidth) || //
               !Property.isConstant(ellipse.numberOfVerticalLines) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    EllipseGeometryUpdater.prototype._setStaticOptions = function(entity, ellipse) {
        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;
        var numberOfVerticalLines = ellipse.numberOfVerticalLines;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.center = entity.position.getValue(Iso8601.MINIMUM_VALUE, options.center);
        options.semiMajorAxis = ellipse.semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMajorAxis);
        options.semiMinorAxis = ellipse.semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMinorAxis);
        options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    EllipseGeometryUpdater.DynamicGeometryUpdater = DynamicGeometryUpdater;

    /**
     * @private
     */
    function DynamicGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new EllipseGeometryOptions(geometryUpdater._entity);
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
        var ellipse = entity.ellipse;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(ellipse.show, time, true)) {
            return;
        }

        var options = this._options;
        var center = Property.getValueOrUndefined(entity.position, time, options.center);
        var semiMajorAxis = Property.getValueOrUndefined(ellipse.semiMajorAxis, time);
        var semiMinorAxis = Property.getValueOrUndefined(ellipse.semiMinorAxis, time);
        if (!defined(center) || !defined(semiMajorAxis) || !defined(semiMinorAxis)) {
            return;
        }

        options.center = center;
        options.semiMajorAxis = semiMajorAxis;
        options.semiMinorAxis = semiMinorAxis;
        options.rotation = Property.getValueOrUndefined(ellipse.rotation, time);
        options.height = Property.getValueOrUndefined(ellipse.height, time);
        options.extrudedHeight = Property.getValueOrUndefined(ellipse.extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(ellipse.granularity, time);
        options.stRotation = Property.getValueOrUndefined(ellipse.stRotation, time);
        options.numberOfVerticalLines = Property.getValueOrUndefined(ellipse.numberOfVerticalLines, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        var distanceDisplayConditionProperty = this._geometryUpdater.distanceDisplayConditionProperty;
        var distanceDisplayCondition = distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);

        if (Property.getValueOrDefault(ellipse.fill, time, true)) {
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
                        geometry : new EllipseGeometry(options),
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
                        geometry : new EllipseGeometry(options)
                    }),
                    attributes : {
                        distanceDisplayCondition : distanceDisplayConditionAttribute
                    },
                    appearance : appearance,
                    asynchronous : false,
                    shadows : shadows
                }));
            }
        }

        if (!onTerrain && Property.getValueOrDefault(ellipse.outline, time, false)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(ellipse.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(ellipse.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new EllipseOutlineGeometry(options),
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

    return EllipseGeometryUpdater;
});
