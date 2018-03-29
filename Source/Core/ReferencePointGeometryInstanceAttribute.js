define([
        './Cartesian3',
        './Cartographic',
        './Check',
        './ComponentDatatype',
        './defined',
        './defineProperties',
        './EncodedCartesian3',
        './Matrix4',
        './Transforms'
    ], function(
        Cartesian3,
        Cartographic,
        Check,
        ComponentDatatype,
        defined,
        defineProperties,
        EncodedCartesian3,
        Matrix4,
        Transforms) {
    'use strict';

    /**
     * Batch table attribute representing the HIGH or LOW bits of an EncodedCartesian3.
     *
     * @param {Cartesian3} vec3 HIGH or LOW bits of an EncodedCartesian3
     * @private
     */
    function ReferencePointGeometryInstanceAttribute(vec3) {
        this.value = new Float32Array([vec3.x, vec3.y, vec3.z]);
    }

    defineProperties(ReferencePointGeometryInstanceAttribute.prototype, {
        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link ReferencePointGeometryInstanceAttribute#value}.
         *
         * @memberof ReferencePointGeometryInstanceAttribute.prototype
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
         * The number of components in the attributes, i.e., {@link ReferencePointGeometryInstanceAttribute#value}.
         *
         * @memberof ReferencePointGeometryInstanceAttribute.prototype
         *
         * @type {Number}
         * @readonly
         *
         * @default 3
         */
        componentsPerAttribute : {
            get : function() {
                return 3;
            }
        },

        /**
         * When <code>true</code> and <code>componentDatatype</code> is an integer format,
         * indicate that the components should be mapped to the range [0, 1] (unsigned)
         * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
         *
         * @memberof ReferencePointGeometryInstanceAttribute.prototype
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

    var encodeScratch = new EncodedCartesian3();
    function addAttributesForPoint(point, name, attributes) {
        var encoded = EncodedCartesian3.fromCartesian(point, encodeScratch);
        attributes[name + '_HIGH'] = new ReferencePointGeometryInstanceAttribute(encoded.high);
        attributes[name + '_LOW'] = new ReferencePointGeometryInstanceAttribute(encoded.low);
    }

    var cartographicScratch = new Cartographic();
    var cornerScratch = new Cartesian3();
    var northWestScratch = new Cartesian3();
    var southEastScratch = new Cartesian3();
    /**
     * Gets a set of 6 GeometryInstanceAttributes containing double-precision points in world/CBF space.
     * These points can be used to form planes, which can then be used to compute per-fragment texture coordinates
     * over a small rectangle area.
     *
     * @param {Rectangle} rectangle Rectangle bounds over which texture coordinates should be computed.
     * @param {Ellipsoid} ellipsoid Ellipsoid for computing CBF/World coordinates from the rectangle.
     * @private
     */
    ReferencePointGeometryInstanceAttribute.getAttributesForPlanes = function(rectangle, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('rectangle', rectangle);
        Check.typeOf.object('ellipsoid', ellipsoid);
        //>>includeEnd('debug');

        // Compute corner positions in double precision
        var carto = cartographicScratch;
        carto.longitude = rectangle.west;
        carto.latitude = rectangle.south;

        var corner = Cartographic.toCartesian(carto, ellipsoid, cornerScratch);

        carto.latitude = rectangle.north;
        var northWest = Cartographic.toCartesian(carto, ellipsoid, northWestScratch);

        carto.longitude = rectangle.east;
        carto.latitude = rectangle.south;
        var southEast = Cartographic.toCartesian(carto, ellipsoid, southEastScratch);

        var attributes = {};
        addAttributesForPoint(corner, 'southWest', attributes);
        addAttributesForPoint(northWest, 'northWest', attributes);
        addAttributesForPoint(southEast, 'southEast', attributes);
        return attributes;
    };

    /**
     * Checks if the given attributes contain all the attributes needed for double-precision planes.
     *
     * @param {Object} attributes Attributes object.
     * @return {Boolean} Whether the attributes contain all the attributes for double-precision planes.
     * @private
     */
    ReferencePointGeometryInstanceAttribute.hasAttributesForPlanes = function(attributes) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('attributes', attributes);
        //>>includeEnd('debug');
        return defined(attributes.southWest_HIGH) && defined(attributes.southWest_LOW) &&
            defined(attributes.northWest_HIGH) && defined(attributes.northWest_LOW) &&
            defined(attributes.southEast_HIGH) && defined(attributes.southEast_LOW);
    };

    return ReferencePointGeometryInstanceAttribute;
});
