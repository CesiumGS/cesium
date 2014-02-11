/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/PolygonGeometry',
        '../Core/PolygonOutlineGeometry',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/ShowGeometryInstanceAttribute',
        '../DynamicScene/ColorMaterialProperty',
        '../DynamicScene/ConstantProperty',
        '../DynamicScene/GeometryBatchType',
        '../DynamicScene/MaterialProperty',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        PolygonGeometry,
        PolygonOutlineGeometry,
        Event,
        GeometryInstance,
        Iso8601,
        ShowGeometryInstanceAttribute,
        ColorMaterialProperty,
        ConstantProperty,
        GeometryBatchType,
        MaterialProperty,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive) {
    "use strict";

    var defaultMaterial = new ColorMaterialProperty(Color.WHITE);
    var defaultShow = new ConstantProperty(true);
    var defaultFill = new ConstantProperty(true);
    var defaultOutline = new ConstantProperty(false);
    var defaultOutlineColor = new ConstantProperty(Color.BLACK);

    var GeometryOptions = function(dynamicObject) {
        this.id = dynamicObject;
        this.vertexFormat = undefined;
        this.polygonHierarchy = {
            positions : undefined
        };
        this.perPositionHeight = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
    };

    var PolygonGeometryUpdater = function(dynamicObject) {
        if (!defined(dynamicObject)) {
            throw new DeveloperError('dynamicObject is required');
        }

        this._id = dynamicObject.id;
        this._dynamicObject = dynamicObject;
        this._dynamicObjectSubscription = dynamicObject.definitionChanged.addEventListener(PolygonGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._geometryType = GeometryBatchType.NONE;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._outlineEnabled = false;
        this._hasConstantOutline = true;
        this._showOutlineProperty = undefined;
        this._outlineColorProperty = undefined;
        this._options = new GeometryOptions(dynamicObject);
        this._onDynamicObjectPropertyChanged(dynamicObject, 'polygon', dynamicObject.polygon, undefined);
    };

    PolygonGeometryUpdater.PerInstanceColorAppearanceType = PerInstanceColorAppearance;

    PolygonGeometryUpdater.MaterialAppearanceType = MaterialAppearance;

    defineProperties(PolygonGeometryUpdater.prototype, {
        id : {
            get : function() {
                return this._id;
            }
        },
        dynamicObject :{
            get : function() {
                return this._dynamicObject;
            }
        },
        geometryType : {
            get : function() {
                return this._geometryType;
            }
        },
        geometryChanged : {
            get : function() {
                return this._geometryChanged;
            }
        },
        fillMaterialProperty : {
            get : function() {
                return this._materialProperty;
            }
        },
        outlineEnabled : {
            get : function() {
                return this._outlineEnabled;
            }
        },
        hasConstantFill : {
            get : function() {
                return !defined(this._dynamicObject.availability) && this._showProperty.isConstant && this._fillProperty.isConstant;
            }
        },
        hasConstantOutline : {
            get : function() {
                return !defined(this._dynamicObject.availability) && this._showProperty.isConstant && this._showOutlineProperty.isConstant;
            }
        },
        outlineColorProperty : {
            get : function() {
                return this._outlineColorProperty;
            }
        }
    });

    PolygonGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var dynamicObject = this._dynamicObject;
        return dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    PolygonGeometryUpdater.prototype.isFilled = function(time) {
        var dynamicObject = this._dynamicObject;
        return dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._fillProperty.getValue(time);
    };

    PolygonGeometryUpdater.prototype.createGeometryInstance = function(time) {
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        if (this._geometryType === GeometryBatchType.COLOR_OPEN || this._geometryType === GeometryBatchType.COLOR_CLOSED) {
            var currentColor = (isAvailable && defined(this._materialProperty.color)) ? this._materialProperty.color.getValue(time) : Color.WHTE;
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                color : color
            };
        } else {
            attributes = {
                show : show
            };
        }

        return new GeometryInstance({
            id : dynamicObject,
            geometry : new PolygonGeometry(this._options),
            attributes : attributes
        });
    };

    PolygonGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        return new GeometryInstance({
            id : dynamicObject,
            geometry : new PolygonOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(isAvailable ? this._outlineColorProperty.getValue(time) : Color.BLACK)
            }
        });
    };

    PolygonGeometryUpdater.prototype.destroy = function() {
        this._dynamicObjectSubscription();
        destroyObject(this);
    };

    PolygonGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'vertexPositions' || propertyName === 'polygon')) {
            return;
        }

        var polygon = this._dynamicObject.polygon;

        if (!defined(polygon)) {
            if (this._geometryType !== GeometryBatchType.NONE || this._outlineEnabled) {
                this._outlineEnabled = false;
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = polygon.fill;
        var isFilled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = polygon.outline;
        var outlineEnabled = defined(outlineProperty);
        if (outlineEnabled && outlineProperty.isConstant) {
            outlineEnabled = outlineProperty.getValue(Iso8601.MINIMUM_VALUE);
        }

        if (!isFilled && !outlineEnabled) {
            return;
        }

        var vertexPositions = this._dynamicObject.vertexPositions;

        var show = polygon.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(vertexPositions))) {
            if (this._geometryType !== GeometryBatchType.NONE || this._outlineEnabled) {
                this._outlineEnabled = false;
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(polygon.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(polygon.outline, defaultOutline);
        this._outlineColorProperty = defaultValue(polygon.outlineColor, defaultOutlineColor);

        var perPositionHeight = polygon.perPositionHeight;
        var height = polygon.height;
        var extrudedHeight = polygon.extrudedHeight;
        var granularity = polygon.granularity;
        var stRotation = polygon.stRotation;

        if (!vertexPositions.isConstant || //
            defined(perPositionHeight) && !perPositionHeight.isConstant || //
            defined(height) && !height.isConstant || //
            defined(extrudedHeight) && !extrudedHeight.isConstant || //
            defined(granularity) && !granularity.isConstant || //
            defined(stRotation) && !stRotation.isConstant) {
            if (this._geometryType !== GeometryBatchType.DYNAMIC) {
                this._geometryType = GeometryBatchType.DYNAMIC;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.polygonHierarchy.positions = vertexPositions.getValue(Iso8601.MINIMUM_VALUE, options.polygonHierarchy.positions);
            options.perPositionHeight = defined(perPositionHeight) ? perPositionHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;

            var isClosed = defined(options.extrudedHeight);
            if (isClosed) {
                this._geometryType = isColorMaterial ? GeometryBatchType.COLOR_CLOSED : GeometryBatchType.MATERIAL_CLOSED;
            } else {
                this._geometryType = isColorMaterial ? GeometryBatchType.COLOR_OPEN : GeometryBatchType.MATERIAL_OPEN;
            }
            this._outlineEnabled = outlineEnabled;
            this._geometryChanged.raiseEvent(this);
        }
    };

    PolygonGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        return new DynamicGeometryBatchItem(primitives, this);
    };

    var DynamicGeometryBatchItem = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new GeometryOptions(geometryUpdater._dynamicObject);
    };

    DynamicGeometryBatchItem.prototype.update = function(time) {
        var geometryUpdater = this._geometryUpdater;

        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }

        if (defined(this._outlinePrimitive)) {
            this._primitives.remove(this._outlinePrimitive);
        }

        var dynamicObject = geometryUpdater._dynamicObject;
        var polygon = dynamicObject.polygon;
        var show = polygon.show;

        if (!dynamicObject.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;
        var vertexPositions = dynamicObject.vertexPositions;
        var perPositionHeight = polygon.perPositionHeight;
        var height = polygon.height;
        var extrudedHeight = polygon.extrudedHeight;
        var granularity = polygon.granularity;
        var stRotation = polygon.stRotation;

        options.polygonHierarchy.positions = vertexPositions.getValue(time, options.polygonHierarchy.positions);
        options.perPositionHeight = defined(perPositionHeight) ? perPositionHeight.getValue(time) : undefined;
        options.height = defined(height) ? height.getValue(time, options) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(time, options) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(time) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(time) : undefined;

        if (!defined(polygon.fill) || polygon.fill.getValue(time)) {
            this._material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            var material = this._material;
            var appearance = new MaterialAppearance({
                material : material,
                faceForward : true,
                translucent : material.isTranslucent(),
                closed : defined(options.extrudedHeight)
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : dynamicObject,
                    geometry : new PolygonGeometry(options)
                }),
                appearance : appearance,
                asynchronous : false
            });
            this._primitives.add(this._primitive);
        }

        if (defined(polygon.outline) && polygon.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = defined(polygon.outlineColor) ? polygon.outlineColor.getValue(time) : Color.BLACK;
            this._outlinePrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : dynamicObject,
                    geometry : new PolygonOutlineGeometry(options),
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(outlineColor)
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : outlineColor.alpha !== 1.0
                }),
                asynchronous : false
            });
            this._primitives.add(this._outlinePrimitive);
        }
    };

    DynamicGeometryBatchItem.prototype.destroy = function() {
        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }

        if (defined(this._outlinePrimitive)) {
            this._primitives.remove(this._outlinePrimitive);
        }
        destroyObject(this);
    };

    return PolygonGeometryUpdater;
});