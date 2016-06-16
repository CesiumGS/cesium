/*global defineSuite*/
defineSuite([
        'Scene/LabelCollection',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/NearFarScalar',
        'Core/Rectangle',
        'Renderer/ContextLimits',
        'Scene/HeightReference',
        'Scene/HorizontalOrigin',
        'Scene/LabelStyle',
        'Scene/OrthographicFrustum',
        'Scene/VerticalOrigin',
        'Specs/createGlobe',
        'Specs/createScene'
    ], function(
        LabelCollection,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        Ellipsoid,
        CesiumMath,
        NearFarScalar,
        Rectangle,
        ContextLimits,
        HeightReference,
        HorizontalOrigin,
        LabelStyle,
        OrthographicFrustum,
        VerticalOrigin,
        createGlobe,
        createScene) {
    'use strict';

    // TODO: rendering tests for pixel offset, eye offset, horizontal origin, vertical origin, font, style, outlineColor, outlineWidth, and fillColor properties

    var scene;
    var camera;
    var labels;
    var labelsWithHeight;

    beforeAll(function() {
        scene = createScene();
        camera = scene.camera;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });
    beforeEach(function() {
        scene.morphTo3D(0);

        camera.position = new Cartesian3(10.0, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

        labels = new LabelCollection();
        scene.primitives.add(labels);
    });

    afterEach(function() {
        // labels are destroyed by removeAll().
        scene.primitives.removeAll();
    });

    it('has default values when adding a label', function() {
        var label = labels.add();
        expect(label.show).toEqual(true);
        expect(label.position).toEqual(Cartesian3.ZERO);
        expect(label.text).toEqual('');
        expect(label.font).toEqual('30px sans-serif');
        expect(label.fillColor).toEqual(Color.WHITE);
        expect(label.outlineColor).toEqual(Color.BLACK);
        expect(label.outlineWidth).toEqual(1);
        expect(label.style).toEqual(LabelStyle.FILL);
        expect(label.pixelOffset).toEqual(Cartesian2.ZERO);
        expect(label.eyeOffset).toEqual(Cartesian3.ZERO);
        expect(label.heightReference).toEqual(HeightReference.NONE);
        expect(label.horizontalOrigin).toEqual(HorizontalOrigin.LEFT);
        expect(label.verticalOrigin).toEqual(VerticalOrigin.BOTTOM);
        expect(label.scale).toEqual(1.0);
        expect(label.id).not.toBeDefined();
        expect(label.translucencyByDistance).not.toBeDefined();
        expect(label.pixelOffsetScaleByDistance).not.toBeDefined();
    });

    it('can add a label with specified values', function() {
        var show = false;
        var position = new Cartesian3(1.0, 2.0, 3.0);
        var text = 'abc';
        var font = '24px "Open Sans"';
        var fillColor = {
            red : 2.0,
            green : 3.0,
            blue : 4.0,
            alpha : 1.0
        };
        var outlineColor = {
            red : 3.0,
            green : 4.0,
            blue : 2.0,
            alpha : 1.0
        };
        var outlineWidth = 2;

        var style = LabelStyle.FILL_AND_OUTLINE;
        var pixelOffset = new Cartesian2(4.0, 5.0);
        var eyeOffset = new Cartesian3(6.0, 7.0, 8.0);
        var horizontalOrigin = HorizontalOrigin.LEFT;
        var verticalOrigin = VerticalOrigin.BOTTOM;
        var scale = 2.0;
        var translucency = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
        var pixelOffsetScale = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
        var label = labels.add({
            show : show,
            position : position,
            text : text,
            font : font,
            fillColor : fillColor,
            outlineColor : outlineColor,
            outlineWidth : outlineWidth,
            style : style,
            pixelOffset : pixelOffset,
            eyeOffset : eyeOffset,
            horizontalOrigin : horizontalOrigin,
            verticalOrigin : verticalOrigin,
            scale : scale,
            id : 'id',
            translucencyByDistance : translucency,
            pixelOffsetScaleByDistance : pixelOffsetScale
        });

        expect(label.show).toEqual(show);
        expect(label.position).toEqual(position);
        expect(label.text).toEqual(text);
        expect(label.font).toEqual(font);
        expect(label.fillColor).toEqual(fillColor);
        expect(label.outlineColor).toEqual(outlineColor);
        expect(label.outlineWidth).toEqual(outlineWidth);
        expect(label.style).toEqual(style);
        expect(label.pixelOffset).toEqual(pixelOffset);
        expect(label.eyeOffset).toEqual(eyeOffset);
        expect(label.horizontalOrigin).toEqual(horizontalOrigin);
        expect(label.verticalOrigin).toEqual(verticalOrigin);
        expect(label.scale).toEqual(scale);
        expect(label.id).toEqual('id');
        expect(label.translucencyByDistance).toEqual(translucency);
        expect(label.pixelOffsetScaleByDistance).toEqual(pixelOffsetScale);
    });

    it('can specify font using units other than pixels', function() {
        var label = labels.add({
            font : '12pt "Open Sans"',
            text : 'Hello there'
        });
        scene.renderForSpecs();

        var dimensions = label._glyphs[0].dimensions;
        expect(dimensions.height).toBeGreaterThan(0);
    });

    it('has zero labels when constructed', function() {
        expect(labels.length).toEqual(0);
    });

    it('can add a label', function() {
        var label = labels.add();

        expect(labels.length).toEqual(1);
        expect(labels.get(0)).toBe(label);
    });

    it('can remove the first label', function() {
        var one = labels.add();
        var two = labels.add();

        expect(labels.contains(one)).toEqual(true);
        expect(labels.contains(two)).toEqual(true);

        expect(labels.remove(one)).toEqual(true);

        expect(labels.contains(one)).toEqual(false);
        expect(labels.contains(two)).toEqual(true);
    });

    it('can remove the last label', function() {
        var one = labels.add();
        var two = labels.add();

        expect(labels.contains(one)).toEqual(true);
        expect(labels.contains(two)).toEqual(true);

        expect(labels.remove(two)).toEqual(true);

        expect(labels.contains(one)).toEqual(true);
        expect(labels.contains(two)).toEqual(false);
    });

    it('returns false when removing undefined', function() {
        labels.add();
        expect(labels.length).toEqual(1);
        expect(labels.remove(undefined)).toEqual(false);
        expect(labels.length).toEqual(1);
    });

    it('returns false when removing a previously removed label', function() {
        var label = labels.add();
        expect(labels.length).toEqual(1);
        expect(labels.remove(label)).toEqual(true);
        expect(labels.remove(label)).toEqual(false);
        expect(labels.length).toEqual(0);
    });

    it('is not destroyed', function() {
        expect(labels.isDestroyed()).toEqual(false);
    });

    it('can add and remove multiple labels', function() {
        var one = labels.add();
        var two = labels.add();
        var three = labels.add();

        expect(labels.remove(one)).toEqual(true);
        expect(labels.remove(two)).toEqual(true);

        expect(one.isDestroyed()).toEqual(true);
        expect(two.isDestroyed()).toEqual(true);
        expect(three.isDestroyed()).toEqual(false);

        expect(labels.contains(one)).toEqual(false);
        expect(labels.contains(two)).toEqual(false);
        expect(labels.contains(three)).toEqual(true);

        expect(labels.length).toEqual(1);
        expect(labels.get(0)).toBe(three);

        var four = labels.add();
        expect(labels.length).toEqual(2);
        expect(labels.get(0)).toBe(three);
        expect(labels.get(1)).toBe(four);
        expect(labels.contains(three)).toEqual(true);
        expect(labels.contains(four)).toEqual(true);
    });

    it('can remove all labels', function() {
        labels.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        labels.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });
        expect(labels.length).toEqual(2);

        labels.removeAll();
        expect(labels.length).toEqual(0);
    });

    it('can check if it contains a label', function() {
        var label = labels.add();

        expect(labels.contains(label)).toEqual(true);
    });

    it('returns false when checking if it contains a label it does not contain', function() {
        var label = labels.add();
        labels.remove(label);

        expect(labels.contains(label)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(labels.contains(undefined)).toEqual(false);
    });

    it('does not contain random other objects', function() {
        expect(labels.contains({})).toEqual(false);
        expect(labels.contains(new Cartesian2())).toEqual(false);
    });

    it('does not render when constructed', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('can render after modifying and removing a label', function() {
        var labelOne = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });
        labels.add({
            position : Cartesian3.ZERO,
            text : 'o',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        labelOne.scale = 2.0;
        labels.remove(labelOne);

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('can render a label', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);
    });

    it('can render after adding a label', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var actual = scene.renderForSpecs();
        expect(actual[0]).toBeGreaterThan(10);
        expect(actual[1]).toBeGreaterThan(10);
        expect(actual[2]).toBeGreaterThan(10);

        labels.add({
            position : new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
            text : 'x',
            fillColor : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            },
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        actual = scene.renderForSpecs();
        expect(actual[0]).toBeGreaterThan(10);
        expect(actual[1]).toBeLessThan(10);
        expect(actual[2]).toBeLessThan(10);
    });

    it('can render after removing a label', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        labels.remove(label);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('can render after removing and adding a label', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        labels.remove(label);
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);
    });

    it('can render after removing all labels', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        labels.removeAll();
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('can render after removing all labels and adding a label', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        labels.removeAll();
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);
    });

    it('does not render labels with show set to false', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        label.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        label.show = true;
        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);
    });

    it('does not render labels that are behind the viewer', function() {
        var label = labels.add({
            position : new Cartesian3(20.0, 0.0, 0.0), // Behind camera
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        label.position = Cartesian3.ZERO; // Back in front of camera
        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);
    });

    it('does not render labels with a scale of zero', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        label.scale = 0.0;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        label.scale = 2.0;
        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);
    });

    it('renders label with translucencyByDistance', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            translucencyByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0)
        });

        camera.position = new Cartesian3(2.0, 0.0, 0.0);
        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        camera.position = new Cartesian3(4.0, 0.0, 0.0);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('renders label with pixelOffsetScaleByDistance', function() {
        labels.add({
            position : Cartesian3.ZERO,
            pixelOffset : new Cartesian2(1.0, 0.0),
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            pixelOffsetScaleByDistance: new NearFarScalar(2.0, 0.0, 4.0, 1000.0)
        });

        camera.position = new Cartesian3(2.0, 0.0, 0.0);
        expect(scene.renderForSpecs()[0]).toBeGreaterThan(10);

        camera.position = new Cartesian3(4.0, 0.0, 0.0);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('can pick a label', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            id : 'id'
        });

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(label);
        expect(pick.id).toEqual('id');
    });

    it('can change pick id', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            id : 'id'
        });

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(label);
        expect(pick.id).toEqual('id');

        label.id = 'id2';

        pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(label);
        expect(pick.id).toEqual('id2');
    });

    it('does not pick a label with show set to false', function() {
        labels.add({
            show : false,
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

    it('picks a label using translucencyByDistance', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var translucency = new NearFarScalar(1.0, 0.9, 3.0e9, 0.8);
        label.translucencyByDistance = translucency;

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(label);

        translucency.nearValue = 0.0;
        translucency.farValue = 0.0;
        label.translucencyByDistance = translucency;

        pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

    it('picks a label using pixelOffsetScaleByDistance', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            pixelOffset : new Cartesian2(0.0, 100.0),
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var pixelOffsetScale = new NearFarScalar(1.0, 0.0, 3.0e9, 0.0);
        label.pixelOffsetScaleByDistance = pixelOffsetScale;

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(label);

        pixelOffsetScale.nearValue = 10.0;
        pixelOffsetScale.farValue = 10.0;
        label.pixelOffsetScaleByDistance = pixelOffsetScale;

        pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

    it('throws when calling get without an index', function() {
        expect(function() {
            labels.get();
        }).toThrowDeveloperError();
    });

    it('should reuse canvases for letters, but only if other settings are the same', function() {
        labels.add({
            text : 'a'
        });
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(1);

        labels.add({
            text : 'a'
        });
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(1);

        labels.add({
            text : 'abcd'
        });
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(4);

        labels.add({
            text : 'abc'
        });
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(4);

        var label = labels.add({
            text : 'de'
        });
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(5);

        var originalFont = label.font;
        label.font = '30px "Open Sans"';
        expect(label.font).not.toEqual(originalFont); // otherwise this test needs fixing.
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);

        label.style = LabelStyle.OUTLINE;
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(9);

        label.fillColor = new Color(1.0, 165.0 / 255.0, 0.0, 1.0);
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(11);

        label.outlineColor = new Color(1.0, 1.0, 1.0, 1.0);
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(13);

        // vertical origin only affects glyph positions, not glyphs themselves.
        label.verticalOrigin = VerticalOrigin.CENTER;
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(13);
        label.verticalOrigin = VerticalOrigin.TOP;
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(13);

        //even though we're resetting to the original font, other properties used to create the id have changed
        label.font = originalFont;
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(15);

        //Changing thickness requires new glyphs
        label.outlineWidth = 3;
        scene.renderForSpecs();
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(17);
    });

    it('should reuse billboards that are not needed any more', function() {
        var label = labels.add({
            text : 'abc'
        });
        scene.renderForSpecs();
        expect(labels._billboardCollection.length).toEqual(3);

        label.text = 'a';
        scene.renderForSpecs();
        expect(labels._billboardCollection.length).toEqual(3);

        label.text = 'def';
        scene.renderForSpecs();
        expect(labels._billboardCollection.length).toEqual(3);
    });

    describe('Label', function() {
        it('can set properties after being added', function() {
            var label = labels.add();

            var show = false;
            var position = new Cartesian3(1.0, 2.0, 3.0);
            var text = 'abc';
            var font = '24px "Open Sans"';
            var fillColor = {
                red : 2.0,
                green : 3.0,
                blue : 4.0,
                alpha : 1.0
            };
            var outlineColor = {
                red : 3.0,
                green : 4.0,
                blue : 2.0,
                alpha : 1.0
            };
            var outlineWidth = 2;
            var style = LabelStyle.FILL_AND_OUTLINE;
            var pixelOffset = new Cartesian2(4.0, 5.0);
            var eyeOffset = new Cartesian3(6.0, 7.0, 8.0);
            var horizontalOrigin = HorizontalOrigin.LEFT;
            var verticalOrigin = VerticalOrigin.BOTTOM;
            var scale = 2.0;
            var translucency = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
            var pixelOffsetScale = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);

            label.show = show;
            label.position = position;
            label.text = text;
            label.font = font;
            label.fillColor = fillColor;
            label.outlineColor = outlineColor;
            label.outlineWidth = outlineWidth;
            label.style = style;
            label.pixelOffset = pixelOffset;
            label.eyeOffset = eyeOffset;
            label.horizontalOrigin = horizontalOrigin;
            label.verticalOrigin = verticalOrigin;
            label.scale = scale;
            label.translucencyByDistance = translucency;
            label.pixelOffsetScaleByDistance = pixelOffsetScale;

            expect(label.show).toEqual(show);
            expect(label.position).toEqual(position);
            expect(label.text).toEqual(text);
            expect(label.font).toEqual(font);
            expect(label.fillColor).toEqual(fillColor);
            expect(label.outlineColor).toEqual(outlineColor);
            expect(label.outlineWidth).toEqual(outlineWidth);
            expect(label.style).toEqual(style);
            expect(label.pixelOffset).toEqual(pixelOffset);
            expect(label.eyeOffset).toEqual(eyeOffset);
            expect(label.horizontalOrigin).toEqual(horizontalOrigin);
            expect(label.verticalOrigin).toEqual(verticalOrigin);
            expect(label.scale).toEqual(scale);
            expect(label.translucencyByDistance).toEqual(translucency);
            expect(label.pixelOffsetScaleByDistance).toEqual(pixelOffsetScale);
        });

        it('is destroyed after being removed', function() {
            var label = labels.add();

            expect(label.isDestroyed()).toEqual(false);

            labels.remove(label);

            expect(label.isDestroyed()).toEqual(true);
        });

        it('throws after being removed', function() {
            var label = labels.add();
            labels.remove(label);
            expect(function() {
                label.equals(label);
            }).toThrowDeveloperError();
        });

        it('can compute screen space position', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : Cartesian3.ZERO
            });
            scene.renderForSpecs();
            expect(label.computeScreenSpacePosition(scene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
        });

        it('stores screen space position in a result', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : Cartesian3.ZERO
            });
            var result = new Cartesian2();
            scene.renderForSpecs();
            var actual = label.computeScreenSpacePosition(scene, result);
            expect(actual).toEqual(result);
            expect(result).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
        });

        it('can compute screen space position with pixelOffset', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : Cartesian3.ZERO,
                pixelOffset : new Cartesian2(0.5, 0.5)
            });
            scene.renderForSpecs();
            expect(label.computeScreenSpacePosition(scene)).toEqualEpsilon(new Cartesian2(1.0, 1.0), CesiumMath.EPSILON1);
        });

        it('can compute screen space position with eyeOffset', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : Cartesian3.ZERO,
                eyeOffset : new Cartesian3(1.0, 1.0, 0.0)
            });
            scene.renderForSpecs();
            expect(label.computeScreenSpacePosition(scene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
        });

        it('can equal another label', function() {
            var label = labels.add({
                position : new Cartesian3(1.0, 2.0, 3.0),
                text : 'equals'
            });
            var otherLabel = labels.add({
                position : new Cartesian3(1.0, 2.0, 3.0),
                text : 'equals'
            });

            // This tests the `LabelCollection.equals` function itself, not simple equality.
            expect(label.equals(otherLabel)).toEqual(true);
        });

        it('can differ from another label', function() {
            var label = labels.add({
                position : new Cartesian3(1.0, 2.0, 3.0)
            });
            var otherLabel = labels.add({
                position : new Cartesian3(4.0, 5.0, 6.0)
            });

            // This tests the `LabelCollection.equals` function itself, not simple equality.
            expect(label.equals(otherLabel)).toEqual(false);
        });

        it('does not equal undefined', function() {
            // This tests the `LabelCollection.equals` function itself, not simple equality.
            var label = labels.add();
            expect(label.equals(undefined)).toEqual(false);
        });

        it('should have a number of glyphs equal to the number of characters', function() {
            var label = labels.add({
                text : 'abc'
            });
            scene.renderForSpecs();
            expect(label._glyphs.length).toEqual(3);

            label.text = 'abcd';
            scene.renderForSpecs();
            expect(label._glyphs.length).toEqual(4);

            label.text = '';
            scene.renderForSpecs();
            expect(label._glyphs.length).toEqual(0);

            label = labels.add();
            scene.renderForSpecs();
            expect(label._glyphs.length).toEqual(0);
        });

        it('does not create billboards for spaces', function() {
            var label = labels.add({
                text : 'abc'
            });
            scene.renderForSpecs();
            expect(label._glyphs.length).toEqual(3);
            expect(labels._billboardCollection.length).toEqual(3);

            label.text = ' ab c';
            scene.renderForSpecs();
            expect(label._glyphs.length).toEqual(5);
            expect(labels._billboardCollection.length).toEqual(3);
        });

        function getGlyphBillboardVertexTranslate(label, index) {
            return Cartesian2.clone(label._glyphs[index].billboard._translate, new Cartesian2());
        }

        it('sets billboard properties properly when they change on the label', function() {
            var position1 = new Cartesian3(1.0, 2.0, 3.0);
            var position2 = new Cartesian3(4.0, 5.0, 6.0);
            var pixelOffset1 = new Cartesian2(4.0, 5.0);
            var pixelOffset2 = new Cartesian2(6.0, 7.0);
            var eyeOffset1 = new Cartesian3(6.0, 7.0, 8.0);
            var eyeOffset2 = new Cartesian3(16.0, 17.0, 18.0);
            var verticalOrigin1 = VerticalOrigin.TOP;
            var verticalOrigin2 = VerticalOrigin.BOTTOM;
            var scale1 = 2.0;
            var scale2 = 3.0;
            var id1 = 'id1';
            var id2 = 'id2';
            var translucency1 = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
            var translucency2 = new NearFarScalar(1.1e4, 1.2, 1.3e6, 4.0);
            var pixelOffsetScale1 = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
            var pixelOffsetScale2 = new NearFarScalar(1.5e4, 1.6, 1.7e6, 8.0);

            var label = labels.add({
                position : position1,
                text : 'abc',
                pixelOffset : pixelOffset1,
                eyeOffset : eyeOffset1,
                verticalOrigin : verticalOrigin1,
                scale : scale1,
                id : id1,
                translucencyByDistance : translucency1,
                pixelOffsetScaleByDistance : pixelOffsetScale1
            });

            scene.renderForSpecs();

            label.position = position2;
            label.text = 'def';
            label.pixelOffset = pixelOffset2;
            label.eyeOffset = eyeOffset2;
            label.verticalOrigin = verticalOrigin2;
            label.scale = scale2;
            label.id = id2;
            label.translucencyByDistance = translucency2;
            label.pixelOffsetScaleByDistance = pixelOffsetScale2;

            scene.renderForSpecs();

            for (var i = 0; i < label._glyphs.length; ++i) {
                var glyph = label._glyphs[i];
                var billboard = glyph.billboard;
                expect(billboard.show).toEqual(label.show);
                expect(billboard.position).toEqual(label.position);
                expect(billboard.eyeOffset).toEqual(label.eyeOffset);
                expect(billboard.pixelOffset).toEqual(label.pixelOffset);
                expect(billboard.verticalOrigin).toEqual(label.verticalOrigin);
                // glyph horizontal origin is always LEFT
                expect(billboard.scale).toEqual(label.scale);
                expect(billboard.id).toEqual(label.id);
                expect(billboard.translucencyByDistance).toEqual(label.translucencyByDistance);
                expect(billboard.pixelOffsetScaleByDistance).toEqual(label.pixelOffsetScaleByDistance);

                expect(billboard.pickPrimitive).toEqual(label);
            }
        });

        describe('sets individual billboard properties properly when they change on the label', function() {
            var label;
            beforeEach(function() {
                label = labels.add({
                    position : new Cartesian3(1.0, 2.0, 3.0),
                    text : 'abc',
                    pixelOffset : new Cartesian2(4.0, 5.0),
                    eyeOffset : new Cartesian3(6.0, 7.0, 8.0),
                    verticalOrigin : VerticalOrigin.TOP,
                    scale : 2.0,
                    id : 'id1',
                    translucencyByDistance : new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0),
                    pixelOffsetScaleByDistance : new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0)
                });
                scene.renderForSpecs();
            });

            function getGlyphBillboards() {
                return label._glyphs.map(function(glyph) {
                    return glyph.billboard;
                });
            }

            it('position', function() {
                var newValue = new Cartesian3(4.0, 5.0, 6.0);
                expect(label.position).not.toEqual(newValue);
                label.position = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.position).toEqual(label.position);
                });
            });

            it('eyeOffset', function() {
                var newValue = new Cartesian3(16.0, 17.0, 18.0);
                expect(label.eyeOffset).not.toEqual(newValue);
                label.eyeOffset = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.eyeOffset).toEqual(label.eyeOffset);
                });
            });

            it('pixelOffset', function() {
                var newValue = new Cartesian3(16.0, 17.0, 18.0);
                expect(label.pixelOffset).not.toEqual(newValue);
                label.pixelOffset = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.pixelOffset).toEqual(label.pixelOffset);
                });
            });

            it('verticalOrigin', function() {
                var newValue = VerticalOrigin.BOTTOM;
                expect(label.verticalOrigin).not.toEqual(newValue);
                label.verticalOrigin = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.verticalOrigin).toEqual(label.verticalOrigin);
                });
            });

            // glyph horizontal origin is always LEFT

            it('scale', function() {
                var newValue = 3.0;
                expect(label.scale).not.toEqual(newValue);
                label.scale = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.scale).toEqual(label.scale);
                });
            });

            it('id', function() {
                var newValue = 'id2';
                expect(label.id).not.toEqual(newValue);
                label.id = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.id).toEqual(label.id);
                });
            });

            it('translucencyByDistance', function() {
                var newValue = new NearFarScalar(1.1e4, 1.2, 1.3e6, 4.0);
                expect(label.translucencyByDistance).not.toEqual(newValue);
                label.translucencyByDistance = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.translucencyByDistance).toEqual(label.translucencyByDistance);
                });
            });

            it('pixelOffsetScaleByDistance', function() {
                var newValue = new NearFarScalar(1.5e4, 1.6, 1.7e6, 8.0);
                expect(label.pixelOffsetScaleByDistance).not.toEqual(newValue);
                label.pixelOffsetScaleByDistance = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.pixelOffsetScaleByDistance).toEqual(label.pixelOffsetScaleByDistance);
                });
            });

            it('translucencyByDistance to undefined', function() {
                var newValue;
                expect(label.translucencyByDistance).not.toEqual(newValue);
                label.translucencyByDistance = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.translucencyByDistance).toEqual(label.translucencyByDistance);
                });
            });

            it('pixelOffsetScaleByDistance to undefined', function() {
                var newValue;
                expect(label.pixelOffsetScaleByDistance).not.toEqual(newValue);
                label.pixelOffsetScaleByDistance = newValue;
                scene.renderForSpecs();

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.pixelOffsetScaleByDistance).toEqual(label.pixelOffsetScaleByDistance);
                });
            });
        });

        it('should set vertexTranslate of billboards correctly when vertical origin is changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '90px "Open Sans"',
                verticalOrigin : VerticalOrigin.CENTER
            });
            scene.renderForSpecs();

            // store the offsets when vertically centered
            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.verticalOrigin = VerticalOrigin.TOP;
            scene.renderForSpecs();

            // vertical origin TOP should decrease (or equal) Y offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toBeLessThanOrEqualTo(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toBeLessThanOrEqualTo(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toBeLessThanOrEqualTo(offset2.y);

            // X offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toEqual(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toEqual(offset2.x);

            label.verticalOrigin = VerticalOrigin.BOTTOM;
            scene.renderForSpecs();

            // vertical origin BOTTOM should increase (or equal) Y offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toBeGreaterThanOrEqualTo(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toBeGreaterThanOrEqualTo(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toBeGreaterThanOrEqualTo(offset2.y);

            // X offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toEqual(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toEqual(offset2.x);
        });

        it('should set vertexTranslate of billboards correctly when horizontal origin is changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '90px "Open Sans"',
                horizontalOrigin : HorizontalOrigin.CENTER
            });
            scene.renderForSpecs();

            // store the offsets when horizontally centered
            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.horizontalOrigin = HorizontalOrigin.LEFT;
            scene.renderForSpecs();

            // horizontal origin LEFT should increase X offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeGreaterThan(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeGreaterThan(offset2.x);

            // Y offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(offset2.y);

            label.horizontalOrigin = HorizontalOrigin.RIGHT;
            scene.renderForSpecs();

            // horizontal origin RIGHT should decrease X offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeLessThan(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeLessThan(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeLessThan(offset2.x);

            // Y offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(offset2.y);
        });

        it('should set vertexTranslate of billboards correctly when scale is changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '90px "Open Sans"',
                verticalOrigin : VerticalOrigin.CENTER,
                horizontalOrigin : HorizontalOrigin.CENTER
            });
            scene.renderForSpecs();

            // store the offsets when vertically centered at scale 1
            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.scale = 2;
            scene.renderForSpecs();

            // scaling by 2 should double X and Y offset
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toEqual(2 * offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(2 * offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toEqual(2 * offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(2 * offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toEqual(2 * offset2.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(2 * offset2.y);

            // store the offsets when vertically centered at scale 2
            offset0 = getGlyphBillboardVertexTranslate(label, 0);
            offset1 = getGlyphBillboardVertexTranslate(label, 1);
            offset2 = getGlyphBillboardVertexTranslate(label, 2);

            // vertical origin TOP should decrease (or equal) Y offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toBeLessThanOrEqualTo(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toBeLessThanOrEqualTo(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toBeLessThanOrEqualTo(offset2.y);

            label.verticalOrigin = VerticalOrigin.BOTTOM;
            scene.renderForSpecs();

            // vertical origin BOTTOM should increase (or equal) Y offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toBeGreaterThanOrEqualTo(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toBeGreaterThanOrEqualTo(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toBeGreaterThanOrEqualTo(offset2.y);

            label.verticalOrigin = VerticalOrigin.CENTER;
            label.horizontalOrigin = HorizontalOrigin.LEFT;
            scene.renderForSpecs();

            // horizontal origin LEFT should increase X offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeGreaterThan(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeGreaterThan(offset2.x);

            // Y offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(offset2.y);

            label.horizontalOrigin = HorizontalOrigin.RIGHT;
            scene.renderForSpecs();

            // horizontal origin RIGHT should decrease X offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeLessThan(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeLessThan(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeLessThan(offset2.x);

            // Y offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(offset2.y);
        });

        it('label vertex translate should remain the same when pixel offset is changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '90px "Open Sans"'
            });
            scene.renderForSpecs();

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            var xOffset = 20;
            var yOffset = -10;
            label.pixelOffset = new Cartesian2(xOffset, yOffset);
            scene.renderForSpecs();

            expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
            expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
            expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);

            expect(label.pixelOffset.x).toEqual(xOffset);
            expect(label.pixelOffset.y).toEqual(yOffset);
        });

        it('should set vertexTranslate of billboards correctly when font size changes', function() {
            var label = labels.add({
                text : 'apl',
                font : '80px "Open Sans"',
                verticalOrigin : VerticalOrigin.TOP,
                horizontalOrigin : HorizontalOrigin.LEFT
            });
            scene.renderForSpecs();

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.font = '20px "Open Sans"';
            scene.renderForSpecs();

            // reducing font size should reduce absolute value of both X and Y offset

            expect(Math.abs(getGlyphBillboardVertexTranslate(label, 0).x)).toBeLessThanOrEqualTo(Math.abs(offset0.x));
            expect(Math.abs(getGlyphBillboardVertexTranslate(label, 0).y)).toBeLessThanOrEqualTo(Math.abs(offset0.y));
            expect(Math.abs(getGlyphBillboardVertexTranslate(label, 1).x)).toBeLessThanOrEqualTo(Math.abs(offset1.x));
            expect(Math.abs(getGlyphBillboardVertexTranslate(label, 1).y)).toBeLessThanOrEqualTo(Math.abs(offset1.y));
            expect(Math.abs(getGlyphBillboardVertexTranslate(label, 2).x)).toBeLessThanOrEqualTo(Math.abs(offset2.x));
            expect(Math.abs(getGlyphBillboardVertexTranslate(label, 2).y)).toBeLessThanOrEqualTo(Math.abs(offset2.y));
        });

        it('should have the same vertexTranslate of billboards whether values are set at construction or afterwards', function() {
            var text = 'apl';
            var scale = 2.0;
            var font = '20px "Open Sans"';
            var verticalOrigin = VerticalOrigin.CENTER;
            var pixelOffset = new Cartesian2(10.0, 15.0);

            var one = labels.add({
                text : text,
                scale : scale,
                font : font,
                verticalOrigin : verticalOrigin,
                pixelOffset : pixelOffset
            });
            scene.renderForSpecs();

            var two = labels.add();
            two.text = text;
            two.scale = scale;
            two.font = font;
            two.verticalOrigin = verticalOrigin;
            two.pixelOffset = pixelOffset;

            scene.renderForSpecs();

            expect(getGlyphBillboardVertexTranslate(one, 0)).toEqual(getGlyphBillboardVertexTranslate(two, 0));
            expect(getGlyphBillboardVertexTranslate(one, 1)).toEqual(getGlyphBillboardVertexTranslate(two, 1));
            expect(getGlyphBillboardVertexTranslate(one, 2)).toEqual(getGlyphBillboardVertexTranslate(two, 2));
        });

        it('should not change vertexTranslate of billboards when position changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            scene.renderForSpecs();

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.position = new Cartesian3(1.0, 1.0, 1.0);
            scene.renderForSpecs();

            expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
            expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
            expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);
        });

        it('should not change vertexTranslate of billboards when eye offset changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            scene.renderForSpecs();

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.eyeOffset = new Cartesian3(10.0, 10.0, -10.0);
            scene.renderForSpecs();

            expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
            expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
            expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);
        });

        it('should not change label dimensions when scale changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            scene.renderForSpecs();

            var originalDimensions = label._glyphs[0].dimensions;

            label.scale = 3;
            scene.renderForSpecs();

            var dimensions = label._glyphs[0].dimensions;
            expect(dimensions.width).toEqual(originalDimensions.width);
            expect(dimensions.height).toEqual(originalDimensions.height);
            expect(dimensions.descent).toEqual(originalDimensions.descent);
        });

        it('should change label dimensions when font size changes', function() {
            var label = labels.add({
                text : 'apl',
                font : '90px "Open Sans"'
            });
            scene.renderForSpecs();

            var originalDimensions = label._glyphs[0].dimensions;

            label.font = '20px "Open Sans"';
            scene.renderForSpecs();

            var dimensions = label._glyphs[0].dimensions;
            expect(dimensions.width).toBeLessThan(originalDimensions.width);
            expect(dimensions.height).toBeLessThan(originalDimensions.height);
            expect(dimensions.descent).toBeLessThanOrEqualTo(originalDimensions.descent);
        });
    }, 'WebGL');

    it('computes bounding sphere in 3D', function() {
        var one = labels.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0, 0.0),
            text : 'one'
        });
        var two = labels.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0, 0.0),
            text : 'two'
        });

        scene.renderForSpecs();
        var actual = scene.frameState.commandList[0].boundingVolume;

        var positions = [one.position, two.position];
        var expected = BoundingSphere.fromPoints(positions);
        expect(actual.center).toEqual(expected.center);
        expect(actual.radius).toEqual(expected.radius);
    });

    it('computes bounding sphere in Columbus view', function() {
        var projection = scene.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = labels.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0, 0.0),
            text : 'one'
        });
        var two = labels.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0, 0.0),
            text : 'two'
        });

        // Update scene state
        scene.morphToColumbusView(0);
        scene.renderForSpecs();
        var actual = scene.frameState.commandList[0].boundingVolume;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.position)),
            projection.project(ellipsoid.cartesianToCartographic(two.position))
        ];
        var expected = BoundingSphere.fromPoints(projectedPositions);
        expected.center = new Cartesian3(0.0, expected.center.x, expected.center.y);
        expect(actual.center).toEqualEpsilon(expected.center, CesiumMath.EPSILON8);
        expect(actual.radius).toBeGreaterThan(expected.radius);
    });

    it('computes bounding sphere in 2D', function() {
        var projection = scene.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = labels.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0),
            text : 'one'
        });
        var two = labels.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0),
            text : 'two'
        });

        camera.setView({
            destination : Rectangle.fromDegrees(-60.0, -60.0, -40.0, 60.0)
        });

        scene.morphTo2D(0);
        scene.renderForSpecs();

        scene.renderForSpecs();
        var actual = scene.frameState.commandList[0].boundingVolume;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.position)),
            projection.project(ellipsoid.cartesianToCartographic(two.position))
        ];
        var expected = BoundingSphere.fromPoints(projectedPositions);
        expected.center = new Cartesian3(0.0, expected.center.x, expected.center.y);
        expect(actual.center).toEqualEpsilon(expected.center, CesiumMath.EPSILON8);
        expect(actual.radius).toBeGreaterThan(expected.radius);
    });

    it('Label.show throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.show = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.position throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.position = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.text throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.text = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.font throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.font = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.fillColor throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.fillColor = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.outlineColor throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.outlineColor = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.outlineWidth throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.outlineWidth = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.style throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.style = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.pixelOffset throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.pixelOffset = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.eyeOffset throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.eyeOffset = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.horizontalOrigin throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.horizontalOrigin = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.verticalOrigin throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.verticalOrigin = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.scale throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.scale = undefined;
        }).toThrowDeveloperError();
    });

    it('Label.computeScreenSpacePosition throws with undefined scene', function() {
        var label = labels.add();
        expect(function() {
            label.computeScreenSpacePosition();
        }).toThrowDeveloperError();
    });

    it('Label.translucencyByDistance throws with nearDistance === farDistance', function() {
        var label = labels.add();
        var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            label.translucencyByDistance = translucency;
        }).toThrowDeveloperError();
    });

    it('Label.pixelOffsetScaleByDistance throws with nearDistance === farDistance', function() {
        var label = labels.add();
        var pixelOffsetScale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            label.pixelOffsetScaleByDistance = pixelOffsetScale;
        }).toThrowDeveloperError();
    });

    it('new label throws with invalid translucencyByDistance (nearDistance === farDistance)', function() {
        var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            labels.add({
                translucencyByDistance : translucency
            });
        }).toThrowDeveloperError();
    });

    it('new label throws with invalid pixelOffsetScaleByDistance (nearDistance === farDistance)', function() {
        var pixelOffsetScale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            labels.add({
                pixelOffsetScaleByDistance : pixelOffsetScale
            });
        }).toThrowDeveloperError();
    });

    it('Label.translucencyByDistance throws with nearDistance > farDistance', function() {
        var label = labels.add();
        var translucency = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
        expect(function() {
            label.translucencyByDistance = translucency;
        }).toThrowDeveloperError();
    });

    it('Label.pixelOffsetScaleByDistance throws with nearDistance > farDistance', function() {
        var label = labels.add();
        var pixelOffsetScale = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
        expect(function() {
            label.pixelOffsetScaleByDistance = pixelOffsetScale;
        }).toThrowDeveloperError();
    });

    it('destroys texture atlas when destroying', function() {
        labels.add({
            text : 'a'
        });
        scene.renderForSpecs();

        var textureAtlas = labels._textureAtlas;
        expect(textureAtlas.isDestroyed()).toBe(false);

        scene.primitives.removeAll();

        expect(textureAtlas.isDestroyed()).toBe(true);
    });

    describe('height referenced labels', function() {
        beforeEach(function() {
            scene.globe = createGlobe();

            labelsWithHeight = new LabelCollection({
                scene : scene
            });
            scene.primitives.add(labelsWithHeight);
        });

        it('explicitly constructs a label with height reference', function() {
            scene.globe = createGlobe();
            var l = labelsWithHeight.add({
                text : "test",
                heightReference : HeightReference.CLAMP_TO_GROUND
            });

            expect(l.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
        });

        it('set label height reference property', function() {
            scene.globe = createGlobe();
            var l = labelsWithHeight.add({
                text : "test"
            });
            l.heightReference = HeightReference.CLAMP_TO_GROUND;

            expect(l.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
        });

        it('creating with a height reference creates a height update callback', function() {
            scene.globe = createGlobe();
            labelsWithHeight.add({
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0)
            });
            expect(scene.globe.callback).toBeDefined();
        });

        it('set height reference property creates a height update callback', function() {
            scene.globe = createGlobe();
            var l = labelsWithHeight.add({
                position : Cartesian3.fromDegrees(-72.0, 40.0)
            });
            l.heightReference = HeightReference.CLAMP_TO_GROUND;
            expect(scene.globe.callback).toBeDefined();
        });

        it('updates the callback when the height reference changes', function() {
            scene.globe = createGlobe();
            var l = labelsWithHeight.add({
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0)
            });
            expect(scene.globe.callback).toBeDefined();

            l.heightReference = HeightReference.RELATIVE_TO_GROUND;
            expect(scene.globe.removedCallback).toEqual(true);
            expect(scene.globe.callback).toBeDefined();

            scene.globe.removedCallback = false;
            l.heightReference = HeightReference.NONE;
            expect(scene.globe.removedCallback).toEqual(true);
            expect(scene.globe.callback).not.toBeDefined();
        });

        it('changing the position updates the callback', function() {
            scene.globe = createGlobe();
            var l = labelsWithHeight.add({
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0)
            });
            expect(scene.globe.callback).toBeDefined();

            l.position = Cartesian3.fromDegrees(-73.0, 40.0);
            expect(scene.globe.removedCallback).toEqual(true);
            expect(scene.globe.callback).toBeDefined();
        });

        it('callback updates the position', function() {
            scene.globe = createGlobe();
            var l = labelsWithHeight.add({
                heightReference : HeightReference.CLAMP_TO_GROUND,
                position : Cartesian3.fromDegrees(-72.0, 40.0)
            });
            expect(scene.globe.callback).toBeDefined();

            var cartographic = scene.globe.ellipsoid.cartesianToCartographic(l._clampedPosition);
            expect(cartographic.height).toEqual(0.0);

            scene.globe.callback(Cartesian3.fromDegrees(-72.0, 40.0, 100.0));
            cartographic = scene.globe.ellipsoid.cartesianToCartographic(l._clampedPosition);
            expect(cartographic.height).toEqualEpsilon(100.0, CesiumMath.EPSILON9);
        });
    });

}, 'WebGL');
