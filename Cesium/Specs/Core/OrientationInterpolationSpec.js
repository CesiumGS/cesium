(function() {
    "use strict";
    /*global Cesium, describe, it, expect, beforeEach*/

   describe("OrientationInterpolator", function () {
       var OrientationInterpolator = Cesium.OrientationInterpolator;
       var Quaternion = Cesium.Quaternion;

       var points;
       beforeEach(function() {
          points = [
              {
                  orientation : new Quaternion(0.0, 0.0, 0.0, 1.0),
                  time : 0.0
              },
              {
                  orientation : new Quaternion(0.0, 0.0, Math.sin(Cesium.Math.PI_OVER_FOUR), Math.cos(Cesium.Math.PI_OVER_FOUR)),
                  time : 10.0
              },
              {
                  orientation : new Quaternion(0.0, -1.0, 0.0, Cesium.Math.toRadians(15.0)),
                  time : 20.0
              }
          ];
       });

       it("constructor throws an exception with invalid control points", function () {
           expect(function () {
               return new OrientationInterpolator();
           }).toThrow();

           expect(function () {
               return new OrientationInterpolator(1.0);
           }).toThrow();

           expect(function () {
               return new OrientationInterpolator([1.0]);
           }).toThrow();
       });

       it("get control points", function () {
           var oi = new OrientationInterpolator(points);
           expect(oi.getControlPoints()).toEqual(points);
       });

       it("evaluate fails with undefined time", function () {
           var oi = new OrientationInterpolator(points);
           expect(function() {
               oi.evaluate();
           }).toThrow();
       });

       it("evaluate fails with time out of range", function () {
           var oi = new OrientationInterpolator(points);

           expect(function() {
               oi.evaluate(points[0].time - 1.0);
           }).toThrow();

           expect(function() {
               oi.evaluate(points[points.length - 1].time + 1.0);
           }).toThrow();
       });

       it("evaluate can jump around in time", function () {
           var oi = new OrientationInterpolator(points);

           expect(oi.evaluate(points[0].time).equalsEpsilon(points[0].orientation, Cesium.Math.EPSILON12)).toBeTruthy();

           // jump forward
           expect(oi.evaluate(points[1].time).equalsEpsilon(points[1].orientation, Cesium.Math.EPSILON12)).toBeTruthy();

           // jump backward
           expect(oi.evaluate(points[0].time).equalsEpsilon(points[0].orientation, Cesium.Math.EPSILON12)).toBeTruthy();

           // jump far forward
           expect(oi.evaluate(points[points.length - 2].time).equalsEpsilon(points[points.length - 2].orientation, Cesium.Math.EPSILON12)).toBeTruthy();

           // jump far back
           expect(oi.evaluate(points[0].time).equalsEpsilon(points[0].orientation, Cesium.Math.EPSILON12)).toBeTruthy();
       });

       it("evaluate", function () {
           var oi = new OrientationInterpolator(points);
           var actual = oi.evaluate((points[0].time + points[1].time) * 0.5);
           var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));
           expect(actual.equalsEpsilon(expected, Cesium.Math.EPSILON15)).toBeTruthy();
       });
   });

}());
