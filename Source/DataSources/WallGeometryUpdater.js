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
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/WallGeometry',
        '../Core/WallOutlineGeometry',
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
        Event,
        GeometryInstance,
        Iso8601,
        ShowGeometryInstanceAttribute,
        WallGeometry,
        WallOutlineGeometry,
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

    function WallGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.minimumHeights = undefined;
        this.maximumHeights = undefined;
        this.granularity = undefined;
    }

    /**
     * A {@link GeometryUpdater} for walls.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias WallGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function WallGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new WallGeometryOptions(entity),
            geometryPropertyName : 'wall',
            observedPropertyNames : ['availability', 'wall']
        });
    }

    if (defined(Object.create)) {
        WallGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        WallGeometryUpdater.prototype.constructor = WallGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    WallGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new WallGeometry(this._options),
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
    WallGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new WallOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    WallGeometryUpdater.prototype._isHidden = function(entity, wall) {
        return !defined(wall.positions) || GeometryUpdater.prototype._isHidden.call(this, entity, wall);
    };

    WallGeometryUpdater.prototype._getIsClosed = function(entity, wall) {
        return false;
    };

    WallGeometryUpdater.prototype._isDynamic = function(entity, wall) {
        return !wall.positions.isConstant || //
               !Property.isConstant(wall.minimumHeights) || //
               !Property.isConstant(wall.maximumHeights) || //
               !Property.isConstant(wall.outlineWidth) || //
               !Property.isConstant(wall.granularity);
    };

    WallGeometryUpdater.prototype._setStaticOptions = function(entity, wall) {
        var minimumHeights = wall.minimumHeights;
        var maximumHeights = wall.maximumHeights;
        var granularity = wall.granularity;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.positions = wall.positions.getValue(Iso8601.MINIMUM_VALUE, options.positions);
        options.minimumHeights = defined(minimumHeights) ? minimumHeights.getValue(Iso8601.MINIMUM_VALUE, options.minimumHeights) : undefined;
        options.maximumHeights = defined(maximumHeights) ? maximumHeights.getValue(Iso8601.MINIMUM_VALUE, options.maximumHeights) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };


    WallGeometryUpdater.DynamicGeometryUpdater = DynamicGeometryUpdater;

    /**
     * @private
     */
    function DynamicGeometryUpdater(geometryUpdater, primitives) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new WallGeometryOptions(geometryUpdater._entity);
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
        var wall = entity.wall;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(wall.show, time, true)) {
            return;
        }

        var options = this._options;
        var positions = Property.getValueOrUndefined(wall.positions, time, options.positions);
        if (!defined(positions)) {
            return;
        }

        options.positions = positions;
        options.minimumHeights = Property.getValueOrUndefined(wall.minimumHeights, time, options.minimumHeights);
        options.maximumHeights = Property.getValueOrUndefined(wall.maximumHeights, time, options.maximumHeights);
        options.granularity = Property.getValueOrUndefined(wall.granularity, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        if (Property.getValueOrDefault(wall.fill, time, true)) {
            var material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            this._material = material;

            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : defined(options.extrudedHeight)
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new WallGeometry(options)
                }),
                appearance : appearance,
                asynchronous : false,
                shadows : shadows
            }));
        }

        if (Property.getValueOrDefault(wall.outline, time, false)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(wall.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(wall.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new WallOutlineGeometry(options),
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
        primitives.removeAndDestroy(this._primitive);
        primitives.removeAndDestroy(this._outlinePrimitive);
        destroyObject(this);
    };

    return WallGeometryUpdater;
});
