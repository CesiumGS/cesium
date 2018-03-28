define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './Check',
        './Math',
        './ComponentDatatype',
        './defineProperties',
        './Ellipsoid'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        Check,
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

    /**
     * Spherical extents needed when computing ground primitive texture coordinates per-instance.
     * Used for "large distances."
     * Computation is matched to in-shader approximations.
     *
     * Consists of western and southern spherical coordinates and inverse ranges.
     *
     * @alias SphericalExtentsGeometryInstanceAttribute
     * @constructor
     *
     * @param {Rectangle} rectangle Conservative bounding rectangle around the instance.
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     * @see createShadowVolumeAppearanceShader
     * @private
     */
    function SphericalExtentsGeometryInstanceAttribute(rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('rectangle', rectangle);
        //>>includeEnd('debug');

        // rectangle cartographic coords !== spherical because it's on an ellipsoid
        var southWestExtents = latLongToSpherical(rectangle.south, rectangle.west, sphericalScratch);

        // Slightly pad extents to avoid floating point error when fragment culling at edges.
        var south = southWestExtents.x - CesiumMath.EPSILON5;
        var west = southWestExtents.y - CesiumMath.EPSILON5;

        var northEastExtents = latLongToSpherical(rectangle.north, rectangle.east, sphericalScratch);
        var north = northEastExtents.x + CesiumMath.EPSILON5;
        var east = northEastExtents.y + CesiumMath.EPSILON5;

        var longitudeRangeInverse = 1.0 / (east - west);
        var latitudeRangeInverse = 1.0 / (north - south);

        this.value = new Float32Array([west, south, longitudeRangeInverse, latitudeRangeInverse]);
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
