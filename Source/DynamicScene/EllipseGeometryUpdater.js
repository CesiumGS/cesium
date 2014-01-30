/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
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
        '../DynamicScene/GeometryBatchType',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
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
        GeometryBatchType,
        MaterialAppearance,
        PerInstanceColorAppearance) {
    "use strict";

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

        this._dynamicObject = dynamicObject;
        this._id = dynamicObject.id;
        this._dynamicObjectSubscription = dynamicObject.propertyChanged.addEventListener(EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._ellipseSubscription = undefined;
        this._geometryType = GeometryBatchType.NONE;
        this._geometryChanged = new Event();
        this._options = new GeometryOptions(dynamicObject);
        this._hasOutline = false;
        this._showOutline = undefined;
        this._outlineColor = undefined;
        this._outlineGeometryChanged = new Event();
        this._onDynamicObjectPropertyChanged(dynamicObject, 'ellipse', dynamicObject.ellipse, undefined);
    };

    EllipseGeometryUpdater.PerInstanceColorAppearanceType = PerInstanceColorAppearance;

    EllipseGeometryUpdater.MaterialAppearanceType = MaterialAppearance;

    EllipseGeometryUpdater.prototype.createGeometryInstance = function(time) {
        var attributes;
        if (this._geometryType === GeometryBatchType.COLOR) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(defined(this._show) ? this._show.getValue(time) : true),
                color : ColorGeometryInstanceAttribute.fromColor(defined(this._material) && defined(this._material.color) ? this._material.color.getValue(time) : Color.WHTE)
            };
        } else if (this._geometryType === GeometryBatchType.MATERIAL) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(defined(this._show) ? this._show.getValue(time) : true)
            };
        }

        return new GeometryInstance({
            id : this._dynamicObject,
            geometry : new EllipseGeometry(this._options),
            attributes : attributes
        });
    };

    EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        var attributes;
        if (this._geometryType === GeometryBatchType.COLOR) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(defined(this._showOutline) ? this._showOutline.getValue(time) : true),
                color : ColorGeometryInstanceAttribute.fromColor(defined(this._outlineColor) ? this._outlineColor.getValue(time) : Color.BLACK)
            };
        } else if (this._geometryType === GeometryBatchType.MATERIAL) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(defined(this._showOutline) ? this._showOutline.getValue(time) : true)
            };
        }

        return new GeometryInstance({
            id : this._dynamicObject,
            geometry : new EllipseOutlineGeometry(this._options),
            attributes : attributes
        });
    };

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
        show : {
            get : function() {
                return this._show;
            }
        },
        material : {
            get : function() {
                return this._material;
            }
        },
        hasOutline : {
            get : function() {
                return this._hasOutline;
            }
        },
        showOutline : {
            get : function() {
                return this._showOutline;
            }
        },
        outlineColor : {
            get : function() {
                return this._outlineColor;
            }
        },
        outlineGeometryChanged : {
            get : function() {
                return this._outlineGeometryChanged;
            }
        }
    });

    EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        if (propertyName === 'ellipse') {
            if (defined(oldValue)) {
                this._ellipseSubscription();
            }

            this._ellipse = newValue;

            if (defined(newValue)) {
                this._ellipseSubscription = newValue.propertyChanged.addEventListener(EllipseGeometryUpdater.prototype._onEllipsePropertyChanged, this);
            }

            this._onEllipsePropertyChanged();
        } else if (propertyName === 'position') {
            this._update();
        }
    };

    EllipseGeometryUpdater.prototype._onEllipsePropertyChanged = function(ellipse, propertyName, newValue, oldValue) {
        this._update();
    };

    EllipseGeometryUpdater.prototype._update = function() {
        var ellipse = this._dynamicObject.ellipse;
        var oldGeometryType = this._geometryType;

        if (!defined(ellipse)) {
            this._geometryType = GeometryBatchType.NONE;
            this._geometryChanged.raiseEvent();
            if(this._hasOutline){
                this._hasOutline = false;
                this._outlineGeometryChanged.raiseEvent();
            }
            return;
        }

        var fillOff = false;
        var fill = ellipse.fill;
        if (defined(fill) && fill.isConstant && !fill.getValue(Iso8601.MINIMUM_VALUE)) {
            if (this._geometryType !== GeometryBatchType.NONE) {
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent();
            }
            fillOff = true;
        }

        var outlineOff = false;
        var outline = ellipse.outline;
        if (defined(outline) && outline.isConstant && !outline.getValue(Iso8601.MINIMUM_VALUE) && this._hasOutline) {
            if (this._hasOutline) {
                this._hasOutline = false;
                this._outlineGeometryChanged.raiseEvent();
                outlineOff = true;
            }
        }

        if (fillOff && outlineOff) {
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
                this._geometryChanged.raiseEvent();
            }
            if (this._hasOutline) {
                this._hasOutline = false;
                this._outlineGeometryChanged.raiseEvent();
            }
            return;
        }


        var material = ellipse.material;
        var isColorMaterial = !defined(material) || material instanceof ColorMaterialProperty;

        this._material = material;
        this._show = show;
        this._outlineColor = ellipse.outlineColor;
        this._showOutline = ellipse.outline;

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
            this._geometryType = GeometryBatchType.DYNAMIC;
            this._geometryChanged.raiseEvent();
            if (this._hasOutline) {
                this._hasOutline = false;
                this._outlineGeometryChanged.raiseEvent();
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

            if (!fillOff) {
                this._geometryType = isColorMaterial ? GeometryBatchType.COLOR : GeometryBatchType.MATERIAL;
                this._geometryChanged.raiseEvent();
            }
            if (!outlineOff) {
                this._hasOutline = true;
                this._outlineGeometryChanged.raiseEvent();
            }
        }
    };

    return EllipseGeometryUpdater;
});