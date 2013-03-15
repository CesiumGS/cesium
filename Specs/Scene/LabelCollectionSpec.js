/*global defineSuite*/
defineSuite([
         'Scene/LabelCollection',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/BoundingSphere',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Color',
         'Core/Matrix4',
         'Core/Math',
         'Renderer/BufferUsage',
         'Scene/HorizontalOrigin',
         'Scene/VerticalOrigin',
         'Scene/LabelStyle',
         'Scene/SceneMode',
         'Scene/OrthographicFrustum'
     ], function(
         LabelCollection,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         frameState,
         pick,
         render,
         BoundingSphere,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Color,
         Matrix4,
         CesiumMath,
         BufferUsage,
         HorizontalOrigin,
         VerticalOrigin,
         LabelStyle,
         SceneMode,
         OrthographicFrustum) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    // TODO: rendering tests for pixel offset, eye offset, horizontal origin, vertical origin, font, style, outlineColor, outlineWidth, and fillColor properties

    var context;
    var labels;

    beforeAll(function() {
        context = createContext();

        var us = context.getUniformState();
        us.update(createFrameState(createCamera(context)));
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        labels = new LabelCollection();
    });

    afterEach(function() {
        labels = labels && labels.destroy();
    });

    it('has default values when adding a label', function() {
        var label = labels.add();
        expect(label.getShow()).toEqual(true);
        expect(label.getPosition()).toEqual(Cartesian3.ZERO);
        expect(label.getText()).toEqual('');
        expect(label.getFont()).toEqual('30px sans-serif');
        expect(label.getFillColor()).toEqual(Color.WHITE);
        expect(label.getOutlineColor()).toEqual(Color.BLACK);
        expect(label.getOutlineWidth()).toEqual(1);
        expect(label.getStyle()).toEqual(LabelStyle.FILL);
        expect(label.getPixelOffset()).toEqual(Cartesian2.ZERO);
        expect(label.getEyeOffset()).toEqual(Cartesian3.ZERO);
        expect(label.getHorizontalOrigin()).toEqual(HorizontalOrigin.LEFT);
        expect(label.getVerticalOrigin()).toEqual(VerticalOrigin.BOTTOM);
        expect(label.getScale()).toEqual(1.0);
    });

    it('can add a label with specified values', function() {
        var show = false;
        var position = new Cartesian3(1.0, 2.0, 3.0);
        var text = 'abc';
        var font = '24px Helvetica';
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
            scale : scale
        });

        expect(label.getShow()).toEqual(show);
        expect(label.getPosition()).toEqual(position);
        expect(label.getText()).toEqual(text);
        expect(label.getFont()).toEqual(font);
        expect(label.getFillColor()).toEqual(fillColor);
        expect(label.getOutlineColor()).toEqual(outlineColor);
        expect(label.getOutlineWidth()).toEqual(outlineWidth);
        expect(label.getStyle()).toEqual(style);
        expect(label.getPixelOffset()).toEqual(pixelOffset);
        expect(label.getEyeOffset()).toEqual(eyeOffset);
        expect(label.getHorizontalOrigin()).toEqual(horizontalOrigin);
        expect(label.getVerticalOrigin()).toEqual(verticalOrigin);
        expect(label.getScale()).toEqual(scale);
    });

    it('can specify font using units other than pixels', function() {
        var label = labels.add({
            font : '12pt Arial',
            text : 'Hello there'
        });
        labels.update(context, frameState, []);

        var dimensions = label._glyphs[0].dimensions;
        expect(dimensions.height).toBeGreaterThan(0);
    });

    it('has zero labels when constructed', function() {
        expect(labels.getLength()).toEqual(0);
    });

    it('can add a label', function() {
        var label = labels.add();

        expect(labels.getLength()).toEqual(1);
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
        expect(labels.getLength()).toEqual(1);
        expect(labels.remove(undefined)).toEqual(false);
        expect(labels.getLength()).toEqual(1);
    });

    it('returns false when removing a previously removed label', function() {
        var label = labels.add();
        expect(labels.getLength()).toEqual(1);
        expect(labels.remove(label)).toEqual(true);
        expect(labels.remove(label)).toEqual(false);
        expect(labels.getLength()).toEqual(0);
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

        expect(labels.getLength()).toEqual(1);
        expect(labels.get(0)).toBe(three);

        var four = labels.add();
        expect(labels.getLength()).toEqual(2);
        expect(labels.get(0)).toBe(three);
        expect(labels.get(1)).toBe(four);
        expect(labels.contains(three)).toEqual(true);
        expect(labels.contains(four)).toEqual(true);
    });

    it('can remove all labels', function() {
        labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });
        labels.add({
            position : {
                x : 4.0,
                y : 5.0,
                z : 6.0
            }
        });
        expect(labels.getLength()).toEqual(2);

        labels.removeAll();
        expect(labels.getLength()).toEqual(0);
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
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });
        labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'o',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        label.setScale(2.0);
        labels.remove(label);

        context.clear();
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
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('can render after adding a label', function() {
        labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        labels.add({
            position : {
                x : -0.5,
                y : 0.0,
                z : 0.0
            }, // Closer to viewer
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
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.remove(label);
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('can render after removing and adding a label', function() {
        var label = labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        labels.remove(label);

        context.clear();
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('can render after removing all labels', function() {
        labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.removeAll();
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('can render after removing all labels and adding a label', function() {
        labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.removeAll();
        labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('can render with a different buffer usage', function() {
        labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render labels with show set to false', function() {
        var label = labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setShow(false);
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setShow(true);
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render labels that are behind the viewer', function() {
        var label = labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setPosition({
            x : -2.0,
            y : 0.0,
            z : 0.0
        }); // Behind viewer
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setPosition({
            x : 0.0,
            y : 0.0,
            z : 0.0
        }); // Back in front of viewer
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render labels with a scale of zero', function() {
        var label = labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setScale(0.0);
        render(context, frameState, labels);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setScale(2.0);
        render(context, frameState, labels);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('can pick a label', function() {
        var label = labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject).toEqual(label);
    });

    it('does not pick a label with show set to false', function() {
        labels.add({
            show : false,
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        var pickedObject = pick(context, frameState, labels, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('throws when calling get without an index', function() {
        expect(function() {
            labels.get();
        }).toThrow();
    });

    it('should reuse canvases for letters, but only if other settings are the same', function() {
        labels.add({
            text : 'a'
        });
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(1);

        labels.add({
            text : 'a'
        });
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(1);

        labels.add({
            text : 'abcd'
        });
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(4);

        labels.add({
            text : 'abc'
        });
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(4);

        var label = labels.add({
            text : 'de'
        });
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(5);

        label.setFont('30px arial');
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(7);

        label.setStyle(LabelStyle.OUTLINE);
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(9);

        label.setFillColor({
            red : 1.0,
            green : 165.0 / 255.0,
            blue : 0.0,
            alpha : 1.0
        });
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(11);

        label.setOutlineColor({
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 1.0
        });
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(13);

        // vertical origin only affects glyph positions, not glyphs themselves.
        label.setVerticalOrigin(VerticalOrigin.CENTER);
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(13);
        label.setVerticalOrigin(VerticalOrigin.TOP);
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(13);

        //even though we originally started with 30px sans-serif, other properties used to create the id have changed
        label.setFont('30px sans-serif');
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(15);

        //Changing thickness requires new glyphs
        label.setOutlineWidth(3);
        labels.update(context, frameState, []);
        expect(labels._textureCount).toEqual(17);
    });

    it('should reuse billboards that are not needed any more', function() {
        var label = labels.add({
            text : 'abc'
        });
        labels.update(context, frameState, []);
        expect(labels._billboardCollection.getLength()).toEqual(3);

        label.setText('a');
        labels.update(context, frameState, []);
        expect(labels._billboardCollection.getLength()).toEqual(3);

        label.setText('def');
        labels.update(context, frameState, []);
        expect(labels._billboardCollection.getLength()).toEqual(3);
    });

    it('should compact unused billboards after several frames', function() {
        var label = labels.add({
            text : 'abc'
        });
        labels.update(context, frameState, []);
        expect(labels._billboardCollection.getLength()).toEqual(3);

        label.setText('a');
        labels.update(context, frameState, []);
        expect(labels._billboardCollection.getLength()).toEqual(3);

        for ( var i = 0; i < 150; ++i) {
            labels.update(context, frameState, []);
        }

        expect(labels._billboardCollection.getLength()).toEqual(1);
    });

    it('should remove all glyphs several frames after calling remove', function() {
        var label = labels.add({
            text : 'blah blah'
        });
        labels.update(context, frameState, []);

        expect(labels._textureCount).toEqual(5);
        expect(labels._billboardCollection.getLength()).toEqual(8);

        labels.remove(label);

        for ( var i = 0; i < 150; ++i) {
            labels.update(context, frameState, []);
        }

        expect(labels._textureCount).toEqual(0);
        expect(labels._billboardCollection.getLength()).toEqual(0);
    });

    describe('Label', function() {
        it('can set properties after being added', function() {
            var label = labels.add();

            var show = false;
            var position = new Cartesian3(1.0, 2.0, 3.0);
            var text = 'abc';
            var font = '24px Helvetica';
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

            label.setShow(show);
            label.setPosition(position);
            label.setText(text);
            label.setFont(font);
            label.setFillColor(fillColor);
            label.setOutlineColor(outlineColor);
            label.setOutlineWidth(outlineWidth);
            label.setStyle(style);
            label.setPixelOffset(pixelOffset);
            label.setEyeOffset(eyeOffset);
            label.setHorizontalOrigin(horizontalOrigin);
            label.setVerticalOrigin(verticalOrigin);
            label.setScale(scale);

            expect(label.getShow()).toEqual(show);
            expect(label.getPosition()).toEqual(position);
            expect(label.getText()).toEqual(text);
            expect(label.getFont()).toEqual(font);
            expect(label.getFillColor()).toEqual(fillColor);
            expect(label.getOutlineColor()).toEqual(outlineColor);
            expect(label.getOutlineWidth()).toEqual(outlineWidth);
            expect(label.getStyle()).toEqual(style);
            expect(label.getPixelOffset()).toEqual(pixelOffset);
            expect(label.getEyeOffset()).toEqual(eyeOffset);
            expect(label.getHorizontalOrigin()).toEqual(horizontalOrigin);
            expect(label.getVerticalOrigin()).toEqual(verticalOrigin);
            expect(label.getScale()).toEqual(scale);
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
                label.setShow(false);
            }).toThrow();
        });

        it('can compute screen space position (1)', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : {
                    x : 0.0,
                    y : 0.0,
                    z : 0.0
                }
            });
            labels.update(context, frameState, []);

            expect(label.computeScreenSpacePosition(context, frameState)).toEqual(new Cartesian2(0.5, 0.5));
        });

        it('can compute screen space position (2)', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : {
                    x : 0.0,
                    y : 0.0,
                    z : 0.0
                },
                pixelOffset : {
                    x : 1.0,
                    y : 2.0
                }
            });
            labels.update(context, frameState, []);

            expect(label.computeScreenSpacePosition(context, frameState)).toEqual(new Cartesian2(1.5, 2.5));
        });

        it('can compute screen space position (3)', function() {
            labels.clampToPixel = false;
            var label = labels.add({
                text : 'abc',
                position : {
                    x : 0.0,
                    y : 0.0,
                    z : 0.0
                },
                eyeOffset : {
                    x : 5.0,
                    y : 5.0,
                    z : 0.0
                }
            });
            labels.update(context, frameState, []);

            var p = label.computeScreenSpacePosition(context, frameState);
            expect(p.x).toBeGreaterThan(0.5);
            expect(p.y).toBeGreaterThan(0.5);
        });

        it('throws when computing screen space position without uniform state', function() {
            var label = labels.add();

            expect(function() {
                label.computeScreenSpacePosition();
            }).toThrow();
        });

        it('can equal another label', function() {
            var label = labels.add({
                position : {
                    x : 1.0,
                    y : 2.0,
                    z : 3.0
                },
                text : 'equals'
            });
            var otherLabel = labels.add({
                position : {
                    x : 1.0,
                    y : 2.0,
                    z : 3.0
                },
                text : 'equals'
            });

            expect(label).toEqual(otherLabel);
        });

        it('can differ from another label', function() {
            var label = labels.add({
                position : {
                    x : 1.0,
                    y : 2.0,
                    z : 3.0
                }
            });
            var otherLabel = labels.add({
                position : {
                    x : 4.0,
                    y : 5.0,
                    z : 6.0
                }
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

            label.setText('abcd');
            labels.update(context, frameState, []);
            expect(label._glyphs.length).toEqual(4);

            label.setText('');
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
            expect(labels._billboardCollection.getLength()).toEqual(3);

            label.setText(' ab c');
            labels.update(context, frameState, []);
            expect(label._glyphs.length).toEqual(5);
            expect(labels._billboardCollection.getLength()).toEqual(3);
        });

        function getGlyphBillboardPixelOffset(label, index) {
            return Cartesian2.clone(label._glyphs[index].billboard.getPixelOffset());
        }

        it('should set pixelOffsets of billboards correctly when vertical origin is changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px arial'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);
            var offset1 = getGlyphBillboardPixelOffset(label, 1);
            var offset2 = getGlyphBillboardPixelOffset(label, 2);

            label.setVerticalOrigin(VerticalOrigin.TOP);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeLessThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toEqual(offset2.y);

            label.setVerticalOrigin(VerticalOrigin.CENTER);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeLessThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toEqual(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toEqual(offset2.y);
        });

        it('should set pixelOffsets of billboards correctly when vertical origin and scale are changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px arial'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);
            var offset1 = getGlyphBillboardPixelOffset(label, 1);
            var offset2 = getGlyphBillboardPixelOffset(label, 2);

            label.setScale(2);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeGreaterThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toBeLessThan(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeGreaterThan(offset2.x);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toBeGreaterThan(offset2.y);

            label.setVerticalOrigin(VerticalOrigin.TOP);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeLessThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toBeLessThan(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeGreaterThan(offset2.x);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toBeGreaterThan(offset2.y);

            label.setVerticalOrigin(VerticalOrigin.CENTER);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeLessThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toBeLessThan(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeGreaterThan(offset2.x);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toBeGreaterThan(offset2.y);
        });

        it('should set pixelOffsets of billboards correctly when horizontal origin is changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px arial'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);

            label.setHorizontalOrigin(HorizontalOrigin.CENTER);
            labels.update(context, frameState, []);

            var center0 = getGlyphBillboardPixelOffset(label, 0);
            var center1 = getGlyphBillboardPixelOffset(label, 1);
            var center2 = getGlyphBillboardPixelOffset(label, 2);
            expect(center0.x).toBeLessThan(offset0.x);
            expect(center1.x).toBeGreaterThan(center0.x);
            expect(center2.x).toBeGreaterThan(center1.x);

            label.setHorizontalOrigin(HorizontalOrigin.RIGHT);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toBeLessThan(center0.x);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeLessThan(center1.x);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeLessThan(center2.x);
        });

        it('should set pixelOffsets of billboards correctly when horizontal origin and scale are changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px arial'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);
            var offset1 = getGlyphBillboardPixelOffset(label, 1);
            var offset2 = getGlyphBillboardPixelOffset(label, 2);

            label.setScale(2);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeGreaterThan(offset2.x);

            label.setHorizontalOrigin(HorizontalOrigin.CENTER);
            labels.update(context, frameState, []);

            var centerX0 = getGlyphBillboardPixelOffset(label, 0).x;
            var centerX1 = getGlyphBillboardPixelOffset(label, 1).x;
            var centerX2 = getGlyphBillboardPixelOffset(label, 2).x;
            expect(centerX0).toBeLessThan(offset0.x);
            expect(centerX1).toBeGreaterThan(centerX0);
            expect(centerX2).toBeGreaterThan(centerX1);

            label.setHorizontalOrigin(HorizontalOrigin.RIGHT);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toBeLessThan(centerX0);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeLessThan(centerX1);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeLessThan(centerX2);
        });

        it('should set pixelOffsets of billboards correctly when vertical origin, scale and pixel offset are changed', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px arial'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);
            var offset1 = getGlyphBillboardPixelOffset(label, 1);
            var offset2 = getGlyphBillboardPixelOffset(label, 2);

            label.setPixelOffset({
                x : 10,
                y : 10
            });
            label.setScale(2);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toBeGreaterThan(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeGreaterThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toBeGreaterThan(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeGreaterThan(offset2.x);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toBeGreaterThan(offset2.y);

            label.setVerticalOrigin(VerticalOrigin.TOP);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toBeGreaterThan(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeLessThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toBeGreaterThan(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeGreaterThan(offset2.x);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toBeGreaterThan(offset2.y);

            label.setVerticalOrigin(VerticalOrigin.CENTER);
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toBeGreaterThan(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 0).y).toBeGreaterThan(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeGreaterThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toBeGreaterThan(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeGreaterThan(offset2.x);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toBeGreaterThan(offset2.y);
        });

        it('should set pixelOffsets of billboards correctly when font size changes', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px arial'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);
            var offset1 = getGlyphBillboardPixelOffset(label, 1);
            var offset2 = getGlyphBillboardPixelOffset(label, 2);

            label.setFont('20px arial');
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0).x).toEqual(offset0.x);
            expect(getGlyphBillboardPixelOffset(label, 0).y).toEqual(offset0.y);
            expect(getGlyphBillboardPixelOffset(label, 1).x).toBeLessThan(offset1.x);
            expect(getGlyphBillboardPixelOffset(label, 1).y).toBeGreaterThan(offset1.y);
            expect(getGlyphBillboardPixelOffset(label, 2).x).toBeLessThan(offset2.x);
            expect(getGlyphBillboardPixelOffset(label, 2).y).toEqual(offset2.y);
        });

        it('should have the same pixelOffsets of billboards whether values are set at construction or afterwards', function() {
            var text = 'apl';
            var scale = 2.0;
            var font = '20px sans-serif';
            var verticalOrigin = VerticalOrigin.CENTER;
            var pixelOffset = {
                x : 10,
                y : 15
            };

            var one = labels.add({
                text : text,
                scale : scale,
                font : font,
                verticalOrigin : verticalOrigin,
                pixelOffset : pixelOffset
            });
            labels.update(context, frameState, []);

            var two = labels.add();
            two.setText(text);
            two.setScale(scale);
            two.setFont(font);
            two.setVerticalOrigin(verticalOrigin);
            two.setPixelOffset(pixelOffset);

            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(one, 0)).toEqual(getGlyphBillboardPixelOffset(two, 0));
            expect(getGlyphBillboardPixelOffset(one, 1)).toEqual(getGlyphBillboardPixelOffset(two, 1));
            expect(getGlyphBillboardPixelOffset(one, 2)).toEqual(getGlyphBillboardPixelOffset(two, 2));
        });

        it('should not change pixelOffsets of billboards when position changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);
            var offset1 = getGlyphBillboardPixelOffset(label, 1);
            var offset2 = getGlyphBillboardPixelOffset(label, 2);

            label.setPosition({
                x : 1,
                y : 1,
                z : 1
            });
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0)).toEqual(offset0);
            expect(getGlyphBillboardPixelOffset(label, 1)).toEqual(offset1);
            expect(getGlyphBillboardPixelOffset(label, 2)).toEqual(offset2);
        });

        it('should not change pixelOffsets of billboards when eye offset changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            labels.update(context, frameState, []);

            var offset0 = getGlyphBillboardPixelOffset(label, 0);
            var offset1 = getGlyphBillboardPixelOffset(label, 1);
            var offset2 = getGlyphBillboardPixelOffset(label, 2);

            label.setEyeOffset({
                x : 10.0,
                y : 10.0,
                z : -10.0
            });
            labels.update(context, frameState, []);

            expect(getGlyphBillboardPixelOffset(label, 0)).toEqual(offset0);
            expect(getGlyphBillboardPixelOffset(label, 1)).toEqual(offset1);
            expect(getGlyphBillboardPixelOffset(label, 2)).toEqual(offset2);
        });

        it('should not change label dimensions when scale changes', function() {
            var label = labels.add({
                text : 'apl'
            });
            labels.update(context, frameState, []);

            var originalDimensions = label._glyphs[0].dimensions;

            label.setScale(3);
            labels.update(context, frameState, []);

            var dimensions = label._glyphs[0].dimensions;
            expect(dimensions.width).toEqual(originalDimensions.width);
            expect(dimensions.height).toEqual(originalDimensions.height);
            expect(dimensions.descent).toEqual(originalDimensions.descent);
        });

        it('should change label dimensions when font size changes', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px sans-serif'
            });
            labels.update(context, frameState, []);

            var originalDimensions = label._glyphs[0].dimensions;

            label.setFont('20px sans-serif');
            labels.update(context, frameState, []);

            var dimensions = label._glyphs[0].dimensions;
            expect(dimensions.width).toBeLessThan(originalDimensions.width);
            expect(dimensions.height).toBeLessThan(originalDimensions.height);
            expect(dimensions.descent).toEqual(originalDimensions.descent);
        });
    }, 'WebGL');

    it('computes bounding sphere in 3D', function() {
        var projection = frameState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();

        var one = labels.add({
            position : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
            text : 'one'
        });
        var two = labels.add({
            position : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0)),
            text : 'two'
        });

        var commandList = [];
        labels.update(context, frameState, commandList);
        var actual = commandList[0].colorList[0].boundingVolume;

        var positions = [one.getPosition(), two.getPosition()];
        var bs = BoundingSphere.fromPoints(positions);
        expect(actual.center).toEqual(bs.center);
        expect(actual.radius > bs.radius).toEqual(true);
    });

    it('computes bounding sphere in Columbus view', function() {
        var projection = frameState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();

        var one = labels.add({
            position : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
            text : 'one'
        });
        var two = labels.add({
            position : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0)),
            text : 'two'
        });

        var mode = frameState.mode;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var commandList = [];
        labels.update(context, frameState, commandList);
        var actual = commandList[0].colorList[0].boundingVolume;
        frameState.mode = mode;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.getPosition())),
            projection.project(ellipsoid.cartesianToCartographic(two.getPosition()))
        ];
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(0.0, bs.center.x, bs.center.y);
        expect(bs.center).toEqualEpsilon(actual.center, CesiumMath.EPSILON8);
        expect(bs.radius).toBeLessThan(actual.radius);
    });

    it('computes bounding sphere in 2D', function() {
        var projection = frameState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();

        var one = labels.add({
            position : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
            text : 'one'
        });
        var two = labels.add({
            position : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0)),
            text : 'two'
        });

        var maxRadii = ellipsoid.getMaximumRadius();
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
        var actual = commandList[0].colorList[0].boundingVolume;

        camera.frustum = frustum;
        frameState.mode = mode;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.getPosition())),
            projection.project(ellipsoid.cartesianToCartographic(two.getPosition()))
        ];
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(0.0, bs.center.x, bs.center.y);
        expect(bs.center).toEqualEpsilon(actual.center, CesiumMath.EPSILON8);
        expect(bs.radius).toBeLessThan(actual.radius);
    });

    it('Label.setShow throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setShow(undefined);
        }).toThrow();
    });

    it('Label.setPosition throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setPosition(undefined);
        }).toThrow();
    });

    it('Label.setText throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setText(undefined);
        }).toThrow();
    });

    it('Label.setFont throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setFont(undefined);
        }).toThrow();
    });

    it('Label.setFillColor throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setFillColor(undefined);
        }).toThrow();
    });

    it('Label.setOutlineColor throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setOutlineColor(undefined);
        }).toThrow();
    });

    it('Label.setOutlineWidth throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setOutlineWidth(undefined);
        }).toThrow();
    });

    it('Label.setStyle throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setStyle(undefined);
        }).toThrow();
    });

    it('Label.setPixelOffset throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setPixelOffset(undefined);
        }).toThrow();
    });

    it('Label.setEyeOffset throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setEyeOffset(undefined);
        }).toThrow();
    });

    it('Label.setHorizontalOrigin throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setHorizontalOrigin(undefined);
        }).toThrow();
    });

    it('Label.setVerticalOrigin throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setVerticalOrigin(undefined);
        }).toThrow();
    });

    it('Label.setScale throws with undefined', function() {
        var label = labels.add();
        expect(function() {
            label.setScale(undefined);
        }).toThrow();
    });

    it('Label.computeScreenSpacePosition throws with undefined context', function() {
        var label = labels.add();
        expect(function() {
            label.computeScreenSpacePosition(undefined, frameState);
        }).toThrow();
    });

    it('Label.computeScreenSpacePosition throws with undefined frameState', function() {
        var label = labels.add();
        expect(function() {
            label.computeScreenSpacePosition(context, undefined);
        }).toThrow();
    });
}, 'WebGL');
