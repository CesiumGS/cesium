/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EllipsoidGeometry',
        '../Core/EllipsoidOutlineGeometry',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/Matrix3',
        '../Core/Matrix4',
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
        EllipsoidGeometry,
        EllipsoidOutlineGeometry,
        Event,
        GeometryInstance,
        Iso8601,
        Matrix3,
        Matrix4,
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

    var positionScratch;
    var orientationScratch;

    var GeometryOptions = function(dynamicObject) {
        this.id = dynamicObject;
        this.vertexFormat = undefined;
        this.radii = undefined;
        this.stackPartitions = undefined;
        this.slicePartitions = undefined;
        this.subdivisions = undefined;
    };

    var EllipsoidGeometryUpdater = function(dynamicObject) {
        if (!defined(dynamicObject)) {
            throw new DeveloperError('dynamicObject is required');
        }

        this._dynamicObject = dynamicObject;
        this._dynamicObjectSubscription = dynamicObject.definitionChanged.addEventListener(EllipsoidGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._fillEnabled = false;
        this._dynamic = false;
        this._outlineEnabled = false;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._hasConstantOutline = true;
        this._showOutlineProperty = undefined;
        this._outlineColorProperty = undefined;
        this._options = new GeometryOptions(dynamicObject);
        this._onDynamicObjectPropertyChanged(dynamicObject, 'ellipsoid', dynamicObject.ellipsoid, undefined);
    };

    EllipsoidGeometryUpdater.PerInstanceColorAppearanceType = PerInstanceColorAppearance;

    EllipsoidGeometryUpdater.MaterialAppearanceType = MaterialAppearance;

    defineProperties(EllipsoidGeometryUpdater.prototype, {
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
                return true;
            }
        },
        geometryChanged : {
            get : function() {
                return this._geometryChanged;
            }
        }
    });

    EllipsoidGeometryUpdater.prototype.isOutlineVisible = function(time) {
        var dynamicObject = this._dynamicObject;
        return this._outlineEnabled && dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time);
    };

    EllipsoidGeometryUpdater.prototype.isFilled = function(time) {
        var dynamicObject = this._dynamicObject;
        return this._fillEnabled && dynamicObject.isAvailable(time) && this._showProperty.getValue(time) && this._fillProperty.getValue(time);
    };

    EllipsoidGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
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

        positionScratch = dynamicObject.position.getValue(Iso8601.MINIMUM_VALUE, positionScratch);
        orientationScratch = dynamicObject.orientation.getValue(Iso8601.MINIMUM_VALUE, orientationScratch);

        return new GeometryInstance({
            id : dynamicObject,
            geometry : new EllipsoidGeometry(this._options),
            modelMatrix : Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientationScratch), positionScratch),
            attributes : attributes
        });
    };

    EllipsoidGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        if (!defined(time)) {
            throw new DeveloperError();
        }

        if (!this._outlineEnabled) {
            throw new DeveloperError();
        }

        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);

        positionScratch = dynamicObject.position.getValue(Iso8601.MINIMUM_VALUE, positionScratch);
        orientationScratch = dynamicObject.orientation.getValue(Iso8601.MINIMUM_VALUE, orientationScratch);

        return new GeometryInstance({
            id : dynamicObject,
            geometry : new EllipsoidOutlineGeometry(this._options),
            modelMatrix : Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientationScratch), positionScratch),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(isAvailable ? this._outlineColorProperty.getValue(time) : Color.BLACK)
            }
        });
    };

    EllipsoidGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    EllipsoidGeometryUpdater.prototype.destroy = function() {
        this._dynamicObjectSubscription();
        destroyObject(this);
    };

    EllipsoidGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'position' || propertyName === 'orientation' || propertyName === 'ellipsoid')) {
            return;
        }

        var ellipsoid = this._dynamicObject.ellipsoid;

        if (!defined(ellipsoid)) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var fillProperty = ellipsoid.fill;
        var fillEnabled = defined(fillProperty) && fillProperty.isConstant ? fillProperty.getValue(Iso8601.MINIMUM_VALUE) : true;

        var outlineProperty = ellipsoid.outline;
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

        var position = this._dynamicObject.position;
        var orientation = this._dynamicObject.orientation;
        var radii = ellipsoid.radii;

        var show = ellipsoid.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(position) || !defined(orientation) || !defined(radii))) {
            if (this._fillEnabled || this._outlineEnabled) {
                this._fillEnabled = false;
                this._outlineEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(ellipsoid.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._fillProperty = defaultValue(fillProperty, defaultFill);
        this._showProperty = defaultValue(show, defaultShow);
        this._showOutlineProperty = defaultValue(ellipsoid.outline, defaultOutline);
        this._outlineColorProperty = outlineEnabled ? defaultValue(ellipsoid.outlineColor, defaultOutlineColor) : undefined;
        this._fillEnabled = fillEnabled;
        this._outlineEnabled = outlineEnabled;

        var stackPartitions = ellipsoid.stackPartitions;
        var slicePartitions = ellipsoid.slicePartitions;
        var subdivisions = ellipsoid.subdivisions;

        if (!position.isConstant || //
            !orientation.isConstant || //
            !radii.isConstant || //
            defined(stackPartitions) && !stackPartitions.isConstant || //
            defined(slicePartitions) && !slicePartitions.isConstant || //
            defined(subdivisions) && !subdivisions.isConstant) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.VERTEX_FORMAT;
            options.radii = radii.getValue(Iso8601.MINIMUM_VALUE, options.radii);
            options.stackPartitions = defined(stackPartitions) ? stackPartitions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.slicePartitions = defined(slicePartitions) ? slicePartitions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            options.subdivisions = defined(subdivisions) ? subdivisions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            this._dynamic = false;
            this._geometryChanged.raiseEvent(this);
        }
    };

    EllipsoidGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        if (this._dynamic) {
            throw new DeveloperError('This instance does not represent dynamic geometry.');
        }

        if (!defined(primitives)) {
            throw new DeveloperError('primitives is required.');
        }

        return new DynamicGeometryUpdater(primitives, this);
    };

    /**
     * @private
     */
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
        var ellipsoid = dynamicObject.ellipsoid;
        var show = ellipsoid.show;

        if (!dynamicObject.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;
        var position = dynamicObject.position;
        var orientation = dynamicObject.orientation;
        var radii = ellipsoid.radii;
        var stackPartitions = ellipsoid.stackPartitions;
        var slicePartitions = ellipsoid.slicePartitions;
        var subdivisions = ellipsoid.subdivisions;

        positionScratch = position.getValue(time, positionScratch);
        orientationScratch = orientation.getValue(time, orientationScratch);
        var modelMatrix = Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientationScratch), positionScratch);

        options.radii = radii.getValue(time, options.radii);
        options.stackPartitions = defined(stackPartitions) ? stackPartitions.getValue(time, options) : undefined;
        options.slicePartitions = defined(slicePartitions) ? slicePartitions.getValue(time, options) : undefined;
        options.subdivisions = defined(subdivisions) ? subdivisions.getValue(time) : undefined;

        if (!defined(ellipsoid.fill) || ellipsoid.fill.getValue(time)) {
            this._material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
            var material = this._material;
            var appearance = new MaterialAppearance({
                material : material,
                faceForward : true,
                translucent : material.isTranslucent(),
                closed : true
            });
            options.vertexFormat = appearance.vertexFormat;

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : dynamicObject,
                    geometry : new EllipsoidGeometry(options),
                    modelMatrix : modelMatrix
                }),
                appearance : appearance,
                asynchronous : false
            });
            this._primitives.add(this._primitive);
        }

        if (defined(ellipsoid.outline) && ellipsoid.outline.getValue(time)) {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

            var outlineColor = defined(ellipsoid.outlineColor) ? ellipsoid.outlineColor.getValue(time) : Color.BLACK;
            this._outlinePrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    id : dynamicObject,
                    geometry : new EllipsoidOutlineGeometry(options),
                    modelMatrix : modelMatrix,
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

    return EllipsoidGeometryUpdater;
});