/*global define*/
define(['./Cartographic3',
        './Cartesian3'
    ], function(
        Cartographic3,
        Cartesian3) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PolylinePipeline
     */
    var PolylinePipeline = {
        /*
         * DOC_TBA
         */
        wrapLongitude : function(ellipsoid, positions) {
            var segments = [];

            if (positions && (positions.length > 0)) {
                var length = positions.length;

                var currentSegment = [{
                    cartesian : Cartesian3.clone(positions[0]),
                    cartographic : ellipsoid.toCartographic3(positions[0]),
                    index : 0
                }];

                var prev = currentSegment[0].cartographic;

                for ( var i = 1; i < length; ++i) {
                    var cur = ellipsoid.toCartographic3(positions[i]);

                    if (Math.abs(prev.longitude - cur.longitude) > Math.PI) {
                        var interpolatedLongitude = prev.longitude < 0.0 ? -Math.PI : Math.PI;
                        var longitude = cur.longitude + (2.0 * interpolatedLongitude);
                        var ratio = (interpolatedLongitude - prev.longitude) / (longitude - prev.longitude);
                        var interpolatedLatitude = prev.latitude + (cur.latitude - prev.latitude) * ratio;
                        var interpolatedHeight = prev.height + (cur.height - prev.height) * ratio;

                        currentSegment.push({
                            cartesian : ellipsoid.toCartesian(new Cartographic3(interpolatedLongitude, interpolatedLatitude, interpolatedHeight)),
                            cartographic : new Cartographic3(interpolatedLongitude, interpolatedLatitude, interpolatedHeight),
                            index : i
                        });
                        segments.push(currentSegment);

                        currentSegment = [];
                        currentSegment.push({
                            cartesian : ellipsoid.toCartesian(new Cartographic3(-interpolatedLongitude, interpolatedLatitude, interpolatedHeight)),
                            cartographic : new Cartographic3(-interpolatedLongitude, interpolatedLatitude, interpolatedHeight),
                            index : i
                        });
                    }

                    currentSegment.push({
                        cartesian : Cartesian3.clone(positions[i]),
                        cartographic : ellipsoid.toCartographic3(positions[i]),
                        index : i
                    });

                    prev = cur.clone();
                }

                if (currentSegment.length > 1) {
                    segments.push(currentSegment);
                }
            }

            return segments;
        }
    };

    return PolylinePipeline;
});