/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicMaterialProperty',
             'Core/Color',
             'Core/JulianDate',
             'Core/TimeInterval',
             'Scene/Material',
             'Specs/createContext',
             'Specs/destroyContext'
         ], function(
             DynamicMaterialProperty,
             Color,
             JulianDate,
             TimeInterval,
             Material,
             createContext,
             destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    var solidColor = Color.fromBytes(255, 0, 0, 77);

    var staticColorCzml = {
        solidColor : {
            color : {
                rgba : [255, 0, 0, 77]
            }
        }
    };

    var staticImageCzml = {
        image : {
            image : 'someImage'
        }
    };

    var constrainedImageCzml = [{
        interval : '2012-03-15/2012-03-16',
        image : {
            image : 'someImage'
        }
    }];

    it('Supports color materials.', function() {
        var property = new DynamicMaterialProperty();
        property.processCzmlIntervals(staticColorCzml, undefined, undefined);
        var material = property.getValue(new JulianDate(), context);
        expect(material.type).toEqual(Material.ColorType);
        expect(material.uniforms.color).toEqual(solidColor);
    });

    it('Supports image materials.', function() {
        var property = new DynamicMaterialProperty();
        property.processCzmlIntervals(staticImageCzml, undefined, undefined);
        var material = property.getValue(new JulianDate(), context);
        expect(material.type).toEqual(Material.ImageType);
        expect(material.uniforms.image).toEqual(staticImageCzml.image.image);
    });

    it('Constrains data to CZML defined Interval', function() {
        var property = new DynamicMaterialProperty();
        property.processCzmlIntervals(constrainedImageCzml, undefined, undefined);

        var interval = TimeInterval.fromIso8601(constrainedImageCzml[0].interval);

        var material = property.getValue(interval.stop.addSeconds(1), context);
        expect(material).toBeUndefined();

        material = property.getValue(interval.start, context);
        expect(material.type).toEqual(Material.ImageType);
        expect(material.uniforms.image).toEqual(constrainedImageCzml[0].image.image);

        material = property.getValue(interval.start.addSeconds(-1), context);
        expect(material).toBeUndefined();

        material = property.getValue(interval.stop, context);
        expect(material.type).toEqual(Material.ImageType);
        expect(material.uniforms.image).toEqual(constrainedImageCzml[0].image.image);
    });

    it('Works with different materials over time.', function() {
        var property = new DynamicMaterialProperty();
        property.processCzmlIntervals(staticColorCzml, TimeInterval.fromIso8601('2012-03-15/2012-03-16'), undefined);
        property.processCzmlIntervals(staticImageCzml, TimeInterval.fromIso8601('2012-03-16/2012-03-17'), undefined);

        var material = property.getValue(JulianDate.fromIso8601('2012-03-16'), context);
        expect(material.type).toEqual(Material.ImageType);
        expect(material.uniforms.image).toEqual(staticImageCzml.image.image);

        material = property.getValue(JulianDate.fromIso8601('2012-03-15'), context, material);
        expect(material.type).toEqual(Material.ColorType);
        expect(material.uniforms.color).toEqual(solidColor);

        material = property.getValue(JulianDate.fromIso8601('2012-03-18'), context);
        expect(material).toBeUndefined();
    });

    it('Incrementally processing CZML can replace existing material intervals.', function() {
        var property = new DynamicMaterialProperty();
        var date = new JulianDate();

        property.processCzmlIntervals(staticColorCzml, undefined, undefined);
        var material = property.getValue(date, context, material);
        expect(material.type).toEqual(Material.ColorType);
        expect(material.uniforms.color).toEqual(solidColor);

        property.processCzmlIntervals(staticImageCzml, undefined, undefined);
        material = property.getValue(date, context);
        expect(material.type).toEqual(Material.ImageType);
        expect(material.uniforms.image).toEqual(staticImageCzml.image.image);
    });
}, 'WebGL');
