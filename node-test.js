var Cesium = require('./');
var fs = require('fs');

Cesium.isReady.then(function() {
    // Something trivial
    var vec = new Cesium.Cartesian3(0, 1, 2);
    console.log("The length of vector " + vec + " is " + Cesium.Cartesian3.magnitude(vec));

    /**
     * Generate a hypothetical flight path
     */
    var generateFlightArc = function(departCart, departTime, arriveCart, arriveTime) {

        var horizontalThreshold = 80000;
        var heightMultiplier = 0.1;
        var result = [];

        var geodesic = new Cesium.EllipsoidGeodesic(departCart, arriveCart);
        var distance = geodesic.getSurfaceDistance();
        var dt = departTime.getSecondsDifference(arriveTime);

        var segs = Math.ceil(distance / horizontalThreshold);
        if (segs < 3) {
            segs = 3;
        }

        for (var i = 0; i <= segs; ++i) {
            var fraction = i / segs;
            var height = 2.0 * (fraction - 0.5);
            height = 1.0 - height * height;
            height *= distance * heightMultiplier;

            var time = dt * fraction;
            var pos = geodesic.interpolateUsingFraction(fraction);
            result.push(time);
            result.push(pos.longitude);
            result.push(pos.latitude);
            result.push(height);
        }
        return result;
    };

    /**
     * Write CZML
     */

    var departCart = Cesium.Cartographic.fromDegrees(-118.4081, 33.9425);
    var departTime = Cesium.JulianDate.fromIso8601('2012-08-04T16:00:00Z');
    var arriveCart = Cesium.Cartographic.fromDegrees(-75.2411, 39.8719);
    var arriveTime = Cesium.JulianDate.fromIso8601('2012-08-04T17:04:54Z');

    var arc = generateFlightArc(departCart, departTime, arriveCart, arriveTime);

    var czml = [ {
        "id" : "Vehicle",
        "availability" : departTime.toIso8601() + "/" + arriveTime.toIso8601(),
        "point" : {
            'color' : {
                'rgba' : [ 255, 0, 0, 255 ]
            },
            'outlineWidth' : 2.0,
            'pixelSize' : 20.0,
            'show' : true
        },
        "path" : {
            "color" : {
                "rgba" : [ 255, 255, 0, 255 ]
            },
            "outlineWidth" : 0.0,
            "width" : 2.0,
            "show" : true
        },
        "position" : {
            "interpolationAlgorithm" : "LAGRANGE",
            "interpolationDegree" : 1,
            "epoch" : departTime.toIso8601(),
            "cartographicRadians" : arc
        }
    } ];

    var dstFile = './out.czml';
    fs.writeFile(dstFile, JSON.stringify(czml, undefined, 2));
    console.log("Wrote file to: " + dstFile);
});