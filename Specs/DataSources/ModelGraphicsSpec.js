/*global defineSuite*/
defineSuite([
        'DataSources/ModelGraphics',
        'DataSources/ConstantProperty'
    ], function(
        ModelGraphics,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            uri : '0',
            scale : 1,
            show : false,
            minimumPixelSize : 2
        };

        var model = new ModelGraphics(options);
        expect(model.uri).toBeInstanceOf(ConstantProperty);
        expect(model.scale).toBeInstanceOf(ConstantProperty);
        expect(model.show).toBeInstanceOf(ConstantProperty);
        expect(model.minimumPixelSize).toBeInstanceOf(ConstantProperty);

        expect(model.uri.getValue()).toEqual(options.uri);
        expect(model.scale.getValue()).toEqual(options.scale);
        expect(model.show.getValue()).toEqual(options.show);
        expect(model.minimumPixelSize.getValue()).toEqual(options.minimumPixelSize);
    });

    it('merge assigns unassigned properties', function() {
        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);

        var target = new ModelGraphics();
        target.merge(source);

        expect(target.uri).toBe(source.uri);
        expect(target.show).toBe(source.show);
        expect(target.scale).toBe(source.scale);
        expect(target.minimumPixelSize).toBe(source.minimumPixelSize);
    });

    it('merge does not assign assigned properties', function() {
        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);

        var uri = new ConstantProperty('');
        var show = new ConstantProperty(true);
        var scale = new ConstantProperty(1.0);
        var minimumPixelSize = new ConstantProperty(2.0);

        var target = new ModelGraphics();
        target.uri = uri;
        target.show = show;
        target.scale = scale;
        target.minimumPixelSize = minimumPixelSize;

        target.merge(source);

        expect(target.uri).toBe(uri);
        expect(target.show).toBe(show);
        expect(target.scale).toBe(scale);
        expect(target.minimumPixelSize).toBe(minimumPixelSize);
    });

    it('clone works', function() {
        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);

        var result = source.clone();
        expect(result.uri).toBe(source.uri);
        expect(result.show).toBe(source.show);
        expect(result.scale).toBe(source.scale);
        expect(result.minimumPixelSize).toBe(source.minimumPixelSize);
    });

    it('merge throws if source undefined', function() {
        var target = new ModelGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});