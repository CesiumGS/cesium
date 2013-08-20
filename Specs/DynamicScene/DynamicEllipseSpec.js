/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicObject',
             'Core/Shapes',
             'Core/Ellipsoid',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Iso8601',
             'Core/TimeInterval',
             'Specs/MockProperty'
            ], function(
              DynamicEllipse,
              DynamicObject,
              Shapes,
              Ellipsoid,
              JulianDate,
              Cartesian3,
              Iso8601,
              TimeInterval,
              MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var position = new Cartesian3(1234, 5678, 9101112);

    it('mergeProperties does not change a fully configured ellipse', function() {
        var expectedSemiMajorAxis = new MockProperty();
        var expectedSemiMinorAxis = new MockProperty();
        var expectedBearing = new MockProperty();

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = new MockProperty();
        objectToMerge.semiMinorAxis = new MockProperty();
        objectToMerge.bearing = new MockProperty();

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

    it('mergeProperties creates and configures an undefined ellipse', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = new MockProperty();
        objectToMerge.semiMinorAxis = new MockProperty();
        objectToMerge.bearing = new MockProperty();

        var mergedObject = new DynamicObject('mergedObject');

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toEqual(objectToMerge.ellipse.semiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toEqual(objectToMerge.ellipse.semiMinorAxis);
        expect(mergedObject.ellipse.bearing).toEqual(objectToMerge.ellipse.bearing);
    });

    it('mergeProperties does not change when used with an undefined ellipse', function() {
        var expectedSemiMajorAxis = new MockProperty();
        var expectedSemiMinorAxis = new MockProperty();
        var expectedBearing = new MockProperty();
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

    it('getValue with no properties returns undefined', function() {
        var ellipse = new DynamicEllipse();
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();
    });

    it('getValue with no semiMajorAxis returns undefined', function() {
        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.bearing = new MockProperty(0);
        ellipse.semiMinorAxis = new MockProperty(10);
        ellipse.semiMajorAxis = undefined;
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();

        ellipse.semiMajorAxis = new MockProperty(undefined);
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();
    });

    it('getValue with no semiMinorAxis returns undefined', function() {
        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.bearing = new MockProperty(0);
        ellipse.semiMinorAxis = undefined;
        ellipse.semiMajorAxis = new MockProperty(10);
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();

        ellipse.semiMinorAxis = new MockProperty(undefined);
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();
    });

    it('getValue with no bearing uses zero', function() {
        var semiMinor = 10;
        var semiMajor = 20;
        var bearing = 0.0;

        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.semiMinorAxis = new MockProperty(semiMinor);
        ellipse.semiMajorAxis = new MockProperty(semiMajor);
        ellipse.bearing = undefined;

        var expected = Shapes.computeEllipseBoundary(Ellipsoid.WGS84, position, semiMajor, semiMinor, bearing);
        var result = ellipse.getValue(new JulianDate(), position);
        expect(result).toEqual(expected);

        ellipse.bearing = new MockProperty(undefined);
        result = ellipse.getValue(new JulianDate(), position);
        expect(result).toEqual(expected);
    });

    it('getValue uses bearing when specified.', function() {
        var semiMinor = 10;
        var semiMajor = 20;
        var bearing = 23.0;

        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.semiMinorAxis = new MockProperty(semiMinor);
        ellipse.semiMajorAxis = new MockProperty(semiMajor);
        ellipse.bearing = new MockProperty(bearing);

        var expected = Shapes.computeEllipseBoundary(Ellipsoid.WGS84, position, semiMajor, semiMinor, bearing);
        var result = ellipse.getValue(new JulianDate(), position);
        expect(result).toEqual(expected);
    });

    it('getValue caches results.', function() {
        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.semiMinorAxis = new MockProperty(10);
        ellipse.semiMajorAxis = new MockProperty(20);
        ellipse.bearing = new MockProperty(50);

        var result1 = ellipse.getValue(new JulianDate(), position);
        var result2 = ellipse.getValue(new JulianDate(), position);
        expect(result1).toBe(result2);

        ellipse.bearing = new MockProperty(75);
        result2 = ellipse.getValue(new JulianDate(), position);
        expect(result1).toNotBe(result2);
    });
});