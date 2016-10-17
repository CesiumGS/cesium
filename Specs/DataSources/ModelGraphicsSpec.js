/*global defineSuite*/
defineSuite([
        'DataSources/ModelGraphics',
        'Core/Cartesian3',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'Core/JulianDate',
        'Core/Quaternion',
        'DataSources/ConstantProperty',
        'DataSources/NodeTransformationProperty',
        'DataSources/PropertyBag',
        'Scene/ShadowMode'
    ], function(
        ModelGraphics,
        Cartesian3,
        Color,
        DistanceDisplayCondition,
        JulianDate,
        Quaternion,
        ConstantProperty,
        NodeTransformationProperty,
        PropertyBag,
        ShadowMode) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            uri : '0',
            scale : 1,
            show : false,
            minimumPixelSize : 2,
            maximumScale : 200,
            incrementallyLoadTextures : false,
            runAnimations : false,
            shadows : ShadowMode.DISABLED,
            distanceDisplayCondition : new DistanceDisplayCondition(),
            highlight: false,
            highlightSize: 3.0,
            highlightColor: new Color(1.0, 0.0, 0.0, 1.0),
            nodeTransformations : {
                node1 : {
                    translation : Cartesian3.UNIT_Y,
                    rotation : new Quaternion(0.5, 0.5, 0.5, 0.5),
                    scale : Cartesian3.UNIT_X
                }
            }
        };

        var model = new ModelGraphics(options);
        expect(model.uri).toBeInstanceOf(ConstantProperty);
        expect(model.scale).toBeInstanceOf(ConstantProperty);
        expect(model.show).toBeInstanceOf(ConstantProperty);
        expect(model.minimumPixelSize).toBeInstanceOf(ConstantProperty);
        expect(model.maximumScale).toBeInstanceOf(ConstantProperty);
        expect(model.incrementallyLoadTextures).toBeInstanceOf(ConstantProperty);
        expect(model.shadows).toBeInstanceOf(ConstantProperty);
        expect(model.runAnimations).toBeInstanceOf(ConstantProperty);
        expect(model.highlight).toBeInstanceOf(ConstantProperty);
        expect(model.highlightSize).toBeInstanceOf(ConstantProperty);
        expect(model.highlightColor).toBeInstanceOf(ConstantProperty);

        expect(model.nodeTransformations).toBeInstanceOf(PropertyBag);

        expect(model.uri.getValue()).toEqual(options.uri);
        expect(model.scale.getValue()).toEqual(options.scale);
        expect(model.show.getValue()).toEqual(options.show);
        expect(model.minimumPixelSize.getValue()).toEqual(options.minimumPixelSize);
        expect(model.maximumScale.getValue()).toEqual(options.maximumScale);
        expect(model.incrementallyLoadTextures.getValue()).toEqual(options.incrementallyLoadTextures);
        expect(model.shadows.getValue()).toEqual(options.shadows);
        expect(model.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
        expect(model.runAnimations.getValue()).toEqual(options.runAnimations);
        expect(model.highlight.getValue()).toEqual(options.highlight);
        expect(model.highlightSize.getValue()).toEqual(options.highlightSize);
        expect(model.highlightColor.getValue()).toEqual(options.highlightColor);

        var actualNodeTransformations = model.nodeTransformations.getValue(new JulianDate());
        var expectedNodeTransformations = options.nodeTransformations;

        // by default toEqual requires constructors to match.  for the purposes of this test, we only care about the structure.
        actualNodeTransformations = JSON.parse(JSON.stringify(actualNodeTransformations));
        expectedNodeTransformations = JSON.parse(JSON.stringify(expectedNodeTransformations));
        expect(actualNodeTransformations).toEqual(expectedNodeTransformations);
    });

    it('merge assigns unassigned properties', function() {
        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);
        source.maximumScale = new ConstantProperty(200.0);
        source.incrementallyLoadTextures = new ConstantProperty(true);
        source.shadows = new ConstantProperty(ShadowMode.ENABLED);
        source.highlight = new ConstantProperty(true);
        source.highlightSize = new ConstantProperty(3.0);
        source.highlightColor = new ConstantProperty(new Color(1.0, 0.0, 0.0, 1.0));
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());
        source.runAnimations = new ConstantProperty(true);
        source.nodeTransformations = {
            node1 : new NodeTransformationProperty({
                translation : Cartesian3.UNIT_Y,
                rotation : new Quaternion(0.5, 0.5, 0.5, 0.5),
                scale : Cartesian3.UNIT_X
            }),
            node2 : new NodeTransformationProperty({
                scale : Cartesian3.UNIT_Z
            })
        };

        var target = new ModelGraphics();
        target.merge(source);

        expect(target.uri).toBe(source.uri);
        expect(target.show).toBe(source.show);
        expect(target.scale).toBe(source.scale);
        expect(target.minimumPixelSize).toBe(source.minimumPixelSize);
        expect(target.maximumScale).toBe(source.maximumScale);
        expect(target.incrementallyLoadTextures).toBe(source.incrementallyLoadTextures);
        expect(target.shadows).toBe(source.shadows);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
        expect(target.runAnimations).toBe(source.runAnimations);
        expect(target.nodeTransformations).toEqual(source.nodeTransformations);
        expect(target.highlight).toEqual(source.highlight);
        expect(target.highlightSize).toEqual(source.highlightSize);
        expect(target.highlightColor).toEqual(source.highlightColor);
    });

    it('merge does not assign assigned properties', function() {
        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);
        source.maximumScale = new ConstantProperty(200.0);
        source.incrementallyLoadTextures = new ConstantProperty(true);
        source.shadows = new ConstantProperty(ShadowMode.ENABLED);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());
        source.runAnimations = new ConstantProperty(true);
        source.nodeTransformations = {
            transform : new NodeTransformationProperty()
        };
        source.highlight = new ConstantProperty(true);
        source.highlightSize = new ConstantProperty(1.0);
        source.highlightColor = new ConstantProperty(new Color());

        var uri = new ConstantProperty('');
        var show = new ConstantProperty(true);
        var scale = new ConstantProperty(1.0);
        var minimumPixelSize = new ConstantProperty(2.0);
        var maximumScale = new ConstantProperty(200.0);
        var incrementallyLoadTextures = new ConstantProperty(true);
        var shadows = new ConstantProperty(ShadowMode.ENABLED);
        var distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());
        var runAnimations = new ConstantProperty(true);
        var nodeTransformations = new PropertyBag({
            transform : new NodeTransformationProperty()
        });
        var highlight = new ConstantProperty(true);
        var highlightSize = new ConstantProperty(1.0);
        var highlightColor = new ConstantProperty(new Color());

        var target = new ModelGraphics();
        target.uri = uri;
        target.show = show;
        target.scale = scale;
        target.minimumPixelSize = minimumPixelSize;
        target.maximumScale = maximumScale;
        target.incrementallyLoadTextures = incrementallyLoadTextures;
        target.shadows = shadows;
        target.distanceDisplayCondition = distanceDisplayCondition;
        target.runAnimations = runAnimations;
        target.nodeTransformations = nodeTransformations;
        target.highlight = highlight;
        target.highlightSize = highlightSize;
        target.highlightColor = highlightColor;

        target.merge(source);

        expect(target.uri).toBe(uri);
        expect(target.show).toBe(show);
        expect(target.scale).toBe(scale);
        expect(target.minimumPixelSize).toBe(minimumPixelSize);
        expect(target.maximumScale).toBe(maximumScale);
        expect(target.incrementallyLoadTextures).toBe(incrementallyLoadTextures);
        expect(target.shadows).toBe(shadows);
        expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
        expect(target.runAnimations).toBe(runAnimations);
        expect(target.nodeTransformations).toBe(nodeTransformations);
        expect(target.highlight).toBe(highlight);
        expect(target.highlightSize).toBe(highlightSize);
        expect(target.highlightColor).toBe(highlightColor);
    });

    it('clone works', function() {
        var source = new ModelGraphics();
        source.uri = new ConstantProperty('');
        source.show = new ConstantProperty(true);
        source.scale = new ConstantProperty(1.0);
        source.minimumPixelSize = new ConstantProperty(2.0);
        source.maximumScale = new ConstantProperty(200.0);
        source.incrementallyLoadTextures = new ConstantProperty(true);
        source.shadows = new ConstantProperty(ShadowMode.ENABLED);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());
        source.runAnimations = new ConstantProperty(true);
        source.nodeTransformations = {
            node1 : new NodeTransformationProperty(),
            node2 : new NodeTransformationProperty()
        };
        source.highlight = new ConstantProperty(true);
        source.highlightSize = new ConstantProperty(2.0);
        source.highlightColor = new ConstantProperty(new Color());

        var result = source.clone();
        expect(result.uri).toBe(source.uri);
        expect(result.show).toBe(source.show);
        expect(result.scale).toBe(source.scale);
        expect(result.minimumPixelSize).toBe(source.minimumPixelSize);
        expect(result.maximumScale).toBe(source.maximumScale);
        expect(result.incrementallyLoadTextures).toBe(source.incrementallyLoadTextures);
        expect(result.shadows).toBe(source.shadows);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
        expect(result.runAnimations).toBe(source.runAnimations);
        expect(result.nodeTransformations).toEqual(source.nodeTransformations);
        expect(result.highlight).toEqual(source.highlight);
        expect(result.highlightSize).toEqual(source.highlightSize);
        expect(result.highlightColor).toEqual(source.highlightColor);
    });

    it('merge throws if source undefined', function() {
        var target = new ModelGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});
