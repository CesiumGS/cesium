/*global defineSuite*/
defineSuite([
         'Scene/LabelCollection',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Color',
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
         Color,
         Matrix4,
         CesiumMath,
         BufferUsage,
         HorizontalOrigin,
         VerticalOrigin,
         LabelStyle) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    // TODO: rendering tests for pixel offset, eye offset, horizontal origin, vertical origin, font, style, outlineColor and fillColor properties

    var context;
    var labels;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        labels = new LabelCollection();

        var camera = {
            eye : new Cartesian3(-1.0, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };

        us = context.getUniformState();
        us.setView(Matrix4.fromCamera(camera));
        us.setProjection(Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        labels = labels && labels.destroy();
        us = undefined;
    });

    it('has default values when adding a label', function() {
        var label = labels.add();
        expect(label.getShow()).toEqual(true);
        expect(label.getPosition()).toEqual(Cartesian3.ZERO);
        expect(label.getText()).toEqual('');
        expect(label.getFont()).toEqual('30px sans-serif');
        expect(label.getFillColor()).toEqual(Color.WHITE);
        expect(label.getOutlineColor()).toEqual(Color.BLACK);
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
            text : 'Hello'
        });
        var dimension = label._billboards[0]._labelDimensions;
        expect(dimension.height).toBeGreaterThan(0);
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
        expect(labels.get(0)).toBe(two);
    });

    it('can remove the last label', function() {
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
        expect(labels.get(0)).toBe(one);
    });

    it('returns false when removing null', function() {
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

    it('can add and remove labels', function() {
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
        expect(labels.get(0)).toBe(one);
        expect(labels.get(1)).toBe(two);

        expect(labels.remove(two)).toEqual(true);
        var three = labels.add({
            position : {
                x : 7.0,
                y : 8.0,
                z : 9.0
            }
        });
        expect(labels.getLength()).toEqual(2);
        expect(labels.get(0)).toBe(one);
        expect(labels.get(1)).toBe(three);
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
        labels.add(label);

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

    it('has a default buffer usage', function() {
        expect(labels.bufferUsage).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('does not render when constructed', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        label.setScale(2.0);
        labels.remove(label);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.remove(label);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.removeAll();
        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        labels.bufferUsage = BufferUsage.STREAM_DRAW;
        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setShow(false);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setShow(true);
        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setPosition({
            x : -2.0,
            y : 0.0,
            z : 0.0
        }); // Behind viewer
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setPosition({
            x : 0.0,
            y : 0.0,
            z : 0.0
        }); // Back in front of viewer
        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setScale(0.0);
        labels.update(context, sceneState);
        labels.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        label.setScale(2.0);
        labels.update(context, sceneState);
        labels.render(context, us);
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

        labels.update(context, sceneState);

        var pickedObject = pick(context, labels, 0, 0);
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

        labels.update(context, sceneState);

        var pickedObject = pick(context, labels, 0, 0);
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
            var label = labels.add({
                position : {
                    x : 0.0,
                    y : 0.0,
                    z : 0.0
                }
            });

            expect(label.computeScreenSpacePosition(us).equals(new Cartesian2(0.5, 0.5)));
        });

        it('can compute screen space position (2)', function() {
            var label = labels.add({
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

            expect(label.computeScreenSpacePosition(us).equals(new Cartesian2(1.5, 2.5)));
        });

        it('can compute screen space position (3)', function() {
            var label = labels.add({
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

            var p = label.computeScreenSpacePosition(us);
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
            expect(label.equals(undefined)).toEqual(false);
        });

        it('should have a number of billboards equal to the number of characters', function() {
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

        it('should set pixelOffsets of billboards correctly when vertical origin is changed', function() {
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

        it('should set pixelOffsets of billboards correctly when vertical origin and scale are changed', function() {
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

        it('should set pixelOffsets of billboards correctly when horizontal origin is changed', function() {
            var label = labels.add({
                text : 'apl'
            });
            var x0 = label._billboards[0]._pixelOffset.x;
            label.setHorizontalOrigin(HorizontalOrigin.CENTER);
            var centerX0 = label._billboards[0]._pixelOffset.x;
            var centerX1 = label._billboards[1]._pixelOffset.x;
            var centerX2 = label._billboards[2]._pixelOffset.x;
            expect(centerX0).toBeLessThan(x0);
            expect(centerX1).toBeGreaterThan(centerX0);
            expect(centerX2).toBeGreaterThan(centerX1);

            label.setHorizontalOrigin(HorizontalOrigin.RIGHT);
            expect(label._billboards[0]._pixelOffset.x).toBeLessThan(centerX0);
            expect(label._billboards[1]._pixelOffset.x).toBeLessThan(centerX1);
            expect(label._billboards[2]._pixelOffset.x).toBeLessThan(centerX2);
        });

        it('should set pixelOffsets of billboards correctly when horizontal origin and scale are changed', function() {
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
            var centerX0 = label._billboards[0]._pixelOffset.x;
            var centerX1 = label._billboards[1]._pixelOffset.x;
            var centerX2 = label._billboards[2]._pixelOffset.x;
            expect(centerX0).toBeLessThan(x0);
            expect(centerX1).toBeGreaterThan(centerX0);
            expect(centerX2).toBeGreaterThan(centerX1);

            label.setHorizontalOrigin(HorizontalOrigin.RIGHT);
            expect(label._billboards[0]._pixelOffset.x).toBeLessThan(centerX0);
            expect(label._billboards[1]._pixelOffset.x).toBeLessThan(centerX1);
            expect(label._billboards[2]._pixelOffset.x).toBeLessThan(centerX2);
        });

        it('should set pixelOffsets of billboards correctly when vertical origin, scale and pixel offset are changed', function() {
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

        it('should set pixelOffsets of billboards correctly when font size changes', function() {
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

            var two = labels.add();
            two.setText(text);
            two.setScale(scale);
            two.setFont(font);
            two.setVerticalOrigin(verticalOrigin);
            two.setPixelOffset(pixelOffset);

            expect(one._billboards[0]._pixelOffset).toEqual(two._billboards[0]._pixelOffset);
            expect(one._billboards[1]._pixelOffset).toEqual(two._billboards[1]._pixelOffset);
            expect(one._billboards[2]._pixelOffset).toEqual(two._billboards[2]._pixelOffset);
        });

        it('should not change pixelOffsets of billboards when position changes', function() {
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

        it('should not change label dimensions when scale changes', function() {
            var label = labels.add({
                text : 'apl'
            });

            var dimensions = label._billboards[0]._labelDimensions;
            var width = dimensions.width;
            var height = dimensions.height;
            var descent = dimensions.descent;

            label.setScale(3);

            dimensions = label._billboards[0]._labelDimensions;
            expect(dimensions.width).toEqual(width);
            expect(dimensions.height).toEqual(height);
            expect(dimensions.descent).toEqual(descent);
        });

        it('should change label dimensions when font size changes', function() {
            var label = labels.add({
                text : 'apl',
                font : '30px sans-serif'
            });

            var dimensions = label._billboards[0]._labelDimensions;
            var width = dimensions.width;
            var height = dimensions.height;
            var descent = dimensions.descent;
            expect(dimensions.width).toEqual(16);
            expect(dimensions.height).toEqual(16);
            expect(dimensions.descent).toEqual(-1);

            label.setFont('20px sans-serif');

            dimensions = label._billboards[0]._labelDimensions;
            expect(dimensions.width).toBeLessThan(width);
            expect(dimensions.height).toBeLessThan(height);
            expect(dimensions.descent).toEqual(descent);
        });
    });
});