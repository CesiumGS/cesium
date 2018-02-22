define([
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CylinderGeometry',
        '../Core/CylinderOutlineGeometry',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
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
        CylinderGeometry,
        CylinderOutlineGeometry,
        defined,
        destroyObject,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GeometryInstance,
        Iso8601,
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

    var scratchColor = new Color();

    function CylinderGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.length = undefined;
        this.topRadius = undefined;
        this.bottomRadius = undefined;
        this.slices = undefined;
        this.numberOfVerticalLines = undefined;
    }

    /**
     * A {@link GeometryUpdater} for cylinders.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias CylinderGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function CylinderGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity: entity,
            scene: scene,
            geometryOptions: new CylinderGeometryOptions(entity),
            geometryPropertyName: 'cylinder',
            observedPropertyNames: ['availability', 'position', 'orientation', 'cylinder']
        });

        this._isClosed = true;
    }

    if (defined(Object.create)) {
        CylinderGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        CylinderGeometryUpdater.prototype.constructor = CylinderGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    CylinderGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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
            geometry : new CylinderGeometry(this._options),
            modelMatrix : entity.computeModelMatrix(Iso8601.MINIMUM_VALUE),
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
    CylinderGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
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
            geometry : new CylinderOutlineGeometry(this._options),
            modelMatrix : entity.computeModelMatrix(Iso8601.MINIMUM_VALUE),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    CylinderGeometryUpdater.prototype._isHidden = function(entity, cylinder) {
        return !defined(entity.position) || !defined(cylinder.length) || !defined(cylinder.topRadius) || !defined(cylinder.bottomRadius) || GeometryUpdater.prototype._isHidden.call(this, entity, cylinder);
    };

    CylinderGeometryUpdater.prototype._isDynamic = function(entity, cylinder) {
        return !entity.position.isConstant || //
                !Property.isConstant(entity.orientation) || //
                !cylinder.length.isConstant || //
                !cylinder.topRadius.isConstant || //
                !cylinder.bottomRadius.isConstant || //
                !Property.isConstant(cylinder.slices) || //
                !Property.isConstant(cylinder.outlineWidth) || //
                !Property.isConstant(cylinder.numberOfVerticalLines);
    };

    CylinderGeometryUpdater.prototype._setStaticOptions = function(entity, cylinder) {
        var slices = cylinder.slices;
        var numberOfVerticalLines = cylinder.numberOfVerticalLines;

        var options = this._options;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.length = cylinder.length.getValue(Iso8601.MINIMUM_VALUE);
        options.topRadius = cylinder.topRadius.getValue(Iso8601.MINIMUM_VALUE);
        options.bottomRadius = cylinder.bottomRadius.getValue(Iso8601.MINIMUM_VALUE);
        options.slices = defined(slices) ? slices.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    CylinderGeometryUpdater.DynamicGeometryUpdater = DynamicGeometryUpdater;

    /**
     * @private
     */
    function DynamicGeometryUpdater(geometryUpdater, primitives) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new CylinderGeometryOptions(geometryUpdater._entity);
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
        var cylinder = entity.cylinder;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(cylinder.show, time, true)) {
            return;
        }

        var options = this._options;
        var modelMatrix = entity.computeModelMatrix(time);
        var length = Property.getValueOrUndefined(cylinder.length, time);
        var topRadius = Property.getValueOrUndefined(cylinder.topRadius, time);
        var bottomRadius = Property.getValueOrUndefined(cylinder.bottomRadius, time);
        if (!defined(modelMatrix) || !defined(length) || !defined(topRadius) || !defined(bottomRadius)) {
            return;
        }

        options.length = length;
        options.topRadius = topRadius;
        options.bottomRadius = bottomRadius;
        options.slices = Property.getValueOrUndefined(cylinder.slices, time);
        options.numberOfVerticalLines = Property.getValueOrUndefined(cylinder.numberOfVerticalLines, time);

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        var distanceDisplayConditionProperty = this._geometryUpdater.distanceDisplayConditionProperty;
        var distanceDisplayCondition = distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);

        if (Property.getValueOrDefault(cylinder.fill, time, true)) {
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
                    geometry : new CylinderGeometry(options),
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

        if (Property.getValueOrDefault(cylinder.outline, time, false)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = Property.getValueOrClonedDefault(cylinder.outlineColor, time, Color.BLACK, scratchColor);
            var outlineWidth = Property.getValueOrDefault(cylinder.outlineWidth, time, 1.0);
            var translucent = outlineColor.alpha !== 1.0;

            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : new GeometryInstance({
                    id : entity,
                    geometry : new CylinderOutlineGeometry(options),
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

    return CylinderGeometryUpdater;
});
