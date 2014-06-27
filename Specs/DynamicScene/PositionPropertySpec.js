/*global defineSuite*/
defineSuite([
        'DynamicScene/PositionProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Math',
        'Core/Quaternion',
        'Core/ReferenceFrame',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicObject'
    ], function(
        PositionProperty,
        Cartesian3,
        JulianDate,
        CesiumMath,
        Quaternion,
        ReferenceFrame,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicObject) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    //Results of the below tests were verified against STK Components.
    var time = JulianDate.now();

    it('Works without orientation', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(100001, 200002, 300003));
    });

    it('Works with orientation', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        referenceFrame.orientation = new ConstantProperty(Quaternion.normalize(new Quaternion(0, 0, 1, 1)));

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(99998, 200001, 300003));
    });

    it('Works with chained reference frames', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        referenceFrame.orientation = new ConstantProperty(Quaternion.normalize(new Quaternion(0, 0, 1, 1)));

        var referenceFrame2 = new DynamicObject();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        referenceFrame2.orientation = new ConstantProperty(Quaternion.normalize(new Quaternion(1, 0, 0, 1)));

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(99603, 200201, 300602));
    });

    it('Works with rotated chained reference frames', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        referenceFrame.orientation = new ConstantProperty(Quaternion.normalize(new Quaternion(0, 0, 1, 1)));

        var referenceFrame2 = new DynamicObject();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        referenceFrame2.orientation = new ConstantProperty(Quaternion.normalize(new Quaternion(1, 0, 0, 1)));

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, referenceFrame2);

        expect(result).toEqual(new Cartesian3(99601, 200197, 300602));
    });

    it('Works with custom input and output frames', function() {
        var referenceFrame = new DynamicObject();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        referenceFrame.orientation = new ConstantProperty(Quaternion.normalize(new Quaternion(0, 0, 1, 1)));

        var referenceFrame2 = new DynamicObject();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        referenceFrame2.orientation = new ConstantProperty(Quaternion.normalize(new Quaternion(1, 0, 0, 1)));

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, referenceFrame);

        expect(result).toEqual(new Cartesian3(197, 399, 602), CesiumMath.EPSILON7);
    });
});