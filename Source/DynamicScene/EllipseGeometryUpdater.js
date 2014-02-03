/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
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
        '../Scene/MaterialAppearance',
        '../DynamicScene/MaterialProperty',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
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
        MaterialAppearance,
        MaterialProperty,
        PerInstanceColorAppearance,
        Primitive) {
    "use strict";

    //TODO Fix fill for static objects
    var defaultMaterial = new ColorMaterialProperty(new ConstantProperty(Color.WHITE));
    var defaultShow = new ConstantProperty(true);
    var defaultFill = new ColorMaterialProperty(true);
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
        this._dynamicObjectSubscription = dynamicObject.propertyChanged.addEventListener(EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._ellipseSubscription = undefined;
        this._geometryType = GeometryBatchType.NONE;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._isOutlined = false;
        this._showOutlineProperty = undefined;
        this._outlineColorProperty = undefined;
        this._outlineGeometryChanged = new Event();
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
        showProperty : {
            get : function() {
                return this._showProperty;
            }
        },
        materialProperty : {
            get : function() {
                return this._materialProperty;
            }
        },
        isOutlined : {
            get : function() {
                return this._isOutlined;
            }
        },
        showOutlineProperty : {
            get : function() {
                return this._showOutlineProperty;
            }
        },
        outlineColorProperty : {
            get : function() {
                return this._outlineColorProperty;
            }
        },
        outlineGeometryChanged : {
            get : function() {
                return this._outlineGeometryChanged;
            }
        }
    });

    EllipseGeometryUpdater.prototype.createGeometryInstance = function(time) {
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time));
        if (this._geometryType === GeometryBatchType.COLOR) {
            var currentColor = (isAvailable && defined(this._materialProperty.color)) ? this._materialProperty.color.getValue(time) : Color.WHTE;
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
        }
        return new GeometryInstance({
            id : dynamicObject,
            geometry : new EllipseGeometry(this._options),
            attributes : {
                show : show,
                color : color
            }
        });
    };

    EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        return new GeometryInstance({
            id : dynamicObject,
            geometry : new EllipseOutlineGeometry(this._options),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(isAvailable ? this._outlineColorProperty.getValue(time) : Color.BLACK)
            }
        });
    };

    EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        if (propertyName === 'ellipse') {
            if (defined(oldValue)) {
                this._ellipseSubscription();
            }

            this._ellipse = newValue;

            if (defined(newValue)) {
                this._ellipseSubscription = newValue.propertyChanged.addEventListener(EllipseGeometryUpdater.prototype._update, this);
            }

            this._update();
        } else if (propertyName === 'position') {
            this._update();
        }
    };

    EllipseGeometryUpdater.prototype._update = function() {
        var ellipse = this._dynamicObject.ellipse;
        var oldGeometryType = this._geometryType;

        if (!defined(ellipse)) {
            if (this._geometryType !== GeometryBatchType.NONE) {
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this._geometryType, oldGeometryType);
            }
            if(this._isOutlined){
                this._isOutlined = false;
                this._outlineGeometryChanged.raiseEvent(this._isOutlined);
            }
            return;
        }

        var fillProperty = ellipse.fill;
        var isFilled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = ellipse.outline;
        var isOutlined = defined(outlineProperty);
        if (isOutlined && outlineProperty.isConstant) {
            isOutlined = outlineProperty.getValue(Iso8601.MINIMUM_VALUE);
        }

        if (!isFilled && !isOutlined) {
            return;
        }

        var position = this._dynamicObject.position;
        var semiMajorAxis = ellipse.semiMajorAxis;
        var semiMinorAxis = ellipse.semiMinorAxis;

        var show = ellipse.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(position) || !defined(semiMajorAxis) || !defined(semiMinorAxis))) {
            if (this._geometryType !== GeometryBatchType.NONE) {
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this._geometryType, oldGeometryType);
            }
            if (this._isOutlined) {
                this._isOutlined = false;
                this._outlineGeometryChanged.raiseEvent(this._isOutlined);
            }
            return;
        }

        var material = defaultValue(ellipse.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(ellipse.outline, defaultOutline);
        this._outlineColorProperty = defaultValue(ellipse.outlineColor, defaultOutlineColor);

        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;

        if (!position.isConstant || //
            !semiMajorAxis.isConstant || //
            !semiMinorAxis.isConstant || //
            defined(rotation) && !rotation.isConstant || //
            defined(height) && !height.isConstant || //
            defined(extrudedHeight) && !extrudedHeight.isConstant || //
            defined(granularity) && !granularity.isConstant || //
            defined(stRotation) && !stRotation.isConstant) {
            if (this._geometryType !== GeometryBatchType.DYNAMIC) {
                this._geometryType = GeometryBatchType.DYNAMIC;
                this._geometryChanged.raiseEvent(this._geometryType, oldGeometryType);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.center = position.getValue(Iso8601.MINIMUM_VALUE, options.center);
            options.semiMajorAxis = semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMajorAxis);
            options.semiMinorAxis = semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMinorAxis);
            options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE, options.rotation) : undefined;
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE, options.height) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE, options.extrudedHeight) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE, options.granularity) : undefined;
            options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE, options.stRotation) : undefined;

            if (isFilled) {
                this._geometryType = isColorMaterial ? GeometryBatchType.COLOR : GeometryBatchType.MATERIAL;
                this._geometryChanged.raiseEvent(this._geometryType, oldGeometryType);
            }
            if (isOutlined) {
                this._isOutlined = true;
                this._outlineGeometryChanged.raiseEvent(this._isOutlined);
            }
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
        var show = dynamicObject.show;

        if (!dynamicObject.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;
        var ellipse = dynamicObject.ellipse;

        var position = dynamicObject.position;
        var semiMajorAxis = ellipse.semiMajorAxis;
        var semiMinorAxis = ellipse.semiMinorAxis;
        var rotation = ellipse.rotation;
        var height = ellipse.height;
        var extrudedHeight = ellipse.extrudedHeight;
        var granularity = ellipse.granularity;
        var stRotation = ellipse.stRotation;

        options.center = position.getValue(time, options.center);
        options.semiMajorAxis = semiMajorAxis.getValue(time, options.semiMajorAxis);
        options.semiMinorAxis = semiMinorAxis.getValue(time, options.semiMinorAxis);
        options.rotation = defined(rotation) ? rotation.getValue(time, options.rotation) : undefined;
        options.height = defined(height) ? height.getValue(time, options.height) : undefined;
        options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(time, options.extrudedHeight) : undefined;
        options.granularity = defined(granularity) ? granularity.getValue(time, options.granularity) : undefined;
        options.stRotation = defined(stRotation) ? stRotation.getValue(time, options.stRotation) : undefined;

        if (!defined(ellipse.fill) || ellipse.fill.getValue(time)) {
            this._material = MaterialProperty.getValue(time, geometryUpdater.materialProperty, this._material);
            var material = this._material;
            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : true
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : this._dynamicObject,
                    geometry : new EllipseGeometry(options)
                }),
                appearance : appearance,
                asynchronous : false
            });
            this._primitives.add(this._primitive);
        }

        if (defined(ellipse.outline) && ellipse.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
            var outlineColor = defined(ellipse.outlineColor) ? ellipse.outlineColor.getValue(time) : Color.BLACK;
            this._outlinePrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : this._dynamicObject,
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
    };

    return EllipseGeometryUpdater;
});