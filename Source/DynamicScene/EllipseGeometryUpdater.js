/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EllipseGeometry',
        '../Core/EllipseOutlineGeometry',
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
        EllipseGeometry,
        EllipseOutlineGeometry,
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
        this.center = undefined;
        this.semiMajorAxis = undefined;
        this.semiMinorAxis = undefined;
        this.rotation = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.numberOfVerticalLines = undefined;
    };

    var EllipseGeometryUpdater = function(dynamicObject) {
        if (!defined(dynamicObject)) {
            throw new DeveloperError('dynamicObject is required');
        }

        this._id = dynamicObject.id;
        this._dynamicObject = dynamicObject;
        this._dynamicObjectSubscription = dynamicObject.definitionChanged.addEventListener(EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._geometryType = GeometryBatchType.NONE;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._outlineEnabled = false;
        this._hasConstantOutline = true;
        this._showOutlineProperty = undefined;
        this._outlineColorProperty = undefined;
        this._options = new GeometryOptions(dynamicObject);
        this._onDynamicObjectPropertyChanged(dynamicObject, 'ellipse', dynamicObject.ellipse, undefined);
    };

    EllipseGeometryUpdater.PerInstanceColorAppearanceType = PerInstanceColorAppearance;

    EllipseGeometryUpdater.MaterialAppearanceType = MaterialAppearance;

    defineProperties(EllipseGeometryUpdater.prototype, {
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

    EllipseGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var dynamicObject = this._dynamicObject;
        return dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    EllipseGeometryUpdater.prototype.isFilled = function(time) {
        var dynamicObject = this._dynamicObject;
        return dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._fillProperty.getValue(time);
    };

    EllipseGeometryUpdater.prototype.createGeometryInstance = function(time) {
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        if (this._geometryType === GeometryBatchType.COLOR) {
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
            geometry : new EllipseGeometry(this._options),
            attributes : attributes
        });
    };

    EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        return new GeometryInstance({
            id : dynamicObject,
            geometry : new EllipseOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(isAvailable ? this._outlineColorProperty.getValue(time) : Color.BLACK)
            }
        });
    };

    EllipseGeometryUpdater.prototype.destroy = function() {
        this._dynamicObjectSubscription();
        destroyObject(this);
    };

    EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'position' || propertyName === 'ellipse')) {
            return;
        }

        var ellipse = this._dynamicObject.ellipse;

        if (!defined(ellipse)) {
            if (this._geometryType !== GeometryBatchType.NONE || this._outlineEnabled) {
                this._outlineEnabled = false;
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = ellipse.fill;
        var isFilled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = ellipse.outline;
        var outlineEnabled = defined(outlineProperty);
        if (outlineEnabled && outlineProperty.isConstant) {
            outlineEnabled = outlineProperty.getValue(Iso8601.MINIMUM_VALUE);
        }

        if (!isFilled && !outlineEnabled) {
            return;
        }

        var position = this._dynamicObject.position;
        var semiMajorAxis = ellipse.semiMajorAxis;
        var semiMinorAxis = ellipse.semiMinorAxis;

        var show = ellipse.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(position) || !defined(semiMajorAxis) || !defined(semiMinorAxis))) {
            if (this._geometryType !== GeometryBatchType.NONE || this._outlineEnabled) {
                this._outlineEnabled = false;
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(ellipse.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(ellipse.outline, defaultOutline);
        this._outlineColorProperty = defaultValue(ellipse.outlineColor, defaultOutlineColor);

        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;
        var numberOfVerticalLines = ellipse.numberOfVerticalLines;

        if (!position.isConstant || //
            !semiMajorAxis.isConstant || //
            !semiMinorAxis.isConstant || //
            defined(rotation) && !rotation.isConstant || //
            defined(height) && !height.isConstant || //
            defined(extrudedHeight) && !extrudedHeight.isConstant || //
            defined(granularity) && !granularity.isConstant || //
            defined(stRotation) && !stRotation.isConstant || //
            defined(numberOfVerticalLines) && !numberOfVerticalLines.isConstant) {
            if (this._geometryType !== GeometryBatchType.DYNAMIC) {
                this._geometryType = GeometryBatchType.DYNAMIC;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.center = position.getValue(Iso8601.MINIMUM_VALUE, options.center);
            options.semiMajorAxis = semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMajorAxis);
            options.semiMinorAxis = semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMinorAxis);
            options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE) : undefined;

            this._outlineEnabled = outlineEnabled;
            this._geometryType = isColorMaterial ? GeometryBatchType.COLOR : GeometryBatchType.MATERIAL;
            this._geometryChanged.raiseEvent(this);
        }
    };

    EllipseGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
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
        var ellipse = dynamicObject.ellipse;
        var show = ellipse.show;

        if (!dynamicObject.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;

        var position = dynamicObject.position;
        var semiMajorAxis = ellipse.semiMajorAxis;
        var semiMinorAxis = ellipse.semiMinorAxis;
        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;
        var numberOfVerticalLines = ellipse.numberOfVerticalLines;

        options.center = position.getValue(time, options.center);
        options.semiMajorAxis = semiMajorAxis.getValue(time, options.semiMajorAxis);
        options.semiMinorAxis = semiMinorAxis.getValue(time, options.semiMinorAxis);
        options.rotation = defined(rotation) ? rotation.getValue(time, options) : undefined;
        options.height = defined(height) ? height.getValue(time, options) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(time, options) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(time) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(time) : undefined;

        if (!defined(ellipse.fill) || ellipse.fill.getValue(time)) {
            this._material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            var material = this._material;
            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : true
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : dynamicObject,
                    geometry : new EllipseGeometry(options)
                }),
                appearance : appearance,
                asynchronous : false
            });
            this._primitives.add(this._primitive);
        }

        if (defined(ellipse.outline) && ellipse.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
            options.numberOfVerticalLines = defined(numberOfVerticalLines) ? numberOfVerticalLines.getValue(time) : undefined;

            var outlineColor = defined(ellipse.outlineColor) ? ellipse.outlineColor.getValue(time) : Color.BLACK;
            this._outlinePrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : dynamicObject,
                    geometry : new EllipseOutlineGeometry(options),
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(outlineColor)
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : false,
                    renderState : {
                        depthTest : {
                            enabled : true
                        }
                    }
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

    return EllipseGeometryUpdater;
});