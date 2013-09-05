/*global define*/
define([
        './defined',
        './Cartesian2',
        './Cartesian3',
        './CornerType',
        './EllipsoidTangentPlane',
        './PolylinePipeline',
        './Matrix3',
        './Quaternion',
        './Math'
    ], function(
        defined,
        Cartesian2,
        Cartesian3,
        CornerType,
        EllipsoidTangentPlane,
        PolylinePipeline,
        Matrix3,
        Quaternion,
        CesiumMath) {
    "use strict";

    /**
     * @private
     */
    var PolylineVolumeGeometryLibrary = {};

    var originScratch = new Cartesian3();
    var nextScratch = new Cartesian3();
    var prevScratch = new Cartesian3();
    PolylineVolumeGeometryLibrary.angleIsGreaterThanPi = function (forward, backward, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, forward, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, backward, prevScratch), prevScratch);

        prev = Cartesian2.subtract(prev, origin, prev);
        next = Cartesian2.subtract(next, origin, next);

        return ((prev.x * next.y) - (prev.y * next.x)) >= 0.0;
    };

    PolylineVolumeGeometryLibrary.computeRotationAngle = function (start, end, position, ellipsoid) {
        var tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
        var origin = tangentPlane.projectPointOntoPlane(position, originScratch);
        var next = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, start, nextScratch), nextScratch);
        var prev = tangentPlane.projectPointOntoPlane(Cartesian3.add(position, end, prevScratch), prevScratch);
        prev = Cartesian2.subtract(prev, origin, prev);
        next = Cartesian2.subtract(next, origin, next);

        var angle = Cartesian2.angleBetween(next, prev);

        return (((prev.x * next.y) - (prev.y * next.x)) >= 0.0) ? -angle : angle;
    };

    return PolylineVolumeGeometryLibrary;
});