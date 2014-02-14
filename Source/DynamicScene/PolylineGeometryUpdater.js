/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/PolylineGeometry',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/ShowGeometryInstanceAttribute',
        '../DynamicScene/ColorMaterialProperty',
        '../DynamicScene/ConstantProperty',
        '../DynamicScene/GeometryBatchType',
        '../DynamicScene/MaterialProperty',
        '../Scene/PolylineMaterialAppearance',
        '../Scene/PolylineColorAppearance',
        '../Scene/Primitive'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        PolylineGeometry,
        Event,
        GeometryInstance,
        Iso8601,
        ShowGeometryInstanceAttribute,
        ColorMaterialProperty,
        ConstantProperty,
        GeometryBatchType,
        MaterialProperty,
        PolylineMaterialAppearance,
        PolylineColorAppearance,
        Primitive) {
    "use strict";

    var defaultMaterial = new ColorMaterialProperty(Color.WHITE);
    var defaultShow = new ConstantProperty(true);
    var defaultFill = new ConstantProperty(true);

    var GeometryOptions = function(dynamicObject) {
        this.id = dynamicObject;
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.width = undefined;
    };

    var PolylineGeometryUpdater = function(dynamicObject) {
        if (!defined(dynamicObject)) {
            throw new DeveloperError('dynamicObject is required');
        }

        this._dynamicObject = dynamicObject;
        this._dynamicObjectSubscription = dynamicObject.definitionChanged.addEventListener(PolylineGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._geometryType = GeometryBatchType.NONE;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._options = new GeometryOptions(dynamicObject);
        this._onDynamicObjectPropertyChanged(dynamicObject, 'polyline', dynamicObject.polyline, undefined);
    };

    PolylineGeometryUpdater.PerInstanceColorAppearanceType = PolylineColorAppearance;

    PolylineGeometryUpdater.MaterialAppearanceType = PolylineMaterialAppearance;

    defineProperties(PolylineGeometryUpdater.prototype, {
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
                return false;
            }
        },
        hasConstantFill : {
            get : function() {
                return true;
            }
        },
        hasConstantOutline : {
            get : function() {
                return true;
            }
        },
        outlineColorProperty : {
            get : function() {
                return undefined;
            }
        }
    });

    PolylineGeometryUpdater.prototype.isOutlineVisible = function(time) {
        return false;
    };

    PolylineGeometryUpdater.prototype.isFilled = function(time) {
        return true;
    };

    PolylineGeometryUpdater.prototype.createGeometryInstance = function(time) {
        var color;
        var attributes;
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);
        var show = new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time));

        if (this._geometryType === GeometryBatchType.COLOR_OPEN) {
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
            geometry : new PolylineGeometry(this._options),
            attributes : attributes
        });
    };

    PolylineGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        throw new DeveloperError();
    };

    PolylineGeometryUpdater.prototype.destroy = function() {
        this._dynamicObjectSubscription();
        destroyObject(this);
    };

    PolylineGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'vertexPositions' || propertyName === 'polyline')) {
            return;
        }

        var polyline = this._dynamicObject.polyline;

        if (!defined(polyline)) {
            if (this._geometryType !== GeometryBatchType.NONE) {
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var vertexPositions = this._dynamicObject.vertexPositions;

        var show = polyline.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(vertexPositions))) {
            if (this._geometryType !== GeometryBatchType.NONE) {
                this._geometryType = GeometryBatchType.NONE;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(polyline.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._showProperty = defaultValue(show, defaultShow);

        var width = polyline.width;

        if (!vertexPositions.isConstant || //
            defined(width) && !width.isConstant) {
            if (this._geometryType !== GeometryBatchType.DYNAMIC) {
                this._geometryType = GeometryBatchType.DYNAMIC;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PolylineColorAppearance.VERTEX_FORMAT : PolylineMaterialAppearance.VERTEX_FORMAT;
            options.positions = vertexPositions.getValue(Iso8601.MINIMUM_VALUE, options.positions);
            options.width = defined(width) ? width.getValue(Iso8601.MINIMUM_VALUE) : undefined;

            this._geometryType = isColorMaterial ? GeometryBatchType.COLOR_OPEN : GeometryBatchType.MATERIAL_OPEN;
            this._geometryChanged.raiseEvent(this);
        }
    };

    PolylineGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        return new DynamicGeometryUpdater(primitives, this);
    };

    var DynamicGeometryUpdater = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new GeometryOptions(geometryUpdater._dynamicObject);
    };

    DynamicGeometryUpdater.prototype.update = function(time) {
        var geometryUpdater = this._geometryUpdater;

        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }

        var dynamicObject = geometryUpdater._dynamicObject;
        var polyline = dynamicObject.polyline;
        var show = polyline.show;

        if (!dynamicObject.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;
        var vertexPositions = dynamicObject.vertexPositions;
        var width = polyline.width;

        options.positions = vertexPositions.getValue(time, options.positions);
        options.width = defined(width) ? width.getValue(time) : undefined;

        this._material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
        var material = this._material;
        var appearance = new PolylineMaterialAppearance({
            material : material,
            faceForward : true,
            translucent : material.isTranslucent(),
            closed : false
        });
        options.vertexFormat = appearance.vertexFormat;

        this._primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                id : dynamicObject,
                geometry : new PolylineGeometry(options)
            }),
            appearance : appearance,
            asynchronous : false
        });
        this._primitives.add(this._primitive);
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }
        destroyObject(this);
    };

    return PolylineGeometryUpdater;
});