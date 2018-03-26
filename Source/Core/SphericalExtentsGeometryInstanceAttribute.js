define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './Math',
        './ComponentDatatype',
        './defineProperties',
        './Ellipsoid'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        CesiumMath,
        ComponentDatatype,
        defineProperties,
        Ellipsoid) {
    'use strict';

    function approximateSphericalLatitude(spherePoint) {
        // Project into plane with vertical for latitude
        var magXY = Math.sqrt(spherePoint.x * spherePoint.x + spherePoint.y * spherePoint.y);
        return CesiumMath.fastApproximateAtan2(magXY, spherePoint.z);
    }

    function approximateSphericalLongitude(spherePoint) {
        return CesiumMath.fastApproximateAtan2(spherePoint.x, spherePoint.y);
    }

    var cartographicScratch = new Cartographic();
    var cartesian3Scratch = new Cartesian3();
    function latLongToSpherical(latitude, longitude, result) {
        var carto = cartographicScratch;
        carto.latitude = latitude;
        carto.longitude = longitude;
        carto.height = 0.0;

        var cartesian = Cartographic.toCartesian(carto, Ellipsoid.WGS84, cartesian3Scratch);
        var sphereLatitude = approximateSphericalLatitude(cartesian);
        var sphereLongitude = approximateSphericalLongitude(cartesian);
        result.x = sphereLatitude;
        result.y = sphereLongitude;

        return result;
    }

    var sphericalScratch = new Cartesian2();
    function SphericalExtentsGeometryInstanceAttribute(rectangle) {
        // rectangle cartographic coords !== spherical because it's on an ellipsoid
        var southWestExtents = latLongToSpherical(rectangle.south, rectangle.west, sphericalScratch);

        // Slightly pad extents to avoid floating point error when fragment culling at edges.
        // TODO: what's the best value for this?
        // TODO: should we undo this in the shader?
        var south = southWestExtents.x - 0.00001;
        var west = southWestExtents.y - 0.00001;

        var northEastExtents = latLongToSpherical(rectangle.north, rectangle.east, sphericalScratch);
        var north = northEastExtents.x + 0.00001;
        var east = northEastExtents.y + 0.00001;

        var longitudeRange = 1.0 / (east - west);
        var latitudeRange = 1.0 / (north - south);

        this.value = new Float32Array([west, south, longitudeRange, latitudeRange]);
    }

    defineProperties(SphericalExtentsGeometryInstanceAttribute.prototype, {
        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link SphericalExtentsGeometryInstanceAttribute#value}.
         *
         * @memberof SphericalExtentsGeometryInstanceAttribute.prototype
         *
         * @type {ComponentDatatype}
         * @readonly
         *
         * @default {@link ComponentDatatype.FLOAT}
         */
        componentDatatype : {
            get : function() {
                return ComponentDatatype.FLOAT;
            }
        },

        /**
         * The number of components in the attributes, i.e., {@link SphericalExtentsGeometryInstanceAttribute#value}.
         *
         * @memberof SphericalExtentsGeometryInstanceAttribute.prototype
         *
         * @type {Number}
         * @readonly
         *
         * @default 4
         */
        componentsPerAttribute : {
            get : function() {
                return 4;
            }
        },

        /**
         * When <code>true</code> and <code>componentDatatype</code> is an integer format,
         * indicate that the components should be mapped to the range [0, 1] (unsigned)
         * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
         *
         * @memberof SphericalExtentsGeometryInstanceAttribute.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        normalize : {
            get : function() {
                return false;
            }
        }
    });

    return SphericalExtentsGeometryInstanceAttribute;
});
