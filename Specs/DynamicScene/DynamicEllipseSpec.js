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
             'DynamicScene/ConstantProperty',
             'Specs/UndefinedProperty'
            ], function(
              DynamicEllipse,
              DynamicObject,
              Shapes,
              Ellipsoid,
              JulianDate,
              Cartesian3,
              Iso8601,
              TimeInterval,
              ConstantProperty,
              UndefinedProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var position = new Cartesian3(1234, 5678, 9101112);

    it('mergeProperties does not change a fully configured ellipse', function() {
        var expectedSemiMajorAxis = new ConstantProperty(1);
        var expectedSemiMinorAxis = new ConstantProperty(2);
        var expectedBearing = new ConstantProperty(3);

        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = new ConstantProperty(4);
        objectToMerge.semiMinorAxis = new ConstantProperty(5);
        objectToMerge.bearing = new ConstantProperty(6);

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipse = new DynamicEllipse();
        mergedObject.ellipse.semiMajorAxis = expectedSemiMajorAxis;
        mergedObject.ellipse.semiMinorAxis = expectedSemiMinorAxis;
        mergedObject.ellipse.bearing = expectedBearing;

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toBe(expectedSemiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toBe(expectedSemiMinorAxis);
        expect(mergedObject.ellipse.bearing).toBe(expectedBearing);
    });

    it('mergeProperties creates and configures an undefined ellipse', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.ellipse = new DynamicEllipse();
        objectToMerge.semiMajorAxis = new ConstantProperty(1);
        objectToMerge.semiMinorAxis = new ConstantProperty(2);
        objectToMerge.bearing = new ConstantProperty(3);

        var mergedObject = new DynamicObject('mergedObject');

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toBe(objectToMerge.ellipse.semiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toBe(objectToMerge.ellipse.semiMinorAxis);
        expect(mergedObject.ellipse.bearing).toBe(objectToMerge.ellipse.bearing);
    });

    it('mergeProperties does not change when used with an undefined ellipse', function() {
        var expectedSemiMajorAxis = new ConstantProperty(1);
        var expectedSemiMinorAxis = new ConstantProperty(2);
        var expectedBearing = new ConstantProperty(3);
        var objectToMerge = new DynamicObject('objectToMerge');

        var mergedObject = new DynamicObject('mergedObject');
        mergedObject.ellipse = new DynamicEllipse();
        mergedObject.ellipse.semiMajorAxis = expectedSemiMajorAxis;
        mergedObject.ellipse.semiMinorAxis = expectedSemiMinorAxis;
        mergedObject.ellipse.bearing = expectedBearing;

        DynamicEllipse.mergeProperties(mergedObject, objectToMerge);

        expect(mergedObject.ellipse.semiMajorAxis).toBe(expectedSemiMajorAxis);
        expect(mergedObject.ellipse.semiMinorAxis).toBe(expectedSemiMinorAxis);
        expect(mergedObject.ellipse.bearing).toBe(expectedBearing);
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
        ellipse.bearing = new ConstantProperty(0);
        ellipse.semiMinorAxis = new ConstantProperty(10);
        ellipse.semiMajorAxis = undefined;
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();

        ellipse.semiMajorAxis = new UndefinedProperty();
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();
    });

    it('getValue with no semiMinorAxis returns undefined', function() {
        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.bearing = new ConstantProperty(0);
        ellipse.semiMinorAxis = undefined;
        ellipse.semiMajorAxis = new ConstantProperty(10);
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();

        ellipse.semiMinorAxis = new UndefinedProperty();
        expect(ellipse.getValue(new JulianDate(), position)).toBeUndefined();
    });

    it('getValue with no bearing uses zero', function() {
        var semiMinor = 10;
        var semiMajor = 20;
        var bearing = 0.0;

        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.semiMinorAxis = new ConstantProperty(semiMinor);
        ellipse.semiMajorAxis = new ConstantProperty(semiMajor);
        ellipse.bearing = undefined;

        var expected = Shapes.computeEllipseBoundary(Ellipsoid.WGS84, position, semiMajor, semiMinor, bearing);
        var result = ellipse.getValue(new JulianDate(), position);
        expect(result).toEqual(expected);

        ellipse.bearing = new UndefinedProperty();
        result = ellipse.getValue(new JulianDate(), position);
        expect(result).toEqual(expected);
    });

    it('getValue uses bearing when specified.', function() {
        var semiMinor = 10;
        var semiMajor = 20;
        var bearing = 23.0;

        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.semiMinorAxis = new ConstantProperty(semiMinor);
        ellipse.semiMajorAxis = new ConstantProperty(semiMajor);
        ellipse.bearing = new ConstantProperty(bearing);

        var expected = Shapes.computeEllipseBoundary(Ellipsoid.WGS84, position, semiMajor, semiMinor, bearing);
        var result = ellipse.getValue(new JulianDate(), position);
        expect(result).toEqual(expected);
    });

    it('getValue caches results.', function() {
        var ellipse = new DynamicEllipse();
        ellipse = new DynamicEllipse();
        ellipse.semiMinorAxis = new ConstantProperty(10);
        ellipse.semiMajorAxis = new ConstantProperty(20);
        ellipse.bearing = new ConstantProperty(50);

        var result1 = ellipse.getValue(new JulianDate(), position);
        var result2 = ellipse.getValue(new JulianDate(), position);
        expect(result1).toBe(result2);

        ellipse.bearing = new ConstantProperty(75);
        result2 = ellipse.getValue(new JulianDate(), position);
        expect(result1).toNotBe(result2);
    });
});