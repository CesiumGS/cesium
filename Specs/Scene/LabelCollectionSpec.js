/*global defineSuite*/
defineSuite([
         'Scene/LabelCollection',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Matrix4',
         'Core/Math',
         'Renderer/BufferUsage',
         'Scene/HorizontalOrigin',
         'Scene/VerticalOrigin',
         'Scene/LabelStyle'
     ], function(
         LabelCollection,
         createContext,
         destroyContext,
         sceneState,
         pick,
         Cartesian2,
         Cartesian3,
         Matrix4,
         CesiumMath,
         BufferUsage,
         HorizontalOrigin,
         VerticalOrigin,
         LabelStyle) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    // TODO: rendering tests for pixel offset, eye offset, horizontal origin, vertical origin, font, style, outlineColor and fillColor properties

    var context;
    var labels;
    var us;

    beforeEach(function() {
        context = createContext();
        labels = new LabelCollection();

        var camera = {
            eye : new Cartesian3(-1.0, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };
        us = context.getUniformState();
        us.setView(Matrix4.createLookAt(camera.eye, camera.target, camera.up));
        us.setProjection(Matrix4.createPerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        labels = labels && labels.destroy();
        us = null;

        destroyContext(context);
    });

    it('default constructs a label', function() {
        var l = labels.add();
        expect(l.getShow()).toEqual(true);
        expect(l.getPosition().equals(Cartesian3.ZERO)).toEqual(true);
        expect(l.getText()).toEqual('');
        expect(l.getFont()).toEqual('30px sans-serif');
        expect(l.getFillColor().red).toEqual(1.0);
        expect(l.getFillColor().green).toEqual(1.0);
        expect(l.getFillColor().blue).toEqual(1.0);
        expect(l.getFillColor().alpha).toEqual(1.0);
        expect(l.getOutlineColor().red).toEqual(0.0);
        expect(l.getOutlineColor().green).toEqual(0.0);
        expect(l.getOutlineColor().blue).toEqual(0.0);
        expect(l.getOutlineColor().alpha).toEqual(1.0);
        expect(l.getStyle()).toEqual(LabelStyle.FILL);
        expect(l.getPixelOffset().equals(Cartesian2.ZERO)).toEqual(true);
        expect(l.getEyeOffset().equals(Cartesian3.ZERO)).toEqual(true);
        expect(l.getHorizontalOrigin()).toEqual(HorizontalOrigin.LEFT);
        expect(l.getVerticalOrigin()).toEqual(VerticalOrigin.BOTTOM);
        expect(l.getScale()).toEqual(1.0);
    });

    it('explicitly constructs a label', function() {
        var l = labels.add({
            show : false,
            position : new Cartesian3(1.0, 2.0, 3.0),
            text : 'abc',
            font : '24px Helvetica',
            fillColor : {
                red : 2.0,
                green : 3.0,
                blue : 4.0,
                alpha : 1.0
            },
            outlineColor : {
                red : 3.0,
                green : 4.0,
                blue : 2.0,
                alpha : 1.0
            },
            style : LabelStyle.FILL_AND_OUTLINE,
            pixelOffset : new Cartesian2(1.0, 2.0),
            eyeOffset : new Cartesian3(1.0, 2.0, 3.0),
            horizontalOrigin : HorizontalOrigin.LEFT,
            verticalOrigin : VerticalOrigin.BOTTOM,
            scale : 2.0,
            color : {
                red : 1.0,
                green : 2.0,
                blue : 3.0,
                alpha : 4.0
            }
        });

        expect(l.getShow()).toEqual(false);
        expect(l.getPosition().equals(new Cartesian3(1.0, 2.0, 3.0))).toEqual(true);
        expect(l.getText()).toEqual('abc');
        expect(l.getFont()).toEqual('24px Helvetica');
        expect(l.getFillColor().red).toEqual(2.0);
        expect(l.getFillColor().green).toEqual(3.0);
        expect(l.getFillColor().blue).toEqual(4.0);
        expect(l.getFillColor().alpha).toEqual(1.0);
        expect(l.getOutlineColor().red).toEqual(3.0);
        expect(l.getOutlineColor().green).toEqual(4.0);
        expect(l.getOutlineColor().blue).toEqual(2.0);
        expect(l.getOutlineColor().alpha).toEqual(1.0);
        expect(l.getStyle()).toEqual(LabelStyle.FILL_AND_OUTLINE);
        expect(l.getPixelOffset().equals(new Cartesian2(1.0, 2.0))).toEqual(true);
        expect(l.getEyeOffset().equals(new Cartesian3(1.0, 2.0, 3.0))).toEqual(true);
        expect(l.getHorizontalOrigin()).toEqual(HorizontalOrigin.LEFT);
        expect(l.getVerticalOrigin()).toEqual(VerticalOrigin.BOTTOM);
        expect(l.getScale()).toEqual(2.0);
    });

    it('sets label properties', function() {
        var l = labels.add();
        l.setShow(false);
        l.setPosition(new Cartesian3(1.0, 2.0, 3.0));
        l.setText('abc');
        l.setFont('24px Helvetica');
        l.setFillColor({
            red : 2.0,
            green : 3.0,
            blue : 4.0,
            alpha : 1.0
        });
        l.setOutlineColor({
            red : 3.0,
            green : 4.0,
            blue : 2.0,
            alpha : 1.0
        });
        l.setStyle(LabelStyle.FILL_AND_OUTLINE);
        l.setPixelOffset(new Cartesian2(1.0, 2.0));
        l.setEyeOffset(new Cartesian3(1.0, 2.0, 3.0));
        l.setHorizontalOrigin(HorizontalOrigin.LEFT);
        l.setVerticalOrigin(VerticalOrigin.BOTTOM);
        l.setScale(2.0);

        expect(l.getShow()).toEqual(false);
        expect(l.getPosition().equals(new Cartesian3(1.0, 2.0, 3.0))).toEqual(true);
        expect(l.getText()).toEqual('abc');
        expect(l.getFont()).toEqual('24px Helvetica');
        expect(l.getFillColor().red).toEqual(2.0);
        expect(l.getFillColor().green).toEqual(3.0);
        expect(l.getFillColor().blue).toEqual(4.0);
        expect(l.getFillColor().alpha).toEqual(1.0);
        expect(l.getOutlineColor().red).toEqual(3.0);
        expect(l.getOutlineColor().green).toEqual(4.0);
        expect(l.getOutlineColor().blue).toEqual(2.0);
        expect(l.getOutlineColor().alpha).toEqual(1.0);
        expect(l.getStyle()).toEqual(LabelStyle.FILL_AND_OUTLINE);
        expect(l.getPixelOffset().equals(new Cartesian2(1.0, 2.0))).toEqual(true);
        expect(l.getEyeOffset().equals(new Cartesian3(1.0, 2.0, 3.0))).toEqual(true);
        expect(l.getHorizontalOrigin()).toEqual(HorizontalOrigin.LEFT);
        expect(l.getVerticalOrigin()).toEqual(VerticalOrigin.BOTTOM);
        expect(l.getScale()).toEqual(2.0);
    });

    it('can specify font using units other than pixels', function() {
        var l = labels.add({
            font : '12pt Arial',
            text : 'Hello'
        });
        var dimension = l._billboards[0]._labelDimension;
        expect(dimension.height).toBeGreaterThan(0);
    });

    it('sets removed label property', function() {
        var l = labels.add();
        labels.remove(l);
        l.setShow(false);
        expect(l.getShow()).toEqual(false);
    });

    it('has zero labels when constructed', function() {
        expect(labels.getLength()).toEqual(0);
    });

    it('adds a label', function() {
        var l = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });

        expect(labels.getLength()).toEqual(1);
        expect(labels.get(0).equals(l)).toEqual(true);
    });

    it('removes the first label', function() {
        var one = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });
        var two = labels.add({
            position : {
                x : 4.0,
                y : 5.0,
                z : 6.0
            }
        });

        expect(labels.getLength()).toEqual(2);

        expect(labels.remove(one)).toEqual(true);

        expect(labels.getLength()).toEqual(1);
        expect(labels.get(0).equals(two)).toEqual(true);
    });

    it('removes the last label', function() {
        var one = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });
        var two = labels.add({
            position : {
                x : 4.0,
                y : 5.0,
                z : 6.0
            }
        });

        expect(labels.getLength()).toEqual(2);

        expect(labels.remove(two)).toEqual(true);

        expect(labels.getLength()).toEqual(1);
        expect(labels.get(0).equals(one)).toEqual(true);
    });

    it('removes the same label twice', function() {
        var l = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });
        expect(labels.getLength()).toEqual(1);

        expect(labels.remove(l)).toEqual(true);
        expect(labels.getLength()).toEqual(0);

        expect(labels.remove(l)).toEqual(false);
        expect(labels.getLength()).toEqual(0);
    });

    it('removes null', function() {
        labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });
        expect(labels.getLength()).toEqual(1);

        expect(labels.remove(null)).toEqual(false);
        expect(labels.getLength()).toEqual(1);
    });

    it('adds and removes labels', function() {
        var one = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });
        var two = labels.add({
            position : {
                x : 4.0,
                y : 5.0,
                z : 6.0
            }
        });
        expect(labels.getLength()).toEqual(2);
        expect(labels.get(0).equals(one)).toEqual(true);
        expect(labels.get(1).equals(two)).toEqual(true);

        expect(labels.remove(two)).toEqual(true);
        var three = labels.add({
            position : {
                x : 7.0,
                y : 8.0,
                z : 9.0
            }
        });
        expect(labels.getLength()).toEqual(2);
        expect(labels.get(0).equals(one)).toEqual(true);
        expect(labels.get(1).equals(three)).toEqual(true);
    });

    it('removes all labels', function() {
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

    it('contains a label', function() {
        var l = labels.add();
        labels.add(l);

        expect(labels.contains(l)).toEqual(true);
    });

    it('does not contain a label', function() {
        var l0 = labels.add();
        var l1 = labels.add();

        labels.add(l0);
        labels.add(l1);
        labels.remove(l0);

        expect(labels.contains(l0)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(labels.contains()).toEqual(false);
    });

    it('gets default buffer usage', function() {
        expect(labels.bufferUsage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('does not render when constructed', function() {
        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it('modifies and removes a label, then renders', function() {
        var l = labels.add({
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        l.setScale(2.0);
        labels.remove(l);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        var p = context.readPixels();
        expect(p[0]).toEqual(0);
        expect(p[1]).toEqual(0);
        expect(p[2]).toEqual(0);
        expect((p[3] === 0) || (p[3] === 255)).toEqual(true); // ANGLE Workaround:  Blending or texture alpha channel is buggy
    });

    it('renders a label', function() {
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('adds and renders a label', function() {
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]); // Not the most precise check
    });

    it('removes and renders a label', function() {
        var l = labels.add({
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.remove(l);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it('removes all labels and renders', function() {
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.removeAll();
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it('removes all labels, adds a label, and renders', function() {
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('renders with a different buffer usage', function() {
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.bufferUsage = BufferUsage.STREAM_DRAW;
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('renders using show property', function() {
        var l = labels.add({
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        l.setShow(false);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        l.setShow(true);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('renders using position property', function() {
        var l = labels.add({
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        l.setPosition({
            x : -2.0,
            y : 0.0,
            z : 0.0
        }); // Behind viewer
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        l.setPosition({
            x : 0.0,
            y : 0.0,
            z : 0.0
        }); // Back in front of viewer
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('renders using scale property', function() {
        var l = labels.add({
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
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        l.setScale(0.0);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        l.setScale(2.0);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);
    });

    it('is picked', function() {
        var l = labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            },
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });

        labels.update(context, sceneState);

        var pickedObject = pick(context, labels, 0, 0);
        expect(pickedObject).toEqual(l);
    });

    it('is not picked', function() {
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

        labels.update(context, sceneState);

        var pickedObject = pick(context, labels, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('computes screen space position (1)', function() {
        var l = labels.add({
            position : {
                x : 0.0,
                y : 0.0,
                z : 0.0
            }
        });

        expect(l.computeScreenSpacePosition(us).equals(new Cartesian2(0.5, 0.5)));
    });

    it('computes screen space position (2)', function() {
        var l = labels.add({
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

        expect(l.computeScreenSpacePosition(us).equals(new Cartesian2(1.5, 2.5)));
    });

    it('computes screen space position (3)', function() {
        var l = labels.add({
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

        var p = l.computeScreenSpacePosition(us);
        expect(p.x).toBeGreaterThan(0.5);
        expect(p.y).toBeGreaterThan(0.5);
    });

    it('throws when computing screen space position when not in a collection', function() {
        var l = labels.add();
        labels.remove(l);

        expect(function() {
            l.computeScreenSpacePosition(us);
        }).toThrow();
    });

    it('throws when computing screen space position without uniform state', function() {
        var l = labels.add();

        expect(function() {
            l.computeScreenSpacePosition();
        }).toThrow();
    });

    it('equals another label', function() {
        var l = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            },
            text : 'equals'
        });
        var l2 = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            },
            text : 'equals'
        });

        expect(l.equals(l2)).toEqual(true);
    });

    it('does not equal another label', function() {
        var l = labels.add({
            position : {
                x : 1.0,
                y : 2.0,
                z : 3.0
            }
        });
        var l2 = labels.add({
            position : {
                x : 4.0,
                y : 5.0,
                z : 6.0
            }
        });

        expect(l.equals(l2)).toEqual(false);
    });

    it('does not equal null', function() {
        var l = labels.add({});
        expect(l.equals(null)).toBeFalsy();
    });

    it('throws when accessing without an index', function() {
        expect(function() {
            labels.get();
        }).toThrow();
    });

    it('cache should have distinct entries', function() {
        labels.add({
            text : 'a'
        });
        expect(labels._canvasContainer.getItems().length).toEqual(1);
        labels.add({
            text : 'a'
        });
        expect(labels._canvasContainer.getItems().length).toEqual(1);
        labels.add({
            text : 'ab'
        });
        expect(labels._canvasContainer.getItems().length).toEqual(2);
        var label = labels.add({
            text : 'abc'
        });
        expect(labels._canvasContainer.getItems().length).toEqual(3);
        label.setFont('30px arial');
        expect(labels._canvasContainer.getItems().length).toEqual(6);
        label.setStyle(LabelStyle.OUTLINE);
        expect(labels._canvasContainer.getItems().length).toEqual(9);
        label.setFillColor({
            red : 1.0,
            green : 165.0 / 255.0,
            blue : 0.0,
            alpha : 1.0
        });
        expect(labels._canvasContainer.getItems().length).toEqual(12);
        label.setOutlineColor({
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 1.0
        });
        expect(labels._canvasContainer.getItems().length).toEqual(15);
        label.setVerticalOrigin(VerticalOrigin.CENTER);
        expect(labels._canvasContainer.getItems().length).toEqual(18);
        //even though we originally started with 30px sans-serif, other properties used to create the id have changed
        label.setFont('30px sans-serif');
        expect(labels._canvasContainer.getItems().length).toEqual(21);
    });

    it('billboards should equal number of characters', function() {
        var label = labels.add({
            text : 'abc'
        });
        expect(label._billboards.length).toEqual(3);
        label.setText('abcd');
        expect(label._billboards.length).toEqual(4);
        label.setText('');
        expect(label._billboards.length).toEqual(0);
        label = labels.add();
        expect(label._billboards.length).toEqual(0);
    });

    it('pixelOffsets of billboards should should be correct when verticalOrigin is changed', function() {
        var label = labels.add({
            text : 'apl'
        });
        var y0 = label._billboards[0]._pixelOffset.y;
        var y1 = label._billboards[1]._pixelOffset.y;
        var y2 = label._billboards[2]._pixelOffset.y;
        label.setVerticalOrigin(VerticalOrigin.TOP);
        expect(label._billboards[0]._pixelOffset.y).toBeLessThan(y0);
        expect(label._billboards[1]._pixelOffset.y).toEqual(y1);
        expect(label._billboards[2]._pixelOffset.y).toEqual(y2);

        label.setVerticalOrigin(VerticalOrigin.CENTER);
        expect(label._billboards[0]._pixelOffset.y).toBeLessThan(y0);
        expect(label._billboards[1]._pixelOffset.y).toEqual(y1);
        expect(label._billboards[2]._pixelOffset.y).toEqual(y2);
    });

    it('pixelOffsets of billboards should should be correct when verticalOrigin and scale are changed', function() {
        var label = labels.add({
            text : 'apl'
        });
        var x0 = label._billboards[0]._pixelOffset.x;
        var y0 = label._billboards[0]._pixelOffset.y;
        var x1 = label._billboards[1]._pixelOffset.x;
        var y1 = label._billboards[1]._pixelOffset.y;
        var x2 = label._billboards[2]._pixelOffset.x;
        var y2 = label._billboards[2]._pixelOffset.y;

        label.setScale(2);
        expect(label._billboards[0]._pixelOffset.x).toEqual(x0);
        expect(label._billboards[0]._pixelOffset.y).toBeGreaterThan(y0);
        expect(label._billboards[1]._pixelOffset.x).toBeGreaterThan(x1);
        expect(label._billboards[1]._pixelOffset.y).toBeLessThan(y1);
        expect(label._billboards[2]._pixelOffset.x).toBeGreaterThan(x2);
        expect(label._billboards[2]._pixelOffset.y).toBeGreaterThan(y2);
        label.setVerticalOrigin(VerticalOrigin.TOP);
        expect(label._billboards[0]._pixelOffset.x).toEqual(x0);
        expect(label._billboards[0]._pixelOffset.y).toBeLessThan(y0);
        expect(label._billboards[1]._pixelOffset.x).toBeGreaterThan(x1);
        expect(label._billboards[1]._pixelOffset.y).toBeLessThan(y1);
        expect(label._billboards[2]._pixelOffset.x).toBeGreaterThan(x2);
        expect(label._billboards[2]._pixelOffset.y).toBeGreaterThan(y2);
        label.setVerticalOrigin(VerticalOrigin.CENTER);
        expect(label._billboards[0]._pixelOffset.x).toEqual(x0);
        expect(label._billboards[0]._pixelOffset.y).toBeLessThan(y0);
        expect(label._billboards[1]._pixelOffset.x).toBeGreaterThan(x1);
        expect(label._billboards[1]._pixelOffset.y).toBeLessThan(y1);
        expect(label._billboards[2]._pixelOffset.x).toBeGreaterThan(x2);
        expect(label._billboards[2]._pixelOffset.y).toBeGreaterThan(y2);
    });

    it('pixelOffsets of billboards should should be correct when HorizontalOrigin is changed', function() {
        var label = labels.add({
            text : 'apl'
        });
        var x0 = label._billboards[0]._pixelOffset.x;
        label.setHorizontalOrigin(HorizontalOrigin.CENTER);
        var centerX0 = label._billboards[0]._pixelOffset.x,
            centerX1 = label._billboards[1]._pixelOffset.x,
            centerX2 = label._billboards[2]._pixelOffset.x;
        expect(centerX0).toBeLessThan(x0);
        expect(centerX1).toBeGreaterThan(centerX0);
        expect(centerX2).toBeGreaterThan(centerX1);

        label.setHorizontalOrigin(HorizontalOrigin.RIGHT);
        expect(label._billboards[0]._pixelOffset.x).toBeLessThan(centerX0);
        expect(label._billboards[1]._pixelOffset.x).toBeLessThan(centerX1);
        expect(label._billboards[2]._pixelOffset.x).toBeLessThan(centerX2);
    });

    it('pixelOffsets of billboards should should be correct when HorizontalOrigin and scale are changed', function() {
        var label = labels.add({
            text : 'apl'
        });
        var x0 = label._billboards[0]._pixelOffset.x;
        var x1 = label._billboards[1]._pixelOffset.x;
        var x2 = label._billboards[2]._pixelOffset.x;

        label.setScale(2);
        expect(label._billboards[0]._pixelOffset.x).toEqual(x0);
        expect(label._billboards[1]._pixelOffset.x).toBeGreaterThan(x1);
        expect(label._billboards[2]._pixelOffset.x).toBeGreaterThan(x2);
        label.setHorizontalOrigin(HorizontalOrigin.CENTER);
        var centerX0 = label._billboards[0]._pixelOffset.x,
            centerX1 = label._billboards[1]._pixelOffset.x,
            centerX2 = label._billboards[2]._pixelOffset.x;
        expect(centerX0).toBeLessThan(x0);
        expect(centerX1).toBeGreaterThan(centerX0);
        expect(centerX2).toBeGreaterThan(centerX1);
        label.setHorizontalOrigin(HorizontalOrigin.RIGHT);
        expect(label._billboards[0]._pixelOffset.x).toBeLessThan(centerX0);
        expect(label._billboards[1]._pixelOffset.x).toBeLessThan(centerX1);
        expect(label._billboards[2]._pixelOffset.x).toBeLessThan(centerX2);
    });

    it('pixelOffsets of billboards should should be correct when verticalOrigin, scale and pixelOffset are changed', function() {
        var label = labels.add({
            text : 'apl'
        });
        var x0 = label._billboards[0]._pixelOffset.x;
        var y0 = label._billboards[0]._pixelOffset.y;
        var x1 = label._billboards[1]._pixelOffset.x;
        var y1 = label._billboards[1]._pixelOffset.y;
        var x2 = label._billboards[2]._pixelOffset.x;
        var y2 = label._billboards[2]._pixelOffset.y;

        label.setPixelOffset({
            x : 10,
            y : 10
        });
        label.setScale(2);
        expect(label._billboards[0]._pixelOffset.x).toBeGreaterThan(x0);
        expect(label._billboards[0]._pixelOffset.y).toBeGreaterThan(y0);
        expect(label._billboards[1]._pixelOffset.x).toBeGreaterThan(x1);
        expect(label._billboards[1]._pixelOffset.y).toBeGreaterThan(y1);
        expect(label._billboards[2]._pixelOffset.x).toBeGreaterThan(x2);
        expect(label._billboards[2]._pixelOffset.y).toBeGreaterThan(y2);
        label.setVerticalOrigin(VerticalOrigin.TOP);
        expect(label._billboards[0]._pixelOffset.x).toBeGreaterThan(x0);
        expect(label._billboards[0]._pixelOffset.y).toBeLessThan(y0);
        expect(label._billboards[1]._pixelOffset.x).toBeGreaterThan(x1);
        expect(label._billboards[1]._pixelOffset.y).toBeGreaterThan(y1);
        expect(label._billboards[2]._pixelOffset.x).toBeGreaterThan(x2);
        expect(label._billboards[2]._pixelOffset.y).toBeGreaterThan(y2);
        label.setVerticalOrigin(VerticalOrigin.CENTER);
        expect(label._billboards[0]._pixelOffset.x).toBeGreaterThan(x0);
        expect(label._billboards[0]._pixelOffset.y).toBeGreaterThan(y0);
        expect(label._billboards[1]._pixelOffset.x).toBeGreaterThan(x1);
        expect(label._billboards[1]._pixelOffset.y).toBeGreaterThan(y1);
        expect(label._billboards[2]._pixelOffset.x).toBeGreaterThan(x2);
        expect(label._billboards[2]._pixelOffset.y).toBeGreaterThan(y2);
    });

    it('pixelOffsets of billboards should should be correct when fontsize changes', function() {
        var label = labels.add({
            text : 'apl'
        });
        var x0 = label._billboards[0]._pixelOffset.x;
        var y0 = label._billboards[0]._pixelOffset.y;
        var x1 = label._billboards[1]._pixelOffset.x;
        var y1 = label._billboards[1]._pixelOffset.y;
        var x2 = label._billboards[2]._pixelOffset.x;
        var y2 = label._billboards[2]._pixelOffset.y;
        label.setFont('20px sans-serif');
        expect(label._billboards[0]._pixelOffset.x).toEqual(x0);
        expect(label._billboards[0]._pixelOffset.y).toEqual(y0);
        expect(label._billboards[1]._pixelOffset.x).toBeLessThan(x1);
        expect(label._billboards[1]._pixelOffset.y).toBeGreaterThan(y1);
        expect(label._billboards[2]._pixelOffset.x).toBeLessThan(x2);
        expect(label._billboards[2]._pixelOffset.y).toEqual(y2);
    });

    it('pixelOffset should equal if set by constructor or properties', function() {
        var label = labels.add({
            text : 'apl',
            scale : 2,
            font : '20px sans-serif',
            verticalOrigin : VerticalOrigin.CENTER,
            pixelOffset : {
                x : 10,
                y : 15
            }
        });
        var propLabel = labels.add();
        propLabel.setText('apl');
        propLabel.setScale(2);
        propLabel.setFont('20px sans-serif');
        propLabel.setVerticalOrigin(VerticalOrigin.CENTER);
        propLabel.setPixelOffset({
            x : 10,
            y : 15
        });
        expect(label._billboards[0]._pixelOffset.x).toEqual(propLabel._billboards[0]._pixelOffset.x);
        expect(label._billboards[0]._pixelOffset.y).toEqual(propLabel._billboards[0]._pixelOffset.y);
        expect(label._billboards[1]._pixelOffset.x).toEqual(propLabel._billboards[1]._pixelOffset.x);
        expect(label._billboards[1]._pixelOffset.y).toEqual(propLabel._billboards[1]._pixelOffset.y);
        expect(label._billboards[2]._pixelOffset.x).toEqual(propLabel._billboards[2]._pixelOffset.x);
        expect(label._billboards[2]._pixelOffset.y).toEqual(propLabel._billboards[2]._pixelOffset.y);
    });

    it('pixelOffsets should not change if position changes', function() {
        var label = labels.add({
            text : 'apl'
        });
        var x0 = label._billboards[0]._pixelOffset.x;
        var y0 = label._billboards[0]._pixelOffset.y;
        var x1 = label._billboards[1]._pixelOffset.x;
        var y1 = label._billboards[1]._pixelOffset.y;
        var x2 = label._billboards[2]._pixelOffset.x;
        var y2 = label._billboards[2]._pixelOffset.y;
        label.setPosition({
            x : 1,
            y : 1,
            z : 1
        });
        expect(label._billboards[0]._pixelOffset.x).toEqual(x0);
        expect(label._billboards[0]._pixelOffset.y).toEqual(y0);
        expect(label._billboards[1]._pixelOffset.x).toEqual(x1);
        expect(label._billboards[1]._pixelOffset.y).toEqual(y1);
        expect(label._billboards[2]._pixelOffset.x).toEqual(x2);
        expect(label._billboards[2]._pixelOffset.y).toEqual(y2);
    });

    it('scale does not change billboard dimension', function() {
        var label = labels.add({
            text : 'apl'
        });
        var dimension = label._billboards[0]._labelDimension;
        var width = dimension.width;
        var height = dimension.height;
        var descent = dimension.descent;
        label.setScale(3);
        dimension = label._billboards[0]._labelDimension;
        expect(dimension.width).toEqual(width);
        expect(dimension.height).toEqual(height);
        expect(dimension.descent).toEqual(descent);

    });

    it('font size changes billboard dimension', function() {
        var label = labels.add({
            text : 'apl'
        });
        var dimension = label._billboards[0]._labelDimension;
        var width = dimension.width;
        var height = dimension.height;
        var descent = dimension.descent;
        expect(dimension.width).toEqual(16);
        expect(dimension.height).toEqual(16);
        expect(dimension.descent).toEqual(-1);
        label.setFont('20px sans-serif');
        dimension = label._billboards[0]._labelDimension;
        expect(dimension.width).toBeLessThan(width);
        expect(dimension.height).toBeLessThan(height);
        expect(dimension.descent).toEqual(descent);
    });
});