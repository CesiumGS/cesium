/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Math',
        '../Core/Quaternion',
        '../Core/ReferenceFrame',
        '../Core/Spherical',
        '../Core/HermitePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/LagrangePolynomialApproximation',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        '../Core/TimeInterval',
        '../Core/Iso8601',
        '../Core/JulianDate',
        './CompositeProperty',
        './ConstantProperty',
        './SampledProperty',
        './TimeIntervalCollectionProperty',
        './CompositePositionProperty',
        './ConstantPositionProperty',
        './SampledPositionProperty',
        './TimeIntervalCollectionPositionProperty',
        './DynamicColorMaterial',
        './DynamicImageMaterial',
        './DynamicGridMaterial',
        '../ThirdParty/Uri'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        Color,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        CesiumMath,
        Quaternion,
        ReferenceFrame,
        Spherical,
        HermitePolynomialApproximation,
        LinearApproximation,
        LagrangePolynomialApproximation,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin,
        TimeInterval,
        Iso8601,
        JulianDate,
        CompositeProperty,
        ConstantProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        CompositePositionProperty,
        ConstantPositionProperty,
        SampledPositionProperty,
        TimeIntervalCollectionPositionProperty,
        DynamicColorMaterial,
        DynamicImageMaterial,
        DynamicGridMaterial,
        Uri) {
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

        var tmp = scratchCartesian;
        var cartographic = czmlInterval.cartographicRadians;
        if (defined(cartographic)) {
            if (cartographic.length > 3) {
                scratchCartographic.longitude = cartographic[0];
                scratchCartographic.latitude = cartographic[1];
                scratchCartographic.height = cartographic[2];
                Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);
                result = [tmp.x, tmp.y, tmp.z];
            } else {
                len = cartographic.length;
                result = new Array(len);
                for (i = 0; i < len; i += 4) {
                    scratchCartographic.longitude = cartographic[i + 1];
                    scratchCartographic.latitude = cartographic[i + 2];
                    scratchCartographic.height = cartographic[i + 3];
                    Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);

                    result[i] = cartographic[i];
                    result[i + 1] = tmp.x;
                    result[i + 2] = tmp.y;
                    result[i + 3] = tmp.z;
                }
            }
        } else {
            var cartographicDegrees = czmlInterval.cartographicDegrees;
            if (!defined(cartographicDegrees)) {
                return undefined;
            }

            if (cartographicDegrees.length > 3) {
                scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[0]);
                scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[1]);
                scratchCartographic.height = cartographicDegrees[2];
                Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);
                result = [tmp.x, tmp.y, tmp.z];
            } else {
                len = cartographicDegrees.length;
                result = new Array(len);
                for (i = 0; i < len; i += 4) {
                    scratchCartographic.longitude = CesiumMath.toRadians(cartographicDegrees[i + 1]);
                    scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[i + 2]);
                    scratchCartographic.height = cartographicDegrees[i + 3];
                    Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic, tmp);

                    result[i] = cartographicDegrees[i];
                    result[i + 1] = tmp.x;
                    result[i + 2] = tmp.y;
                    result[i + 3] = tmp.z;
                }
            }
        }
    }

    function unwrapInterval(type, czmlInterval, sourceUri) {
        switch (type) {
        case Boolean:
            return defaultValue(czmlInterval.boolean, czmlInterval);
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
        case LabelStyle:
            return LabelStyle[defaultValue(czmlInterval.labelStyle, czmlInterval)];
        case Number:
            return defaultValue(czmlInterval.number, czmlInterval);
        case String:
            return defaultValue(czmlInterval.string, czmlInterval);
        case Quaternion:
            return czmlInterval.unitQuaternion;
        case VerticalOrigin:
            return VerticalOrigin[defaultValue(czmlInterval.verticalOrigin, czmlInterval)];
        default:
            throw new DeveloperError(type);
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
        var isSampled = (typeof unwrappedInterval !== 'string') && unwrappedIntervalLength > packedLength;

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
        if (!isSampled && hasInterval) {
            combinedInterval = combinedInterval.clone();
            if (defined(type.unpack)) {
                combinedInterval.data = type.unpack(unwrappedInterval, 0);
            } else {
                combinedInterval.data = unwrappedInterval;
            }

            if (!defined(property)) {
                property = new TimeIntervalCollectionProperty();
                object[propertyName] = property;
                propertyCreated = true;
            }

            if (property instanceof TimeIntervalCollectionProperty) {
                property.intervals.addInterval(combinedInterval);
            } else {
                //TODO Morph to CompositeProperty
            }
        } else if (isSampled && !hasInterval) {
            if (!(property instanceof SampledProperty)) {
                property = new SampledProperty(type);
                object[propertyName] = property;
                propertyCreated = true;
            }
            property.addSamplesFlatArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
        } else if (isSampled && hasInterval) {
            if (!defined(property)) {
                property = new CompositeProperty();
                object[propertyName] = property;
                propertyCreated = true;
            }
            if (property instanceof CompositeProperty) {
                var intervals = property.intervals;
                var interval = intervals.findInterval(combinedInterval.start, combinedInterval.stop, combinedInterval.isStartIncluded, combinedInterval.isStopIncluded);
                var intervalData;
                if (defined(interval)) {
                    intervalData = interval.data;
                } else {
                    interval = combinedInterval.clone();
                    intervalData = new SampledProperty(type);
                    interval.data = intervalData;
                    intervals.addInterval(interval);
                }
                if (!(intervalData instanceof SampledProperty)) {
                    intervalData = new SampledProperty(type);
                    interval.Data = intervalData;
                }
                intervalData.addSamplesFlatArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
            } else {
                //TODO Morph to CompositeProperty
            }
        }
        return propertyCreated;
    }

    function processPacketData(type, object, propertyName, packetData, interval, sourceUri) {
        if (!defined(packetData)) {
            return false;
        }

        var updated = false;
        if (Array.isArray(packetData)) {
            for ( var i = 0, len = packetData.length; i < len; i++) {
                updated = processProperty(type, object, propertyName, packetData[i], interval, sourceUri) || updated;
            }
        } else {
            updated = processProperty(type, object, propertyName, packetData, interval, sourceUri) || updated;
        }
        return updated;
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
        var isSampled = unwrappedInterval.length > Cartesian3.packedLength;

        if (!isSampled && !hasInterval) {
            object[propertyName] = new ConstantPositionProperty(Cartesian3.unpack(unwrappedInterval, 0), referenceFrame);
            return true;
        }

        var propertyCreated = false;
        var property = object[propertyName];
        if (!isSampled && hasInterval) {
            combinedInterval = combinedInterval.clone();
            combinedInterval.data = Cartesian3.unpack(unwrappedInterval, 0);

            if (!defined(property)) {
                property = new TimeIntervalCollectionPositionProperty(referenceFrame);
                object[propertyName] = property;
                propertyCreated = true;
            }
            if (property instanceof TimeIntervalCollectionPositionProperty) {
                property.intervals.addInterval(combinedInterval);
                updateInterpolationSettings(packetData, property);
            } else {
                //TODO Morph to CompositePositionProperty
            }
        } else if (isSampled && !hasInterval) {
            if (!(property instanceof SampledPositionProperty)) {
                property = new SampledPositionProperty(referenceFrame);
                object[propertyName] = property;
                propertyCreated = true;
            }
            property.addSamplesFlatArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
            updateInterpolationSettings(packetData, property);
        } else if (isSampled && hasInterval) {
            if (!defined(property)) {
                property = new CompositePositionProperty(referenceFrame);
                object[propertyName] = property;
                propertyCreated = true;
            }
            if (property instanceof CompositePositionProperty) {
                var intervals = property.intervals;
                var interval = intervals.findInterval(combinedInterval.start, combinedInterval.stop, combinedInterval.isStartIncluded, combinedInterval.isStopIncluded);
                var intervalData;
                if (defined(interval)) {
                    intervalData = interval.data;
                } else {
                    interval = combinedInterval.clone();
                    intervalData = new SampledPositionProperty(referenceFrame);
                    interval.data = intervalData;
                    intervals.addInterval(interval);
                }
                if (!(intervalData instanceof SampledPositionProperty)) {
                    intervalData = new SampledPositionProperty(referenceFrame);
                    interval.Data = intervalData;
                }
                intervalData.addSamplesFlatArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
                updateInterpolationSettings(packetData, property);
            } else {
                //TODO Morph to CompositePositionProperty
            }
        }
        return propertyCreated;
    }

    function processPositionPacketData(object, propertyName, packetData, interval, sourceUri) {
        if (!defined(packetData)) {
            return false;
        }

        var updated = false;
        if (Array.isArray(packetData)) {
            for ( var i = 0, len = packetData.length; i < len; i++) {
                updated = processPositionProperty(object, propertyName, packetData[i], interval, sourceUri) || updated;
            }
        } else {
            updated = processPositionProperty(object, propertyName, packetData, interval, sourceUri) || updated;
        }
        return updated;
    }
    processPacketData.position = processPositionPacketData;

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
            property = new TimeIntervalCollectionProperty(function(value) {
                return value;
            });
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

        if (!defined(existingMaterial) || !existingMaterial.isMaterial(packetData)) {
            if (defined(packetData.solidColor)) {
                existingMaterial = new DynamicColorMaterial();
                propertyCreated = processPacketData(Color, existingMaterial, 'color', packetData.solidColor.color);
                existingInterval.data = existingMaterial;
            }
        }

        return propertyCreated;
    }

    function processMaterialPacketData(object, propertyName, packetData, interval, sourceUri){
        if (!defined(packetData)) {
            return false;
        }

        var updated = false;
        if (Array.isArray(packetData)) {
            for ( var i = 0, len = packetData.length; i < len; i++) {
                updated = processMaterialProperty(object, propertyName, packetData[i], interval, sourceUri) || updated;
            }
        } else {
            updated = processMaterialProperty(object, propertyName, packetData, interval, sourceUri) || updated;
        }
        return updated;
    }
    processPacketData.material = processMaterialPacketData;

    return processPacketData;
});
