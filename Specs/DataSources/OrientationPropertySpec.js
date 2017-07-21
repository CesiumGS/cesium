/*global defineSuite*/
defineSuite([
        'DataSources/OrientationProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Math',
        'Core/Quaternion',
        'Core/ReferenceFrame',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity'
    ], function(
        OrientationProperty,
        Cartesian3,
        JulianDate,
        CesiumMath,
        Quaternion,
        ReferenceFrame,
        ConstantPositionProperty,
        ConstantProperty,
        Entity) {
    "use strict";

    var time = JulianDate.now();

    it('Works with custom input referenceFrame', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        referenceFrame.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));

        var value = new Quaternion(1, 0, 0, 1);
        var result = OrientationProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED);

        expect(result).toEqual(new Quaternion(1, 0, 0, 1));
    });

});
