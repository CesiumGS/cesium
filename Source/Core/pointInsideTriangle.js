import barycentricCoordinates from './barycentricCoordinates.js';
import Cartesian3 from './Cartesian3.js';

    var coords = new Cartesian3();

    /**
     * Determines if a point is inside a triangle.
     *
     * @exports pointInsideTriangle
     *
     * @param {Cartesian2|Cartesian3} point The point to test.
     * @param {Cartesian2|Cartesian3} p0 The first point of the triangle.
     * @param {Cartesian2|Cartesian3} p1 The second point of the triangle.
     * @param {Cartesian2|Cartesian3} p2 The third point of the triangle.
     * @returns {Boolean} <code>true</code> if the point is inside the triangle; otherwise, <code>false</code>.
     *
     * @example
     * // Returns true
     * var p = new Cesium.Cartesian2(0.25, 0.25);
     * var b = Cesium.pointInsideTriangle(p,
     *   new Cesium.Cartesian2(0.0, 0.0),
     *   new Cesium.Cartesian2(1.0, 0.0),
     *   new Cesium.Cartesian2(0.0, 1.0));
     */
    function pointInsideTriangle(point, p0, p1, p2) {
        barycentricCoordinates(point, p0, p1, p2, coords);
        return (coords.x > 0.0) && (coords.y > 0.0) && (coords.z > 0);
    }
export default pointInsideTriangle;
