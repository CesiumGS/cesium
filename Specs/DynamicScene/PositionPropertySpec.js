/*global defineSuite*/
defineSuite([
        'DynamicScene/PositionProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Quaternion',
        'Core/ReferenceFrame',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicObject'
    ], function(
        PositionProperty,
        Cartesian3,
        JulianDate,
        Quaternion,
        ReferenceFrame,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicObject) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    it('Works with unrotated positions', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100, 200, 300));
        referenceFrame.orientation = new ConstantProperty(Quaternion.IDENTITY);

        var time = new JulianDate();
        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED, new Cartesian3());

        expect(result).toEqual(new Cartesian3(101, 202, 303));
    });

    it('Works with chained reference frames', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100, 200, 300));
        referenceFrame.orientation = new ConstantProperty(Quaternion.IDENTITY);

        var referenceFrame2 = new DynamicObject();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        referenceFrame2.orientation = new ConstantProperty(Quaternion.IDENTITY);

        var time = new JulianDate();
        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, ReferenceFrame.FIXED, new Cartesian3());

        expect(result).toEqual(new Cartesian3(301, 602, 903));
    });

    it('Works with custom input and output frames', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100, 200, 300));
        referenceFrame.orientation = new ConstantProperty(Quaternion.IDENTITY);

        var referenceFrame2 = new DynamicObject();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(100, 200, 300), referenceFrame);
        referenceFrame2.orientation = new ConstantProperty(Quaternion.IDENTITY);

        var time = new JulianDate();
        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, referenceFrame, new Cartesian3());

        expect(result).toEqual(new Cartesian3(101, 202, 303));
    });
});