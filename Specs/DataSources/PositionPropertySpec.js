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

    //Results of the below tests were verified against STK Components.
    var time = JulianDate.now();

    it('Works with entity input referenceFrame without orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(100001, 200002, 300003));
    });

    it('Works with entity input referenceFrame with orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame, ReferenceFrame.FIXED);

        expect(result).toEqual(new Cartesian3(99998, 200001, 300003));
    });

    it('Works with custom chained input referenceFrame', function() {
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

        expect(result).toEqual(new Cartesian3(99603, 200201, 300602));
    });

    it('Works with entity output referenceFrame without orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));

        var value = new Cartesian3(100001, 200002, 300003);
        var result = PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, referenceFrame);

        expect(result).toEqual(new Cartesian3(1, 2, 3));
    });

    it('Works with entity output referenceFrame with orientation', function() {
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000));
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(99998, 200001, 300003);
        var result = PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, referenceFrame);

        expect(result).toEqualEpsilon(new Cartesian3(1, 2, 3), CesiumMath.EPSILON7);
    });

    it('Works with chained output referenceFrame', function() {
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

        var value = new Cartesian3(99603, 200201, 300602);
        var result = PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, referenceFrame2);

        expect(result).toEqualEpsilon(new Cartesian3(1, 2, 3), CesiumMath.EPSILON7);
    });

    it('Works with entity input and output referenceFrame parameters', function() {
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

        expect(result).toEqualEpsilon(new Cartesian3(201, 397, 602), CesiumMath.EPSILON7);
    });

    it('Works when input and output referenceFrame parameters have a root entity reference frame', function() {
        var rootFrame = new Entity();
        
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000), rootFrame);
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var referenceFrame2 = new Entity();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), referenceFrame);
        orientation = new Quaternion(1, 0, 0, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame2.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, rootFrame);

        expect(result).toEqualEpsilon(new Cartesian3(99603, 200201, 300602), CesiumMath.EPSILON7);
    });

    it('returns undefined when input and output referenceFrames are disconnected', function() {
        var rootEntity = new Entity();
        var referenceFrame = new Entity();
        referenceFrame.position = new ConstantPositionProperty(new Cartesian3(100000, 200000, 300000), rootEntity);
        var orientation = new Quaternion(0, 0, 1, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame.orientation = new ConstantProperty(orientation);

        var rootEntity2 = new Entity();
        var referenceFrame2 = new Entity();
        referenceFrame2.position = new ConstantPositionProperty(new Cartesian3(200, 400, 600), rootEntity2);
        orientation = new Quaternion(1, 0, 0, 1);
        Quaternion.normalize(orientation, orientation);
        referenceFrame2.orientation = new ConstantProperty(orientation);

        var value = new Cartesian3(1, 2, 3);
        var result = PositionProperty.convertToReferenceFrame(time, value, referenceFrame2, referenceFrame);

        expect(result).toEqual(undefined);
    });
});
