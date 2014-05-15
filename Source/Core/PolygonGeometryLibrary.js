/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './defined',
        './Ellipsoid'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        Ellipsoid) {
    "use strict";

    /**
     * @private
     */
    var PolygonGeometryLibrary = {};

    var distanceScratch = new Cartesian3();
    function getPointAtDistance(p0, p1, distance, length) {
        Cartesian3.subtract(p1, p0, distanceScratch);
        Cartesian3.multiplyByScalar(distanceScratch, distance / length, distanceScratch);
        Cartesian3.add(p0, distanceScratch, distanceScratch);
        return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
    }

    /**
     * @private
     */
    PolygonGeometryLibrary.subdivideLine = function(p0, p1, granularity) {
        var length = Cartesian3.distance(p0, p1);
        var angleBetween = Cartesian3.angleBetween(p0, p1);
        var n = angleBetween / granularity;
        var countDivide = Math.ceil(Math.log(n) / Math.log(2));
        if (countDivide < 1) {
            countDivide = 0;
        }
        var numVertices = Math.pow(2, countDivide);

        var distanceBetweenVertices = length / numVertices;

        var positions = new Array(numVertices * 3);
        var index = 0;
        positions[index++] = p0.x;
        positions[index++] = p0.y;
        positions[index++] = p0.z;
        for ( var i = 1; i < numVertices; i++) {
            var p = getPointAtDistance(p0, p1, i * distanceBetweenVertices, length);
            positions[index++] = p[0];
            positions[index++] = p[1];
            positions[index++] = p[2];
        }

        return positions;
    };

    var scaleToGeodeticHeightN1 = new Cartesian3();
    var scaleToGeodeticHeightN2 = new Cartesian3();
    var scaleToGeodeticHeightP1 = new Cartesian3();
    var scaleToGeodeticHeightP2 = new Cartesian3();
    /**
     * @private
     */
    PolygonGeometryLibrary.scaleToGeodeticHeightExtruded = function(geometry, maxHeight, minHeight, ellipsoid, perPositionHeight) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var n1 = scaleToGeodeticHeightN1;
        var n2 = scaleToGeodeticHeightN2;
        var p = scaleToGeodeticHeightP1;
        var p2 = scaleToGeodeticHeightP2;

        if (defined(geometry) && defined(geometry.attributes) && defined(geometry.attributes.position)) {
            var positions = geometry.attributes.position.values;
            var length = positions.length / 2;

            for ( var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(positions, i, p);

                ellipsoid.geodeticSurfaceNormal(p, n1);
                p2 = ellipsoid.scaleToGeodeticSurface(p, p2);
                n2 = Cartesian3.multiplyByScalar(n1, minHeight, n2);
                n2 = Cartesian3.add(p2, n2, n2);
                positions[i + length] = n2.x;
                positions[i + 1 + length] = n2.y;
                positions[i + 2 + length] = n2.z;

                if (perPositionHeight) {
                    p2 = Cartesian3.clone(p, p2);
                }
                n2 = Cartesian3.multiplyByScalar(n1, maxHeight, n2);
                n2 = Cartesian3.add(p2, n2, n2);
                positions[i] = n2.x;
                positions[i + 1] = n2.y;
                positions[i + 2] = n2.z;
            }
        }
        return geometry;
    };

    return PolygonGeometryLibrary;
});