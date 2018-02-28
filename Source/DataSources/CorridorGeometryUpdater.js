define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CorridorGeometry',
        '../Core/CorridorOutlineGeometry',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
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
        CorridorGeometry,
        CorridorOutlineGeometry,
        defined,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GeometryInstance,
        Iso8601,
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
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK, scratchColor);

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

    CorridorGeometryUpdater.prototype._getIsClosed = function(options) {
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        return height === 0 || (defined(extrudedHeight) && extrudedHeight !== height);
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

    CorridorGeometryUpdater.DynamicGeometryUpdater = DynamicCorridorGeometryUpdater;

    /**
     * @private
     */
    function DynamicCorridorGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DynamicCorridorGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicCorridorGeometryUpdater.prototype.constructor = DynamicCorridorGeometryUpdater;
    }

    DynamicCorridorGeometryUpdater.prototype._isHidden = function(entity, corridor, time) {
        var options = this._options;
        return !defined(options.positions) || !defined(options.width) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, corridor, time);
    };

    DynamicCorridorGeometryUpdater.prototype._setOptions = function(entity, corridor, time) {
        var options = this._options;
        options.positions = Property.getValueOrUndefined(corridor.positions, time);
        options.width = Property.getValueOrUndefined(corridor.width, time);
        options.height = Property.getValueOrUndefined(corridor.height, time);
        options.extrudedHeight = Property.getValueOrUndefined(corridor.extrudedHeight, time);
        options.granularity = Property.getValueOrUndefined(corridor.granularity, time);
        options.cornerType = Property.getValueOrUndefined(corridor.cornerType, time);
    };

    return CorridorGeometryUpdater;
});
