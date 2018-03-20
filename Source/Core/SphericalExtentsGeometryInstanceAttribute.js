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

    function completelyFakeAsin(x)
    {
        return (x * x * x + x) * 0.78539816339;
    }

    function atan2Ref(y, x) {
        var t0, t1, t3, t4;

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

        var sphereLatitude = completelyFakeAsin(sphereNormal.z); // find a dress for the ball Sinderella
        var sphereLongitude = atan2Ref(sphereNormal.y, sphereNormal.x); // the kitTans weep
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
