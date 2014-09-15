/*global defineSuite*/
defineSuite([
        'Scene/PrimitiveCollection',
        'Core/Cartesian3',
        'Core/defaultValue',
        'Core/Ellipsoid',
        'Core/Math',
        'Renderer/ClearCommand',
        'Scene/HorizontalOrigin',
        'Scene/LabelCollection',
        'Scene/Polygon',
        'Scene/VerticalOrigin',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext',
        'Specs/pick',
        'Specs/render'
    ], function(
        PrimitiveCollection,
        Cartesian3,
        defaultValue,
        Ellipsoid,
        CesiumMath,
        ClearCommand,
        HorizontalOrigin,
        LabelCollection,
        Polygon,
        VerticalOrigin,
        createCamera,
        createContext,
        createFrameState,
        destroyContext,
        pick,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var primitives;
    var frameState;
    var us;
    var camera;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        primitives = new PrimitiveCollection();

        camera = createCamera();
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.direction = Cartesian3.negate(Cartesian3.normalize(camera.position, new Cartesian3()), new Cartesian3());

        us = context.uniformState;
        us.update(context, createFrameState(camera));
    });

    afterEach(function() {
        primitives = primitives && primitives.destroy();
        us = undefined;
    });

    function createLabels(position) {
        position = defaultValue(position, {
            x : -1.0,
            y : 0.0,
            z : 0.0
        });
        var labels = new LabelCollection();
        labels.add({
            position : position,
            text : 'x',
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER
        });
        return labels;
    }

    function createPolygon(degree, ellipsoid) {
        degree = defaultValue(degree, 50.0);
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.UNIT_SPHERE);
        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.positions = Cartesian3.fromDegreesArray([
            -degree, -degree,
            degree, -degree,
            degree,  degree,
            -degree,  degree
        ], ellipsoid);
        polygon.asynchronous = false;
        return polygon;
    }

    it('constructs with options', function() {
        var collection = new PrimitiveCollection({
            show : false,
            destroyPrimitives : false
        });
        expect(collection.show).toEqual(false);
        expect(collection.destroyPrimitives).toEqual(false);
        collection.destroy();
    });

    it('gets default show', function() {
        expect(primitives.show).toEqual(true);
    });

    it('get throws if index is undefined', function() {
        expect(function() {
            primitives.get(undefined);
        }).toThrowDeveloperError();
    });

    it('has zero primitives when constructed', function() {
        expect(primitives.length).toEqual(0);
    });

    it('adds a primitive with add()', function() {
        var p = createLabels();
        expect(primitives.add(p)).toBe(p);
        expect(primitives.length).toEqual(1);
    });

    it('removes the first primitive', function() {
        var p0 = createLabels();
        var p1 = createLabels();

        primitives.add(p0);
        primitives.add(p1);

        expect(primitives.length).toEqual(2);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.length).toEqual(1);
        expect(primitives.get(0)).toBe(p1);

        expect(primitives.remove(p1)).toEqual(true);
        expect(primitives.length).toEqual(0);
    });

    it('removes the last primitive', function() {
        var p0 = createLabels();
        var p1 = createLabels();

        primitives.add(p0);
        primitives.add(p1);

        expect(primitives.length).toEqual(2);

        expect(primitives.remove(p1)).toEqual(true);
        expect(primitives.length).toEqual(1);
        expect(primitives.get(0)).toBe(p0);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.length).toEqual(0);
    });

    it('removes a primitive twice', function() {
        var p0 = createLabels();
        primitives.add(p0);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.remove(p0)).toEqual(false);
    });

    it('removes null', function() {
        expect(primitives.remove()).toEqual(false);
    });

    it('removes all primitives', function() {
        primitives.add(createLabels());
        primitives.add(createLabels());
        primitives.add(createLabels());

        expect(primitives.length).toEqual(3);

        primitives.removeAll();
        expect(primitives.length).toEqual(0);
    });

    it('contains a primitive', function() {
        var labels = createLabels();
        primitives.add(labels);

        expect(primitives.contains(labels)).toEqual(true);
    });

    it('does not contain a primitive', function() {
        var labels0 = createLabels();
        var labels1 = createLabels();
        primitives.add(labels0);

        expect(primitives.contains(labels1)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(primitives.contains()).toEqual(false);
    });

    it('adds and removes a primitive in two composites', function() {
        var p = createLabels();

        primitives.add(p);
        primitives.destroyPrimitives = false;

        var otherPrimitives = new PrimitiveCollection();
        otherPrimitives.add(p);
        otherPrimitives.destroyPrimitives = false;

        // In both composites
        expect(primitives.contains(p)).toEqual(true);
        expect(otherPrimitives.contains(p)).toEqual(true);

        // In one composite
        expect(primitives.remove(p)).toEqual(true);
        expect(primitives.contains(p)).toEqual(false);
        expect(otherPrimitives.contains(p)).toEqual(true);

        // In neither composite
        expect(otherPrimitives.remove(p)).toEqual(true);
        expect(primitives.contains(p)).toEqual(false);
        expect(otherPrimitives.contains(p)).toEqual(false);
        expect(primitives.remove(p)).toEqual(false);
        expect(otherPrimitives.remove(p)).toEqual(false);

        p.destroy();
        otherPrimitives.destroy();
    });

    it('does not remove from a second composite', function() {
        var p = createLabels();
        primitives.add(p);

        var otherPrimitives = new PrimitiveCollection();

        expect(otherPrimitives.contains(p)).toEqual(false);
        expect(otherPrimitives.remove(p)).toEqual(false);
    });

    it('gets default destroyPrimitives', function() {
        expect(primitives.destroyPrimitives).toEqual(true);
    });

    it('renders a primitive added with add()', function() {
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.add(createLabels());
        render(context, frameState, primitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render', function() {
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.show = false;
        primitives.add(createLabels());
        render(context, frameState, primitives);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('renders a primitive in more than one composite', function() {
        var otherPrimitives = new PrimitiveCollection();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var p = createLabels();
        primitives.add(p);
        otherPrimitives.add(p);
        otherPrimitives.destroyPrimitives = false;

        render(context, frameState, primitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        // Render using other composite
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, otherPrimitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        otherPrimitives.destroy();
    });

    it('renders child composites', function() {
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var children = new PrimitiveCollection();
        children.add(createLabels());
        primitives.add(children);

        render(context, frameState, primitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('picks a primitive added with add()', function() {
        var labels = createLabels();
        var l = labels.get(0);

        primitives.add(labels);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(l);
    });

    it('does not pick', function() {
        var labels = createLabels();

        primitives.show = false;
        primitives.add(labels);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('picks child composites', function() {
        var labels = createLabels();
        var l = labels.get(0);

        var children = new PrimitiveCollection();
        children.add(labels);
        primitives.add(children);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(l);
    });

    it('picks a primitive added with render order (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p1);
    });

    it('picks a primitive added with render order (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p1);
        primitives.add(p0);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p0);
    });

    it('picks a primitive added with raise (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raise(p1); // Already on top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p1);
    });

    it('picks a primitive added with raise (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raise(p0); // Moved to top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p0);
    });

    it('picks a primitive added with raiseToTop (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raiseToTop(p1); // Already on top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p1);
    });

    it('picks a primitive added with raiseToTop (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raiseToTop(p0); // Moved to top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p0);
    });

    it('picks a primitive added with lower (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lower(p1); // Moved back

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p0);
    });

    it('picks a primitive added with lower (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lower(p0); // Already on bottom

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p1);
    });

    it('picks a primitive added with lowerToBottom (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lowerToBottom(p1); // Moved back

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p0);
    });

    it('picks a primitive added with lowerToBottom (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lowerToBottom(p0); // Already on bottom

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject.primitive).toEqual(p1);
    });


    it('is not destroyed when first constructed', function() {
        expect(primitives.isDestroyed()).toEqual(false);
    });

    it('is destroyed after calling destroy()', function() {
        var p = new PrimitiveCollection();
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });

    it('destroys its primitives', function() {
        var labels = new LabelCollection(context);

        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives = primitives.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('destroys children', function() {
        var labels = new LabelCollection(context);

        var children = new PrimitiveCollection();
        children.add(labels);

        primitives.add(children);
        expect(children.isDestroyed()).toEqual(false);
        expect(labels.isDestroyed()).toEqual(false);

        primitives = primitives.destroy();
        expect(children.isDestroyed()).toEqual(true);
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('destroys primitive on remove', function() {
        var labels = new LabelCollection(context);

        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.remove(labels);
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('destroys primitive on removeAll', function() {
        var labels = new LabelCollection(context);

        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.removeAll();
        expect(labels.isDestroyed()).toEqual(true);
    });


    it('does not destroy its primitives', function() {
        var labels = new LabelCollection(context);

        primitives.destroyPrimitives = false;
        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives = primitives.destroy();
        expect(labels.isDestroyed()).toEqual(false);

        labels.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('does not destroy primitive on remove', function() {
        var labels = new LabelCollection(context);

        primitives.destroyPrimitives = false;
        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.remove(labels);
        expect(labels.isDestroyed()).toEqual(false);

        labels.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('does not destroy primitive on removeAll', function() {
        var labels = new LabelCollection(context);

        primitives.destroyPrimitives = false;
        primitives.add(labels);
        expect(labels.isDestroyed()).toEqual(false);

        primitives.removeAll();
        expect(labels.isDestroyed()).toEqual(false);

        labels.destroy();
        expect(labels.isDestroyed()).toEqual(true);
    });

    it('throws when add() without an primitive', function() {
        expect(function() {
            primitives.add();
        }).toThrowDeveloperError();
    });

    it('raise throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.raise(p);
        }).toThrowDeveloperError();
    });

    it('raiseToTop throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.raiseToTop(p);
        }).toThrowDeveloperError();
    });

    it('lower throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.lower(p);
        }).toThrowDeveloperError();
    });

    it('lowerToBottom throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.lowerToBottom(p);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
