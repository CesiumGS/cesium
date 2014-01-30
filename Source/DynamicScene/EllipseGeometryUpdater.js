/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/GeometryInstance',
        '../Core/EllipseGeometry',
        '../Core/Iso8601',
        '../DynamicScene/ConstantProperty',
        '../DynamicScene/ConstantPositionProperty',
        '../DynamicScene/ColorMaterialProperty',
        '../DynamicScene/GeometryBatchType',
        '../Scene/Primitive',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        defineProperties,
        DeveloperError,
        Event,
        ShowGeometryInstanceAttribute,
        defaultValue,
        defined,
        GeometryInstance,
        EllipseGeometry,
        Iso8601,
        ConstantProperty,
        ConstantPositionProperty,
        ColorMaterialProperty,
        GeometryBatchType,
        Primitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Material,
        MaterialProperty) {
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
        this._geometryInstance = undefined;
        this._options = new GeometryOptions(dynamicObject);
        this._onDynamicObjectPropertyChanged(dynamicObject, 'ellipse', dynamicObject.ellipse, undefined);
    };

    EllipseGeometryUpdater.PerInstanceColorAppearanceType = PerInstanceColorAppearance;

    EllipseGeometryUpdater.MaterialAppearanceType = MaterialAppearance;

    EllipseGeometryUpdater.prototype.createGeometryInstance = function(time) {
        var attributes;
        if (!defined(this._geometryInstance)) {
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

            this._geometryInstance = new GeometryInstance({
                id : this._dynamicObject,
                geometry : new EllipseGeometry(this._options),
                attributes : attributes
            });
        } else {
            attributes = this._geometryInstance.attributes;
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
        }

        return this._geometryInstance;
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
        }
    });

    function setGeometryType(that, geometryType) {
        that._geometryType = geometryType;
        that._geometryInstance = undefined;
        that._geometryChanged.raiseEvent();
    }

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

        if (!defined(ellipse)) {
            setGeometryType(this, GeometryBatchType.NONE);
            return;
        }

        var createInstance = false;
        var dynamicOptions = {};
        var options = this._options;

        var fill = ellipse.fill;
        if (defined(fill)) {
            if (fill.isConstant) {
                if (!fill.getValue(Iso8601.MINIMUM_VALUE)) {
                    setGeometryType(this, GeometryBatchType.NONE);
                    return;
                }
            } else {
                dynamicOptions.fill = fill;
            }
        }

        var show = ellipse.show;
        if (defined(show)) {
            if (show.isConstant) {
                if (!show.getValue(Iso8601.MINIMUM_VALUE)) {
                    setGeometryType(this, GeometryBatchType.NONE);
                    return;
                }
            } else {
                dynamicOptions.show = fill;
            }
        }

        var material = ellipse.material;
        var isColorMaterial = !defined(material) || material instanceof ColorMaterialProperty;

        this._material = material;
        this._show = show;

        var position = this._dynamicObject.position;
        var semiMajorAxis = ellipse.semiMajorAxis;
        var semiMinorAxis = ellipse.semiMinorAxis;

        if (!defined(position) || !defined(semiMajorAxis) || !defined(semiMinorAxis)) {
            setGeometryType(this, GeometryBatchType.NONE);
            return;
        }

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
            setGeometryType(this, GeometryBatchType.DYNAMIC);
        } else {
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.center = position.getValue(Iso8601.MINIMUM_VALUE, options.center);
            options.semiMajorAxis = semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMajorAxis);
            options.semiMinorAxis = semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE, options.semiMinorAxis);
            options.rotation = defined(rotation) ? rotation.getValue(Iso8601.MINIMUM_VALUE, options.rotation) : undefined;
            options.height = defined(height) ? height.getValue(Iso8601.MINIMUM_VALUE, options.height) : undefined;
            options.extrudedHeight = defined(extrudedHeight) ? extrudedHeight.getValue(Iso8601.MINIMUM_VALUE, options.extrudedHeight) : undefined;
            options.granularity = defined(granularity) ? granularity.getValue(Iso8601.MINIMUM_VALUE, options.granularity) : undefined;
            options.stRotation = defined(stRotation) ? stRotation.getValue(Iso8601.MINIMUM_VALUE, options.stRotation) : undefined;
            setGeometryType(this, isColorMaterial ? GeometryBatchType.COLOR : GeometryBatchType.MATERIAL);
        }
    };

    return EllipseGeometryUpdater;
});