/*global define*/
define(['../Core/CorridorOutlineGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        CorridorOutlineGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createCorridorOutlineGeometry(corridorOutlineGeometry) {
        corridorOutlineGeometry._ellipsoid = Ellipsoid.clone(corridorOutlineGeometry._ellipsoid);
        return CorridorOutlineGeometry.createGeometry(corridorOutlineGeometry);
    }

    return createCorridorOutlineGeometry;
});
