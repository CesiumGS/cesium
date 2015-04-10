/*global defineSuite*/
defineSuite([
        'Scene/PointPrimitiveCollection',
        'Core/BoundingRectangle',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Math',
        'Core/NearFarScalar',
        'Renderer/ClearCommand',
        'Scene/OrthographicFrustum',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/pick',
        'Specs/pollToPromise',
        'Specs/render',
        'ThirdParty/when'
    ], function(
        PointPrimitiveCollection,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        CesiumMath,
        NearFarScalar,
        ClearCommand,
        OrthographicFrustum,
        SceneMode,
        createCamera,
        createContext,
        createFrameState,
        pick,
        pollToPromise,
        render,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;
    var frameState;
    var mockScene;
    var pointPrimitives;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();

        context.uniformState.update(context, frameState);

        mockScene = {
            canvas : context._canvas,
            context : context,
            camera : frameState.camera,
            frameState : frameState
        };
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        pointPrimitives = new PointPrimitiveCollection();
    });

    afterEach(function() {
        pointPrimitives = pointPrimitives && pointPrimitives.destroy();
    });

    it('default constructs a pointPrimitive', function() {
        var b = pointPrimitives.add();
        expect(b.show).toEqual(true);
        expect(b.position).toEqual(Cartesian3.ZERO);
        expect(b.pixelSize).toEqual(10.0);
        expect(b.color.red).toEqual(1.0);
        expect(b.color.green).toEqual(1.0);
        expect(b.color.blue).toEqual(1.0);
        expect(b.color.alpha).toEqual(1.0);
        expect(b.outlineColor.red).toEqual(0.0);
        expect(b.outlineColor.green).toEqual(0.0);
        expect(b.outlineColor.blue).toEqual(0.0);
        expect(b.outlineColor.alpha).toEqual(0.0);
        expect(b.outlineWidth).toEqual(0.0);
        expect(b.scaleByDistance).not.toBeDefined();
        expect(b.translucencyByDistance).not.toBeDefined();
        expect(b.id).not.toBeDefined();
    });

    it('can add and remove before first update.', function() {
        var p = pointPrimitives.add();
        pointPrimitives.remove(p);
        pointPrimitives.update(context, frameState, []);
    });

    it('explicitly constructs a pointPrimitive', function() {
        var b = pointPrimitives.add({
            show : false,
            position : new Cartesian3(1.0, 2.0, 3.0),
            pixelSize : 2.0,
            color : {
                red : 0.1,
                green : 0.2,
                blue : 0.3,
                alpha : 0.4
            },
            outlineColor : {
                red : 0.5,
                green : 0.6,
                blue : 0.7,
                alpha : 0.8
            },
            outlineWidth : 4.0,
            scaleByDistance : new NearFarScalar(1.0, 3.0, 1.0e6, 0.0),
            translucencyByDistance : new NearFarScalar(1.0, 1.0, 1.0e6, 0.0),
            id : 'id'
        });

        expect(b.show).toEqual(false);
        expect(b.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.pixelSize).toEqual(2.0);
        expect(b.color.red).toEqual(0.1);
        expect(b.color.green).toEqual(0.2);
        expect(b.color.blue).toEqual(0.3);
        expect(b.color.alpha).toEqual(0.4);
        expect(b.outlineColor.red).toEqual(0.5);
        expect(b.outlineColor.green).toEqual(0.6);
        expect(b.outlineColor.blue).toEqual(0.7);
        expect(b.outlineColor.alpha).toEqual(0.8);
        expect(b.outlineWidth).toEqual(4.0);
        expect(b.scaleByDistance).toEqual(new NearFarScalar(1.0, 3.0, 1.0e6, 0.0));
        expect(b.translucencyByDistance).toEqual(new NearFarScalar(1.0, 1.0, 1.0e6, 0.0));
        expect(b.id).toEqual('id');
    });

    it('set pointPrimitive properties', function() {
        var b = pointPrimitives.add();
        b.show = false;
        b.position = new Cartesian3(1.0, 2.0, 3.0);
        b.pixelSize = 2.0;
        b.color = new Color(0.1, 0.2, 0.3, 0.4);
        b.outlineColor = new Color(0.5, 0.6, 0.7, 0.8);
        b.outlineWidth = 4.0;
        b.scaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
        b.translucencyByDistance = new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0);

        expect(b.show).toEqual(false);
        expect(b.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.pixelSize).toEqual(2.0);
        expect(b.color.red).toEqual(0.1);
        expect(b.color.green).toEqual(0.2);
        expect(b.color.blue).toEqual(0.3);
        expect(b.color.alpha).toEqual(0.4);
        expect(b.outlineColor.red).toEqual(0.5);
        expect(b.outlineColor.green).toEqual(0.6);
        expect(b.outlineColor.blue).toEqual(0.7);
        expect(b.outlineColor.alpha).toEqual(0.8);
        expect(b.outlineWidth).toEqual(4.0);
        expect(b.scaleByDistance).toEqual(new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0));
        expect(b.translucencyByDistance).toEqual(new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0));
    });

    it('disable pointPrimitive scaleByDistance', function() {
        var b = pointPrimitives.add({
            scaleByDistance : new NearFarScalar(1.0, 3.0, 1.0e6, 0.0)
        });
        b.scaleByDistance = undefined;
        expect(b.scaleByDistance).not.toBeDefined();
    });

    it('disable pointPrimitive translucencyByDistance', function() {
        var b = pointPrimitives.add({
            translucencyByDistance : new NearFarScalar(1.0, 1.0, 1.0e6, 0.0)
        });
        b.translucencyByDistance = undefined;
        expect(b.translucencyByDistance).not.toBeDefined();
    });

    it('render pointPrimitive with scaleByDistance', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            scaleByDistance: new NearFarScalar(1.0, 1.0, 3.0, 0.0),
            color : Color.LIME
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var us = context.uniformState;
        us.update(context, createFrameState(createCamera({
            offset : new Cartesian3(0.0, 0.0, 1.0)
        })));
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        us.update(context, createFrameState(createCamera({
            offset : new Cartesian3(0.0, 0.0, 6.0)
        })));
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        us.update(context, createFrameState(createCamera()));
    });

    it('render pointPrimitive with translucencyByDistance', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            translucencyByDistance: new NearFarScalar(1.0, 1.0, 3.0, 0.0),
            color : Color.LIME
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var us = context.uniformState;
        var offset = new Cartesian3(0.0, 0.0, 1.0);
        us.update(context, createFrameState(createCamera({
            offset : offset
        })));
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        offset = new Cartesian3(0.0, 0.0, 6.0);
        us.update(context, createFrameState(createCamera({
            offset : offset
        })));
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        us.update(context, createFrameState(createCamera()));
    });

    it('throws scaleByDistance with nearDistance === farDistance', function() {
        var b = pointPrimitives.add();
        var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            b.scaleByDistance = scale;
        }).toThrowDeveloperError();
    });

    it('throws new pointPrimitive with invalid scaleByDistance (nearDistance === farDistance)', function() {
        var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            pointPrimitives.add({
                scaleByDistance : scale
            });
        }).toThrowDeveloperError();
    });

    it('throws scaleByDistance with nearDistance > farDistance', function() {
        var b = pointPrimitives.add();
        var scale = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
        expect(function() {
            b.scaleByDistance = scale;
        }).toThrowDeveloperError();
    });

    it('throws translucencyByDistance with nearDistance === farDistance', function() {
        var b = pointPrimitives.add();
        var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            b.translucencyByDistance = translucency;
        }).toThrowDeveloperError();
    });

    it('throws new pointPrimitive with invalid translucencyByDistance (nearDistance === farDistance)', function() {
        var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            pointPrimitives.add({
                translucencyByDistance : translucency
            });
        }).toThrowDeveloperError();
    });

    it('throws translucencyByDistance with nearDistance > farDistance', function() {
        var b = pointPrimitives.add();
        var translucency = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
        expect(function() {
            b.translucencyByDistance = translucency;
        }).toThrowDeveloperError();
    });

    it('set a removed pointPrimitive property', function() {
        var b = pointPrimitives.add();
        pointPrimitives.remove(b);
        b.show = false;
        expect(b.show).toEqual(false);
    });

    it('has zero pointPrimitives when constructed', function() {
        expect(pointPrimitives.length).toEqual(0);
    });

    it('adds a pointPrimitive', function() {
        var b = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });

        expect(pointPrimitives.length).toEqual(1);
        expect(pointPrimitives.get(0)).toEqual(b);
    });

    it('removes the first pointPrimitive', function() {
        var one = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var two = pointPrimitives.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });

        expect(pointPrimitives.length).toEqual(2);

        expect(pointPrimitives.remove(one)).toEqual(true);

        expect(pointPrimitives.length).toEqual(1);
        expect(pointPrimitives.get(0)).toEqual(two);
    });

    it('removes the last pointPrimitive', function() {
        var one = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var two = pointPrimitives.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });

        expect(pointPrimitives.length).toEqual(2);

        expect(pointPrimitives.remove(two)).toEqual(true);

        expect(pointPrimitives.length).toEqual(1);
        expect(pointPrimitives.get(0)).toEqual(one);
    });

    it('removes the same pointPrimitive twice', function() {
        var b = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        expect(pointPrimitives.length).toEqual(1);

        expect(pointPrimitives.remove(b)).toEqual(true);
        expect(pointPrimitives.length).toEqual(0);

        expect(pointPrimitives.remove(b)).toEqual(false);
        expect(pointPrimitives.length).toEqual(0);
    });

    it('returns false when removing undefined', function() {
        pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        expect(pointPrimitives.length).toEqual(1);

        expect(pointPrimitives.remove(undefined)).toEqual(false);
        expect(pointPrimitives.length).toEqual(1);
    });

    it('adds and removes pointPrimitives', function() {
        var one = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var two = pointPrimitives.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });
        expect(pointPrimitives.length).toEqual(2);
        expect(pointPrimitives.get(0)).toEqual(one);
        expect(pointPrimitives.get(1)).toEqual(two);

        expect(pointPrimitives.remove(two)).toEqual(true);
        var three = pointPrimitives.add({
            position : new Cartesian3(7.0, 8.0, 9.0)
        });
        expect(pointPrimitives.length).toEqual(2);
        expect(pointPrimitives.get(0)).toEqual(one);
        expect(pointPrimitives.get(1)).toEqual(three);
    });

    it('removes all pointPrimitives', function() {
        pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        pointPrimitives.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });
        expect(pointPrimitives.length).toEqual(2);

        pointPrimitives.removeAll();
        expect(pointPrimitives.length).toEqual(0);
    });

    it('can check if it contains a pointPrimitive', function() {
        var pointPrimitive = pointPrimitives.add();

        expect(pointPrimitives.contains(pointPrimitive)).toEqual(true);
    });

    it('returns false when checking if it contains a pointPrimitive it does not contain', function() {
        var pointPrimitive = pointPrimitives.add();
        pointPrimitives.remove(pointPrimitive);

        expect(pointPrimitives.contains(pointPrimitive)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(pointPrimitives.contains(undefined)).toEqual(false);
    });

    it('does not contain random other objects', function() {
        expect(pointPrimitives.contains({})).toEqual(false);
        expect(pointPrimitives.contains(new Cartesian2())).toEqual(false);
    });

    it('does not render when constructed', function() {
        expect(render(context, frameState, pointPrimitives)).toEqual(0);
    });

    it('modifies and removes a pointPrimitive, then renders', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });
        pointPrimitives.add({
            position : new Cartesian3(1.0, 0.0, 0.0),
            color : Color.BLUE
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        b.pixelSize = 2.0;
        pointPrimitives.remove(b);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders a green pointPrimitive', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('adds and renders a pointPrimitive', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        pointPrimitives.add({
            position : new Cartesian3(-0.5, 0.0, 0.0), // Closer to viewer
            color : Color.BLUE
        });

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('removes and renders a pointPrimitive', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });
        var bluePointPrimitive = pointPrimitives.add({
            position : new Cartesian3(-0.5, 0.0, 0.0), // Closer to viewer
            color : Color.BLUE
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        pointPrimitives.remove(bluePointPrimitive);
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('removes all pointPrimitives and renders', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        pointPrimitives.removeAll();
        expect(render(context, frameState, pointPrimitives)).toEqual(0);
    });

    it('removes all pointPrimitives, adds a pointPrimitive, and renders', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        pointPrimitives.removeAll();
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.BLUE
        });

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using pointPrimitive show property', function() {
        var greenPointPrimitive = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });
        var bluePointPrimitive = pointPrimitives.add({
            show : false,
            position : Cartesian3.ZERO,
            color : Color.BLUE
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        greenPointPrimitive.show = false;
        bluePointPrimitive.show = true;

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using pointPrimitive position property', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.position = new Cartesian3(-2.0, 0.0, 0.0); // Behind viewer
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.position = Cartesian3.ZERO; // Back in front of viewer
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using pointPrimitive color property', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.color = new Color(1.0, 0.0, 1.0, 1.0);
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([255, 0, 255, 255]);

        // Update a second time since it goes through a different vertex array update path
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.color = new Color(0.0, 1.0, 0.0, 1.0);
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME,
            pixelSize : 0.5 // bring bounding volume in view
        });
        pointPrimitives.debugShowBoundingVolume = true;

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('updates 10% of pointPrimitives', function() {
        for ( var i = 0; i < 10; ++i) {
            pointPrimitives.add({
                position : Cartesian3.ZERO,
                color : Color.WHITE,
                show : (i === 3)
            });
        }

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // First render - default pointPrimitive color is white.
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        pointPrimitives.get(3).color = new Color(0.0, 1.0, 0.0, 1.0);

        // Second render - pointPrimitive is green
        ClearCommand.ALL.execute(context);
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        pointPrimitives.get(3).color = new Color(1.0, 0.0, 0.0, 1.0);

        // Third render - update goes through a different vertex array update path
        ClearCommand.ALL.execute(context);
        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('renders more than 64K pointPrimitives', function() {
        for ( var i = 0; i < 64 * 1024; ++i) {
            pointPrimitives.add({
                position : Cartesian3.ZERO,
                color : Color.TRANSPARENT
            });
        }

        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, pointPrimitives);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('is picked', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE,
            id : 'id'
        });

        var pickedObject = pick(context, frameState, pointPrimitives, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        expect(pickedObject.id).toEqual('id');
    });

    it('can change pick id', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE,
            id : 'id'
        });

        var pickedObject = pick(context, frameState, pointPrimitives, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        expect(pickedObject.id).toEqual('id');

        b.id = 'id2';

        pickedObject = pick(context, frameState, pointPrimitives, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        expect(pickedObject.id).toEqual('id2');
    });

    it('is not picked', function() {
        pointPrimitives.add({
            show : false,
            position : Cartesian3.ZERO,
            color : Color.WHITE
        });

        var pickedObject = pick(context, frameState, pointPrimitives, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('pick a pointPrimitive using translucencyByDistance', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE
        });

        var translucency = new NearFarScalar(1.0, 1.0, 3.0e9, 0.9);
        b.translucencyByDistance = translucency;
        var pickedObject = pick(context, frameState, pointPrimitives, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        translucency.nearValue = 0.0;
        translucency.farValue = 0.0;
        b.translucencyByDistance = translucency;
        pickedObject = pick(context, frameState, pointPrimitives, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('computes screen space position', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO
        });
        pointPrimitives.update(context, frameState, []);
        expect(b.computeScreenSpacePosition(mockScene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
    });

    it('throws when computing screen space position when not in a collection', function() {
        var b = pointPrimitives.add({
            position : Cartesian3.ZERO
        });
        pointPrimitives.remove(b);
        expect(function() {
            b.computeScreenSpacePosition(mockScene);
        }).toThrowDeveloperError();
    });

    it('throws when computing screen space position without scene', function() {
        var b = pointPrimitives.add();

        expect(function() {
            b.computeScreenSpacePosition();
        }).toThrowDeveloperError();
    });

    it('equals another pointPrimitive', function() {
        var b = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0),
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });
        var b2 = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0),
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        expect(b).toEqual(b2);
    });

    it('does not equal another pointPrimitive', function() {
        var b = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var b2 = pointPrimitives.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });

        expect(b.equals(b2)).toEqual(false);
    });

    it('does not equal undefined', function() {
        var pointPrimitive = pointPrimitives.add();
        expect(pointPrimitive.equals(undefined)).toEqual(false);
    });

    it('throws when accessing without an index', function() {
        expect(function() {
            pointPrimitives.get();
        }).toThrowDeveloperError();
    });

    it('computes bounding sphere in 3D', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = pointPrimitives.add({
            color : Color.LIME,
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = pointPrimitives.add({
            color : Color.LIME,
            position : Cartesian3.fromDegrees(-50.0, 50.0)
        });

        var commandList = [];
        pointPrimitives.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;

        var positions = [one.position, two.position];
        var bs = BoundingSphere.fromPoints(positions);
        expect(actual.center).toEqual(bs.center);
        expect(actual.radius).toBeGreaterThan(bs.radius);
    });

    it('computes bounding sphere in Columbus view', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = pointPrimitives.add({
            color : Color.LIME,
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = pointPrimitives.add({
            color : Color.LIME,
            position : Cartesian3.fromDegrees(-50.0, 50.0)
        });

        var mode = frameState.mode;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var commandList = [];
        pointPrimitives.update(context, frameState, commandList);
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

        var one = pointPrimitives.add({
            color : Color.LIME,
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = pointPrimitives.add({
            color : Color.LIME,
            position : Cartesian3.fromDegrees(-50.0, 50.0)
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
        pointPrimitives.update(context, frameState, commandList);
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
}, 'WebGL');
