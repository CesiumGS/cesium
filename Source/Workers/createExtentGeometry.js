/*global define*/
define(['../Core/ExtentGeometry',
        '../Core/Ellipsoid',
        '../Core/Extent'
    ], function(
        ExtentGeometry,
        Ellipsoid,
        Extent) {
    "use strict";

    function createExtentGeometry(extentGeometry) {
        extentGeometry._ellipsoid = Ellipsoid.clone(extentGeometry._ellipsoid);
        extentGeometry._extent = Extent.clone(extentGeometry._extent);
        return ExtentGeometry.createGeometry(extentGeometry);
    }

    return createExtentGeometry;
});
