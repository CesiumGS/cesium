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

        this._dynamicObject = dynamicObject;
        this._dynamicObjectSubscription = dynamicObject.definitionChanged.addEventListener(PolygonGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._fillEnabled = false;
        this._isClosed = false;
        this._dynamic = false;
        this._outlineEnabled = false;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._hasConstantOutline = true;
        this._showOutlineProperty = undefined;
        this._outlineColorProperty = undefined;
        this._options = new GeometryOptions(dynamicObject);
        this._onDynamicObjectPropertyChanged(dynamicObject, 'polygon', dynamicObject.polygon, undefined);
    };

    PolygonGeometryUpdater.PerInstanceColorAppearanceType = PerInstanceColorAppearance;

    PolygonGeometryUpdater.MaterialAppearanceType = MaterialAppearance;

    defineProperties(PolygonGeometryUpdater.prototype, {
        dynamicObject :{
            get : function() {
                return this._dynamicObject;
            }
        },
        fillEnabled : {
            get : function() {
                return this._fillEnabled;
            }
        },
        hasConstantFill : {
            get : function() {
                return !this._fillEnabled ||
                       (!defined(this._dynamicObject.availability) &&
                        (!defined(this._showProperty) || this._showProperty.isConstant) &&
                        (!defined(this._fillProperty) || this._fillProperty.isConstant));
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
        hasConstantOutline : {
            get : function() {
                return !this._outlineEnabled ||
                       (!defined(this._dynamicObject.availability) &&
                        (!defined(this._showProperty) || this._showProperty.isConstant) &&
                        (!defined(this._showOutlineProperty) || this._showOutlineProperty.isConstant));
            }
        },
        outlineColorProperty : {
            get : function() {
                return this._outlineColorProperty;
            }
        },
        isDynamic : {
            get : function() {
                return this._dynamic;
            }
        },
        isClosed : {
            get : function() {
                return this._isClosed;
            }
        },
        geometryChanged : {
            get : function() {
                return this._geometryChanged;
            }
        }
    });

    PolygonGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var dynamicObject = this._dynamicObject;
        return this._outlineEnabled && dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    PolygonGeometryUpdater.prototype.isFilled = function(time) {
        var dynamicObject = this._dynamicObject;
        return this._fillEnabled && dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._fillProperty.getValue(time);
    };

    PolygonGeometryUpdater.prototype.createGeometryInstance = function(time) {
        if (!defined(time)) {
            throw new DeveloperError();
        }

        if (!this._fillEnabled) {
            throw new DeveloperError();
        }

        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor = Color.WHITE;
            if (defined(defined(this._materialProperty.color)) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time);
            }
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
        if (!defined(time)) {
            throw new DeveloperError();
        }

        if (!this._outlineEnabled) {
            throw new DeveloperError();
        }

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

    PolygonGeometryUpdater.prototype.isDestroyed = function() {
        return false;
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
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = polygon.fill;
        var fillEnabled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = polygon.outline;
        var outlineEnabled = defined(outlineProperty);
        if (outlineEnabled && outlineProperty.isConstant) {
            outlineEnabled = outlineProperty.getValue(Iso8601.MINIMUM_VALUE);
        }

        if (!fillEnabled && !outlineEnabled) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var vertexPositions = this._dynamicObject.vertexPositions;

        var show = polygon.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(vertexPositions))) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
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
        this._outlineColorProperty = outlineEnabled ? defaultValue(polygon.outlineColor, defaultOutlineColor) : undefined;

        var height = polygon.height;
        var extrudedHeight = polygon.extrudedHeight;
        var granularity = polygon.granularity;
        var stRotation = polygon.stRotation;
        var perPositionHeight = polygon.perPositionHeight;

        this._isClosed = defined(extrudedHeight);
        this._fillEnabled = fillEnabled;
        this._outlineEnabled = outlineEnabled;

        if (!vertexPositions.isConstant || //
            defined(height) && !height.isConstant || //
            defined(extrudedHeight) && !extrudedHeight.isConstant || //
            defined(granularity) && !granularity.isConstant || //
            defined(stRotation) && !stRotation.isConstant || //
            defined(perPositionHeight) && !perPositionHeight.isConstant) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.polygonHierarchy.positions = vertexPositions.getValue(Iso8601.MINIMUM_VALUE, options.polygonHierarchy.positions);
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.perPositionHeight = defined(perPositionHeight) ? perPositionHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            this._dynamic = false;
            this._geometryChanged.raiseEvent(this);
        }
    };

    PolygonGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        if (!this._dynamic) {
            throw new DeveloperError();
        }

        if (!defined(primitives)) {
            throw new DeveloperError();
        }

        return new DynamicGeometryUpdater(primitives, this);
    };

    var DynamicGeometryUpdater = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._outlinePrimitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new GeometryOptions(geometryUpdater._dynamicObject);
    };

    DynamicGeometryUpdater.prototype.update = function(time) {
        if (!defined(time)) {
            throw new DeveloperError();
        }

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
        options.height = defined(height) ? height.getValue(time, options) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(time, options) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(time) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(time) : undefined;

        if (!defined(polygon.fill) || polygon.fill.getValue(time)) {
            options.perPositionHeight = defined(perPositionHeight) ? perPositionHeight.getValue(time) : undefined;

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

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
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