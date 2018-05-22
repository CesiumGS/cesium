define([
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CorridorGeometry',
        '../Core/CorridorOutlineGeometry',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/GeometryOffsetAttribute',
        '../Core/Iso8601',
        '../Core/OffsetGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        '../Scene/HeightReference',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryHeightProperty',
        './GeometryUpdater',
        './GroundGeometryUpdater',
        './Property'
    ], function(
        Cartesian3,
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        CorridorGeometry,
        CorridorOutlineGeometry,
        defined,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GeometryInstance,
        GeometryOffsetAttribute,
        Iso8601,
        OffsetGeometryInstanceAttribute,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        HeightReference,
        MaterialAppearance,
        PerInstanceColorAppearance,
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryHeightProperty,
        GeometryUpdater,
        GroundGeometryUpdater,
        Property) {
    'use strict';

    var scratchColor = new Color();
    var defaultOffset = Cartesian3.ZERO;
    var offsetScratch = new Cartesian3();
    var scratchCorridorGeometry = new CorridorGeometry({positions: [], width: 1});

    function CorridorGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.width = undefined;
        this.cornerType = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.offsetAttribute = undefined;
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
        GroundGeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new CorridorGeometryOptions(entity),
            geometryPropertyName : 'corridor',
            observedPropertyNames : ['availability', 'corridor']
        });

        this._onEntityPropertyChanged(entity, 'corridor', entity.corridor, undefined);
    }

    if (defined(Object.create)) {
        CorridorGeometryUpdater.prototype = Object.create(GroundGeometryUpdater.prototype);
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
        var offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));
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
                color : color,
                offset : offset
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayCondition,
                offset : offset
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
        var offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));

        return new GeometryInstance({
            id : entity,
            geometry : new CorridorOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(this._distanceDisplayConditionProperty.getValue(time)),
                offset : offset
            }
        });
    };

    CorridorGeometryUpdater.prototype._computeCenter = function(entity, corridor, time, result) {
        var positions = Property.getValueOrUndefined(corridor.positions, time);
        if (!defined(positions) || positions.length === 0) {
            return;
        }
        return Cartesian3.clone(positions[Math.floor(positions.length / 2.0)], result);
    };

    CorridorGeometryUpdater.prototype._isHidden = function(entity, corridor) {
        return !defined(corridor.positions) || GeometryUpdater.prototype._isHidden.call(this, entity, corridor);
    };

    CorridorGeometryUpdater.prototype._isOnTerrain = function(entity, corridor) {
        return this._fillEnabled && !defined(corridor.height) && !defined(corridor.extrudedHeight) &&
               GroundPrimitive.isSupported(this._scene);
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
               !Property.isConstant(corridor.zIndex) || //
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
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.width = defined(width) ? width.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.cornerType = defined(cornerType) ? cornerType.getValue(Iso8601.MINIMUM_VALUE) : undefined;

        if (extrudedHeight instanceof GeometryHeightProperty && extrudedHeight.getHeightReference(Iso8601.MINIMUM_VALUE) === HeightReference.CLAMP_TO_GROUND) {
            scratchCorridorGeometry.setOptions(options);
            options.extrudedHeight = GeometryHeightProperty.getMinimumTerrainValue(scratchCorridorGeometry.rectangle);
            options.offsetAttribute = GeometryOffsetAttribute.TOP;
        } else {
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.offsetAttribute = GeometryOffsetAttribute.ALL;
        }
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
