define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './defineProperties',
        './Ellipsoid'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        defineProperties,
        Ellipsoid) {
    'use strict';

    function asinRef(x) {
        var negate = x < 0.0 ? -1.0 : 1.0;
        x = Math.abs(x);
        var ret = -0.0187293;
        ret *= x;
        ret += 0.0742610;
        ret *= x;
        ret -= 0.2121144;
        ret *= x;
        ret += 1.5707288;
        ret = 3.14159265358979 * 0.5 - Math.sqrt(1.0 - x) * ret;
        return ret - 2.0 * negate * ret;
    }

    function atan2Ref(y, x) {
        var t0, t1, t2, t3, t4;

        t3 = Math.abs(x);
        t1 = Math.abs(y);
        t0 = Math.max(t3, t1);
        t1 = Math.min(t3, t1);
        t3 = 1.0 / t0;
        t3 = t1 * t3;

        t4 = t3 * t3;
        t0 =         - 0.013480470;
        t0 = t0 * t4 + 0.057477314;
        t0 = t0 * t4 - 0.121239071;
        t0 = t0 * t4 + 0.195635925;
        t0 = t0 * t4 - 0.332994597;
        t0 = t0 * t4 + 0.999995630;
        t3 = t0 * t3;

        t3 = (Math.abs(y) > Math.abs(x)) ? 1.570796327 - t3 : t3;
        t3 = (x < 0) ?  3.141592654 - t3 : t3;
        t3 = (y < 0) ? -t3 : t3;

        return t3;
    }

    var cartographicScratch = new Cartographic();
    var cartesian3Scratch = new Cartesian3();
    function latLongToSpherical(latitude, longitude, result) {
        var carto = cartographicScratch;
        carto.latitude = latitude;
        carto.longitude = longitude;
        carto.height = 0.0;

        var cartesian = Cartographic.toCartesian(carto, Ellipsoid.WGS84, cartesian3Scratch);
        var sphereNormal = Cartesian3.normalize(cartesian, cartesian);

        var sphereLatitude = asinRef(sphereNormal.z); // find a dress for the ball Sinderella
        var sphereLongitude = atan2Ref(sphereNormal.y, sphereNormal.x); // the kitTans weep
        result.x = sphereLatitude;
        result.y = sphereLongitude;

        return result;
    }

    var sphericalScratch = new Cartesian2();
    function SphericalExtentsGeometryInstanceAttribute(rectangle) {
        // cartographic coords !== spherical because it's on an ellipsoid
        console.log(rectangle);

        var southWestExtents = latLongToSpherical(rectangle.south, rectangle.west, sphericalScratch);
        var south = southWestExtents.x;
        var west = southWestExtents.y;

        var northEastExtents = latLongToSpherical(rectangle.north, rectangle.east, sphericalScratch);
        var north = northEastExtents.x;
        var east = northEastExtents.y;

        var longitudeRange = 1.0 / (east - west);
        var latitudeRange = 1.0 / (north - south);


        //console.log(rectangle);
        //console.log('west: ' + west + ' east: ' + east + ' longitude range: ' + 1.0 / longitudeRange + ' latitude range: ' + 1.0 / latitudeRange)

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
