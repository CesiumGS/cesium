/*global defineSuite*/
defineSuite([
        'Scene/LabelCollection',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Math',
        'Core/NearFarScalar',
        'Renderer/ClearCommand',
        'Scene/HorizontalOrigin',
        'Scene/LabelStyle',
        'Scene/OrthographicFrustum',
        'Scene/SceneMode',
        'Scene/VerticalOrigin',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/pick',
        'Specs/render'
    ], function(
        LabelCollection,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        CesiumMath,
        NearFarScalar,
        ClearCommand,
        HorizontalOrigin,
        LabelStyle,
        OrthographicFrustum,
        SceneMode,
        VerticalOrigin,
        createCamera,
        createContext,
        createFrameState,
        pick,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    // TODO: rendering tests for pixel offset, eye offset, horizontal origin, vertical origin, font, style, outlineColor, outlineWidth, and fillColor properties

    var context;
    var frameState;
    var mockScene;
    var labels;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();

        context.uniformState.update(context, createFrameState(createCamera()));

        mockScene = {
            canvas: context._canvas,
            context : context,
            camera : frameState.camera,
            frameState : frameState
        };
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        labels = new LabelCollection();
    });

    afterEach(function() {
        labels = labels && labels.destroy();
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
        labels.update(context, frameState, []);

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

    it('isDestroyed returns false', function() {
        expect(labels.isDestroyed()).toEqual(false);
    });

    it('adding and removing multiple labels works', function() {
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
        expect(render(context, frameState, labels)).toEqual(0);
    });

    it('can render after modifying and removing a label', function() {
        var label = labels.add({
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

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        label.scale = 2.0;
        labels.remove(label);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);

        var p = context.readPixels();
        expect(p[0]).toEqual(0);
        expect(p[1]).toEqual(0);
        expect(p[2]).toEqual(0);
        expect((p[3] === 0) || (p[3] === 255)).toEqual(true); // ANGLE Workaround:  Blending or texture alpha channel is buggy
    });

    it('can render a label', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('can render after adding a label', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        labels.add({
            position : new Cartesian3(-0.5, 0.0, 0.0), // Closer to viewer
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

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]); // Not the most precise check
    });

    it('can render after removing a label', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.remove(label);
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('can render after removing and adding a label', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        labels.remove(label);

        ClearCommand.ALL.execute(context);
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('can render after removing all labels', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.removeAll();
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('can render after removing all labels and adding a label', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.removeAll();
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('can render with a different buffer usage', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render labels with show set to false', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.show = false;
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.show = true;
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render labels that are behind the viewer', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.position = new Cartesian3(-2.0, 0.0, 0.0); // Behind viewer
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.position = Cartesian3.ZERO; // Back in front of viewer
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render labels with a scale of zero', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.scale = 0.0;
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.scale = 2.0;
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('render label with translucencyByDistance', function() {
        labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            translucencyByDistance: new NearFarScalar(1.0, 1.0, 3.0, 0.0)
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        var us = context.uniformState;
        us.update(context, createFrameState(createCamera({
            offset : new Cartesian3(0.0, 0.0, 1.0)
        })));
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        us.update(context, createFrameState(createCamera({
            offset : new Cartesian3(0.0, 0.0, 6.0)
        })));
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        us.update(context, createFrameState(createCamera()));
    });

    it('render label with pixelOffsetScaleByDistance', function() {
        labels.add({
            position : Cartesian3.ZERO,
            pixelOffset : new Cartesian2(1.0, 0.0),
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            pixelOffsetScaleByDistance: new NearFarScalar(1.0, 0.0, 3.0, 10.0)
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        var us = context.uniformState;
        us.update(context, createFrameState(createCamera({
            offset : new Cartesian3(0.0, 0.0, 1.0)
        })));
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        us.update(context, createFrameState(createCamera({
            offset : new Cartesian3(0.0, 0.0, 6.0)
        })));
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        us.update(context, createFrameState(createCamera()));
    });

    it('can pick a label', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            id : 'id'
        });

        var pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject.primitive).toEqual(label);
        expect(pickedObject.id).toEqual('id');
    });

    it('can change pick id', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            id : 'id'
        });

        var pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject.primitive).toEqual(label);
        expect(pickedObject.id).toEqual('id');

        label.id = 'id2';

        pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject.primitive).toEqual(label);
        expect(pickedObject.id).toEqual('id2');
    });

    it('does not pick a label with show set to false', function() {
        labels.add({
            show : false,
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('pick a label using translucencyByDistance', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var translucency = new NearFarScalar(1.0, 1.0, 3.0e9, 0.9);
        label.translucencyByDistance = translucency;
        var pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject.primitive).toEqual(label);
        translucency.nearValue = 0.0;
        translucency.farValue = 0.0;
        label.translucencyByDistance = translucency;
        pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('pick a label using pixelOffsetScaleByDistance', function() {
        var label = labels.add({
            position : Cartesian3.ZERO,
            pixelOffset : new Cartesian2(0.0, 1.0),
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var pixelOffsetScale = new NearFarScalar(1.0, 0.0, 3.0e9, 0.0);
        label.pixelOffsetScaleByDistance = pixelOffsetScale;
        var pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject.primitive).toEqual(label);
        pixelOffsetScale.nearValue = 10.0;
        pixelOffsetScale.farValue = 10.0;
        label.pixelOffsetScaleByDistance = pixelOffsetScale;
        pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject).toBeUndefined();
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
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(1);

        labels.add({
            text : 'a'
        });
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(1);

        labels.add({
            text : 'abcd'
        });
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(4);

        labels.add({
            text : 'abc'
        });
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(4);

        var label = labels.add({
            text : 'de'
        });
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(5);

        label.font = '30px "Open Sans"';
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);

        label.style = LabelStyle.OUTLINE;
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(9);

        label.fillColor = new Color(1.0, 165.0 / 255.0, 0.0, 1.0);
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(11);

        label.outlineColor = new Color(1.0, 1.0, 1.0, 1.0);
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(13);

        // vertical origin only affects glyph positions, not glyphs themselves.
        label.verticalOrigin = VerticalOrigin.CENTER;
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(13);
        label.verticalOrigin = VerticalOrigin.TOP;
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(13);

        //even though we originally started with 30px sans-serif, other properties used to create the id have changed
        label.font = '30px sans-serif';
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(15);

        //Changing thickness requires new glyphs
        label.outlineWidth = 3;
        labels.update(context, frameState, []);
        expect(Object.keys(labels._glyphTextureCache).length).toEqual(17);
    });

    it('should reuse billboards that are not needed any more', function() {
        var label = labels.add({
            text : 'abc'
        });
        labels.update(context, frameState, []);
        expect(labels._billboardCollection.length).toEqual(3);

        label.text = 'a';
        labels.update(context, frameState, []);
        expect(labels._billboardCollection.length).toEqual(3);

        label.text = 'def';
        labels.update(context, frameState, []);
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

        it('can compute screen space position (1)', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : Cartesian3.ZERO
            });
            labels.update(context, frameState, []);
            expect(label.computeScreenSpacePosition(mockScene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
        });

        it('can compute screen space position (2)', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : Cartesian3.ZERO,
                pixelOffset : new Cartesian2(1.0, 2.0)
            });
            labels.update(context, frameState, []);
            expect(label.computeScreenSpacePosition(mockScene)).toEqualEpsilon(new Cartesian2(1.5, 2.5), CesiumMath.EPSILON1);
        });

        it('can compute screen space position (3)', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : Cartesian3.ZERO,
                eyeOffset : new Cartesian3(5.0, -5.0, 0.0)
            });
            labels.update(context, frameState, []);
            expect(label.computeScreenSpacePosition(mockScene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
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

            expect(label).toEqual(otherLabel);
        });

        it('can differ from another label', function() {
            var label = labels.add({
                position : new Cartesian3(1.0, 2.0, 3.0)
            });
            var otherLabel = labels.add({
                position : new Cartesian3(4.0, 5.0, 6.0)
            });

            expect(label).not.toEqual(otherLabel);
        });

        it('does not equal undefined', function() {
            var label = labels.add();
            expect(label).not.toEqual(undefined);
        });

        it('should have a number of glyphs equal to the number of characters', function() {
            var label = labels.add({
                text : 'abc'
            });
            labels.update(context, frameState, []);
            expect(label._glyphs.length).toEqual(3);

            label.text = 'abcd';
            labels.update(context, frameState, []);
            expect(label._glyphs.length).toEqual(4);

            label.text = '';
            labels.update(context, frameState, []);
            expect(label._glyphs.length).toEqual(0);

            label = labels.add();
            labels.update(context, frameState, []);
            expect(label._glyphs.length).toEqual(0);
        });

        it('does not create billboards for spaces', function() {
            var label = labels.add({
                text : 'abc'
            });
            labels.update(context, frameState, []);
            expect(label._glyphs.length).toEqual(3);
            expect(labels._billboardCollection.length).toEqual(3);

            label.text = ' ab c';
            labels.update(context, frameState, []);
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

            labels.update(context, frameState, []);

            label.position = position2;
            label.text = 'def';
            label.pixelOffset = pixelOffset2;
            label.eyeOffset = eyeOffset2;
            label.verticalOrigin = verticalOrigin2;
            label.scale = scale2;
            label.id = id2;
            label.translucencyByDistance = translucency2;
            label.pixelOffsetScaleByDistance = pixelOffsetScale2;

            labels.update(context, frameState, []);

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
                labels.update(context, frameState, []);
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
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.position).toEqual(label.position);
                });
            });

            it('eyeOffset', function() {
                var newValue = new Cartesian3(16.0, 17.0, 18.0);
                expect(label.eyeOffset).not.toEqual(newValue);
                label.eyeOffset = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.eyeOffset).toEqual(label.eyeOffset);
                });
            });

            it('pixelOffset', function() {
                var newValue = new Cartesian3(16.0, 17.0, 18.0);
                expect(label.pixelOffset).not.toEqual(newValue);
                label.pixelOffset = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.pixelOffset).toEqual(label.pixelOffset);
                });
            });

            it('verticalOrigin', function() {
                var newValue = VerticalOrigin.BOTTOM;
                expect(label.verticalOrigin).not.toEqual(newValue);
                label.verticalOrigin = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.verticalOrigin).toEqual(label.verticalOrigin);
                });
            });

            // glyph horizontal origin is always LEFT

            it('scale', function() {
                var newValue = 3.0;
                expect(label.scale).not.toEqual(newValue);
                label.scale = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.scale).toEqual(label.scale);
                });
            });

            it('id', function() {
                var newValue = 'id2';
                expect(label.id).not.toEqual(newValue);
                label.id = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.id).toEqual(label.id);
                });
            });

            it('translucencyByDistance', function() {
                var newValue = new NearFarScalar(1.1e4, 1.2, 1.3e6, 4.0);
                expect(label.translucencyByDistance).not.toEqual(newValue);
                label.translucencyByDistance = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.translucencyByDistance).toEqual(label.translucencyByDistance);
                });
            });

            it('pixelOffsetScaleByDistance', function() {
                var newValue = new NearFarScalar(1.5e4, 1.6, 1.7e6, 8.0);
                expect(label.pixelOffsetScaleByDistance).not.toEqual(newValue);
                label.pixelOffsetScaleByDistance = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.pixelOffsetScaleByDistance).toEqual(label.pixelOffsetScaleByDistance);
                });
            });

            it('translucencyByDistance to undefined', function() {
                var newValue;
                expect(label.translucencyByDistance).not.toEqual(newValue);
                label.translucencyByDistance = newValue;
                labels.update(context, frameState, []);

                getGlyphBillboards().forEach(function(billboard) {
                    expect(billboard.translucencyByDistance).toEqual(label.translucencyByDistance);
                });
            });

            it('pixelOffsetScaleByDistance to undefined', function() {
                var newValue;
                expect(label.pixelOffsetScaleByDistance).not.toEqual(newValue);
                label.pixelOffsetScaleByDistance = newValue;
                labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            // store the offsets when vertically centered
            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.verticalOrigin = VerticalOrigin.TOP;
            labels.update(context, frameState, []);

            // vertical origin TOP should decrease (or equal) Y offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toBeLessThanOrEqualTo(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toBeLessThanOrEqualTo(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toBeLessThanOrEqualTo(offset2.y);

            // X offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toEqual(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toEqual(offset2.x);

            label.verticalOrigin = VerticalOrigin.BOTTOM;
            labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            // store the offsets when horizontally centered
            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.horizontalOrigin = HorizontalOrigin.LEFT;
            labels.update(context, frameState, []);

            // horizontal origin LEFT should increase X offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeGreaterThan(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeGreaterThan(offset2.x);

            // Y offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(offset2.y);

            label.horizontalOrigin = HorizontalOrigin.RIGHT;
            labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            // store the offsets when vertically centered at scale 1
            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.scale = 2;
            labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            // vertical origin BOTTOM should increase (or equal) Y offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toBeGreaterThanOrEqualTo(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toBeGreaterThanOrEqualTo(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toBeGreaterThanOrEqualTo(offset2.y);

            label.verticalOrigin = VerticalOrigin.CENTER;
            label.horizontalOrigin = HorizontalOrigin.LEFT;
            labels.update(context, frameState, []);

            // horizontal origin LEFT should increase X offset compared to CENTER
            expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeGreaterThan(offset0.x);
            expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeGreaterThan(offset2.x);

            // Y offset should be unchanged
            expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(offset0.y);
            expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(offset2.y);

            label.horizontalOrigin = HorizontalOrigin.RIGHT;
            labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            var xOffset = 20;
            var yOffset = -10;
            label.pixelOffset = new Cartesian2(xOffset, yOffset);
            labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.font = '20px "Open Sans"';
            labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            var two = labels.add();
            two.text = text;
            two.scale = scale;
            two.font = font;
            two.verticalOrigin = verticalOrigin;
            two.pixelOffset = pixelOffset;

            labels.update(context, frameState, []);

            expect(getGlyphBillboardVertexTranslate(one, 0)).toEqual(getGlyphBillboardVertexTranslate(two, 0));
            expect(getGlyphBillboardVertexTranslate(one, 1)).toEqual(getGlyphBillboardVertexTranslate(two, 1));
            expect(getGlyphBillboardVertexTranslate(one, 2)).toEqual(getGlyphBillboardVertexTranslate(two, 2));
        });

        it('should not change vertexTranslate of billboards when position changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.position = new Cartesian3(1.0, 1.0, 1.0);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
            expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
            expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);
        });

        it('should not change vertexTranslate of billboards when eye offset changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardVertexTranslate(label, 0);
            var offset1 = getGlyphBillboardVertexTranslate(label, 1);
            var offset2 = getGlyphBillboardVertexTranslate(label, 2);

            label.eyeOffset = new Cartesian3(10.0, 10.0, -10.0);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
            expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
            expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);
        });

        it('should not change label dimensions when scale changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            labels.update(context, frameState, []);

            var originalDimensions = label._glyphs[0].dimensions;

            label.scale = 3;
            labels.update(context, frameState, []);

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
            labels.update(context, frameState, []);

            var originalDimensions = label._glyphs[0].dimensions;

            label.font = '20px "Open Sans"';
            labels.update(context, frameState, []);

            var dimensions = label._glyphs[0].dimensions;
            expect(dimensions.width).toBeLessThan(originalDimensions.width);
            expect(dimensions.height).toBeLessThan(originalDimensions.height);
            expect(dimensions.descent).toBeLessThanOrEqualTo(originalDimensions.descent);
        });
    }, 'WebGL');

    it('computes bounding sphere in 3D', function() {
        var projection = frameState.mapProjection;

        var one = labels.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0, 0.0),
            text : 'one'
        });
        var two = labels.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0, 0.0),
            text : 'two'
        });

        var commandList = [];
        labels.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;

        var positions = [one.position, two.position];
        var bs = BoundingSphere.fromPoints(positions);
        expect(actual.center).toEqual(bs.center);
        expect(actual.radius > bs.radius).toEqual(true);
    });

    it('computes bounding sphere in Columbus view', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = labels.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0, 0.0),
            text : 'one'
        });
        var two = labels.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0, 0.0),
            text : 'two'
        });

        var mode = frameState.mode;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var commandList = [];
        labels.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;
        frameState.mode = mode;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.position)),
            projection.project(ellipsoid.cartesianToCartographic(two.position))
        ];
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(0.0, bs.center.x, bs.center.y);
        expect(bs.center).toEqualEpsilon(actual.center, CesiumMath.EPSILON8);
        expect(bs.radius).toBeLessThan(actual.radius);
    });

    it('computes bounding sphere in 2D', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = labels.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0),
            text : 'one'
        });
        var two = labels.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0),
            text : 'two'
        });

        var maxRadii = ellipsoid.maximumRadius;
        var orthoFrustum = new OrthographicFrustum();
        orthoFrustum.right = maxRadii * Math.PI;
        orthoFrustum.left = -orthoFrustum.right;
        orthoFrustum.top = orthoFrustum.right;
        orthoFrustum.bottom = -orthoFrustum.top;
        orthoFrustum.near = 0.01 * maxRadii;
        orthoFrustum.far = 60.0 * maxRadii;

        var mode = frameState.mode;
        var camera = frameState.camera;
        var frustum = camera.frustum;
        frameState.mode = SceneMode.SCENE2D;
        camera.frustum = orthoFrustum;

        var commandList = [];
        labels.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;

        camera.frustum = frustum;
        frameState.mode = mode;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.position)),
            projection.project(ellipsoid.cartesianToCartographic(two.position))
        ];
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(0.0, bs.center.x, bs.center.y);
        expect(bs.center).toEqualEpsilon(actual.center, CesiumMath.EPSILON8);
        expect(bs.radius).toBeLessThan(actual.radius);
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
        labels.update(context, frameState, []);

        var textureAtlas = labels._textureAtlas;
        expect(textureAtlas.isDestroyed()).toBe(false);

        labels = labels.destroy();

        expect(textureAtlas.isDestroyed()).toBe(true);
    });

}, 'WebGL');