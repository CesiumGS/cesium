define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './Math',
        './Check',
        './ComponentDatatype',
        './defineProperties',
        './Ellipsoid',
        './Plane'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        CesiumMath,
        Check,
        ComponentDatatype,
        defineProperties,
        Ellipsoid,
        Plane) {
    'use strict';

    var forwardScratch = new Cartesian3();
    var normalScratch = new Cartesian3();
    var upScratch = new Cartesian3();
    var rightScratch = new Cartesian3();
    var planeScratch = new Plane(Cartesian3.UNIT_X, 0.0);
    /**
     * Plane extents needed when computing ground primitive texture coordinates per-instance.
     * Used for "small distances."
     * Consists of a normal of magnitude range and a distance.
     *
     * @alias PlanarExtentsGeometryInstanceAttribute
     * @constructor
     *
     * @param {Cartesian3} rectangle Conservative bounding rectangle around the instance.
     * @param {Cartesian3} ellipsoid Ellipsoid for converting rectangle bounds to intertial fixed coordinates.
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     * @see createShadowVolumeAppearanceShader
     * @private
     */
    function PlanarExtentsGeometryInstanceAttribute(origin, end) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('origin', origin);
        Check.typeOf.object('end', end);
        //>>includeEnd('debug');

        var forward = Cartesian3.subtract(end, origin, forwardScratch);
        forward = Cartesian3.normalize(forward, forward);
        var up = Cartesian3.normalize(origin, upScratch);
        var right = Cartesian3.cross(up, forward, rightScratch);

        var normal = Cartesian3.cross(up, right, normalScratch);

        var plane = planeScratch;
        plane.normal = normal;
        plane.distance = 0.0;
        var planeDistance = Plane.getPointDistance(plane, end);

        this.value = new Float32Array([normal.x, normal.y, normal.z, 1.0 / planeDistance]);
    }

    defineProperties(PlanarExtentsGeometryInstanceAttribute.prototype, {
        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link PlanarExtentsGeometryInstanceAttribute#value}.
         *
         * @memberof PlanarExtentsGeometryInstanceAttribute.prototype
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
         * The number of components in the attributes, i.e., {@link PlanarExtentsGeometryInstanceAttribute#value}.
         *
         * @memberof PlanarExtentsGeometryInstanceAttribute.prototype
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
         * @memberof PlanarExtentsGeometryInstanceAttribute.prototype
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

    var cartographicScratch = new Cartographic();
    var northMiddleScratch = new Cartesian3();
    var southMiddleScratch = new Cartesian3();
    /**
     * Plane extents needed when computing ground primitive texture coordinates per-instance in the latitude direction.
     * Used for "small distances."
     * Consists of an oct-32 encoded normal packed to a float, a float distance, and a float range
     *
     * @alias PlanarExtentsGeometryInstanceAttribute
     * @constructor
     *
     * @param {Rectangle} rectangle Conservative bounding rectangle around the instance.
     * @param {Ellipoid} ellipsoid Ellipsoid for converting rectangle bounds to intertial fixed coordinates.
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     * @see createShadowVolumeAppearanceShader
     * @private
     */
    PlanarExtentsGeometryInstanceAttribute.getLatitudeExtents = function(rectangle, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('rectangle', rectangle);
        Check.typeOf.object('ellipsoid', ellipsoid);
        //>>includeEnd('debug');

        var cartographic = cartographicScratch;

        cartographic.latitude = rectangle.north;
        cartographic.longitude = (rectangle.east + rectangle.west) * 0.5;
        var northMiddle = Cartographic.toCartesian(cartographic, ellipsoid, northMiddleScratch);

        cartographic.latitude = rectangle.south;
        var southMiddle = Cartographic.toCartesian(cartographic, ellipsoid, southMiddleScratch);

        return new PlanarExtentsGeometryInstanceAttribute(southMiddle, northMiddle);
    }

    var eastMiddleScratch = new Cartesian3();
    var westMiddleScratch = new Cartesian3();

    /**
     * Plane extents needed when computing ground primitive texture coordinates per-instance in the longitude direction.
     * Used for "small distances."
     * Consists of an oct-32 encoded normal packed to a float, a float distance, and a float range
     *
     * @alias PlanarExtentsGeometryInstanceAttribute
     * @constructor
     *
     * @param {Rectangle} rectangle Conservative bounding rectangle around the instance.
     * @param {Ellipoid} ellipsoid Ellipsoid for converting rectangle bounds to intertial fixed coordinates.
     *
     * @see GeometryInstance
     * @see GeometryInstanceAttribute
     * @see createShadowVolumeAppearanceShader
     * @private
     */
    PlanarExtentsGeometryInstanceAttribute.getLongitudeExtents = function(rectangle, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('rectangle', rectangle);
        Check.typeOf.object('ellipsoid', ellipsoid);
        //>>includeEnd('debug');

        var cartographic = cartographicScratch;

        cartographic.latitude = (rectangle.north + rectangle.south) * 0.5;
        cartographic.longitude = rectangle.east;
        var eastMiddle = Cartographic.toCartesian(cartographic, ellipsoid, eastMiddleScratch);

        cartographic.longitude = rectangle.west;
        var westMiddle = Cartographic.toCartesian(cartographic, ellipsoid, westMiddleScratch);

        return new PlanarExtentsGeometryInstanceAttribute(westMiddle, eastMiddle);
    }

    return PlanarExtentsGeometryInstanceAttribute;
});
