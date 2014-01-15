/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/HermitePolynomialApproximation',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/LagrangePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/loadJson',
        '../Core/Math',
        '../Core/Quaternion',
        '../Core/ReferenceFrame',
        '../Core/RuntimeError',
        '../Core/Spherical',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        './CompositeMaterialProperty',
        './CompositePositionProperty',
        './CompositeProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './DynamicBillboard',
        './DynamicClock',
        './ColorMaterialProperty',
        './PolylineOutlineMaterialProperty',
        './DynamicCone',
        './DynamicLabel',
        './DynamicDirectionsProperty',
        './DynamicEllipse',
        './DynamicEllipsoid',
        './GridMaterialProperty',
        './ImageMaterialProperty',
        './DynamicObject',
        './DynamicObjectCollection',
        './DynamicPath',
        './DynamicPoint',
        './DynamicPolyline',
        './DynamicPolygon',
        './DynamicPyramid',
        './DynamicVector',
        './DynamicVertexPositionsProperty',
        './SampledPositionProperty',
        './SampledProperty',
        './TimeIntervalCollectionPositionProperty',
        './TimeIntervalCollectionProperty',
        '../ThirdParty/Uri',
        '../ThirdParty/when'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        Color,
        ClockRange,
        ClockStep,
        createGuid,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        Event,
        getFilenameFromUri,
        HermitePolynomialApproximation,
        Iso8601,
        JulianDate,
        LagrangePolynomialApproximation,
        LinearApproximation,
        loadJson,
        CesiumMath,
        Quaternion,
        ReferenceFrame,
        RuntimeError,
        Spherical,
        TimeInterval,
        TimeIntervalCollection,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin,
        CompositeMaterialProperty,
        CompositePositionProperty,
        CompositeProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicBillboard,
        DynamicClock,
        ColorMaterialProperty,
        PolylineOutlineMaterialProperty,
        DynamicCone,
        DynamicLabel,
        DynamicDirectionsProperty,
        DynamicEllipse,
        DynamicEllipsoid,
        GridMaterialProperty,
        ImageMaterialProperty,
        DynamicObject,
        DynamicObjectCollection,
        DynamicPath,
        DynamicPoint,
        DynamicPolyline,
        DynamicPolygon,
        DynamicPyramid,
        DynamicVector,
        DynamicVertexPositionsProperty,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionPositionProperty,
        TimeIntervalCollectionProperty,
        Uri,
        when) {
    "use strict";

    var scratchCartesian = new Cartesian3();
    var scratchSpherical = new Spherical();
    var scratchCartographic = new Cartographic();

    function unwrapColorInterval(czmlInterval) {
        var rgbaf = czmlInterval.rgbaf;
        if (defined(rgbaf)) {
            return rgbaf;
        }

        var rgba = czmlInterval.rgba;
        if (!defined(rgba)) {
            return undefined;
        }

        if (rgba.length === Color.length) {
            return [Color.byteToFloat(rgba[0]), Color.byteToFloat(rgba[1]), Color.byteToFloat(rgba[2]), Color.byteToFloat(rgba[3])];
        }

        var len = rgba.length;
        rgbaf = new Array(len);
        for ( var i = 0; i < len; i += 5) {
            rgbaf[i] = rgba[i];
            rgbaf[i + 1] = Color.byteToFloat(rgba[i + 1]);
            rgbaf[i + 2] = Color.byteToFloat(rgba[i + 2]);
            rgbaf[i + 3] = Color.byteToFloat(rgba[i + 3]);
            rgbaf[i + 4] = Color.byteToFloat(rgba[i + 4]);
        }
        return rgbaf;
    }

    function unwrapImageInterval(czmlInterval, sourceUri) {
        var result = defaultValue(czmlInterval.image, czmlInterval);
        if (defined(sourceUri)) {
            var baseUri = new Uri(document.location.href);
            sourceUri = new Uri(sourceUri);
            result = new Uri(result).resolve(sourceUri.resolve(baseUri)).toString();
        }
        return result;
    }

    function unwrapCartesianInterval(czmlInterval) {
        if (defined(czmlInterval.cartesian)) {
            return czmlInterval.cartesian;
        }

        if (defined(czmlInterval.unitCartesian)) {
            return czmlInterval.unitCartesian;
        }

        var i;
        var len;
        var result;

        var unitSpherical = czmlInterval.unitSpherical;
        if (defined(unitSpherical)) {
            len = unitSpherical.length;
            if (len === 2) {
                scratchSpherical.clock = unitSpherical[0];
                scratchSpherical.cone = unitSpherical[1];
                Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);
                result = [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
            } else {
                var sphericalIt = 0;
                result = new Array((len / 3) * 4);
                for (i = 0; i < len; i += 4) {
                    result[i] = unitSpherical[sphericalIt++];

                    scratchSpherical.clock = unitSpherical[sphericalIt++];
                    scratchSpherical.cone = unitSpherical[sphericalIt++];
                    Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);

                    result[i + 1] = scratchCartesian.x;
                    result[i + 2] = scratchCartesian.y;
                    result[i + 3] = scratchCartesian.z;
                }
            }
            return result;
        }

        var cartographic = czmlInterval.cartographicRadians;
        if (defined(cartographic)) {
            if (cartographic.length === 3) {
                scratchCartographic.longitude = cartographic[0];
                scratchCartographic.latitude = cartographic[1];
                scratchCartographic.height = cartographic[2];
                Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);
                result = [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
            } else {
                len = cartographic.length;
                result = new Array(len);
                for (i = 0; i < len; i += 4) {
                    scratchCartographic.longitude = cartographic[i + 1];
                    scratchCartographic.latitude = cartographic[i + 2];
                    scratchCartographic.height = cartographic[i + 3];
                    Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);

                    result[i] = cartographic[i];
                    result[i + 1] = scratchCartesian.x;
                    result[i + 2] = scratchCartesian.y;
                    result[i + 3] = scratchCartesian.z;
                }
            }
            return result;
        }

        var cartographicDegrees = czmlInterval.cartographicDegrees;
        if (!defined(cartographicDegrees)) {
            throw new RuntimeError(JSON.stringify(czmlInterval) + ' is not a valid CZML interval.');
        }

        if (cartographicDegrees.length === 3) {
            scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[0]);
            scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[1]);
            scratchCartographic.height = cartographicDegrees[2];
            Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);
            result = [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
        } else {
            len = cartographicDegrees.length;
            result = new Array(len);
            for (i = 0; i < len; i += 4) {
                scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[i + 1]);
                scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[i + 2]);
                scratchCartographic.height = cartographicDegrees[i + 3];
                Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, scratchCartesian);

                result[i] = cartographicDegrees[i];
                result[i + 1] = scratchCartesian.x;
                result[i + 2] = scratchCartesian.y;
                result[i + 3] = scratchCartesian.z;
            }
        }

        return result;
    }

    function unwrapInterval(type, czmlInterval, sourceUri) {
        /*jshint sub:true*/
        switch (type) {
        case Boolean:
            return defaultValue(czmlInterval['boolean'], czmlInterval);
        case Cartesian2:
            return czmlInterval.cartesian2;
        case Cartesian3:
            return unwrapCartesianInterval(czmlInterval);
        case Color:
            return unwrapColorInterval(czmlInterval);
        case HorizontalOrigin:
            return HorizontalOrigin[defaultValue(czmlInterval.horizontalOrigin, czmlInterval)];
        case Image:
            return unwrapImageInterval(czmlInterval, sourceUri);
        case JulianDate:
            return JulianDate.fromIso8601(defaultValue(czmlInterval.date, czmlInterval));
        case LabelStyle:
            return LabelStyle[defaultValue(czmlInterval.labelStyle, czmlInterval)];
        case Number:
            return defaultValue(czmlInterval.number, czmlInterval);
        case String:
            return defaultValue(czmlInterval.string, czmlInterval);
        case Array:
            return czmlInterval.array;
        case Quaternion:
            //TODO: Currently Quaternion convention in CZML is the opposite of what Cesium expects.
            //To avoid unecessary CZML churn, we conjugate manually for now.  During the next big CZML
            //update, we should remove this code and change the convention.
            var unitQuaternion = czmlInterval.unitQuaternion;
            if (defined(unitQuaternion)) {
                if (unitQuaternion.length === 4) {
                    return [-unitQuaternion[0], -unitQuaternion[1], -unitQuaternion[2], unitQuaternion[3]];
                }

                unitQuaternion = unitQuaternion.slice(0);
                for (var i = 0; i < unitQuaternion.length; i += 5) {
                    unitQuaternion[i + 1] = -unitQuaternion[i + 1];
                    unitQuaternion[i + 2] = -unitQuaternion[i + 2];
                    unitQuaternion[i + 3] = -unitQuaternion[i + 3];
                }
            }
            return unitQuaternion;
        case VerticalOrigin:
            return VerticalOrigin[defaultValue(czmlInterval.verticalOrigin, czmlInterval)];
        default:
            throw new DeveloperError(type);
        }
    }

    var interpolators = {
        HERMITE : HermitePolynomialApproximation,
        LAGRANGE : LagrangePolynomialApproximation,
        LINEAR : LinearApproximation
    };

    function updateInterpolationSettings(packetData, property) {
        var interpolator = interpolators[packetData.interpolationAlgorithm];
        if (defined(interpolator)) {
            property.interpolationAlgorithm = interpolator;
        }
        if (defined(packetData.interpolationDegree)) {
            property.interpolationDegree = packetData.interpolationDegree;
        }
    }

    function processProperty(type, object, propertyName, packetData, constrainedInterval, sourceUri) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (defined(packetInterval)) {
            combinedInterval = TimeInterval.fromIso8601(packetInterval);
            if (defined(constrainedInterval)) {
                combinedInterval = combinedInterval.intersect(constrainedInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        var unwrappedInterval = unwrapInterval(type, packetData, sourceUri);
        var hasInterval = defined(combinedInterval) && !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);
        var packedLength = defaultValue(type.packedLength, 1);
        var unwrappedIntervalLength = defaultValue(unwrappedInterval.length, 1);
        var isSampled = !defined(packetData.array) && (typeof unwrappedInterval !== 'string') && unwrappedIntervalLength > packedLength;

        //Any time a constant value is assigned, it completely blows away anything else.
        if (!isSampled && !hasInterval) {
            if (defined(type.unpack)) {
                object[propertyName] = new ConstantProperty(type.unpack(unwrappedInterval, 0));
            } else {
                object[propertyName] = new ConstantProperty(unwrappedInterval);
            }
            return true;
        }

        var propertyCreated = false;
        var property = object[propertyName];

        //Without an interval, any sampled value is infinite, meaning it completely
        //replaces any non-sampled property that may exist.
        if (isSampled && !hasInterval) {
            if (!(property instanceof SampledProperty)) {
                property = new SampledProperty(type);
                object[propertyName] = property;
                propertyCreated = true;
            }
            var epoch;
            var packetEpoch = packetData.epoch;
            if (defined(packetEpoch)) {
                epoch = JulianDate.fromIso8601(packetEpoch);
            }
            property.addSamplesPackedArray(unwrappedInterval, epoch);
            updateInterpolationSettings(packetData, property);
            return propertyCreated;
        }

        var interval;

        //A constant value with an interval is normally part of a TimeIntervalCollection,
        //However, if the current property is not a time-interval collection, we need
        //to turn it into a Composite, preserving the old data with the new interval.
        if (!isSampled && hasInterval) {
            //Create a new interval for the constant value.
            combinedInterval = combinedInterval.clone();
            if (defined(type.unpack)) {
                combinedInterval.data = type.unpack(unwrappedInterval, 0);
            } else {
                combinedInterval.data = unwrappedInterval;
            }

            //If no property exists, simply use a new interval collection
            if (!defined(property)) {
                property = new TimeIntervalCollectionProperty();
                object[propertyName] = property;
                propertyCreated = true;
            }

            if (property instanceof TimeIntervalCollectionProperty) {
                //If we create a collection, or it already existed, use it.
                property.intervals.addInterval(combinedInterval);
            } else if (property instanceof CompositeProperty) {
                //If the collection was already a CompositeProperty, use it.
                combinedInterval.data = new ConstantProperty(combinedInterval.data);
                property.intervals.addInterval(combinedInterval);
            } else {
                //Otherwise, create a CompositeProperty but preserve the existing data.

                //Put the old property in an infinite interval.
                interval = Iso8601.MAXIMUM_INTERVAL.clone();
                interval.data = property;

                //Create the composite.
                propertyCreated = true;
                property = new CompositeProperty();
                object[propertyName] = property;

                //add the old property interval
                property.intervals.addInterval(interval);

                //Change the new data to a ConstantProperty and add it.
                combinedInterval.data = new ConstantProperty(combinedInterval.data);
                property.intervals.addInterval(combinedInterval);
            }

            return propertyCreated;
        }

        //isSampled && hasInterval
        if (!defined(property)) {
            propertyCreated = true;
            property = new CompositeProperty();
            object[propertyName] = property;
        }

        //create a CompositeProperty but preserve the existing data.
        if (!(property instanceof CompositeProperty)) {
            //Put the old property in an infinite interval.
            interval = Iso8601.MAXIMUM_INTERVAL.clone();
            interval.data = property;

            //Create the composite.
            propertyCreated = true;
            property = new CompositeProperty();
            object[propertyName] = property;

            //add the old property interval
            property.intervals.addInterval(interval);
        }

        //Check if the interval already exists in the composite
        var intervals = property.intervals;
        interval = intervals.findInterval(combinedInterval.start, combinedInterval.stop, combinedInterval.isStartIncluded, combinedInterval.isStopIncluded);
        if (!defined(interval) || !(interval.data instanceof SampledProperty)) {
            //If not, create a SampledProperty for it.
            interval = combinedInterval.clone();
            interval.data = new SampledProperty(type);
            intervals.addInterval(interval);
        }
        interval.data.addSamplesPackedArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
        updateInterpolationSettings(packetData, interval.data);
        return propertyCreated;
    }

    function processPacketData(type, object, propertyName, packetData, interval, sourceUri) {
        if (!defined(packetData)) {
            return;
        }

        if (Array.isArray(packetData)) {
            for ( var i = 0, len = packetData.length; i < len; i++) {
                processProperty(type, object, propertyName, packetData[i], interval, sourceUri);
            }
        } else {
            processProperty(type, object, propertyName, packetData, interval, sourceUri);
        }
    }

    function processPositionProperty(object, propertyName, packetData, constrainedInterval, sourceUri) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (defined(packetInterval)) {
            combinedInterval = TimeInterval.fromIso8601(packetInterval);
            if (defined(constrainedInterval)) {
                combinedInterval = combinedInterval.intersect(constrainedInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        var referenceFrame = ReferenceFrame[defaultValue(packetData.referenceFrame, "FIXED")];
        var unwrappedInterval = unwrapCartesianInterval(packetData);
        var hasInterval = defined(combinedInterval) && !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);
        var packedLength = Cartesian3.packedLength;
        var unwrappedIntervalLength = defaultValue(unwrappedInterval.length, 1);
        var isSampled = (typeof unwrappedInterval !== 'string') && unwrappedIntervalLength > packedLength;

        //Any time a constant value is assigned, it completely blows away anything else.
        if (!isSampled && !hasInterval) {
            object[propertyName] = new ConstantPositionProperty(Cartesian3.unpack(unwrappedInterval), referenceFrame);
            return true;
        }

        var propertyCreated = false;
        var property = object[propertyName];

        //Without an interval, any sampled value is infinite, meaning it completely
        //replaces any non-sampled property that may exist.
        if (isSampled && !hasInterval) {
            if (!(property instanceof SampledPositionProperty) || property.referenceFrame !== referenceFrame) {
                property = new SampledPositionProperty(referenceFrame);
                object[propertyName] = property;
                propertyCreated = true;
            }
            var epoch;
            var packetEpoch = packetData.epoch;
            if (defined(packetEpoch)) {
                epoch = JulianDate.fromIso8601(packetEpoch);
            }
            property.addSamplesPackedArray(unwrappedInterval, epoch);
            updateInterpolationSettings(packetData, property);
            return propertyCreated;
        }

        var interval;

        //A constant value with an interval is normally part of a TimeIntervalCollection,
        //However, if the current property is not a time-interval collection, we need
        //to turn it into a Composite, preserving the old data with the new interval.
        if (!isSampled && hasInterval) {
            //Create a new interval for the constant value.
            combinedInterval = combinedInterval.clone();
            combinedInterval.data = Cartesian3.unpack(unwrappedInterval);

            //If no property exists, simply use a new interval collection
            if (!defined(property)) {
                property = new TimeIntervalCollectionPositionProperty(referenceFrame);
                object[propertyName] = property;
                propertyCreated = true;
            }

            if (property instanceof TimeIntervalCollectionPositionProperty && property.referenceFrame === referenceFrame) {
                //If we create a collection, or it already existed, use it.
                property.intervals.addInterval(combinedInterval);
            } else if (property instanceof CompositePositionProperty) {
                //If the collection was already a CompositePositionProperty, use it.
                combinedInterval.data = new ConstantPositionProperty(combinedInterval.data, referenceFrame);
                property.intervals.addInterval(combinedInterval);
            } else {
                //Otherwise, create a CompositePositionProperty but preserve the existing data.

                //Put the old property in an infinite interval.
                interval = Iso8601.MAXIMUM_INTERVAL.clone();
                interval.data = property;

                //Create the composite.
                propertyCreated = true;
                property = new CompositePositionProperty(property.referenceFrame);
                object[propertyName] = property;

                //add the old property interval
                property.intervals.addInterval(interval);

                //Change the new data to a ConstantPositionProperty and add it.
                combinedInterval.data = new ConstantPositionProperty(combinedInterval.data, referenceFrame);
                property.intervals.addInterval(combinedInterval);
            }

            return propertyCreated;
        }

        //isSampled && hasInterval
        if (!defined(property)) {
            propertyCreated = true;
            property = new CompositePositionProperty(referenceFrame);
            object[propertyName] = property;
        } else if (!(property instanceof CompositePositionProperty)) {
            //create a CompositeProperty but preserve the existing data.
            //Put the old property in an infinite interval.
            interval = Iso8601.MAXIMUM_INTERVAL.clone();
            interval.data = property;

            //Create the composite.
            propertyCreated = true;
            property = new CompositePositionProperty(property.referenceFrame);
            object[propertyName] = property;

            //add the old property interval
            property.intervals.addInterval(interval);
        }

        //Check if the interval already exists in the composite
        var intervals = property.intervals;
        interval = intervals.findInterval(combinedInterval.start, combinedInterval.stop, combinedInterval.isStartIncluded, combinedInterval.isStopIncluded);
        if (!defined(interval) || !(interval.data instanceof SampledPositionProperty) || interval.data.referenceFrame !== referenceFrame) {
            //If not, create a SampledPositionProperty for it.
            interval = combinedInterval.clone();
            interval.data = new SampledPositionProperty(referenceFrame);
            intervals.addInterval(interval);
        }
        interval.data.addSamplesPackedArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
        updateInterpolationSettings(packetData, interval.data);
        return propertyCreated;
    }

    function processPositionPacketData(object, propertyName, packetData, interval, sourceUri) {
        if (!defined(packetData)) {
            return;
        }

        if (Array.isArray(packetData)) {
            for ( var i = 0, len = packetData.length; i < len; i++) {
                processPositionProperty(object, propertyName, packetData[i], interval, sourceUri);
            }
        } else {
            processPositionProperty(object, propertyName, packetData, interval, sourceUri);
        }
    }

    var Cartesian2WrapperProperty = function() {
        this._x = new ConstantProperty(0);
        this._y = new ConstantProperty(0);
    };

    Cartesian2WrapperProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = new Cartesian2();
        }
        result.x = this._x.getValue(time);
        result.y = this._y.getValue(time);
        return result;
    };

    function combineIntoCartesian2(object, packetDataX, packetDataY) {
        if (!defined(packetDataX) && !defined(packetDataY)) {
            return object;
        }
        if (!(object instanceof Cartesian2WrapperProperty)) {
            object = new Cartesian2WrapperProperty();
        }
        processPacketData(Number, object, '_x', packetDataX);
        processPacketData(Number, object, '_y', packetDataY);
        return object;
    }

    function processMaterialProperty(object, propertyName, packetData, constrainedInterval, sourceUri) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (defined(packetInterval)) {
            combinedInterval = TimeInterval.fromIso8601(packetInterval);
            if (defined(constrainedInterval)) {
                combinedInterval = combinedInterval.intersect(constrainedInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        combinedInterval = defaultValue(combinedInterval, Iso8601.MAXIMUM_INTERVAL);

        var propertyCreated = false;
        var property = object[propertyName];
        if (!defined(property)) {
            property = new CompositeMaterialProperty();
            object[propertyName] = property;
            propertyCreated = true;
        }

        //See if we already have data at that interval.
        var thisIntervals = property.intervals;
        var existingInterval = thisIntervals.findInterval(combinedInterval.start, combinedInterval.stop);
        var existingMaterial;

        if (defined(existingInterval)) {
            //We have an interval, but we need to make sure the
            //new data is the same type of material as the old data.
            existingMaterial = existingInterval.data;
        } else {
            //If not, create it.
            existingInterval = combinedInterval.clone();
            thisIntervals.addInterval(existingInterval);
        }

        var materialData;
        if (defined(packetData.solidColor)) {
            if (!(existingMaterial instanceof ColorMaterialProperty)) {
                existingMaterial = new ColorMaterialProperty();
            }
            materialData = packetData.solidColor;
            processPacketData(Color, existingMaterial, 'color', materialData.color);
        } else if (defined(packetData.grid)) {
            if (!(existingMaterial instanceof GridMaterialProperty)) {
                existingMaterial = new GridMaterialProperty();
            }
            materialData = packetData.grid;
            processPacketData(Color, existingMaterial, 'color', materialData.color, undefined, sourceUri);
            processPacketData(Number, existingMaterial, 'cellAlpha', materialData.cellAlpha, undefined, sourceUri);
            existingMaterial.lineThickness = combineIntoCartesian2(existingMaterial.lineThickness, materialData.rowThickness, materialData.columnThickness);
            existingMaterial.lineCount = combineIntoCartesian2(existingMaterial.lineCount, materialData.rowCount, materialData.columnCount);
        } else if (defined(packetData.image)) {
            if (!(existingMaterial instanceof ImageMaterialProperty)) {
                existingMaterial = new ImageMaterialProperty();
            }
            materialData = packetData.image;
            processPacketData(Image, existingMaterial, 'image', materialData.image, undefined, sourceUri);
            existingMaterial.repeat = combineIntoCartesian2(existingMaterial.repeat, materialData.horizontalRepeat, materialData.verticalRepeat);
        }
        existingInterval.data = existingMaterial;

        return propertyCreated;
    }

    function processMaterialPacketData(object, propertyName, packetData, interval, sourceUri) {
        if (!defined(packetData)) {
            return;
        }

        if (Array.isArray(packetData)) {
            for ( var i = 0, len = packetData.length; i < len; i++) {
                processMaterialProperty(object, propertyName, packetData[i], interval, sourceUri);
            }
        } else {
            processMaterialProperty(object, propertyName, packetData, interval, sourceUri);
        }
    }

    function processName(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        dynamicObject.name = defaultValue(packet.name, dynamicObject.name);
    }

    function processPosition(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var positionData = packet.position;
        if (defined(positionData)) {
            processPositionPacketData(dynamicObject, 'position', positionData, undefined, sourceUri);
        }
    }

    function processViewFrom(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var viewFromData = packet.viewFrom;
        if (defined(viewFromData)) {
            processPacketData(Cartesian3, dynamicObject, 'viewFrom', viewFromData, undefined, sourceUri);
        }
    }

    function processOrientation(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var orientationData = packet.orientation;
        if (defined(orientationData)) {
            processPacketData(Quaternion, dynamicObject, 'orientation', orientationData, undefined, sourceUri);
        }
    }

    function processVertexPositions(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var vertexPositionsData = packet.vertexPositions;
        if (!defined(vertexPositionsData)) {
            return;
        }

        var vertexPositions = dynamicObject.vertexPositions;
        if (!defined(vertexPositions)) {
            dynamicObject.vertexPositions = vertexPositions = new DynamicVertexPositionsProperty();
        }
        vertexPositions.processCzmlIntervals(vertexPositionsData, undefined, dynamicObjectCollection);
    }

    function processAvailability(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var interval;
        var packetData = packet.availability;
        if (!defined(packetData)) {
            return;
        }

        var intervals;
        if (Array.isArray(packetData)) {
            var length = packetData.length;
            for (var i = 0; i < length; i++) {
                if (!defined(intervals)) {
                    intervals = new TimeIntervalCollection();
                }
                interval = TimeInterval.fromIso8601(packetData[i]);
                intervals.addInterval(interval);
            }
        } else {
            interval = TimeInterval.fromIso8601(packetData);
            intervals = new TimeIntervalCollection();
            intervals.addInterval(interval);
        }
        dynamicObject.availability = intervals;
    }

    function processBillboard(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var billboardData = packet.billboard;
        if (!defined(billboardData)) {
            return;
        }

        var interval = billboardData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var billboard = dynamicObject.billboard;
        if (!defined(billboard)) {
            dynamicObject.billboard = billboard = new DynamicBillboard();
        }

        processPacketData(Color, billboard, 'color', billboardData.color, interval, sourceUri);
        processPacketData(Cartesian3, billboard, 'eyeOffset', billboardData.eyeOffset, interval, sourceUri);
        processPacketData(HorizontalOrigin, billboard, 'horizontalOrigin', billboardData.horizontalOrigin, interval, sourceUri);
        processPacketData(Image, billboard, 'image', billboardData.image, interval, sourceUri);
        processPacketData(Cartesian2, billboard, 'pixelOffset', billboardData.pixelOffset, interval, sourceUri);
        processPacketData(Number, billboard, 'scale', billboardData.scale, interval, sourceUri);
        processPacketData(Number, billboard, 'rotation', billboardData.rotation, interval, sourceUri);
        processPacketData(Cartesian3, billboard, 'alignedAxis', billboardData.alignedAxis, interval, sourceUri);
        processPacketData(Boolean, billboard, 'show', billboardData.show, interval, sourceUri);
        processPacketData(VerticalOrigin, billboard, 'verticalOrigin', billboardData.verticalOrigin, interval, sourceUri);
    }

    function processClock(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var clockPacket = packet.clock;
        if (!defined(clockPacket) || dynamicObject.id !== 'document') {
            return;
        }

        var clock = dynamicObject.clock;
        if (!defined(clock)) {
            clock = new DynamicClock();
            clock.startTime = Iso8601.MAXIMUM_INTERVAL.start;
            clock.stopTime = Iso8601.MAXIMUM_INTERVAL.stop;
            clock.clockRange = ClockRange.LOOP_STOP;
            clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            clock.multiplier = 1.0;
            dynamicObject.clock = clock;
        }
        if (defined(clockPacket.interval)) {
            var interval = TimeInterval.fromIso8601(clockPacket.interval);
            clock.startTime = interval.start;
            clock.stopTime = interval.stop;
        }
        if (defined(clockPacket.currentTime)) {
            clock.currentTime = JulianDate.fromIso8601(clockPacket.currentTime);
        }
        if (defined(clockPacket.range)) {
            clock.clockRange = ClockRange[clockPacket.range];
        }
        if (defined(clockPacket.step)) {
            clock.clockStep = ClockStep[clockPacket.step];
        }
        if (defined(clockPacket.multiplier)) {
            clock.multiplier = clockPacket.multiplier;
        }
    }

    function processCone(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var coneData = packet.cone;
        if (!defined(coneData)) {
            return;
        }

        var interval = coneData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var cone = dynamicObject.cone;
        if (!defined(cone)) {
            dynamicObject.cone = cone = new DynamicCone();
        }

        processPacketData(Boolean, cone, 'show', coneData.show, interval, sourceUri);
        processPacketData(Number, cone, 'radius', coneData.radius, interval, sourceUri);
        processPacketData(Boolean, cone, 'showIntersection', coneData.showIntersection, interval, sourceUri);
        processPacketData(Color, cone, 'intersectionColor', coneData.intersectionColor, interval, sourceUri);
        processPacketData(Number, cone, 'intersectionWidth', coneData.intersectionWidth, interval, sourceUri);
        processPacketData(Number, cone, 'innerHalfAngle', coneData.innerHalfAngle, interval, sourceUri);
        processPacketData(Number, cone, 'outerHalfAngle', coneData.outerHalfAngle, interval, sourceUri);
        processPacketData(Number, cone, 'minimumClockAngle', coneData.minimumClockAngle, interval, sourceUri);
        processPacketData(Number, cone, 'maximumClockAngle', coneData.maximumClockAngle, interval, sourceUri);
        processMaterialPacketData(cone, 'capMaterial', coneData.capMaterial, interval, sourceUri);
        processMaterialPacketData(cone, 'innerMaterial', coneData.innerMaterial, interval, sourceUri);
        processMaterialPacketData(cone, 'outerMaterial', coneData.outerMaterial, interval, sourceUri);
        processMaterialPacketData(cone, 'silhouetteMaterial', coneData.silhouetteMaterial, interval, sourceUri);
    }

    function processEllipse(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var ellipseData = packet.ellipse;
        if (!defined(ellipseData)) {
            return;
        }

        var interval = ellipseData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var ellipse = dynamicObject.ellipse;
        if (!defined(ellipse)) {
            dynamicObject.ellipse = ellipse = new DynamicEllipse();
        }

        processPacketData(Number, ellipse, 'rotation', ellipseData.rotation, interval, sourceUri);
        processPacketData(Number, ellipse, 'semiMajorAxis', ellipseData.semiMajorAxis, interval, sourceUri);
        processPacketData(Number, ellipse, 'semiMinorAxis', ellipseData.semiMinorAxis, interval, sourceUri);
    }

    function processEllipsoid(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var ellipsoidData = packet.ellipsoid;
        if (!defined(ellipsoidData)) {
            return;
        }

        var interval = ellipsoidData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var ellipsoid = dynamicObject.ellipsoid;
        if (!defined(ellipsoid)) {
            dynamicObject.ellipsoid = ellipsoid = new DynamicEllipsoid();
        }

        processPacketData(Boolean, ellipsoid, 'show', ellipsoidData.show, interval, sourceUri);
        processPacketData(Cartesian3, ellipsoid, 'radii', ellipsoidData.radii, interval, sourceUri);
        processMaterialPacketData(ellipsoid, 'material', ellipsoidData.material, interval, sourceUri);
    }

    function processLabel(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var labelData = packet.label;
        if (!defined(labelData)) {
            return;
        }

        var interval = labelData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var label = dynamicObject.label;
        if (!defined(label)) {
            dynamicObject.label = label = new DynamicLabel();
        }

        processPacketData(Color, label, 'fillColor', labelData.fillColor, interval, sourceUri);
        processPacketData(Color, label, 'outlineColor', labelData.outlineColor, interval, sourceUri);
        processPacketData(Number, label, 'outlineWidth', labelData.outlineWidth, interval, sourceUri);
        processPacketData(Cartesian3, label, 'eyeOffset', labelData.eyeOffset, interval, sourceUri);
        processPacketData(HorizontalOrigin, label, 'horizontalOrigin', labelData.horizontalOrigin, interval, sourceUri);
        processPacketData(String, label, 'text', labelData.text, interval, sourceUri);
        processPacketData(Cartesian2, label, 'pixelOffset', labelData.pixelOffset, interval, sourceUri);
        processPacketData(Number, label, 'scale', labelData.scale, interval, sourceUri);
        processPacketData(Boolean, label, 'show', labelData.show, interval, sourceUri);
        processPacketData(VerticalOrigin, label, 'verticalOrigin', labelData.verticalOrigin, interval, sourceUri);
        processPacketData(String, label, 'font', labelData.font, interval, sourceUri);
        processPacketData(LabelStyle, label, 'style', labelData.style, interval, sourceUri);
    }

    function processPath(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var pathData = packet.path;
        if (!defined(pathData)) {
            return;
        }

        var interval = pathData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var path = dynamicObject.path;
        if (!defined(path)) {
            dynamicObject.path = path = new DynamicPath();
        }

        processPacketData(Color, path, 'color', pathData.color, interval, sourceUri);
        processPacketData(Number, path, 'width', pathData.width, interval, sourceUri);
        processPacketData(Color, path, 'outlineColor', pathData.outlineColor, interval, sourceUri);
        processPacketData(Number, path, 'outlineWidth', pathData.outlineWidth, interval, sourceUri);
        processPacketData(Boolean, path, 'show', pathData.show, interval, sourceUri);
        processPacketData(Number, path, 'resolution', pathData.resolution, interval, sourceUri);
        processPacketData(Number, path, 'leadTime', pathData.leadTime, interval, sourceUri);
        processPacketData(Number, path, 'trailTime', pathData.trailTime, interval, sourceUri);
    }

    function processPoint(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var pointData = packet.point;
        if (!defined(pointData)) {
            return;
        }

        var interval = pointData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var point = dynamicObject.point;
        if (!defined(point)) {
            dynamicObject.point = point = new DynamicPoint();
        }

        processPacketData(Color, point, 'color', pointData.color, interval, sourceUri);
        processPacketData(Number, point, 'pixelSize', pointData.pixelSize, interval, sourceUri);
        processPacketData(Color, point, 'outlineColor', pointData.outlineColor, interval, sourceUri);
        processPacketData(Number, point, 'outlineWidth', pointData.outlineWidth, interval, sourceUri);
        processPacketData(Boolean, point, 'show', pointData.show, interval, sourceUri);
    }

    function processPolygon(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var polygonData = packet.polygon;
        if (!defined(polygonData)) {
            return;
        }

        var interval = polygonData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var polygon = dynamicObject.polygon;
        if (!defined(polygon)) {
            dynamicObject.polygon = polygon = new DynamicPolygon();
        }

        processPacketData(Boolean, polygon, 'show', polygonData.show, interval, sourceUri);
        processMaterialPacketData(polygon, 'material', polygonData.material, interval, sourceUri);
    }

    function processPolyline(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var polylineData = packet.polyline;
        if (!defined(polylineData)) {
            return;
        }

        var interval = polylineData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var polyline = dynamicObject.polyline;
        if (!defined(polyline)) {
            dynamicObject.polyline = polyline = new DynamicPolyline();
        }

        //Since CZML does not support PolylineOutlineMaterial, we map it's properties into one.
        var materialToProcess = polyline.material;
        if (defined(interval)) {
            var materialInterval;
            var composite = materialToProcess;
            if (!(composite instanceof CompositeMaterialProperty)) {
                composite = new CompositeMaterialProperty();
                polyline.material = composite;
                if (defined(materialToProcess)) {
                    materialInterval = Iso8601.MAXIMUM_INTERVAL.clone();
                    materialInterval.data = materialToProcess;
                    composite.intervals.addInterval(materialInterval);
                }
            }
            materialInterval = composite.intervals.findInterval(interval.start, interval.stop, interval.isStartIncluded, interval.isStopIncluded);
            if (defined(materialInterval)) {
                materialToProcess = materialInterval.data;
            } else {
                materialToProcess = new PolylineOutlineMaterialProperty();
                materialInterval = interval.clone();
                materialInterval.data = materialToProcess;
                composite.intervals.addInterval(materialInterval);
            }
        } else if (!(materialToProcess instanceof PolylineOutlineMaterialProperty)) {
            materialToProcess = new PolylineOutlineMaterialProperty();
            polyline.material = materialToProcess;
        }

        processPacketData(Boolean, polyline, 'show', polylineData.show, interval, sourceUri);
        processPacketData(Number, polyline, 'width', polylineData.width, interval, sourceUri);
        processPacketData(Color, materialToProcess, 'color', polylineData.color, interval, sourceUri);
        processPacketData(Color, materialToProcess, 'outlineColor', polylineData.outlineColor, interval, sourceUri);
        processPacketData(Number, materialToProcess, 'outlineWidth', polylineData.outlineWidth, interval, sourceUri);
    }

    function processPyramid(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var pyramidData = packet.pyramid;
        if (!defined(pyramidData)) {
            return;
        }

        var interval = pyramidData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var pyramid = dynamicObject.pyramid;
        if (!defined(pyramid)) {
            dynamicObject.pyramid = pyramid = new DynamicPyramid();
        }

        processPacketData(Boolean, pyramid, 'show', pyramidData.show, interval, sourceUri);
        processPacketData(Number, pyramid, 'radius', pyramidData.radius, interval, sourceUri);
        processPacketData(Boolean, pyramid, 'showIntersection', pyramidData.showIntersection, interval, sourceUri);
        processPacketData(Color, pyramid, 'intersectionColor', pyramidData.intersectionColor, interval, sourceUri);
        processPacketData(Number, pyramid, 'intersectionWidth', pyramidData.intersectionWidth, interval, sourceUri);
        processMaterialPacketData(pyramid, 'material', pyramidData.material, interval, sourceUri);

        if (defined(pyramidData.directions)) {
            var directions = pyramid.directions;
            if (!defined(directions)) {
                pyramid.directions = directions = new DynamicDirectionsProperty();
            }
            directions.processCzmlIntervals(pyramidData.directions, interval);
        }
    }

    function processVector(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var vectorData = packet.vector;
        if (!defined(vectorData)) {
            return;
        }

        var interval = vectorData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var vector = dynamicObject.vector;
        if (!defined(vector)) {
            dynamicObject.vector = vector = new DynamicVector();
        }

        processPacketData(Color, vector, 'color', vectorData.color, interval, sourceUri);
        processPacketData(Boolean, vector, 'show', vectorData.show, interval, sourceUri);
        processPacketData(Number, vector, 'width', vectorData.width, interval, sourceUri);
        processPacketData(Cartesian3, vector, 'direction', vectorData.direction, interval, sourceUri);
        processPacketData(Number, vector, 'length', vectorData.length, interval, sourceUri);
    }

    function processCzmlPacket(packet, dynamicObjectCollection, updaterFunctions, sourceUri, dataSource) {
        var objectId = packet.id;
        if (!defined(objectId)) {
            objectId = createGuid();
        }

        if (packet['delete'] === true) {
            dynamicObjectCollection.removeById(objectId);
        } else {
            var dynamicObject;
            if (objectId === 'document') {
                dynamicObject = dataSource._document;
            } else {
                dynamicObject = dynamicObjectCollection.getOrCreateObject(objectId);
            }

            var parentId = packet.parent;
            if (defined(parentId)) {
                dynamicObject.parent = dynamicObjectCollection.getOrCreateObject(parentId);
            }

            for (var i = updaterFunctions.length - 1; i > -1; i--) {
                updaterFunctions[i](dynamicObject, packet, dynamicObjectCollection, sourceUri);
            }
        }
    }

    function loadCzml(dataSource, czml, sourceUri) {
        var dynamicObjectCollection = dataSource._dynamicObjectCollection;
        dynamicObjectCollection.suspendEvents();

        CzmlDataSource._processCzml(czml, dynamicObjectCollection, sourceUri, undefined, dataSource);

        var documentObject = dataSource._document;

        var raiseChangedEvent = false;
        var czmlClock;
        if (defined(documentObject.clock)) {
            czmlClock = documentObject.clock;
        } else {
            var availability = dynamicObjectCollection.computeAvailability();
            if (!availability.start.equals(Iso8601.MINIMUM_VALUE)) {
                var startTime = availability.start;
                var stopTime = availability.stop;
                var totalSeconds = startTime.getSecondsDifference(stopTime);
                var multiplier = Math.round(totalSeconds / 120.0);

                czmlClock = new DynamicClock();
                czmlClock.startTime = startTime;
                czmlClock.stopTime = stopTime;
                czmlClock.clockRange = ClockRange.LOOP_STOP;
                czmlClock.multiplier = multiplier;
                czmlClock.currentTime = startTime;
                czmlClock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            }
        }

        if (defined(czmlClock)) {
            if (!defined(dataSource._clock)) {
                dataSource._clock = new DynamicClock();
                raiseChangedEvent = true;
            }
            if (!czmlClock.equals(dataSource._clock)) {
                czmlClock.clone(dataSource._clock);
                raiseChangedEvent = true;
            }
        }

        var name;
        if (defined(documentObject.name)) {
            name = documentObject.name;
        } else if (defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }

        if (dataSource._name !== name) {
            dataSource._name = name;
            raiseChangedEvent = true;
        }

        dynamicObjectCollection.resumeEvents();
        if (raiseChangedEvent) {
            dataSource._changed.raiseEvent(dataSource);
        }
    }

    /**
     * A {@link DataSource} which processes CZML.
     * @alias CzmlDataSource
     * @constructor
     *
     * @param {String} [name] An optional name for the data source.  This value will be overwritten if a loaded document contains a name.
     */
    var CzmlDataSource = function(name) {
        this._name = name;
        this._changed = new Event();
        this._error = new Event();
        this._clock = undefined;
        this._dynamicObjectCollection = new DynamicObjectCollection();
        this._timeVarying = true;
        this._document = new DynamicObject();
    };

    /**
     * Gets the array of CZML processing functions.
     * @memberof CzmlDataSource
     * @type Array
     */
    CzmlDataSource.updaters = [processClock,//
    processBillboard, //
    processEllipse, //
    processEllipsoid, //
    processCone, //
    processLabel, //
    processName, //
    processPath, //
    processPoint, //
    processPolygon, //
    processPolyline, //
    processPyramid, //
    processVector, //
    processPosition, //
    processViewFrom, //
    processOrientation, //
    processVertexPositions, //
    processAvailability];

    /**
     * Gets an event that will be raised when non-time-varying data changes
     * or if the return value of getIsTimeVarying changes.
     * @memberof CzmlDataSource
     *
     * @returns {Event} The event.
     */
    CzmlDataSource.prototype.getChangedEvent = function() {
        return this._changed;
    };

    /**
     * Gets an event that will be raised if an error is encountered during processing.
     * @memberof CzmlDataSource
     *
     * @returns {Event} The event.
     */
    CzmlDataSource.prototype.getErrorEvent = function() {
        return this._error;
    };

    /**
     * Gets the DynamicObjectCollection generated by this data source.
     * @memberof CzmlDataSource
     *
     * @returns {DynamicObjectCollection} The collection of objects generated by this data source.
     */
    CzmlDataSource.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Gets the name of this data source.  If the return value of
     * this function changes, the changed event will be raised.
     * @memberof CzmlDataSource
     *
     * @returns {String} The name.
     */
    CzmlDataSource.prototype.getName = function() {
        return this._name;
    };

    /**
     * Gets the top level clock defined in CZML or the availability of the
     * underlying data if no clock is defined.  If the CZML document only contains
     * infinite data, undefined will be returned.  If the return value of
     * this function changes, the changed event will be raised.
     * @memberof CzmlDataSource
     *
     * @returns {DynamicClock} The clock associated with the current CZML data, or undefined if none exists.
     */
    CzmlDataSource.prototype.getClock = function() {
        return this._clock;
    };

    /**
     * Gets a value indicating if the data varies with simulation time.  If the return value of
     * this function changes, the changed event will be raised.
     * @memberof CzmlDataSource
     *
     * @returns {Boolean} True if the data is varies with simulation time, false otherwise.
     */
    CzmlDataSource.prototype.getIsTimeVarying = function() {
        return this._timeVarying;
    };

    /**
     * Processes the provided CZML without clearing any existing data.
     *
     * @param {Object} czml The CZML to be processed.
     * @param {String} source The source of the CZML.
     *
     * @exception {DeveloperError} czml is required.
     */
    CzmlDataSource.prototype.process = function(czml, source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(czml)) {
            throw new DeveloperError('czml is required.');
        }
        //>>includeEnd('debug');

        loadCzml(this, czml, source);
    };

    /**
     * Replaces any existing data with the provided CZML.
     *
     * @param {Object} czml The CZML to be processed.
     * @param {String} source The source of the CZML.
     *
     * @exception {DeveloperError} czml is required.
     */
    CzmlDataSource.prototype.load = function(czml, source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(czml)) {
            throw new DeveloperError('czml is required.');
        }
        //>>includeEnd('debug');

        this._document = new DynamicObject('document');
        this._dynamicObjectCollection.removeAll();
        loadCzml(this, czml, source);
    };

    /**
     * Asynchronously processes the CZML at the provided url without clearing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the CZML is processed.
     *
     * @exception {DeveloperError} url is required.
     */
    CzmlDataSource.prototype.processUrl = function(url) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        var dataSource = this;
        return when(loadJson(url), function(czml) {
            dataSource.process(czml, url);
        }, function(error) {
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
    };

    /**
     * Asynchronously loads the CZML at the provided url, replacing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the CZML is processed.
     *
     * @exception {DeveloperError} url is required.
     */
    CzmlDataSource.prototype.loadUrl = function(url) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        var dataSource = this;
        return when(loadJson(url), function(czml) {
            dataSource.load(czml, url);
        }, function(error) {
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
    };

    /**
     * A helper function used by custom CZML updater functions
     * which creates or updates a {@link Property} from a CZML packet.
     * @function
     *
     * @param {Function} type The constructor function for the property being processed.
     * @param {Object} object The object on which the property will be added or updated.
     * @param {String} propertyName The name of the property on the object.
     * @param {Object} packetData The CZML packet being processed.y
     * @param {TimeInterval} [interval] A constraining interval for which the data is valid.
     * @param {String} [sourceUri] The originating uri of the data being processed.
     * @returns {Boolean} True if a new property was created, false otherwise.
     */
    CzmlDataSource.processPacketData = processPacketData;

    /**
     * A helper function used by custom CZML updater functions
     * which creates or updates a {@link PositionProperty} from a CZML packet.
     * @function
     *
     * @param {Object} object The object on which the property will be added or updated.
     * @param {String} propertyName The name of the property on the object.
     * @param {Object} packetData The CZML packet being processed.y
     * @param {TimeInterval} [interval] A constraining interval for which the data is valid.
     * @param {String} [sourceUri] The originating uri of the data being processed.
     * @returns {Boolean} True if a new property was created, false otherwise.
     */
    CzmlDataSource.processPositionPacketData = processPositionPacketData;

    /**
     * A helper function used by custom CZML updater functions
     * which creates or updates a {@link MaterialProperty} from a CZML packet.
     * @function
     *
     * @param {Object} object The object on which the property will be added or updated.
     * @param {String} propertyName The name of the property on the object.
     * @param {Object} packetData The CZML packet being processed.y
     * @param {TimeInterval} [interval] A constraining interval for which the data is valid.
     * @param {String} [sourceUri] The originating uri of the data being processed.
     * @returns {Boolean} True if a new property was created, false otherwise.
     */
    CzmlDataSource.processMaterialPacketData = processMaterialPacketData;

    CzmlDataSource._processCzml = function(czml, dynamicObjectCollection, sourceUri, updaterFunctions, dataSource) {
        updaterFunctions = defined(updaterFunctions) ? updaterFunctions : CzmlDataSource.updaters;

        if (Array.isArray(czml)) {
            for ( var i = 0, len = czml.length; i < len; i++) {
                processCzmlPacket(czml[i], dynamicObjectCollection, updaterFunctions, sourceUri, dataSource);
            }
        } else {
            processCzmlPacket(czml, dynamicObjectCollection, updaterFunctions, sourceUri, dataSource);
        }
    };

    return CzmlDataSource;
});
