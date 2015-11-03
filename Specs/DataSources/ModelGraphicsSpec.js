/*global defineSuite*/
defineSuite([
        'DataSources/ModelGraphics',
        'DataSources/ModelTransformProperty',
        'DataSources/ConstantProperty'
    ], function(
        ModelGraphics,
        ModelTransformProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            uri : '0',
            scale : 1,
            show : false,
            minimumPixelSize : 2,
            runAnimations : false,
            nodeTransformations : {
                node1 : new ModelTransformProperty()
            }
        };

        var model = new ModelGraphics(options);
        expect(model.uri).toBeInstanceOf(ConstantProperty);
        expect(model.scale).toBeInstanceOf(ConstantProperty);
        expect(model.show).toBeInstanceOf(ConstantProperty);
        expect(model.minimumPixelSize).toBeInstanceOf(ConstantProperty);
        expect(model.runAnimations).toBeInstanceOf(ConstantProperty);
        expect(model.nodeTransformations).toBeInstanceOf(ConstantProperty);

        expect(model.uri.getValue()).toEqual(options.uri);
        expect(model.scale.getValue()).toEqual(options.scale);
        expect(model.show.getValue()).toEqual(options.show);
        expect(model.runAnimations.getValue()).toEqual(options.runAnimations);
        expect(model.minimumPixelSize.getValue()).toEqual(options.minimumPixelSize);
        expect(model.nodeTransformations.getValue()).toEqual(options.nodeTransformations);
    });

    it('merge assigns unassigned properties', function() {
        var node1Transforms = new ModelTransformProperty();
        var node2Transforms = new ModelTransformProperty();

        var nodeTransforms = {
            node1 : node1Transforms,
            node2 : node2Transforms
        };

        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.runAnimations = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);
        source.nodeTransformations = nodeTransforms;

        var target = new ModelGraphics();
        target.merge(source);

        expect(target.uri).toBe(source.uri);
        expect(target.show).toBe(source.show);
        expect(target.scale).toBe(source.scale);
        expect(target.runAnimations).toBe(source.runAnimations);
        expect(target.minimumPixelSize).toBe(source.minimumPixelSize);
        expect(target.nodeTransformations).toBe(source.nodeTransformations);
    });

    it('merge does not assign assigned properties', function() {
        var node1Transforms = new ModelTransformProperty();
        var node2Transforms = new ModelTransformProperty();

        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.runAnimations = new ConstantProperty(true);
        source.minimumPixelSize = new ConstantProperty(2.0);
        source.nodeTransformations = new ConstantProperty({
            transform : node1Transforms
        });

        var uri = new ConstantProperty('');
        var show = new ConstantProperty(true);
        var scale = new ConstantProperty(1.0);
        var runAnimations = new ConstantProperty(true);
        var minimumPixelSize = new ConstantProperty(2.0);
        var nodeTransformations = new ConstantProperty({
            transform : node2Transforms
        });

        var target = new ModelGraphics();
        target.uri = uri;
        target.show = show;
        target.scale = scale;
        target.runAnimations = runAnimations;
        target.minimumPixelSize = minimumPixelSize;
        target.nodeTransformations = nodeTransformations;

        target.merge(source);

        expect(target.uri).toBe(uri);
        expect(target.show).toBe(show);
        expect(target.scale).toBe(scale);
        expect(target.runAnimations).toBe(runAnimations);
        expect(target.minimumPixelSize).toBe(minimumPixelSize);
        expect(target.nodeTransformations).toBe(nodeTransformations);
    });

    it('clone works', function() {
        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.runAnimations = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);
        source.nodeTransformations = {
            node1 : new ModelTransformProperty(),
            node2 : new ModelTransformProperty()
        };

        var result = source.clone();
        expect(result.uri).toBe(source.uri);
        expect(result.show).toBe(source.show);
        expect(result.runAnimations).toBe(source.runAnimations);
        expect(result.scale).toBe(source.scale);
        expect(result.minimumPixelSize).toBe(source.minimumPixelSize);
        expect(result.nodeTransformations).toBe(source.nodeTransformations);
    });

    it('merge throws if source undefined', function() {
        var target = new ModelGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});