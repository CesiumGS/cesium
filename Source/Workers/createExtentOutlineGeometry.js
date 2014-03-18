/*global define*/
define(['../Core/ExtentOutlineGeometry',
        '../Core/Ellipsoid',
        '../Core/Extent'
    ], function(
        ExtentOutlineGeometry,
        Ellipsoid,
        Extent) {
    "use strict";

    function createExtentOutlineGeometry(extentGeometry) {
        extentGeometry._ellipsoid = Ellipsoid.clone(extentGeometry._ellipsoid);
        extentGeometry._extent = Extent.clone(extentGeometry._extent);
        return ExtentOutlineGeometry.createGeometry(extentGeometry);
    }

    return createExtentOutlineGeometry;
});
