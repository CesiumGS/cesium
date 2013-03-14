/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Core/Ellipsoid',
             'Core/Iso8601',
             'Core/TimeInterval',
             'Specs/MockProperty'
            ], function(
              DynamicEllipse,
              DynamicObject,
              JulianDate,
              Cartesian3,
              Color,
              Ellipsoid,
              Iso8601,
              TimeInterval,
              MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var ellipsePacket = {
        ellipse : {
            semiMajorAxis : 10,
            semiMinorAxis : 20,
            bearing:1.0
        }
    };

    var ellipsePacketInterval = {
        ellipse : {
            interval : '2000-01-01/2001-01-01',
            semiMajorAxis : 10,
            semiMinorAxis : 20,
            bearing:1.0
        }
    };

    it('processCzmlPacket adds data for infinite ellipse.', function() {
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipse.processCzmlPacket(dynamicObject, ellipsePacket)).toEqual(true);

        expect(dynamicObject.ellipse).toBeDefined();
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMajorAxis);
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMinorAxis);
        expect(dynamicObject.ellipse.bearing.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.bearing);
    });

    it('processCzmlPacket adds data for constrained ellipse.', function() {
        var validTime = TimeInterval.fromIso8601(ellipsePacketInterval.ellipse.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipse.processCzmlPacket(dynamicObject, ellipsePacketInterval)).toEqual(true);

        expect(dynamicObject.ellipse).toBeDefined();
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMajorAxis);
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMinorAxis);
        expect(dynamicObject.ellipse.bearing.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.bearing);

        expect(dynamicObject.ellipse.semiMajorAxis.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.bearing.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicEllipse.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.ellipse).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured ellipse', function() {
        var expectedSemiMajorAxis = 7;
        var expectedSemiMinorAxis = 8;
        var expectedBearing = 9;

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = 1;
        objectToMerge.semiMinorAxis = 2;
        objectToMerge.bearing = 3;

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipse = new DynamicEllipse();
        mergedObject.ellipse.semiMajorAxis = expectedSemiMajorAxis;
        mergedObject.ellipse.semiMinorAxis = expectedSemiMinorAxis;
        mergedObject.ellipse.bearing = expectedBearing;

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toEqual(expectedSemiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toEqual(expectedSemiMinorAxis);
        expect(mergedObject.ellipse.bearing).toEqual(expectedBearing);
    });

    it('getValue with no properties returns undefined', function(){

        var ellipse = new DynamicEllipse();
        expect(ellipse.getValue(new JulianDate(), Ellipsoid.WGS84, new MockProperty(new Cartesian3(1234, 5678, 9101112)))).toBeUndefined();
    });

    it('getValue with valid properties returns positions', function(){
        var dynamicObject = new DynamicObject('dynamicObject');
        var ellipse = dynamicObject.ellipse = new DynamicEllipse();
        DynamicEllipse.processCzmlPacket(dynamicObject, ellipsePacket);

        expect(ellipse.getValue(new JulianDate(), Ellipsoid.WGS84, new MockProperty(new Cartesian3(1234, 5678, 9101112))).length).toBeGreaterThan(0);
    });

    it('getValue with same properties returns cached positions', function(){
        var dynamicObject = new DynamicObject('dynamicObject');
        var ellipse = dynamicObject.ellipse = new DynamicEllipse();
        DynamicEllipse.processCzmlPacket(dynamicObject, ellipsePacket);
        var positions = ellipse.getValue(new JulianDate(), Ellipsoid.WGS84, new MockProperty(new Cartesian3(1234, 5678, 9101112)));
        var origLength = positions.length;
        expect(origLength).toBeGreaterThan(0);

        var newPositions = ellipse.getValue(new JulianDate(), Ellipsoid.WGS84, new MockProperty(new Cartesian3(1234, 5678, 9101112)));
        expect(positions).toEqual(newPositions);
    });

    it('getValue with different properties returns new positions', function(){
        var dynamicObject = new DynamicObject('dynamicObject');
        var ellipse = dynamicObject.ellipse = new DynamicEllipse();
        DynamicEllipse.processCzmlPacket(dynamicObject, ellipsePacket);
        var positions = ellipse.getValue(new JulianDate(), Ellipsoid.WGS84, new MockProperty(new Cartesian3(1234, 5678, 9101112)));
        var origLength = positions.length;
        expect(origLength).toBeGreaterThan(0);

        var newPositions = ellipse.getValue(new JulianDate(), Ellipsoid.WGS84, new MockProperty(new Cartesian3(2222, 5678, 9101112)));
        expect(positions).toNotEqual(newPositions);
    });

    it('mergeProperties creates and configures an undefined ellipse', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = 1;
        objectToMerge.semiMinorAxis = 2;
        objectToMerge.bearing = 3;

        var mergedObject = new DynamicObject('mergedObject');

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toEqual(objectToMerge.ellipse.semiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toEqual(objectToMerge.ellipse.semiMinorAxis);
        expect(mergedObject.ellipse.bearing).toEqual(objectToMerge.ellipse.bearing);
    });

    it('mergeProperties does not change when used with an undefined ellipse', function() {
        var expectedSemiMajorAxis = 7;
        var expectedSemiMinorAxis = 8;
        var expectedBearing = 9;
        var objectToMerge = new DynamicObject('objectToMerge');

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipse = new DynamicEllipse();
        mergedObject.ellipse.semiMajorAxis = expectedSemiMajorAxis;
        mergedObject.ellipse.semiMinorAxis = expectedSemiMinorAxis;
        mergedObject.ellipse.bearing = expectedBearing;

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toEqual(expectedSemiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toEqual(expectedSemiMinorAxis);
        expect(mergedObject.ellipse.bearing).toEqual(expectedBearing);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.ellipse = new DynamicEllipse();
        DynamicEllipse.undefineProperties(testObject);
        expect(testObject.ellipse).toBeUndefined();
    });
});