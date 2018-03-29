define([
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './defineProperties',
        './Matrix4'
    ], function(
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        defineProperties,
        Matrix4) {
    'use strict';

    var cartesianScratch1 = new Cartesian3();
    var cartesianScratch2 = new Cartesian3();
    function cartographicStraightDistances(cartographic1, cartographic2, ellipsoid) {
        var a = Cartographic.toCartesian(cartographic1, ellipsoid, cartesianScratch1);
        var b = Cartographic.toCartesian(cartographic2, ellipsoid, cartesianScratch2);
        return Cartesian3.distance(a, b);
    }

    var cartographic1Scratch = new Cartographic();
    var cartographic2Scratch = new Cartographic();
    function InversePlaneExtentsGeometryAttribute(rectangle, ellipsoid) {
        // Compute greatest straight line distances from rectangle West -> East and rectangle South -> North.
        // Sample at the corners and center of the rectangle
        var carto1 = cartographic1Scratch;
        var carto2 = cartographic2Scratch;

        carto1.longitude = rectangle.west;
        carto2.longitude = rectangle.east;
        carto1.latitude = rectangle.north;
        carto2.latitude = rectangle.north;
        var distanceWestEast = cartographicStraightDistances(carto1, carto2, ellipsoid);

        carto1.latitude = rectangle.south;
        carto2.latitude = rectangle.south;
        distanceWestEast = Math.max(cartographicStraightDistances(carto1, carto2, ellipsoid), distanceWestEast);

        carto1.latitude = (rectangle.south + rectangle.north) * 0.5;
        carto2.latitude = carto1.latitude;
        distanceWestEast = Math.max(cartographicStraightDistances(carto1, carto2, ellipsoid), distanceWestEast);

        carto1.latitude = rectangle.south;
        carto2.latitude = rectangle.north;
        carto1.longitude = rectangle.east;
        carto2.longitude = rectangle.east;
        var distanceSouthNorth = cartographicStraightDistances(carto1, carto2, ellipsoid);

        this.value = new Float32Array([1.0 / distanceWestEast, 1.0 / distanceSouthNorth]);
    }

    defineProperties(InversePlaneExtentsGeometryAttribute.prototype, {
        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link InversePlaneExtentsGeometryAttribute#value}.
         *
         * @memberof InversePlaneExtentsGeometryAttribute.prototype
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
         * The number of components in the attributes, i.e., {@link InversePlaneExtentsGeometryAttribute#value}.
         *
         * @memberof InversePlaneExtentsGeometryAttribute.prototype
         *
         * @type {Number}
         * @readonly
         *
         * @default 2
         */
        componentsPerAttribute : {
            get : function() {
                return 2;
            }
        },

        /**
         * When <code>true</code> and <code>componentDatatype</code> is an integer format,
         * indicate that the components should be mapped to the range [0, 1] (unsigned)
         * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
         *
         * @memberof InversePlaneExtentsGeometryAttribute.prototype
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

    return InversePlaneExtentsGeometryAttribute;
});
