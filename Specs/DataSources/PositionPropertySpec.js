/*global defineSuite*/
defineSuite([
        'DataSources/PositionProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Math',
        'Core/Quaternion',
        'Core/ReferenceFrame',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity'
    ], function(
        PositionProperty,
        Cartesian3,
        JulianDate,
        CesiumMath,
        Quaternion,
        ReferenceFrame,
        ConstantPositionProperty,
        ConstantProperty,
        Entity) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    //Results of the below tests were verified against STK Components.
    var time = JulianDate.now();

    it('Works with custom input referenceFrame without orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(100001, 200002, 300003));
    });

    it('Works with custom input referenceFrame with orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(99998, 200001, 300003));
    });

    it('Works with custom chained input reference', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var referenceFrame2 = new Entity();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        orientation = new Quaternion(1, 0, 0, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame2.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(99601, 200197, 300602));
    });

    it('Works with custom ouput referenceFrame without orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));

        var value = new Cartesian3(100001, 200002, 300003);
        var result = PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, referenceFrame);

        expect(result).toEqual(new Cartesian3(1, 2, 3));
    });

    it('Works with custom ouput referenceFrame with orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(99998, 200001, 300003);
        var result = PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, referenceFrame);

        expect(result).toEqual(new Cartesian3(1, 2, 3));
    });

    it('Works with custom chained ouput referenceFrame', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var referenceFrame2 = new Entity();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        orientation = new Quaternion(1, 0, 0, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame2.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(99601, 200197, 300602);
        var result = PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, referenceFrame2);

        expect(result).toEqual(new Cartesian3(1, 2, 3));
    });

    it('Works with custom input and output referenceFrames', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var referenceFrame2 = new Entity();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        orientation = new Quaternion(1, 0, 0, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame2.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, referenceFrame);

        expect(result).toEqual(new Cartesian3(197, 399, 602), CesiumMath.EPSILON7);
    });
});