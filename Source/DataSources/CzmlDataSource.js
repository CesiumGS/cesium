/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/Color',
        '../Core/CornerType',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/ExtrapolationType',
        '../Core/getAbsoluteUri',
        '../Core/getFilenameFromUri',
        '../Core/HermitePolynomialApproximation',
        '../Core/isArray',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/LagrangePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/loadJson',
        '../Core/Math',
        '../Core/NearFarScalar',
        '../Core/Quaternion',
        '../Core/Rectangle',
        '../Core/ReferenceFrame',
        '../Core/RuntimeError',
        '../Core/Spherical',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Scene/ColorBlendMode',
        '../Scene/HeightReference',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelStyle',
        '../Scene/ShadowMode',
        '../Scene/VerticalOrigin',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './BillboardGraphics',
        './BoxGraphics',
        './ColorMaterialProperty',
        './CompositeMaterialProperty',
        './CompositePositionProperty',
        './CompositeProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './CorridorGraphics',
        './CylinderGraphics',
        './DataSource',
        './DataSourceClock',
        './EllipseGraphics',
        './EllipsoidGraphics',
        './EntityCluster',
        './EntityCollection',
        './GridMaterialProperty',
        './ImageMaterialProperty',
        './LabelGraphics',
        './ModelGraphics',
        './NodeTransformationProperty',
        './PathGraphics',
        './PointGraphics',
        './PolygonGraphics',
        './PolylineArrowMaterialProperty',
        './PolylineDashMaterialProperty',
        './PolylineGlowMaterialProperty',
        './PolylineGraphics',
        './PolylineOutlineMaterialProperty',
        './PositionPropertyArray',
        './PropertyArray',
        './PropertyBag',
        './RectangleGraphics',
        './ReferenceProperty',
        './Rotation',
        './SampledPositionProperty',
        './SampledProperty',
        './StripeMaterialProperty',
        './StripeOrientation',
        './TimeIntervalCollectionPositionProperty',
        './TimeIntervalCollectionProperty',
        './VelocityVectorProperty',
        './WallGraphics'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Color,
        CornerType,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        ExtrapolationType,
        getAbsoluteUri,
        getFilenameFromUri,
        HermitePolynomialApproximation,
        isArray,
        Iso8601,
        JulianDate,
        LagrangePolynomialApproximation,
        LinearApproximation,
        loadJson,
        CesiumMath,
        NearFarScalar,
        Quaternion,
        Rectangle,
        ReferenceFrame,
        RuntimeError,
        Spherical,
        TimeInterval,
        TimeIntervalCollection,
        ColorBlendMode,
        HeightReference,
        HorizontalOrigin,
        LabelStyle,
        ShadowMode,
        VerticalOrigin,
        Uri,
        when,
        BillboardGraphics,
        BoxGraphics,
        ColorMaterialProperty,
        CompositeMaterialProperty,
        CompositePositionProperty,
        CompositeProperty,
        ConstantPositionProperty,
        ConstantProperty,
        CorridorGraphics,
        CylinderGraphics,
        DataSource,
        DataSourceClock,
        EllipseGraphics,
        EllipsoidGraphics,
        EntityCluster,
        EntityCollection,
        GridMaterialProperty,
        ImageMaterialProperty,
        LabelGraphics,
        ModelGraphics,
        NodeTransformationProperty,
        PathGraphics,
        PointGraphics,
        PolygonGraphics,
        PolylineArrowMaterialProperty,
        PolylineDashMaterialProperty,
        PolylineGlowMaterialProperty,
        PolylineGraphics,
        PolylineOutlineMaterialProperty,
        PositionPropertyArray,
        PropertyArray,
        PropertyBag,
        RectangleGraphics,
        ReferenceProperty,
        Rotation,
        SampledPositionProperty,
        SampledProperty,
        StripeMaterialProperty,
        StripeOrientation,
        TimeIntervalCollectionPositionProperty,
        TimeIntervalCollectionProperty,
        VelocityVectorProperty,
        WallGraphics) {
    'use strict';

    var currentId;

    function makeReference(collection, referenceString) {
        if (referenceString[0] === '#') {
            referenceString = currentId + referenceString;
        }
        return ReferenceProperty.fromString(collection, referenceString);
    }

    var scratchCartesian = new Cartesian3();
    var scratchSpherical = new Spherical();
    var scratchCartographic = new Cartographic();
    var scratchTimeInterval = new TimeInterval();

    function unwrapColorInterval(czmlInterval) {
        var rgbaf = czmlInterval.rgbaf;
        if (defined(rgbaf)) {
            return rgbaf;
        }

        var rgba = czmlInterval.rgba;
        if (!defined(rgba)) {
            return undefined;
        }

        var length = rgba.length;
        if (length === Color.packedLength) {
            return [Color.byteToFloat(rgba[0]), Color.byteToFloat(rgba[1]), Color.byteToFloat(rgba[2]), Color.byteToFloat(rgba[3])];
        }

        rgbaf = new Array(length);
        for (var i = 0; i < length; i += 5) {
            rgbaf[i] = rgba[i];
            rgbaf[i + 1] = Color.byteToFloat(rgba[i + 1]);
            rgbaf[i + 2] = Color.byteToFloat(rgba[i + 2]);
            rgbaf[i + 3] = Color.byteToFloat(rgba[i + 3]);
            rgbaf[i + 4] = Color.byteToFloat(rgba[i + 4]);
        }
        return rgbaf;
    }

    function unwrapUriInterval(czmlInterval, sourceUri) {
        var result = defaultValue(czmlInterval.uri, czmlInterval);
        if (defined(sourceUri)) {
            result = getAbsoluteUri(result, getAbsoluteUri(sourceUri));
        }
        return result;
    }

    function unwrapRectangleInterval(czmlInterval) {
        var wsen = czmlInterval.wsen;
        if (defined(wsen)) {
            return wsen;
        }

        var wsenDegrees = czmlInterval.wsenDegrees;
        if (!defined(wsenDegrees)) {
            return undefined;
        }

        var length = wsenDegrees.length;
        if (length === Rectangle.packedLength) {
            return [CesiumMath.toRadians(wsenDegrees[0]), CesiumMath.toRadians(wsenDegrees[1]), CesiumMath.toRadians(wsenDegrees[2]), CesiumMath.toRadians(wsenDegrees[3])];
        }

        wsen = new Array(length);
        for (var i = 0; i < length; i += 5) {
            wsen[i] = wsenDegrees[i];
            wsen[i + 1] = CesiumMath.toRadians(wsenDegrees[i + 1]);
            wsen[i + 2] = CesiumMath.toRadians(wsenDegrees[i + 2]);
            wsen[i + 3] = CesiumMath.toRadians(wsenDegrees[i + 3]);
            wsen[i + 4] = CesiumMath.toRadians(wsenDegrees[i + 4]);
        }
        return wsen;
    }

    function convertUnitSphericalToCartesian(unitSpherical) {
        var length = unitSpherical.length;
        scratchSpherical.magnitude = 1.0;
        if (length === 2) {
            scratchSpherical.clock = unitSpherical[0];
            scratchSpherical.cone = unitSpherical[1];
            Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);
            return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
        } else {
            var result = new Array(length / 3 * 4);
            for (var i = 0, j = 0; i < length; i += 3, j += 4) {
                result[j] = unitSpherical[i];

                scratchSpherical.clock = unitSpherical[i + 1];
                scratchSpherical.cone = unitSpherical[i + 2];
                Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);

                result[j + 1] = scratchCartesian.x;
                result[j + 2] = scratchCartesian.y;
                result[j + 3] = scratchCartesian.z;
            }
            return result;
        }
    }

    function convertSphericalToCartesian(spherical) {
        var length = spherical.length;
        if (length === 3) {
            scratchSpherical.clock = spherical[0];
            scratchSpherical.cone = spherical[1];
            scratchSpherical.magnitude = spherical[2];
            Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);
            return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
        } else {
            var result = new Array(length);
            for (var i = 0; i < length; i += 4) {
                result[i] = spherical[i];

                scratchSpherical.clock = spherical[i + 1];
                scratchSpherical.cone = spherical[i + 2];
                scratchSpherical.magnitude = spherical[i + 3];
                Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);

                result[i + 1] = scratchCartesian.x;
                result[i + 2] = scratchCartesian.y;
                result[i + 3] = scratchCartesian.z;
            }
            return result;
        }
    }

    function convertCartographicRadiansToCartesian(cartographicRadians) {
        var length = cartographicRadians.length;
        if (length === 3) {
            scratchCartographic.longitude = cartographicRadians[0];
            scratchCartographic.latitude = cartographicRadians[1];
            scratchCartographic.height = cartographicRadians[2];
            Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);
            return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
        } else {
            var result = new Array(length);
            for (var i = 0; i < length; i += 4) {
                result[i] = cartographicRadians[i];

                scratchCartographic.longitude = cartographicRadians[i + 1];
                scratchCartographic.latitude = cartographicRadians[i + 2];
                scratchCartographic.height = cartographicRadians[i + 3];
                Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);

                result[i + 1] = scratchCartesian.x;
                result[i + 2] = scratchCartesian.y;
                result[i + 3] = scratchCartesian.z;
            }
            return result;
        }
    }

    function convertCartographicDegreesToCartesian(cartographicDegrees) {
        var length = cartographicDegrees.length;
        if (length === 3) {
            scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[0]);
            scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[1]);
            scratchCartographic.height = cartographicDegrees[2];
            Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);
            return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
        } else {
            var result = new Array(length);
            for (var i = 0; i < length; i += 4) {
                result[i] = cartographicDegrees[i];

                scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[i + 1]);
                scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[i + 2]);
                scratchCartographic.height = cartographicDegrees[i + 3];
                Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);

                result[i + 1] = scratchCartesian.x;
                result[i + 2] = scratchCartesian.y;
                result[i + 3] = scratchCartesian.z;
            }
            return result;
        }
    }

    function unwrapCartesianInterval(czmlInterval) {
        var cartesian = czmlInterval.cartesian;
        if (defined(cartesian)) {
            return cartesian;
        }

        var cartesianVelocity = czmlInterval.cartesianVelocity;
        if (defined(cartesianVelocity)) {
            return cartesianVelocity;
        }

        var unitCartesian = czmlInterval.unitCartesian;
        if (defined(unitCartesian)) {
            return unitCartesian;
        }

        var unitSpherical = czmlInterval.unitSpherical;
        if (defined(unitSpherical)) {
            return convertUnitSphericalToCartesian(unitSpherical);
        }

        var spherical = czmlInterval.spherical;
        if (defined(spherical)) {
            return convertSphericalToCartesian(spherical);
        }

        var cartographicRadians = czmlInterval.cartographicRadians;
        if (defined(cartographicRadians)) {
            return convertCartographicRadiansToCartesian(cartographicRadians);
        }

        var cartographicDegrees = czmlInterval.cartographicDegrees;
        if (defined(cartographicDegrees)) {
            return convertCartographicDegreesToCartesian(cartographicDegrees);
        }

        throw new RuntimeError(JSON.stringify(czmlInterval) + ' is not a valid CZML interval.');
    }

    function normalizePackedQuaternionArray(array, startingIndex) {
        var x = array[startingIndex];
        var y = array[startingIndex + 1];
        var z = array[startingIndex + 2];
        var w = array[startingIndex + 3];

        var inverseMagnitude = 1.0 / Math.sqrt(x * x + y * y + z * z + w * w);
        array[startingIndex] = x * inverseMagnitude;
        array[startingIndex + 1] = y * inverseMagnitude;
        array[startingIndex + 2] = z * inverseMagnitude;
        array[startingIndex + 3] = w * inverseMagnitude;
    }

    function unwrapQuaternionInterval(czmlInterval) {
        var unitQuaternion = czmlInterval.unitQuaternion;
        if (defined(unitQuaternion)) {
            if (unitQuaternion.length === 4) {
                normalizePackedQuaternionArray(unitQuaternion, 0);
                return unitQuaternion;
            }

            for (var i = 1; i < unitQuaternion.length; i += 5) {
                normalizePackedQuaternionArray(unitQuaternion, i);
            }
        }
        return unitQuaternion;
    }

    function getPropertyType(czmlInterval) {
        // The associations in this function need to be kept in sync with the
        // associations in unwrapInterval.

        // Intentionally omitted due to conficts in CZML property names:
        // * Image (conflicts with Uri)
        // * Rotation (conflicts with Number)
        //
        // cartesianVelocity is also omitted due to incomplete support for
        // derivative information in CZML properties.
        // (Currently cartesianVelocity is hacked directly into the position processing code)
        if (typeof czmlInterval === 'boolean') {
            return Boolean;
        } else if (typeof czmlInterval === 'number') {
            return Number;
        } else if (typeof czmlInterval === 'string') {
            return String;
        } else if (czmlInterval.hasOwnProperty('array')) {
            return Array;
        } else if (czmlInterval.hasOwnProperty('boolean')) {
            return Boolean;
        } else if (czmlInterval.hasOwnProperty('boundingRectangle')) {
            return BoundingRectangle;
        } else if (czmlInterval.hasOwnProperty('cartesian2')) {
            return Cartesian2;
        } else if (czmlInterval.hasOwnProperty('cartesian') ||
                   czmlInterval.hasOwnProperty('unitCartesian') ||
                   czmlInterval.hasOwnProperty('unitSpherical') ||
                   czmlInterval.hasOwnProperty('spherical') ||
                   czmlInterval.hasOwnProperty('cartographicRadians') ||
                   czmlInterval.hasOwnProperty('cartographicDegrees')) {
            return Cartesian3;
        } else if (czmlInterval.hasOwnProperty('rgba') ||
                   czmlInterval.hasOwnProperty('rgbaf')) {
            return Color;
        } else if (czmlInterval.hasOwnProperty('colorBlendMode')) {
            return ColorBlendMode;
        } else if (czmlInterval.hasOwnProperty('cornerType')) {
            return CornerType;
        } else if (czmlInterval.hasOwnProperty('heightReference')) {
            return HeightReference;
        } else if (czmlInterval.hasOwnProperty('horizontalOrigin')) {
            return HorizontalOrigin;
        } else if (czmlInterval.hasOwnProperty('date')) {
            return JulianDate;
        } else if (czmlInterval.hasOwnProperty('labelStyle')) {
            return LabelStyle;
        } else if (czmlInterval.hasOwnProperty('number')) {
            return Number;
        } else if (czmlInterval.hasOwnProperty('nearFarScalar')) {
            return NearFarScalar;
        } else if (czmlInterval.hasOwnProperty('object') ||
                   czmlInterval.hasOwnProperty('value')) {
            return Object;
        } else if (czmlInterval.hasOwnProperty('unitQuaternion')) {
            return Quaternion;
        } else if (czmlInterval.hasOwnProperty('shadowMode')) {
            return ShadowMode;
        } else if (czmlInterval.hasOwnProperty('string')) {
            return String;
        } else if (czmlInterval.hasOwnProperty('stripeOrientation')) {
            return StripeOrientation;
        } else if (czmlInterval.hasOwnProperty('wsen') ||
                   czmlInterval.hasOwnProperty('wsenDegrees')) {
            return Rectangle;
        } else if (czmlInterval.hasOwnProperty('uri')) {
            return Uri;
        } else if (czmlInterval.hasOwnProperty('verticalOrigin')) {
            return VerticalOrigin;
        } else {
            // fallback case
            return Object;
        }
    }

    function unwrapInterval(type, czmlInterval, sourceUri) {
        // The associations in this function need to be kept in sync with the
        // associations in getPropertyType
        /*jshint sub:true*/
        switch (type) {
            case Array:
                return czmlInterval.array;
            case Boolean:
                return defaultValue(czmlInterval['boolean'], czmlInterval);
            case BoundingRectangle:
                return czmlInterval.boundingRectangle;
            case Cartesian2:
                return czmlInterval.cartesian2;
            case Cartesian3:
                return unwrapCartesianInterval(czmlInterval);
            case Color:
                return unwrapColorInterval(czmlInterval);
            case ColorBlendMode:
                return ColorBlendMode[defaultValue(czmlInterval.colorBlendMode, czmlInterval)];
            case CornerType:
                return CornerType[defaultValue(czmlInterval.cornerType, czmlInterval)];
            case HeightReference:
                return HeightReference[defaultValue(czmlInterval.heightReference, czmlInterval)];
            case HorizontalOrigin:
                return HorizontalOrigin[defaultValue(czmlInterval.horizontalOrigin, czmlInterval)];
            case Image:
                return unwrapUriInterval(czmlInterval, sourceUri);
            case JulianDate:
                return JulianDate.fromIso8601(defaultValue(czmlInterval.date, czmlInterval));
            case LabelStyle:
                return LabelStyle[defaultValue(czmlInterval.labelStyle, czmlInterval)];
            case Number:
                return defaultValue(czmlInterval.number, czmlInterval);
            case NearFarScalar:
                return czmlInterval.nearFarScalar;
            case Object:
                return defaultValue(defaultValue(czmlInterval.object, czmlInterval.value), czmlInterval);
            case Quaternion:
                return unwrapQuaternionInterval(czmlInterval);
            case Rotation:
                return defaultValue(czmlInterval.number, czmlInterval);
            case ShadowMode:
                return ShadowMode[defaultValue(defaultValue(czmlInterval.shadowMode, czmlInterval.shadows), czmlInterval)];
            case String:
                return defaultValue(czmlInterval.string, czmlInterval);
            case StripeOrientation:
                return StripeOrientation[defaultValue(czmlInterval.stripeOrientation, czmlInterval)];
            case Rectangle:
                return unwrapRectangleInterval(czmlInterval);
            case Uri:
                return unwrapUriInterval(czmlInterval, sourceUri);
            case VerticalOrigin:
                return VerticalOrigin[defaultValue(czmlInterval.verticalOrigin, czmlInterval)];
            default:
                throw new RuntimeError(type);
        }
    }

    var interpolators = {
        HERMITE : HermitePolynomialApproximation,
        LAGRANGE : LagrangePolynomialApproximation,
        LINEAR : LinearApproximation
    };

    function updateInterpolationSettings(packetData, property) {
        var interpolationAlgorithm = packetData.interpolationAlgorithm;
        if (defined(interpolationAlgorithm) || defined(packetData.interpolationDegree)) {
            property.setInterpolationOptions({
                interpolationAlgorithm : interpolators[interpolationAlgorithm],
                interpolationDegree : packetData.interpolationDegree
            });
        }

        var forwardExtrapolationType = packetData.forwardExtrapolationType;
        if (defined(forwardExtrapolationType)) {
            property.forwardExtrapolationType = ExtrapolationType[forwardExtrapolationType];
        }

        var forwardExtrapolationDuration = packetData.forwardExtrapolationDuration;
        if (defined(forwardExtrapolationDuration)) {
            property.forwardExtrapolationDuration = forwardExtrapolationDuration;
        }

        var backwardExtrapolationType = packetData.backwardExtrapolationType;
        if (defined(backwardExtrapolationType)) {
            property.backwardExtrapolationType = ExtrapolationType[backwardExtrapolationType];
        }

        var backwardExtrapolationDuration = packetData.backwardExtrapolationDuration;
        if (defined(backwardExtrapolationDuration)) {
            property.backwardExtrapolationDuration = backwardExtrapolationDuration;
        }
    }

    function processProperty(type, object, propertyName, packetData, constrainedInterval, sourceUri, entityCollection) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (defined(packetInterval)) {
            iso8601Scratch.iso8601 = packetInterval;
            combinedInterval = TimeInterval.fromIso8601(iso8601Scratch);
            if (defined(constrainedInterval)) {
                combinedInterval = TimeInterval.intersect(combinedInterval, constrainedInterval, scratchTimeInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        var packedLength;
        var isSampled;
        var unwrappedInterval;
        var unwrappedIntervalLength;
        var isReference = defined(packetData.reference);
        var hasInterval = defined(combinedInterval) && !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);

        if (!isReference) {
            unwrappedInterval = unwrapInterval(type, packetData, sourceUri);
            packedLength = defaultValue(type.packedLength, 1);
            unwrappedIntervalLength = defaultValue(unwrappedInterval.length, 1);
            isSampled = !defined(packetData.array) && (typeof unwrappedInterval !== 'string') && (unwrappedIntervalLength > packedLength) && (type !== Object);
        }

        //Rotation is a special case because it represents a native type (Number)
        //and therefore does not need to be unpacked when loaded as a constant value.
        var needsUnpacking = typeof type.unpack === 'function' && type !== Rotation;

        //Any time a constant value is assigned, it completely blows away anything else.
        if (!isSampled && !hasInterval) {
            if (isReference) {
                object[propertyName] = makeReference(entityCollection, packetData.reference);
            } else if (needsUnpacking) {
                object[propertyName] = new ConstantProperty(type.unpack(unwrappedInterval, 0));
            } else {
                object[propertyName] = new ConstantProperty(unwrappedInterval);
            }
            return;
        }

        var property = object[propertyName];

        var epoch;
        var packetEpoch = packetData.epoch;
        if (defined(packetEpoch)) {
            epoch = JulianDate.fromIso8601(packetEpoch);
        }

        //Without an interval, any sampled value is infinite, meaning it completely
        //replaces any non-sampled property that may exist.
        if (isSampled && !hasInterval) {
            if (!(property instanceof SampledProperty)) {
                property = new SampledProperty(type);
                object[propertyName] = property;
            }
            property.addSamplesPackedArray(unwrappedInterval, epoch);
            updateInterpolationSettings(packetData, property);
            return;
        }

        var interval;

        //A constant value with an interval is normally part of a TimeIntervalCollection,
        //However, if the current property is not a time-interval collection, we need
        //to turn it into a Composite, preserving the old data with the new interval.
        if (!isSampled && hasInterval) {
            //Create a new interval for the constant value.
            combinedInterval = combinedInterval.clone();
            if (isReference) {
                combinedInterval.data = makeReference(entityCollection, packetData.reference);
            } else if (needsUnpacking) {
                combinedInterval.data = type.unpack(unwrappedInterval, 0);
            } else {
                combinedInterval.data = unwrappedInterval;
            }

            //If no property exists, simply use a new interval collection
            if (!defined(property)) {
                if (isReference) {
                    property = new CompositeProperty();
                } else {
                    property = new TimeIntervalCollectionProperty();
                }
                object[propertyName] = property;
            }

            if (!isReference && property instanceof TimeIntervalCollectionProperty) {
                //If we create a collection, or it already existed, use it.
                property.intervals.addInterval(combinedInterval);
            } else if (property instanceof CompositeProperty) {
                //If the collection was already a CompositeProperty, use it.
                combinedInterval.data = isReference ? combinedInterval.data : new ConstantProperty(combinedInterval.data);
                property.intervals.addInterval(combinedInterval);
            } else {
                //Otherwise, create a CompositeProperty but preserve the existing data.

                //Put the old property in an infinite interval.
                interval = Iso8601.MAXIMUM_INTERVAL.clone();
                interval.data = property;

                //Create the composite.
                property = new CompositeProperty();
                object[propertyName] = property;

                //add the old property interval
                property.intervals.addInterval(interval);

                //Change the new data to a ConstantProperty and add it.
                combinedInterval.data = isReference ? combinedInterval.data : new ConstantProperty(combinedInterval.data);
                property.intervals.addInterval(combinedInterval);
            }

            return;
        }

        //isSampled && hasInterval
        if (!defined(property)) {
            property = new CompositeProperty();
            object[propertyName] = property;
        }

        //create a CompositeProperty but preserve the existing data.
        if (!(property instanceof CompositeProperty)) {
            //Put the old property in an infinite interval.
            interval = Iso8601.MAXIMUM_INTERVAL.clone();
            interval.data = property;

            //Create the composite.
            property = new CompositeProperty();
            object[propertyName] = property;

            //add the old property interval
            property.intervals.addInterval(interval);
        }

        //Check if the interval already exists in the composite
        var intervals = property.intervals;
        interval = intervals.findInterval(combinedInterval);
        if (!defined(interval) || !(interval.data instanceof SampledProperty)) {
            //If not, create a SampledProperty for it.
            interval = combinedInterval.clone();
            interval.data = new SampledProperty(type);
            intervals.addInterval(interval);
        }
        interval.data.addSamplesPackedArray(unwrappedInterval, epoch);
        updateInterpolationSettings(packetData, interval.data);
    }

    function processPacketData(type, object, propertyName, packetData, interval, sourceUri, entityCollection) {
        if (!defined(packetData)) {
            return;
        }

        if (isArray(packetData)) {
            for (var i = 0, len = packetData.length; i < len; i++) {
                processProperty(type, object, propertyName, packetData[i], interval, sourceUri, entityCollection);
            }
        } else {
            processProperty(type, object, propertyName, packetData, interval, sourceUri, entityCollection);
        }
    }

    function processPositionProperty(object, propertyName, packetData, constrainedInterval, sourceUri, entityCollection) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (defined(packetInterval)) {
            iso8601Scratch.iso8601 = packetInterval;
            combinedInterval = TimeInterval.fromIso8601(iso8601Scratch);
            if (defined(constrainedInterval)) {
                combinedInterval = TimeInterval.intersect(combinedInterval, constrainedInterval, scratchTimeInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        var referenceFrame;
        var unwrappedInterval;
        var isSampled = false;
        var unwrappedIntervalLength;
        var numberOfDerivatives = defined(packetData.cartesianVelocity) ? 1 : 0;
        var packedLength = Cartesian3.packedLength * (numberOfDerivatives + 1);
        var isReference = defined(packetData.reference);
        var hasInterval = defined(combinedInterval) && !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);

        if (!isReference) {
            if (defined(packetData.referenceFrame)) {
                referenceFrame = ReferenceFrame[packetData.referenceFrame];
            }
            referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
            unwrappedInterval = unwrapCartesianInterval(packetData);
            unwrappedIntervalLength = defaultValue(unwrappedInterval.length, 1);
            isSampled = unwrappedIntervalLength > packedLength;
        }

        //Any time a constant value is assigned, it completely blows away anything else.
        if (!isSampled && !hasInterval) {
            if (isReference) {
                object[propertyName] = makeReference(entityCollection, packetData.reference);
            } else {
                object[propertyName] = new ConstantPositionProperty(Cartesian3.unpack(unwrappedInterval), referenceFrame);
            }
            return;
        }

        var property = object[propertyName];

        var epoch;
        var packetEpoch = packetData.epoch;
        if (defined(packetEpoch)) {
            epoch = JulianDate.fromIso8601(packetEpoch);
        }

        //Without an interval, any sampled value is infinite, meaning it completely
        //replaces any non-sampled property that may exist.
        if (isSampled && !hasInterval) {
            if (!(property instanceof SampledPositionProperty) || (defined(referenceFrame) && property.referenceFrame !== referenceFrame)) {
                property = new SampledPositionProperty(referenceFrame, numberOfDerivatives);
                object[propertyName] = property;
            }
            property.addSamplesPackedArray(unwrappedInterval, epoch);
            updateInterpolationSettings(packetData, property);
            return;
        }

        var interval;

        //A constant value with an interval is normally part of a TimeIntervalCollection,
        //However, if the current property is not a time-interval collection, we need
        //to turn it into a Composite, preserving the old data with the new interval.
        if (!isSampled && hasInterval) {
            //Create a new interval for the constant value.
            combinedInterval = combinedInterval.clone();
            if (isReference) {
                combinedInterval.data = makeReference(entityCollection, packetData.reference);
            } else {
                combinedInterval.data = Cartesian3.unpack(unwrappedInterval);
            }

            //If no property exists, simply use a new interval collection
            if (!defined(property)) {
                if (isReference) {
                    property = new CompositePositionProperty(referenceFrame);
                } else {
                    property = new TimeIntervalCollectionPositionProperty(referenceFrame);
                }
                object[propertyName] = property;
            }

            if (!isReference && property instanceof TimeIntervalCollectionPositionProperty && (defined(referenceFrame) && property.referenceFrame === referenceFrame)) {
                //If we create a collection, or it already existed, use it.
                property.intervals.addInterval(combinedInterval);
            } else if (property instanceof CompositePositionProperty) {
                //If the collection was already a CompositePositionProperty, use it.
                combinedInterval.data = isReference ? combinedInterval.data : new ConstantPositionProperty(combinedInterval.data, referenceFrame);
                property.intervals.addInterval(combinedInterval);
            } else {
                //Otherwise, create a CompositePositionProperty but preserve the existing data.

                //Put the old property in an infinite interval.
                interval = Iso8601.MAXIMUM_INTERVAL.clone();
                interval.data = property;

                //Create the composite.
                property = new CompositePositionProperty(property.referenceFrame);
                object[propertyName] = property;

                //add the old property interval
                property.intervals.addInterval(interval);

                //Change the new data to a ConstantPositionProperty and add it.
                combinedInterval.data = isReference ? combinedInterval.data : new ConstantPositionProperty(combinedInterval.data, referenceFrame);
                property.intervals.addInterval(combinedInterval);
            }

            return;
        }

        //isSampled && hasInterval
        if (!defined(property)) {
            property = new CompositePositionProperty(referenceFrame);
            object[propertyName] = property;
        } else if (!(property instanceof CompositePositionProperty)) {
            //create a CompositeProperty but preserve the existing data.
            //Put the old property in an infinite interval.
            interval = Iso8601.MAXIMUM_INTERVAL.clone();
            interval.data = property;

            //Create the composite.
            property = new CompositePositionProperty(property.referenceFrame);
            object[propertyName] = property;

            //add the old property interval
            property.intervals.addInterval(interval);
        }

        //Check if the interval already exists in the composite
        var intervals = property.intervals;
        interval = intervals.findInterval(combinedInterval);
        if (!defined(interval) || !(interval.data instanceof SampledPositionProperty) || (defined(referenceFrame) && interval.data.referenceFrame !== referenceFrame)) {
            //If not, create a SampledPositionProperty for it.
            interval = combinedInterval.clone();
            interval.data = new SampledPositionProperty(referenceFrame, numberOfDerivatives);
            intervals.addInterval(interval);
        }
        interval.data.addSamplesPackedArray(unwrappedInterval, epoch);
        updateInterpolationSettings(packetData, interval.data);
    }

    function processPositionPacketData(object, propertyName, packetData, interval, sourceUri, entityCollection) {
        if (!defined(packetData)) {
            return;
        }

        if (isArray(packetData)) {
            for (var i = 0, len = packetData.length; i < len; i++) {
                processPositionProperty(object, propertyName, packetData[i], interval, sourceUri, entityCollection);
            }
        } else {
            processPositionProperty(object, propertyName, packetData, interval, sourceUri, entityCollection);
        }
    }

    function processMaterialProperty(object, propertyName, packetData, constrainedInterval, sourceUri, entityCollection) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (defined(packetInterval)) {
            iso8601Scratch.iso8601 = packetInterval;
            combinedInterval = TimeInterval.fromIso8601(iso8601Scratch);
            if (defined(constrainedInterval)) {
                combinedInterval = TimeInterval.intersect(combinedInterval, constrainedInterval, scratchTimeInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        var property = object[propertyName];
        var existingMaterial;
        var existingInterval;

        if (defined(combinedInterval)) {
            if (!(property instanceof CompositeMaterialProperty)) {
                property = new CompositeMaterialProperty();
                object[propertyName] = property;
            }
            //See if we already have data at that interval.
            var thisIntervals = property.intervals;
            existingInterval = thisIntervals.findInterval({
                start : combinedInterval.start,
                stop : combinedInterval.stop
            });
            if (defined(existingInterval)) {
                //We have an interval, but we need to make sure the
                //new data is the same type of material as the old data.
                existingMaterial = existingInterval.data;
            } else {
                //If not, create it.
                existingInterval = combinedInterval.clone();
                thisIntervals.addInterval(existingInterval);
            }
        } else {
            existingMaterial = property;
        }

        var materialData;
        if (defined(packetData.solidColor)) {
            if (!(existingMaterial instanceof ColorMaterialProperty)) {
                existingMaterial = new ColorMaterialProperty();
            }
            materialData = packetData.solidColor;
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, undefined, entityCollection);
        } else if (defined(packetData.grid)) {
            if (!(existingMaterial instanceof GridMaterialProperty)) {
                existingMaterial = new GridMaterialProperty();
            }
            materialData = packetData.grid;
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, sourceUri, entityCollection);
            processPacketData(Number, existingMaterial, 'cellAlpha', materialData.cellAlpha, undefined, sourceUri, entityCollection);
            processPacketData(Cartesian2, existingMaterial, 'lineCount', materialData.lineCount, undefined, sourceUri, entityCollection);
            processPacketData(Cartesian2, existingMaterial, 'lineThickness', materialData.lineThickness, undefined, sourceUri, entityCollection);
            processPacketData(Cartesian2, existingMaterial, 'lineOffset', materialData.lineOffset, undefined, sourceUri, entityCollection);
        } else if (defined(packetData.image)) {
            if (!(existingMaterial instanceof ImageMaterialProperty)) {
                existingMaterial = new ImageMaterialProperty();
            }
            materialData = packetData.image;
            processPacketData(Image, existingMaterial, 'image', materialData.image, undefined, sourceUri, entityCollection);
            processPacketData(Cartesian2, existingMaterial, 'repeat', materialData.repeat, undefined, sourceUri, entityCollection);
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, sourceUri, entityCollection);
            processPacketData(Boolean, existingMaterial, 'transparent', materialData.transparent, undefined, sourceUri, entityCollection);
        } else if (defined(packetData.stripe)) {
            if (!(existingMaterial instanceof StripeMaterialProperty)) {
                existingMaterial = new StripeMaterialProperty();
            }
            materialData = packetData.stripe;
            processPacketData(StripeOrientation, existingMaterial, 'orientation', materialData.orientation, undefined, sourceUri, entityCollection);
            processPacketData(Color, existingMaterial, 'evenColor', materialData.evenColor, undefined, sourceUri, entityCollection);
            processPacketData(Color, existingMaterial, 'oddColor', materialData.oddColor, undefined, sourceUri, entityCollection);
            processPacketData(Number, existingMaterial, 'offset', materialData.offset, undefined, sourceUri, entityCollection);
            processPacketData(Number, existingMaterial, 'repeat', materialData.repeat, undefined, sourceUri, entityCollection);
        } else if (defined(packetData.polylineOutline)) {
            if (!(existingMaterial instanceof PolylineOutlineMaterialProperty)) {
                existingMaterial = new PolylineOutlineMaterialProperty();
            }
            materialData = packetData.polylineOutline;
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, sourceUri, entityCollection);
            processPacketData(Color, existingMaterial, 'outlineColor', materialData.outlineColor, undefined, sourceUri, entityCollection);
            processPacketData(Number, existingMaterial, 'outlineWidth', materialData.outlineWidth, undefined, sourceUri, entityCollection);
        } else if (defined(packetData.polylineGlow)) {
            if (!(existingMaterial instanceof PolylineGlowMaterialProperty)) {
                existingMaterial = new PolylineGlowMaterialProperty();
            }
            materialData = packetData.polylineGlow;
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, sourceUri, entityCollection);
            processPacketData(Number, existingMaterial, 'glowPower', materialData.glowPower, undefined, sourceUri, entityCollection);
        } else if (defined(packetData.polylineArrow)) {
            if (!(existingMaterial instanceof PolylineArrowMaterialProperty)) {
                existingMaterial = new PolylineArrowMaterialProperty();
            }
            materialData = packetData.polylineArrow;
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, undefined, entityCollection);
        } else if (defined(packetData.polylineDash)) {
            if (!(existingMaterial instanceof PolylineDashMaterialProperty)) {
                existingMaterial = new PolylineDashMaterialProperty();
            }
            materialData = packetData.polylineDash;
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, undefined, entityCollection);
            processPacketData(Color, existingMaterial, 'gapColor', materialData.gapColor, undefined, undefined, entityCollection);
            processPacketData(Number, existingMaterial, 'dashLength', materialData.dashLength, undefined, sourceUri, entityCollection);
            processPacketData(Number, existingMaterial, 'dashPattern', materialData.dashPattern, undefined, sourceUri, entityCollection);
        }

        if (defined(existingInterval)) {
            existingInterval.data = existingMaterial;
        } else {
            object[propertyName] = existingMaterial;
        }
    }

    function processMaterialPacketData(object, propertyName, packetData, interval, sourceUri, entityCollection) {
        if (!defined(packetData)) {
            return;
        }

        if (isArray(packetData)) {
            for (var i = 0, len = packetData.length; i < len; i++) {
                processMaterialProperty(object, propertyName, packetData[i], interval, sourceUri, entityCollection);
            }
        } else {
            processMaterialProperty(object, propertyName, packetData, interval, sourceUri, entityCollection);
        }
    }

    function processName(entity, packet, entityCollection, sourceUri) {
        entity.name = defaultValue(packet.name, entity.name);
    }

    function processDescription(entity, packet, entityCollection, sourceUri) {
        var descriptionData = packet.description;
        if (defined(descriptionData)) {
            processPacketData(String, entity, 'description', descriptionData, undefined, sourceUri, entityCollection);
        }
    }

    function processPosition(entity, packet, entityCollection, sourceUri) {
        var positionData = packet.position;
        if (defined(positionData)) {
            processPositionPacketData(entity, 'position', positionData, undefined, sourceUri, entityCollection);
        }
    }

    function processViewFrom(entity, packet, entityCollection, sourceUri) {
        var viewFromData = packet.viewFrom;
        if (defined(viewFromData)) {
            processPacketData(Cartesian3, entity, 'viewFrom', viewFromData, undefined, sourceUri, entityCollection);
        }
    }

    function processOrientation(entity, packet, entityCollection, sourceUri) {
        var orientationData = packet.orientation;
        if (defined(orientationData)) {
            processPacketData(Quaternion, entity, 'orientation', orientationData, undefined, sourceUri, entityCollection);
        }
    }

    function processProperties(entity, packet, entityCollection, sourceUri) {
        var propertiesData = packet.properties;
        if (defined(propertiesData)) {
            if (!defined(entity.properties)) {
                entity.properties = new PropertyBag();
            }
            //We cannot simply call processPacketData(entity, 'properties', propertyData, undefined, sourceUri, entityCollection)
            //because each property of "properties" may vary separately.
            //The properties will be accessible as entity.properties.myprop.getValue(time).

            for (var key in propertiesData) {
                if (propertiesData.hasOwnProperty(key)) {
                    if (!entity.properties.hasProperty(key)) {
                        entity.properties.addProperty(key);
                    }

                    var propertyData = propertiesData[key];
                    if (isArray(propertyData)) {
                        for (var i = 0, len = propertyData.length; i < len; i++) {
                            processProperty(getPropertyType(propertyData[i]), entity.properties, key, propertyData[i], undefined, sourceUri, entityCollection);
                        }
                    } else {
                        processProperty(getPropertyType(propertyData), entity.properties, key, propertyData, undefined, sourceUri, entityCollection);
                    }
                }
            }
        }
    }

    function processArrayPacketData(object, propertyName, packetData, entityCollection) {
        var references = packetData.references;
        if (defined(references)) {
            var properties = references.map(function(reference) {
                return makeReference(entityCollection, reference);
            });

            var iso8601Interval = packetData.interval;
            if (defined(iso8601Interval)) {
                iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
                if (!(object[propertyName] instanceof CompositePositionProperty)) {
                    iso8601Interval.data = new PropertyArray(properties);
                    var property = new CompositeProperty();
                    property.intervals.addInterval(iso8601Interval);
                    object[propertyName] = property;
                }
            } else {
                object[propertyName] = new PropertyArray(properties);
            }
        } else {
            processPacketData(Array, object, propertyName, packetData, undefined, undefined, entityCollection);
        }
    }

    function processArray(object, propertyName, packetData, entityCollection) {
        if (!defined(packetData)) {
            return;
        }

        if (isArray(packetData)) {
            for (var i = 0, length = packetData.length; i < length; ++i) {
                processArrayPacketData(object, propertyName, packetData[i], entityCollection);
            }
        } else {
            processArrayPacketData(object, propertyName, packetData, entityCollection);
        }
    }

    function processPositionsPacketData(object, propertyName, positionsData, entityCollection) {
        if (defined(positionsData.references)) {
            var properties = positionsData.references.map(function(reference) {
                return makeReference(entityCollection, reference);
            });

            var iso8601Interval = positionsData.interval;
            if (defined(iso8601Interval)) {
                iso8601Interval = TimeInterval.fromIso8601(iso8601Interval);
                if (!(object[propertyName] instanceof CompositePositionProperty)) {
                    iso8601Interval.data = new PositionPropertyArray(properties);
                    var property = new CompositePositionProperty();
                    property.intervals.addInterval(iso8601Interval);
                    object[propertyName] = property;
                }
            } else {
                object[propertyName] = new PositionPropertyArray(properties);
            }
        } else {
            if (defined(positionsData.cartesian)) {
                positionsData.array = Cartesian3.unpackArray(positionsData.cartesian);
            } else if (defined(positionsData.cartographicRadians)) {
                positionsData.array = Cartesian3.fromRadiansArrayHeights(positionsData.cartographicRadians);
            } else if (defined(positionsData.cartographicDegrees)) {
                positionsData.array = Cartesian3.fromDegreesArrayHeights(positionsData.cartographicDegrees);
            }

            if (defined(positionsData.array)) {
                processPacketData(Array, object, propertyName, positionsData, undefined, undefined, entityCollection);
            }
        }
    }

    function processPositions(object, propertyName, positionsData, entityCollection) {
        if (!defined(positionsData)) {
            return;
        }

        if (isArray(positionsData)) {
            for (var i = 0, length = positionsData.length; i < length; i++) {
                processPositionsPacketData(object, propertyName, positionsData[i], entityCollection);
            }
        } else {
            processPositionsPacketData(object, propertyName, positionsData, entityCollection);
        }
    }

    function processAvailability(entity, packet, entityCollection, sourceUri) {
        var interval;
        var packetData = packet.availability;
        if (!defined(packetData)) {
            return;
        }

        var intervals;
        if (isArray(packetData)) {
            var length = packetData.length;
            for (var i = 0; i < length; i++) {
                if (!defined(intervals)) {
                    intervals = new TimeIntervalCollection();
                }
                iso8601Scratch.iso8601 = packetData[i];
                interval = TimeInterval.fromIso8601(iso8601Scratch);
                intervals.addInterval(interval);
            }
        } else {
            iso8601Scratch.iso8601 = packetData;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
            intervals = new TimeIntervalCollection();
            intervals.addInterval(interval);
        }
        entity.availability = intervals;
    }

    var iso8601Scratch = {
        iso8601 : undefined
    };

    function processAlignedAxis(billboard, packetData, interval, sourceUri, entityCollection) {
        if (!defined(packetData)) {
            return;
        }

        if (defined(packetData.velocityReference)) {
            billboard.alignedAxis = new VelocityVectorProperty(makeReference(entityCollection, packetData.velocityReference), true);
        } else {
            processPacketData(Cartesian3, billboard, 'alignedAxis', packetData, interval, sourceUri, entityCollection);
        }
    }

    function processBillboard(entity, packet, entityCollection, sourceUri) {
        var billboardData = packet.billboard;
        if (!defined(billboardData)) {
            return;
        }

        var interval;
        var intervalString = billboardData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var billboard = entity.billboard;
        if (!defined(billboard)) {
            entity.billboard = billboard = new BillboardGraphics();
        }

        processPacketData(Boolean, billboard, 'show', billboardData.show, interval, sourceUri, entityCollection);
        processPacketData(Image, billboard, 'image', billboardData.image, interval, sourceUri, entityCollection);
        processPacketData(Number, billboard, 'scale', billboardData.scale, interval, sourceUri, entityCollection);
        processPacketData(Cartesian2, billboard, 'pixelOffset', billboardData.pixelOffset, interval, sourceUri, entityCollection);
        processPacketData(Cartesian3, billboard, 'eyeOffset', billboardData.eyeOffset, interval, sourceUri, entityCollection);
        processPacketData(HorizontalOrigin, billboard, 'horizontalOrigin', billboardData.horizontalOrigin, interval, sourceUri, entityCollection);
        processPacketData(VerticalOrigin, billboard, 'verticalOrigin', billboardData.verticalOrigin, interval, sourceUri, entityCollection);
        processPacketData(HeightReference, billboard, 'heightReference', billboardData.heightReference, interval, sourceUri, entityCollection);
        processPacketData(Color, billboard, 'color', billboardData.color, interval, sourceUri, entityCollection);
        processPacketData(Rotation, billboard, 'rotation', billboardData.rotation, interval, sourceUri, entityCollection);
        processAlignedAxis(billboard, billboardData.alignedAxis, interval, sourceUri, entityCollection);
        processPacketData(Boolean, billboard, 'sizeInMeters', billboardData.sizeInMeters, interval, sourceUri, entityCollection);
        processPacketData(Number, billboard, 'width', billboardData.width, interval, sourceUri, entityCollection);
        processPacketData(Number, billboard, 'height', billboardData.height, interval, sourceUri, entityCollection);
        processPacketData(NearFarScalar, billboard, 'scaleByDistance', billboardData.scaleByDistance, interval, sourceUri, entityCollection);
        processPacketData(NearFarScalar, billboard, 'translucencyByDistance', billboardData.translucencyByDistance, interval, sourceUri, entityCollection);
        processPacketData(NearFarScalar, billboard, 'pixelOffsetScaleByDistance', billboardData.pixelOffsetScaleByDistance, interval, sourceUri, entityCollection);
        processPacketData(BoundingRectangle, billboard, 'imageSubRegion', billboardData.imageSubRegion, interval, sourceUri, entityCollection);
    }

    function processBox(entity, packet, entityCollection, sourceUri) {
        var boxData = packet.box;
        if (!defined(boxData)) {
            return;
        }

        var interval;
        var intervalString = boxData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var box = entity.box;
        if (!defined(box)) {
            entity.box = box = new BoxGraphics();
        }

        processPacketData(Boolean, box, 'show', boxData.show, interval, sourceUri, entityCollection);
        processPacketData(Cartesian3, box, 'dimensions', boxData.dimensions, interval, sourceUri, entityCollection);
        processPacketData(Boolean, box, 'fill', boxData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(box, 'material', boxData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, box, 'outline', boxData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, box, 'outlineColor', boxData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, box, 'outlineWidth', boxData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, box, 'shadows', boxData.shadows, interval, sourceUri, entityCollection);
    }

    function processCorridor(entity, packet, entityCollection, sourceUri) {
        var corridorData = packet.corridor;
        if (!defined(corridorData)) {
            return;
        }

        var interval;
        var intervalString = corridorData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var corridor = entity.corridor;
        if (!defined(corridor)) {
            entity.corridor = corridor = new CorridorGraphics();
        }

        processPacketData(Boolean, corridor, 'show', corridorData.show, interval, sourceUri, entityCollection);
        processPositions(corridor, 'positions', corridorData.positions, entityCollection);
        processPacketData(Number, corridor, 'width', corridorData.width, interval, sourceUri, entityCollection);
        processPacketData(Number, corridor, 'height', corridorData.height, interval, sourceUri, entityCollection);
        processPacketData(Number, corridor, 'extrudedHeight', corridorData.extrudedHeight, interval, sourceUri, entityCollection);
        processPacketData(CornerType, corridor, 'cornerType', corridorData.cornerType, interval, sourceUri, entityCollection);
        processPacketData(Number, corridor, 'granularity', corridorData.granularity, interval, sourceUri, entityCollection);
        processPacketData(Boolean, corridor, 'fill', corridorData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(corridor, 'material', corridorData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, corridor, 'outline', corridorData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, corridor, 'outlineColor', corridorData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, corridor, 'outlineWidth', corridorData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, corridor, 'shadows', corridorData.shadows, interval, sourceUri, entityCollection);
    }

    function processCylinder(entity, packet, entityCollection, sourceUri) {
        var cylinderData = packet.cylinder;
        if (!defined(cylinderData)) {
            return;
        }

        var interval;
        var intervalString = cylinderData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var cylinder = entity.cylinder;
        if (!defined(cylinder)) {
            entity.cylinder = cylinder = new CylinderGraphics();
        }

        processPacketData(Boolean, cylinder, 'show', cylinderData.show, interval, sourceUri, entityCollection);
        processPacketData(Number, cylinder, 'length', cylinderData.length, interval, sourceUri, entityCollection);
        processPacketData(Number, cylinder, 'topRadius', cylinderData.topRadius, interval, sourceUri, entityCollection);
        processPacketData(Number, cylinder, 'bottomRadius', cylinderData.bottomRadius, interval, sourceUri, entityCollection);
        processPacketData(Boolean, cylinder, 'fill', cylinderData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(cylinder, 'material', cylinderData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, cylinder, 'outline', cylinderData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, cylinder, 'outlineColor', cylinderData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, cylinder, 'outlineWidth', cylinderData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(Number, cylinder, 'numberOfVerticalLines', cylinderData.numberOfVerticalLines, interval, sourceUri, entityCollection);
        processPacketData(Number, cylinder, 'slices', cylinderData.slices, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, cylinder, 'shadows', cylinderData.shadows, interval, sourceUri, entityCollection);
    }

    function processDocument(packet, dataSource) {
        var version = packet.version;
        if (defined(version)) {
            if (typeof version === 'string') {
                var tokens = version.split('.');
                if (tokens.length === 2) {
                    if (tokens[0] !== '1') {
                        throw new RuntimeError('Cesium only supports CZML version 1.');
                    }
                    dataSource._version = version;
                }
            }
        }

        if (!defined(dataSource._version)) {
            throw new RuntimeError('CZML version information invalid.  It is expected to be a property on the document object in the <Major>.<Minor> version format.');
        }

        var documentPacket = dataSource._documentPacket;

        if (defined(packet.name)) {
            documentPacket.name = packet.name;
        }

        var clockPacket = packet.clock;
        if (defined(clockPacket)) {
            var clock = documentPacket.clock;
            if (!defined(clock)) {
                documentPacket.clock = {
                    interval : clockPacket.interval,
                    currentTime : clockPacket.currentTime,
                    range : clockPacket.range,
                    step : clockPacket.step,
                    multiplier : clockPacket.multiplier
                };
            } else {
                clock.interval = defaultValue(clockPacket.interval, clock.interval);
                clock.currentTime = defaultValue(clockPacket.currentTime, clock.currentTime);
                clock.range = defaultValue(clockPacket.range, clock.range);
                clock.step = defaultValue(clockPacket.step, clock.step);
                clock.multiplier = defaultValue(clockPacket.multiplier, clock.multiplier);
            }
        }
    }

    function processEllipse(entity, packet, entityCollection, sourceUri) {
        var ellipseData = packet.ellipse;
        if (!defined(ellipseData)) {
            return;
        }

        var interval;
        var intervalString = ellipseData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var ellipse = entity.ellipse;
        if (!defined(ellipse)) {
            entity.ellipse = ellipse = new EllipseGraphics();
        }

        processPacketData(Boolean, ellipse, 'show', ellipseData.show, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipse, 'semiMajorAxis', ellipseData.semiMajorAxis, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipse, 'semiMinorAxis', ellipseData.semiMinorAxis, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipse, 'height', ellipseData.height, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipse, 'extrudedHeight', ellipseData.extrudedHeight, interval, sourceUri, entityCollection);
        processPacketData(Rotation, ellipse, 'rotation', ellipseData.rotation, interval, sourceUri, entityCollection);
        processPacketData(Rotation, ellipse, 'stRotation', ellipseData.stRotation, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipse, 'granularity', ellipseData.granularity, interval, sourceUri, entityCollection);
        processPacketData(Boolean, ellipse, 'fill', ellipseData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(ellipse, 'material', ellipseData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, ellipse, 'outline', ellipseData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, ellipse, 'outlineColor', ellipseData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipse, 'outlineWidth', ellipseData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipse, 'numberOfVerticalLines', ellipseData.numberOfVerticalLines, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, ellipse, 'shadows', ellipseData.shadows, interval, sourceUri, entityCollection);
    }

    function processEllipsoid(entity, packet, entityCollection, sourceUri) {
        var ellipsoidData = packet.ellipsoid;
        if (!defined(ellipsoidData)) {
            return;
        }

        var interval;
        var intervalString = ellipsoidData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var ellipsoid = entity.ellipsoid;
        if (!defined(ellipsoid)) {
            entity.ellipsoid = ellipsoid = new EllipsoidGraphics();
        }

        processPacketData(Boolean, ellipsoid, 'show', ellipsoidData.show, interval, sourceUri, entityCollection);
        processPacketData(Cartesian3, ellipsoid, 'radii', ellipsoidData.radii, interval, sourceUri, entityCollection);
        processPacketData(Boolean, ellipsoid, 'fill', ellipsoidData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(ellipsoid, 'material', ellipsoidData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, ellipsoid, 'outline', ellipsoidData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, ellipsoid, 'outlineColor', ellipsoidData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipsoid, 'outlineWidth', ellipsoidData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipsoid, 'stackPartitions', ellipsoidData.stackPartitions, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipsoid, 'slicePartitions', ellipsoidData.slicePartitions, interval, sourceUri, entityCollection);
        processPacketData(Number, ellipsoid, 'subdivisions', ellipsoidData.subdivisions, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, ellipsoid, 'shadows', ellipsoidData.shadows, interval, sourceUri, entityCollection);
    }

    function processLabel(entity, packet, entityCollection, sourceUri) {
        var labelData = packet.label;
        if (!defined(labelData)) {
            return;
        }

        var interval;
        var intervalString = labelData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var label = entity.label;
        if (!defined(label)) {
            entity.label = label = new LabelGraphics();
        }

        processPacketData(Boolean, label, 'show', labelData.show, interval, sourceUri, entityCollection);
        processPacketData(String, label, 'text', labelData.text, interval, sourceUri, entityCollection);
        processPacketData(String, label, 'font', labelData.font, interval, sourceUri, entityCollection);
        processPacketData(LabelStyle, label, 'style', labelData.style, interval, sourceUri, entityCollection);
        processPacketData(Number, label, 'scale', labelData.scale, interval, sourceUri, entityCollection);
        processPacketData(Boolean, label, 'showBackground', labelData.showBackground, interval, sourceUri, entityCollection);
        processPacketData(Color, label, 'backgroundColor', labelData.backgroundColor, interval, sourceUri, entityCollection);
        processPacketData(Cartesian2, label, 'backgroundPadding', labelData.backgroundPadding, interval, sourceUri, entityCollection);
        processPacketData(Cartesian2, label, 'pixelOffset', labelData.pixelOffset, interval, sourceUri, entityCollection);
        processPacketData(Cartesian3, label, 'eyeOffset', labelData.eyeOffset, interval, sourceUri, entityCollection);
        processPacketData(HorizontalOrigin, label, 'horizontalOrigin', labelData.horizontalOrigin, interval, sourceUri, entityCollection);
        processPacketData(VerticalOrigin, label, 'verticalOrigin', labelData.verticalOrigin, interval, sourceUri, entityCollection);
        processPacketData(HeightReference, label, 'heightReference', labelData.heightReference, interval, sourceUri, entityCollection);
        processPacketData(Color, label, 'fillColor', labelData.fillColor, interval, sourceUri, entityCollection);
        processPacketData(Color, label, 'outlineColor', labelData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, label, 'outlineWidth', labelData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(NearFarScalar, label, 'translucencyByDistance', labelData.translucencyByDistance, interval, sourceUri, entityCollection);
        processPacketData(NearFarScalar, label, 'pixelOffsetScaleByDistance', labelData.pixelOffsetScaleByDistance, interval, sourceUri, entityCollection);
    }

    function processModel(entity, packet, entityCollection, sourceUri) {
        var modelData = packet.model;
        if (!defined(modelData)) {
            return;
        }

        var interval;
        var intervalString = modelData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var model = entity.model;
        if (!defined(model)) {
            entity.model = model = new ModelGraphics();
        }

        processPacketData(Boolean, model, 'show', modelData.show, interval, sourceUri, entityCollection);
        processPacketData(Uri, model, 'uri', modelData.gltf, interval, sourceUri, entityCollection);
        processPacketData(Number, model, 'scale', modelData.scale, interval, sourceUri, entityCollection);
        processPacketData(Number, model, 'minimumPixelSize', modelData.minimumPixelSize, interval, sourceUri, entityCollection);
        processPacketData(Number, model, 'maximumScale', modelData.maximumScale, interval, sourceUri, entityCollection);
        processPacketData(Boolean, model, 'incrementallyLoadTextures', modelData.incrementallyLoadTextures, interval, sourceUri, entityCollection);
        processPacketData(Boolean, model, 'runAnimations', modelData.runAnimations, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, model, 'shadows', modelData.shadows, interval, sourceUri, entityCollection);
        processPacketData(HeightReference, model, 'heightReference', modelData.heightReference, interval, sourceUri, entityCollection);
        processPacketData(Color, model, 'silhouetteColor', modelData.silhouetteColor, interval, sourceUri, entityCollection);
        processPacketData(Number, model, 'silhouetteSize', modelData.silhouetteSize, interval, sourceUri, entityCollection);
        processPacketData(Color, model, 'color', modelData.color, interval, sourceUri, entityCollection);
        processPacketData(ColorBlendMode, model, 'colorBlendMode', modelData.colorBlendMode, interval, sourceUri, entityCollection);
        processPacketData(Number, model, 'colorBlendAmount', modelData.colorBlendAmount, interval, sourceUri, entityCollection);

        var nodeTransformationsData = modelData.nodeTransformations;
        if (defined(nodeTransformationsData)) {
            if (isArray(nodeTransformationsData)) {
                for (var i = 0, len = nodeTransformationsData.length; i < len; i++) {
                    processNodeTransformations(model, nodeTransformationsData[i], interval, sourceUri, entityCollection);
                }
            } else {
                processNodeTransformations(model, nodeTransformationsData, interval, sourceUri, entityCollection);
            }
        }
    }

    function processNodeTransformations(model, nodeTransformationsData, constrainedInterval, sourceUri, entityCollection) {
        var combinedInterval;
        var packetInterval = nodeTransformationsData.interval;
        if (defined(packetInterval)) {
            iso8601Scratch.iso8601 = packetInterval;
            combinedInterval = TimeInterval.fromIso8601(iso8601Scratch);
            if (defined(constrainedInterval)) {
                combinedInterval = TimeInterval.intersect(combinedInterval, constrainedInterval, scratchTimeInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        var nodeTransformations = model.nodeTransformations;
        var nodeNames = Object.keys(nodeTransformationsData);
        for (var i = 0, len = nodeNames.length; i < len; ++i) {
            var nodeName = nodeNames[i];

            if (nodeName === 'interval') {
                continue;
            }

            var nodeTransformationData = nodeTransformationsData[nodeName];

            if (!defined(nodeTransformationData)) {
                continue;
            }

            if (!defined(nodeTransformations)) {
                model.nodeTransformations = nodeTransformations = new PropertyBag();
            }

            if (!nodeTransformations.hasProperty(nodeName)) {
                nodeTransformations.addProperty(nodeName);
            }

            var nodeTransformation = nodeTransformations[nodeName];
            if (!defined(nodeTransformation)) {
                nodeTransformations[nodeName] = nodeTransformation = new NodeTransformationProperty();
            }

            processPacketData(Cartesian3, nodeTransformation, 'translation', nodeTransformationData.translation, combinedInterval, sourceUri, entityCollection);
            processPacketData(Quaternion, nodeTransformation, 'rotation', nodeTransformationData.rotation, combinedInterval, sourceUri, entityCollection);
            processPacketData(Cartesian3, nodeTransformation, 'scale', nodeTransformationData.scale, combinedInterval, sourceUri, entityCollection);
        }
    }

    function processPath(entity, packet, entityCollection, sourceUri) {
        var pathData = packet.path;
        if (!defined(pathData)) {
            return;
        }

        var interval;
        var intervalString = pathData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var path = entity.path;
        if (!defined(path)) {
            entity.path = path = new PathGraphics();
        }

        processPacketData(Boolean, path, 'show', pathData.show, interval, sourceUri, entityCollection);
        processPacketData(Number, path, 'width', pathData.width, interval, sourceUri, entityCollection);
        processPacketData(Number, path, 'resolution', pathData.resolution, interval, sourceUri, entityCollection);
        processPacketData(Number, path, 'leadTime', pathData.leadTime, interval, sourceUri, entityCollection);
        processPacketData(Number, path, 'trailTime', pathData.trailTime, interval, sourceUri, entityCollection);
        processMaterialPacketData(path, 'material', pathData.material, interval, sourceUri, entityCollection);
    }

    function processPoint(entity, packet, entityCollection, sourceUri) {
        var pointData = packet.point;
        if (!defined(pointData)) {
            return;
        }

        var interval;
        var intervalString = pointData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var point = entity.point;
        if (!defined(point)) {
            entity.point = point = new PointGraphics();
        }

        processPacketData(Boolean, point, 'show', pointData.show, interval, sourceUri, entityCollection);
        processPacketData(Number, point, 'pixelSize', pointData.pixelSize, interval, sourceUri, entityCollection);
        processPacketData(HeightReference, point, 'heightReference', pointData.heightReference, interval, sourceUri, entityCollection);
        processPacketData(Color, point, 'color', pointData.color, interval, sourceUri, entityCollection);
        processPacketData(Color, point, 'outlineColor', pointData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, point, 'outlineWidth', pointData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(NearFarScalar, point, 'scaleByDistance', pointData.scaleByDistance, interval, sourceUri, entityCollection);
        processPacketData(NearFarScalar, point, 'translucencyByDistance', pointData.translucencyByDistance, interval, sourceUri, entityCollection);
    }

    function processPolygon(entity, packet, entityCollection, sourceUri) {
        var polygonData = packet.polygon;
        if (!defined(polygonData)) {
            return;
        }

        var interval;
        var intervalString = polygonData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var polygon = entity.polygon;
        if (!defined(polygon)) {
            entity.polygon = polygon = new PolygonGraphics();
        }

        processPacketData(Boolean, polygon, 'show', polygonData.show, interval, sourceUri, entityCollection);
        processPositions(polygon, 'hierarchy', polygonData.positions, entityCollection);
        processPacketData(Number, polygon, 'height', polygonData.height, interval, sourceUri, entityCollection);
        processPacketData(Number, polygon, 'extrudedHeight', polygonData.extrudedHeight, interval, sourceUri, entityCollection);
        processPacketData(Rotation, polygon, 'stRotation', polygonData.stRotation, interval, sourceUri, entityCollection);
        processPacketData(Number, polygon, 'granularity', polygonData.granularity, interval, sourceUri, entityCollection);
        processPacketData(Boolean, polygon, 'fill', polygonData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(polygon, 'material', polygonData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, polygon, 'outline', polygonData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, polygon, 'outlineColor', polygonData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, polygon, 'outlineWidth', polygonData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(Boolean, polygon, 'perPositionHeight', polygonData.perPositionHeight, interval, sourceUri, entityCollection);
        processPacketData(Boolean, polygon, 'closeTop', polygonData.closeTop, interval, sourceUri, entityCollection);
        processPacketData(Boolean, polygon, 'closeBottom', polygonData.closeBottom, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, polygon, 'shadows', polygonData.shadows, interval, sourceUri, entityCollection);
    }

    function processPolyline(entity, packet, entityCollection, sourceUri) {
        var polylineData = packet.polyline;
        if (!defined(polylineData)) {
            return;
        }

        var interval;
        var intervalString = polylineData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var polyline = entity.polyline;
        if (!defined(polyline)) {
            entity.polyline = polyline = new PolylineGraphics();
        }

        processPacketData(Boolean, polyline, 'show', polylineData.show, interval, sourceUri, entityCollection);
        processPositions(polyline, 'positions', polylineData.positions, entityCollection);
        processPacketData(Number, polyline, 'width', polylineData.width, interval, sourceUri, entityCollection);
        processPacketData(Number, polyline, 'granularity', polylineData.granularity, interval, sourceUri, entityCollection);
        processMaterialPacketData(polyline, 'material', polylineData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, polyline, 'followSurface', polylineData.followSurface, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, polyline, 'shadows', polylineData.shadows, interval, sourceUri, entityCollection);
    }

    function processRectangle(entity, packet, entityCollection, sourceUri) {
        var rectangleData = packet.rectangle;
        if (!defined(rectangleData)) {
            return;
        }

        var interval;
        var intervalString = rectangleData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var rectangle = entity.rectangle;
        if (!defined(rectangle)) {
            entity.rectangle = rectangle = new RectangleGraphics();
        }

        processPacketData(Boolean, rectangle, 'show', rectangleData.show, interval, sourceUri, entityCollection);
        processPacketData(Rectangle, rectangle, 'coordinates', rectangleData.coordinates, interval, sourceUri, entityCollection);
        processPacketData(Number, rectangle, 'height', rectangleData.height, interval, sourceUri, entityCollection);
        processPacketData(Number, rectangle, 'extrudedHeight', rectangleData.extrudedHeight, interval, sourceUri, entityCollection);
        processPacketData(Rotation, rectangle, 'rotation', rectangleData.rotation, interval, sourceUri, entityCollection);
        processPacketData(Rotation, rectangle, 'stRotation', rectangleData.stRotation, interval, sourceUri, entityCollection);
        processPacketData(Number, rectangle, 'granularity', rectangleData.granularity, interval, sourceUri, entityCollection);
        processPacketData(Boolean, rectangle, 'fill', rectangleData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(rectangle, 'material', rectangleData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, rectangle, 'outline', rectangleData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, rectangle, 'outlineColor', rectangleData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, rectangle, 'outlineWidth', rectangleData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(Boolean, rectangle, 'closeTop', rectangleData.closeTop, interval, sourceUri, entityCollection);
        processPacketData(Boolean, rectangle, 'closeBottom', rectangleData.closeBottom, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, rectangle, 'shadows', rectangleData.shadows, interval, sourceUri, entityCollection);
    }

    function processWall(entity, packet, entityCollection, sourceUri) {
        var wallData = packet.wall;
        if (!defined(wallData)) {
            return;
        }

        var interval;
        var intervalString = wallData.interval;
        if (defined(intervalString)) {
            iso8601Scratch.iso8601 = intervalString;
            interval = TimeInterval.fromIso8601(iso8601Scratch);
        }

        var wall = entity.wall;
        if (!defined(wall)) {
            entity.wall = wall = new WallGraphics();
        }

        processPacketData(Boolean, wall, 'show', wallData.show, interval, sourceUri, entityCollection);
        processPositions(wall, 'positions', wallData.positions, entityCollection);
        processArray(wall, 'minimumHeights', wallData.minimumHeights, entityCollection);
        processArray(wall, 'maximumHeights', wallData.maximumHeights, entityCollection);
        processPacketData(Number, wall, 'granularity', wallData.granularity, interval, sourceUri, entityCollection);
        processPacketData(Boolean, wall, 'fill', wallData.fill, interval, sourceUri, entityCollection);
        processMaterialPacketData(wall, 'material', wallData.material, interval, sourceUri, entityCollection);
        processPacketData(Boolean, wall, 'outline', wallData.outline, interval, sourceUri, entityCollection);
        processPacketData(Color, wall, 'outlineColor', wallData.outlineColor, interval, sourceUri, entityCollection);
        processPacketData(Number, wall, 'outlineWidth', wallData.outlineWidth, interval, sourceUri, entityCollection);
        processPacketData(ShadowMode, wall, 'shadows', wallData.shadows, interval, sourceUri, entityCollection);
    }

    function processCzmlPacket(packet, entityCollection, updaterFunctions, sourceUri, dataSource) {
        var objectId = packet.id;
        if (!defined(objectId)) {
            objectId = createGuid();
        }

        currentId = objectId;

        if (!defined(dataSource._version) && objectId !== 'document') {
            throw new RuntimeError('The first CZML packet is required to be the document object.');
        }

        if (packet['delete'] === true) {
            entityCollection.removeById(objectId);
        } else if (objectId === 'document') {
            processDocument(packet, dataSource);
        } else {
            var entity = entityCollection.getOrCreateEntity(objectId);

            var parentId = packet.parent;
            if (defined(parentId)) {
                entity.parent = entityCollection.getOrCreateEntity(parentId);
            }

            for (var i = updaterFunctions.length - 1; i > -1; i--) {
                updaterFunctions[i](entity, packet, entityCollection, sourceUri);
            }
        }

        currentId = undefined;
    }

    function updateClock(dataSource) {
        var clock;
        var clockPacket = dataSource._documentPacket.clock;
        if (!defined(clockPacket)) {
            if (!defined(dataSource._clock)) {
                var availability = dataSource._entityCollection.computeAvailability();
                if (!availability.start.equals(Iso8601.MINIMUM_VALUE)) {
                    var startTime = availability.start;
                    var stopTime = availability.stop;
                    var totalSeconds = JulianDate.secondsDifference(stopTime, startTime);
                    var multiplier = Math.round(totalSeconds / 120.0);

                    clock = new DataSourceClock();
                    clock.startTime = JulianDate.clone(startTime);
                    clock.stopTime = JulianDate.clone(stopTime);
                    clock.clockRange = ClockRange.LOOP_STOP;
                    clock.multiplier = multiplier;
                    clock.currentTime = JulianDate.clone(startTime);
                    clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
                    dataSource._clock = clock;
                    return true;
                }
            }
            return false;
        }

        if (defined(dataSource._clock)) {
            clock = dataSource._clock.clone();
        } else {
            clock = new DataSourceClock();
            clock.startTime = Iso8601.MINIMUM_VALUE.clone();
            clock.stopTime = Iso8601.MAXIMUM_VALUE.clone();
            clock.currentTime = Iso8601.MINIMUM_VALUE.clone();
            clock.clockRange = ClockRange.LOOP_STOP;
            clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            clock.multiplier = 1.0;
        }
        if (defined(clockPacket.interval)) {
            iso8601Scratch.iso8601 = clockPacket.interval;
            var interval = TimeInterval.fromIso8601(iso8601Scratch);
            clock.startTime = interval.start;
            clock.stopTime = interval.stop;
        }
        if (defined(clockPacket.currentTime)) {
            clock.currentTime = JulianDate.fromIso8601(clockPacket.currentTime);
        }
        if (defined(clockPacket.range)) {
            clock.clockRange = defaultValue(ClockRange[clockPacket.range], ClockRange.LOOP_STOP);
        }
        if (defined(clockPacket.step)) {
            clock.clockStep = defaultValue(ClockStep[clockPacket.step], ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        }
        if (defined(clockPacket.multiplier)) {
            clock.multiplier = clockPacket.multiplier;
        }

        if (!clock.equals(dataSource._clock)) {
            dataSource._clock = clock.clone(dataSource._clock);
            return true;
        }

        return false;
    }

    function load(dataSource, czml, options, clear) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(czml)) {
            throw new DeveloperError('czml is required.');
        }
        //>>includeEnd('debug');

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var promise = czml;
        var sourceUri = options.sourceUri;
        if (typeof czml === 'string') {
            promise = loadJson(czml);
            sourceUri = defaultValue(sourceUri, czml);
        }

        DataSource.setLoading(dataSource, true);

        return when(promise, function(czml) {
            return loadCzml(dataSource, czml, sourceUri, clear);
        }).otherwise(function(error) {
            DataSource.setLoading(dataSource, false);
            dataSource._error.raiseEvent(dataSource, error);
            console.log(error);
            return when.reject(error);
        });
    }

    function loadCzml(dataSource, czml, sourceUri, clear) {
        DataSource.setLoading(dataSource, true);
        var entityCollection = dataSource._entityCollection;

        if (clear) {
            dataSource._version = undefined;
            dataSource._documentPacket = new DocumentPacket();
            entityCollection.removeAll();
        }

        CzmlDataSource._processCzml(czml, entityCollection, sourceUri, undefined, dataSource);

        var raiseChangedEvent = updateClock(dataSource);

        var documentPacket = dataSource._documentPacket;
        if (defined(documentPacket.name) && dataSource._name !== documentPacket.name) {
            dataSource._name = documentPacket.name;
            raiseChangedEvent = true;
        } else if (!defined(dataSource._name) && defined(sourceUri)) {
            dataSource._name = getFilenameFromUri(sourceUri);
            raiseChangedEvent = true;
        }

        DataSource.setLoading(dataSource, false);
        if (raiseChangedEvent) {
            dataSource._changed.raiseEvent(dataSource);
        }

        return dataSource;
    }

    function DocumentPacket() {
        this.name = undefined;
        this.clock = undefined;
    }

    /**
     * A {@link DataSource} which processes {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-Guide|CZML}.
     * @alias CzmlDataSource
     * @constructor
     *
     * @param {String} [name] An optional name for the data source.  This value will be overwritten if a loaded document contains a name.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=CZML.html|Cesium Sandcastle CZML Demo}
     */
    function CzmlDataSource(name) {
        this._name = name;
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._clock = undefined;
        this._documentPacket = new DocumentPacket();
        this._version = undefined;
        this._entityCollection = new EntityCollection(this);
        this._entityCluster = new EntityCluster();
    }

    /**
     * Creates a Promise to a new instance loaded with the provided CZML data.
     *
     * @param {String|Object} czml A url or CZML object to be processed.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.sourceUri] Overrides the url to use for resolving relative links.
     * @returns {Promise.<CzmlDataSource>} A promise that resolves to the new instance once the data is processed.
     */
    CzmlDataSource.load = function(czml, options) {
        return new CzmlDataSource().load(czml, options);
    };

    defineProperties(CzmlDataSource.prototype, {
        /**
         * Gets a human-readable name for this instance.
         * @memberof CzmlDataSource.prototype
         * @type {String}
         */
        name : {
            get : function() {
                return this._name;
            }
        },
        /**
         * Gets the clock settings defined by the loaded CZML.  If no clock is explicitly
         * defined in the CZML, the combined availability of all objects is returned.  If
         * only static data exists, this value is undefined.
         * @memberof CzmlDataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            get : function() {
                return this._clock;
            }
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof CzmlDataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof CzmlDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof CzmlDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof CzmlDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof CzmlDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
            }
        },
        /**
         * Gets whether or not this data source should be displayed.
         * @memberof CzmlDataSource.prototype
         * @type {Boolean}
         */
        show : {
            get : function() {
                return this._entityCollection.show;
            },
            set : function(value) {
                this._entityCollection.show = value;
            }
        },

        /**
         * Gets or sets the clustering options for this data source. This object can be shared between multiple data sources.
         *
         * @memberof CzmlDataSource.prototype
         * @type {EntityCluster}
         */
        clustering : {
            get : function() {
                return this._entityCluster;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value must be defined.');
                }
                //>>includeEnd('debug');
                this._entityCluster = value;
            }
        }
    });

    /**
     * Gets the array of CZML processing functions.
     * @memberof CzmlDataSource
     * @type Array
     */
    CzmlDataSource.updaters = [
        processBillboard, //
        processBox, //
        processCorridor, //
        processCylinder, //
        processEllipse, //
        processEllipsoid, //
        processLabel, //
        processModel, //
        processName, //
        processDescription, //
        processPath, //
        processPoint, //
        processPolygon, //
        processPolyline, //
        processProperties, //
        processRectangle, //
        processPosition, //
        processViewFrom, //
        processWall, //
        processOrientation, //
        processAvailability];

    /**
     * Processes the provided url or CZML object without clearing any existing data.
     *
     * @param {String|Object} czml A url or CZML object to be processed.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.sourceUri] Overrides the url to use for resolving relative links.
     * @returns {Promise.<CzmlDataSource>} A promise that resolves to this instances once the data is processed.
     */
    CzmlDataSource.prototype.process = function(czml, options) {
        return load(this, czml, options, false);
    };

    /**
     * Loads the provided url or CZML object, replacing any existing data.
     *
     * @param {String|Object} czml A url or CZML object to be processed.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.sourceUri] Overrides the url to use for resolving relative links.
     * @returns {Promise.<CzmlDataSource>} A promise that resolves to this instances once the data is processed.
     */
    CzmlDataSource.prototype.load = function(czml, options) {
        return load(this, czml, options, true);
    };

    /**
     * A helper function used by custom CZML updater functions
     * which creates or updates a {@link Property} from a CZML packet.
     * @function
     *
     * @param {Function} type The constructor function for the property being processed.
     * @param {Object} object The object on which the property will be added or updated.
     * @param {String} propertyName The name of the property on the object.
     * @param {Object} packetData The CZML packet being processed.
     * @param {TimeInterval} interval A constraining interval for which the data is valid.
     * @param {String} sourceUri The originating uri of the data being processed.
     * @param {EntityCollection} entityCollection The collection being processsed.
     */
    CzmlDataSource.processPacketData = processPacketData;

    /**
     * A helper function used by custom CZML updater functions
     * which creates or updates a {@link PositionProperty} from a CZML packet.
     * @function
     *
     * @param {Object} object The object on which the property will be added or updated.
     * @param {String} propertyName The name of the property on the object.
     * @param {Object} packetData The CZML packet being processed.
     * @param {TimeInterval} interval A constraining interval for which the data is valid.
     * @param {String} sourceUri The originating uri of the data being processed.
     * @param {EntityCollection} entityCollection The collection being processsed.
     */
    CzmlDataSource.processPositionPacketData = processPositionPacketData;

    /**
     * A helper function used by custom CZML updater functions
     * which creates or updates a {@link MaterialProperty} from a CZML packet.
     * @function
     *
     * @param {Object} object The object on which the property will be added or updated.
     * @param {String} propertyName The name of the property on the object.
     * @param {Object} packetData The CZML packet being processed.
     * @param {TimeInterval} interval A constraining interval for which the data is valid.
     * @param {String} sourceUri The originating uri of the data being processed.
     * @param {EntityCollection} entityCollection The collection being processsed.
     */
    CzmlDataSource.processMaterialPacketData = processMaterialPacketData;

    CzmlDataSource._processCzml = function(czml, entityCollection, sourceUri, updaterFunctions, dataSource) {
        updaterFunctions = defined(updaterFunctions) ? updaterFunctions : CzmlDataSource.updaters;

        if (isArray(czml)) {
            for (var i = 0, len = czml.length; i < len; i++) {
                processCzmlPacket(czml[i], entityCollection, updaterFunctions, sourceUri, dataSource);
            }
        } else {
            processCzmlPacket(czml, entityCollection, updaterFunctions, sourceUri, dataSource);
        }
    };

    return CzmlDataSource;
});
