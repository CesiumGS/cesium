define([
        '../Core/ApproximateTerrainHeights',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/CoplanarPolygonGeometry',
        '../Core/CoplanarPolygonOutlineGeometry',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/EllipsoidTangentPlane',
        '../Core/GeometryInstance',
        '../Core/GeometryOffsetAttribute',
        '../Core/isArray',
        '../Core/Iso8601',
        '../Core/oneTimeWarning',
        '../Core/OffsetGeometryInstanceAttribute',
        '../Core/PolygonGeometry',
        '../Core/PolygonHierarchy',
        '../Core/PolygonOutlineGeometry',
        '../Core/Rectangle',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/GroundPrimitive',
        '../Scene/HeightReference',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryUpdater',
        './GroundGeometryUpdater',
        './Property'
    ], function(
        ApproximateTerrainHeights,
        Cartesian2,
        Cartesian3,
        Check,
        Color,
        ColorGeometryInstanceAttribute,
        CoplanarPolygonGeometry,
        CoplanarPolygonOutlineGeometry,
        defined,
        DeveloperError,
        DistanceDisplayConditionGeometryInstanceAttribute,
        EllipsoidTangentPlane,
        GeometryInstance,
        GeometryOffsetAttribute,
        isArray,
        Iso8601,
        oneTimeWarning,
        OffsetGeometryInstanceAttribute,
        PolygonGeometry,
        PolygonHierarchy,
        PolygonOutlineGeometry,
        Rectangle,
        ShowGeometryInstanceAttribute,
        GroundPrimitive,
        HeightReference,
        MaterialAppearance,
        PerInstanceColorAppearance,
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryUpdater,
        GroundGeometryUpdater,
        Property) {
    'use strict';

    var heightAndPerPositionHeightWarning = 'Entity polygons cannot have both height and perPositionHeight.  height will be ignored';
    var heightReferenceAndPerPositionHeightWarning = 'heightReference is not supported for entity polygons with perPositionHeight. heightReference will be ignored';

    var scratchColor = new Color();
    var defaultOffset = Cartesian3.ZERO;
    var offsetScratch = new Cartesian3();
    var scratchRectangle = new Rectangle();
    var scratch2DPositions = [];
    var cart2Scratch = new Cartesian2();

    function PolygonGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.polygonHierarchy = undefined;
        this.perPositionHeight = undefined;
        this.closeTop = undefined;
        this.closeBottom = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.offsetAttribute = undefined;
    }

    /**
     * A {@link GeometryUpdater} for polygons.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias PolygonGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function PolygonGeometryUpdater(entity, scene) {
        GroundGeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new PolygonGeometryOptions(entity),
            geometryPropertyName : 'polygon',
            observedPropertyNames : ['availability', 'polygon']
        });

        this._onEntityPropertyChanged(entity, 'polygon', entity.polygon, undefined);
    }

    if (defined(Object.create)) {
        PolygonGeometryUpdater.prototype = Object.create(GroundGeometryUpdater.prototype);
        PolygonGeometryUpdater.prototype.constructor = PolygonGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    PolygonGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._fillEnabled) {
            throw new DeveloperError('This instance does not represent a filled geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var options = this._options;

        var attributes = {
            show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._fillProperty.getValue(time)),
            distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(this._distanceDisplayConditionProperty.getValue(time)),
            offset : undefined,
            color : undefined
        };

        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
            }
            attributes.color = ColorGeometryInstanceAttribute.fromColor(currentColor);
        }
        if (defined(options.offsetAttribute)) {
            attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));
        }

        var geometry;
        if (options.perPositionHeight && !defined(options.extrudedHeight)) {
            geometry = new CoplanarPolygonGeometry(options);
        } else {
            geometry = new PolygonGeometry(options);
        }

        return new GeometryInstance({
            id : entity,
            geometry : geometry,
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
    PolygonGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);

        if (!this._outlineEnabled) {
            throw new DeveloperError('This instance does not represent an outlined geometry.');
        }
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);
        var options = this._options;
        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK, scratchColor);
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);

        var attributes = {
            show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
            color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
            distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition),
            offset : undefined
        };

        if (defined(options.offsetAttribute)) {
            attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(Property.getValueOrDefault(this._terrainOffsetProperty, time, defaultOffset, offsetScratch));
        }

        var geometry;
        if (options.perPositionHeight && !defined(options.extrudedHeight)) {
            geometry = new CoplanarPolygonOutlineGeometry(options);
        } else {
            geometry = new PolygonOutlineGeometry(options);
        }
        return new GeometryInstance({
            id : entity,
            geometry : geometry,
            attributes : attributes
        });
    };

    PolygonGeometryUpdater.prototype._computeCenter = function(time, result) {
        var positions = Property.getValueOrUndefined(this._entity.polygon.hierarchy, time);
        if (defined(positions) && !isArray(positions)) {
            positions = positions.positions;
        }
        if (positions.length === 0) {
            return;
        }
        var ellipsoid = this._scene.mapProjection.ellipsoid;

        var tangentPlane = EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(positions, scratch2DPositions);

        var length = positions2D.length;
        var area = 0;
        var j = length - 1;
        var centroid2D = new Cartesian2();
        for (var i = 0; i < length; j = i++) {
            var p1 = positions2D[i];
            var p2 = positions2D[j];
            var f = p1.x * p2.y - p2.x * p1.y;

            var sum = Cartesian2.add(p1, p2, cart2Scratch);
            sum = Cartesian2.multiplyByScalar(sum, f, sum);
            centroid2D = Cartesian2.add(centroid2D, sum, centroid2D);

            area += f;
        }

        var a = 1.0 / (area * 3.0);
        centroid2D = Cartesian2.multiplyByScalar(centroid2D, a, centroid2D);
        return tangentPlane.projectPointOntoEllipsoid(centroid2D, result);
    };

    PolygonGeometryUpdater.prototype._isHidden = function(entity, polygon) {
        return !defined(polygon.hierarchy) || GeometryUpdater.prototype._isHidden.call(this, entity, polygon);
    };

    PolygonGeometryUpdater.prototype._isOnTerrain = function(entity, polygon) {
        var onTerrain = GroundGeometryUpdater.prototype._isOnTerrain.call(this, entity, polygon);
        var perPositionHeightProperty = polygon.perPositionHeight;
        var perPositionHeightEnabled = defined(perPositionHeightProperty) && (perPositionHeightProperty.isConstant ? perPositionHeightProperty.getValue(Iso8601.MINIMUM_VALUE) : true);
        return onTerrain && !perPositionHeightEnabled;
    };

    PolygonGeometryUpdater.prototype._isDynamic = function(entity, polygon) {
        return !polygon.hierarchy.isConstant || //
               !Property.isConstant(polygon.height) || //
               !Property.isConstant(polygon.extrudedHeight) || //
               !Property.isConstant(polygon.granularity) || //
               !Property.isConstant(polygon.stRotation) || //
               !Property.isConstant(polygon.outlineWidth) || //
               !Property.isConstant(polygon.perPositionHeight) || //
               !Property.isConstant(polygon.closeTop) || //
               !Property.isConstant(polygon.closeBottom) || //
               !Property.isConstant(polygon.zIndex) || //
               (this._onTerrain && !Property.isConstant(this._materialProperty));
    };

    PolygonGeometryUpdater.prototype._setStaticOptions = function(entity, polygon) {
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;

        var hierarchyValue = polygon.hierarchy.getValue(Iso8601.MINIMUM_VALUE);
        if (isArray(hierarchyValue)) {
            hierarchyValue = new PolygonHierarchy(hierarchyValue);
        }

        var heightValue = Property.getValueOrUndefined(polygon.height, Iso8601.MINIMUM_VALUE);
        var heightReferenceValue = Property.getValueOrDefault(polygon.heightReference, Iso8601.MINIMUM_VALUE, HeightReference.NONE);
        var extrudedHeightValue = Property.getValueOrUndefined(polygon.extrudedHeight, Iso8601.MINIMUM_VALUE);
        var extrudedHeightReferenceValue = Property.getValueOrDefault(polygon.extrudedHeightReference, Iso8601.MINIMUM_VALUE, HeightReference.NONE);
        var perPositionHeightValue = Property.getValueOrDefault(polygon.perPositionHeight, Iso8601.MINIMUM_VALUE, false);

        heightValue = GroundGeometryUpdater.getGeometryHeight(heightValue, heightReferenceValue);

        var offsetAttribute;
        if (perPositionHeightValue) {
            if (defined(heightValue)) {
                heightValue = undefined;
                oneTimeWarning(heightAndPerPositionHeightWarning);
            }
            if (heightReferenceValue !== HeightReference.NONE && perPositionHeightValue) {
                heightValue = undefined;
                oneTimeWarning(heightReferenceAndPerPositionHeightWarning);
            }
        } else {
            if (defined(extrudedHeightValue) && !defined(heightValue)) {
                heightValue = 0;
            }
            offsetAttribute = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightValue, heightReferenceValue, extrudedHeightValue, extrudedHeightReferenceValue);
        }

        options.polygonHierarchy = hierarchyValue;
        options.granularity = Property.getValueOrUndefined(polygon.granularity, Iso8601.MINIMUM_VALUE);
        options.stRotation = Property.getValueOrUndefined(polygon.stRotation, Iso8601.MINIMUM_VALUE);
        options.perPositionHeight = perPositionHeightValue;
        options.closeTop = Property.getValueOrDefault(polygon.closeTop, Iso8601.MINIMUM_VALUE, true);
        options.closeBottom = Property.getValueOrDefault(polygon.closeBottom, Iso8601.MINIMUM_VALUE, true);
        options.offsetAttribute = offsetAttribute;
        options.height = heightValue;

        extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(extrudedHeightValue, extrudedHeightReferenceValue);
        if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
            extrudedHeightValue = ApproximateTerrainHeights.getApproximateTerrainHeights(PolygonGeometry.computeRectangle(options, scratchRectangle)).minimumTerrainHeight;
        }

        options.extrudedHeight = extrudedHeightValue;
    };

    PolygonGeometryUpdater.prototype._getIsClosed = function(options) {
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var isExtruded = defined(extrudedHeight) && extrudedHeight !== height;
        return !options.perPositionHeight && (!isExtruded && height === 0 || (isExtruded && options.closeTop && options.closeBottom));
    };

    PolygonGeometryUpdater.DynamicGeometryUpdater = DyanmicPolygonGeometryUpdater;

    /**
     * @private
     */
    function DyanmicPolygonGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);
    }

    if (defined(Object.create)) {
        DyanmicPolygonGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DyanmicPolygonGeometryUpdater.prototype.constructor = DyanmicPolygonGeometryUpdater;
    }

    DyanmicPolygonGeometryUpdater.prototype._isHidden = function(entity, polygon, time) {
        return !defined(this._options.polygonHierarchy) || DynamicGeometryUpdater.prototype._isHidden.call(this, entity, polygon, time);
    };

    DyanmicPolygonGeometryUpdater.prototype._setOptions = function(entity, polygon, time) {
        var options = this._options;

        var hierarchy = Property.getValueOrUndefined(polygon.hierarchy, time);
        if (isArray(hierarchy)) {
            options.polygonHierarchy = new PolygonHierarchy(hierarchy);
        } else {
            options.polygonHierarchy = hierarchy;
        }

        var heightValue = Property.getValueOrUndefined(polygon.height, time);
        var heightReferenceValue = Property.getValueOrDefault(polygon.heightReference, time, HeightReference.NONE);
        var extrudedHeightReferenceValue = Property.getValueOrDefault(polygon.extrudedHeightReference, time, HeightReference.NONE);
        var extrudedHeightValue = Property.getValueOrUndefined(polygon.extrudedHeight, time);
        var perPositionHeightValue = Property.getValueOrUndefined(polygon.perPositionHeight, time);

        heightValue = GroundGeometryUpdater.getGeometryHeight(heightValue, extrudedHeightReferenceValue);

        var offsetAttribute;
        if (perPositionHeightValue) {
            if (defined(heightValue)) {
                heightValue = undefined;
                oneTimeWarning(heightAndPerPositionHeightWarning);
            }
            if (heightReferenceValue !== HeightReference.NONE && perPositionHeightValue) {
                heightValue = undefined;
                oneTimeWarning(heightReferenceAndPerPositionHeightWarning);
            }
        } else {
            if (defined(extrudedHeightValue) && !defined(heightValue)) {
                heightValue = 0;
            }

            offsetAttribute = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightValue, heightReferenceValue, extrudedHeightValue, extrudedHeightReferenceValue);
        }

        options.granularity = Property.getValueOrUndefined(polygon.granularity, time);
        options.stRotation = Property.getValueOrUndefined(polygon.stRotation, time);
        options.perPositionHeight = Property.getValueOrUndefined(polygon.perPositionHeight, time);
        options.closeTop = Property.getValueOrDefault(polygon.closeTop, time, true);
        options.closeBottom = Property.getValueOrDefault(polygon.closeBottom, time, true);
        options.offsetAttribute = offsetAttribute;
        options.height = heightValue;

        extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(extrudedHeightValue, extrudedHeightReferenceValue);
        if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
            extrudedHeightValue = ApproximateTerrainHeights.getApproximateTerrainHeights(PolygonGeometry.computeRectangle(options, scratchRectangle)).minimumTerrainHeight;
        }

        options.extrudedHeight = extrudedHeightValue;
    };

    return PolygonGeometryUpdater;
});
