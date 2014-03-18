/*global define*/
define(['../Core/CorridorGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        CorridorGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createCorridorGeometry(corridorGeometry) {
        corridorGeometry._ellipsoid = Ellipsoid.clone(corridorGeometry._ellipsoid);
        return CorridorGeometry.createGeometry(corridorGeometry);
    }

    return createCorridorGeometry;
});
