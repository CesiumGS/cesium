define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
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
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryUpdater',
        './Property'
    ], function(
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
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
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryUpdater,
        Property) {
    'use strict';

    var scratchColor = new Color();

    function RectangleGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.rectangle = undefined;
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
            var currentColor;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
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
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK, scratchColor);
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
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    RectangleGeometryUpdater.prototype._setStaticOptions = function(entity, rectangle) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var height = rectangle.height;
        var extrudedHeight = rectangle.extrudedHeight;
        var granularity = rectangle.granularity;
        var stRotation = rectangle.stRotation;
        var rotation = rectangle.rotation;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.rectangle = rectangle.coordinates.getValue(Iso8601.MINIMUM_VALUE, options.rectangle);
        options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    RectangleGeometryUpdater.prototype._getIsClosed = function(options) {
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        return height === 0 || defined(extrudedHeight) && extrudedHeight !== height;
    };

    RectangleGeometryUpdater.DynamicGeometryUpdater = DynamicRectangleGeometryUpdater;

    /**
     * @private
     */
    function DynamicRectangleGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicRectangleGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicRectangleGeometryUpdater.prototype.constructor = DynamicRectangleGeometryUpdater;
    }

    DynamicRectangleGeometryUpdater.prototype._isHidden = function(entity, rectangle, time) {
        return  !defined(this._options.rectangle) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, rectangle, time);
    };

    DynamicRectangleGeometryUpdater.prototype._setOptions = function(entity, rectangle, time) {
        var options = this._options;
        options.rectangle = Property.getValueOrUndefined(rectangle.coordinates, time, options.rectangle);
        options.height = Property.getValueOrUndefined(rectangle.height, time);
        options.extrudedHeight = Property.getValueOrUndefined(rectangle.extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(rectangle.granularity, time);
        options.stRotation = Property.getValueOrUndefined(rectangle.stRotation, time);
        options.rotation = Property.getValueOrUndefined(rectangle.rotation, time);
    };

    return RectangleGeometryUpdater;
});
