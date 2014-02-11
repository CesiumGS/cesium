/*global defineSuite*/
defineSuite(['DynamicScene/EllipseGeometryUpdater',
             'DynamicScene/DynamicObject',
             'DynamicScene/DynamicEllipse',
             'Core/Cartesian3',
             'Core/Color',
             'Core/JulianDate',
             'DynamicScene/ConstantProperty',
             'DynamicScene/ConstantPositionProperty',
             'DynamicScene/GeometryBatchType',
             'DynamicScene/GridMaterialProperty',
             'DynamicScene/SampledProperty',
             'DynamicScene/SampledPositionProperty'
         ], function(
             EllipseGeometryUpdater,
             DynamicObject,
             DynamicEllipse,
             Cartesian3,
             Color,
             JulianDate,
             ConstantProperty,
             ConstantPositionProperty,
             GeometryBatchType,
             GridMaterialProperty,
             SampledProperty,
             SampledPositionProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('GeometryBatchType is always set correctly', function() {
        //Undefined position && ellipse
        var dynamicObject = new DynamicObject();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        expect(updater.geometryType).toBe(GeometryBatchType.NONE);

        //Undefined ellipse
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3());
        expect(updater.geometryType).toBe(GeometryBatchType.NONE);

        //Undefined ellipse.semiMajorAxis && ellipse.semiMinorAxis
        var ellipse = new DynamicEllipse();
        dynamicObject.ellipse = ellipse;
        expect(updater.geometryType).toBe(GeometryBatchType.NONE);

        //Undefined ellipse.semiMinorAxis
        ellipse.semiMajorAxis = new ConstantProperty(1);
        expect(updater.geometryType).toBe(GeometryBatchType.NONE);

        //Undefined ellipse.semiMajorAxis
        ellipse.semiMajorAxis = undefined;
        ellipse.semiMinorAxis = new ConstantProperty(2);
        expect(updater.geometryType).toBe(GeometryBatchType.NONE);

        //Default color
        ellipse.semiMajorAxis = new ConstantProperty(1);
        ellipse.semiMinorAxis = new ConstantProperty(2);
        expect(updater.geometryType).toBe(GeometryBatchType.COLOR_OPEN);

        //Non-color material
        ellipse.material = new GridMaterialProperty();
        expect(updater.geometryType).toBe(GeometryBatchType.MATERIAL_OPEN);

        //Dynamic position
        dynamicObject.position = new SampledPositionProperty();
        dynamicObject.position.addSample(new JulianDate(), new Cartesian3());
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);

        //Dynamic semiMinorAxis
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3());
        ellipse.semiMinorAxis = new SampledProperty(Number);
        ellipse.semiMinorAxis.addSample(new JulianDate(), 1);
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);

        //Dynamic semiMajorAxis
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.semiMajorAxis = new SampledProperty(Number);
        ellipse.semiMajorAxis.addSample(new JulianDate(), 1);
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);

        //Dynamic rotation
        ellipse.semiMajorAxis = new ConstantProperty(1);
        ellipse.rotation = new SampledProperty(Number);
        ellipse.rotation.addSample(new JulianDate(), 1);
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);

        //Dynamic height
        ellipse.rotation = new ConstantProperty(1);
        ellipse.height = new SampledProperty(Number);
        ellipse.height.addSample(new JulianDate(), 1);
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);

        //Dynamic extrudedHeight
        ellipse.height = new ConstantProperty(1);
        ellipse.extrudedHeight = new SampledProperty(Number);
        ellipse.extrudedHeight.addSample(new JulianDate(), 1);
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);

        //Dynamic granularity
        ellipse.extrudedHeight = new ConstantProperty(1);
        ellipse.granularity = new SampledProperty(Number);
        ellipse.granularity.addSample(new JulianDate(), 1);
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);

        //Dynamic stRotation
        ellipse.granularity = new ConstantProperty(1);
        ellipse.stRotation = new SampledProperty(Number);
        ellipse.stRotation.addSample(new JulianDate(), 1);
        expect(updater.geometryType).toBe(GeometryBatchType.DYNAMIC);
    });

    it('Throws if DynamicObject supplied', function() {
        expect(function() {
            return new EllipseGeometryUpdater();
        }).toThrow();
    });
});