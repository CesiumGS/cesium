/*global defineSuite*/
defineSuite([
         'Scene/CompositePrimitive',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/equals',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math',
         'Scene/Camera',
         'Scene/CentralBody',
         'Scene/LabelCollection',
         'Scene/HorizontalOrigin',
         'Scene/VerticalOrigin',
         'Scene/Polygon'
     ], function(
         CompositePrimitive,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         equals,
         frameState,
         pick,
         render,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath,
         Camera,
         CentralBody,
         LabelCollection,
         HorizontalOrigin,
         VerticalOrigin,
         Polygon) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var primitives;
    var us;
    var camera;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        primitives = new CompositePrimitive();

        camera = createCamera(context);
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.up = Cartesian3.UNIT_Z;
        camera.direction = camera.position.normalize().negate();

        us = context.getUniformState();
        us.update(createFrameState(camera));
    });

    afterEach(function() {
        primitives = primitives && primitives.destroy();
        us = undefined;
    });

    function createLabels(position) {
        position = position || { x : -1.0, y : 0.0, z : 0.0 };
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
        degree = (typeof degree !== 'undefined') ? degree : 50.0;
        ellipsoid = ellipsoid || Ellipsoid.UNIT_SPHERE;
        var polygon = new Polygon();
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-degree, -degree, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees( degree, -degree, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees( degree,  degree, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-degree,  degree, 0.0))
                             ]);
        return polygon;
    }

    it('gets default show', function() {
        expect(primitives.show).toEqual(true);
    });

    it('get throws if index is undefined', function() {
        expect(function() {
            primitives.get(undefined);
        }).toThrow();
    });

    it('has zero primitives when constructed', function() {
        expect(primitives.getLength()).toEqual(0);
    });

    it('adds a primitive with add()', function() {
        primitives.add(createLabels());
        expect(primitives.getLength()).toEqual(1);
    });

    it('removes the first primitive', function() {
        var p0 = createLabels();
        var p1 = createLabels();

        primitives.add(p0);
        primitives.add(p1);

        expect(primitives.getLength()).toEqual(2);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.getLength()).toEqual(1);
        expect(primitives.get(0)).toBe(p1);

        expect(primitives.remove(p1)).toEqual(true);
        expect(primitives.getLength()).toEqual(0);
    });

    it('removes the last primitive', function() {
        var p0 = createLabels();
        var p1 = createLabels();

        primitives.add(p0);
        primitives.add(p1);

        expect(primitives.getLength()).toEqual(2);

        expect(primitives.remove(p1)).toEqual(true);
        expect(primitives.getLength()).toEqual(1);
        expect(primitives.get(0)).toBe(p0);

        expect(primitives.remove(p0)).toEqual(true);
        expect(primitives.getLength()).toEqual(0);
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

        expect(primitives.getLength()).toEqual(3);

        primitives.removeAll();
        expect(primitives.getLength()).toEqual(0);
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

        var otherPrimitives = new CompositePrimitive(context);
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

        var otherPrimitives = new CompositePrimitive(context);

        expect(otherPrimitives.contains(p)).toEqual(false);
        expect(otherPrimitives.remove(p)).toEqual(false);
    });

    it('gets default destroyPrimitives', function() {
        expect(primitives.destroyPrimitives).toEqual(true);
    });

    it('setting a central body', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var cb = new CentralBody(ellipsoid);
        primitives.setCentralBody(cb);

        expect(primitives.getCentralBody()).toBe(cb);
    });

    it('renders a primitive added with add()', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.add(createLabels());
        render(context, frameState, primitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitives.show = false;
        primitives.add(createLabels());
        render(context, frameState, primitives);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('renders a primitive in more than one composite', function() {
        var otherPrimitives = new CompositePrimitive(context);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var p = createLabels();
        primitives.add(p);
        otherPrimitives.add(p);
        otherPrimitives.destroyPrimitives = false;

        render(context, frameState, primitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        // Render using other composite
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, otherPrimitives);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        otherPrimitives.destroy();
    });

    it('renders child composites', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var children = new CompositePrimitive();
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
        expect(pickedObject).toEqual(l);
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

        var children = new CompositePrimitive();
        children.add(labels);
        primitives.add(children);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(l);
    });

    it('picks a primitive added with render order (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with render order (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p1);
        primitives.add(p0);

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with raise (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raise(p1); // Already on top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with raise (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raise(p0); // Moved to top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with raiseToTop (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raiseToTop(p1); // Already on top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with raiseToTop (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.raiseToTop(p0); // Moved to top

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with lower (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lower(p1); // Moved back

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with lower (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lower(p0); // Already on bottom

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('picks a primitive added with lowerToBottom (0)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lowerToBottom(p1); // Moved back

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p0);
    });

    it('picks a primitive added with lowerToBottom (1)', function() {
        var p0 = createPolygon();
        var p1 = createPolygon();

        primitives.add(p0);
        primitives.add(p1);
        primitives.lowerToBottom(p0); // Already on bottom

        var pickedObject = pick(context, frameState, primitives, 0, 0);
        expect(pickedObject).toEqual(p1);
    });

    it('renders a central body', function() {
        var savedCamera;

        runs(function() {
            context.clear();
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            var cb = new CentralBody(Ellipsoid.UNIT_SPHERE);
            primitives.setCentralBody(cb);

            savedCamera = frameState.camera;
            frameState.camera = camera;
        });

        waitsFor(function() {
            render(context, frameState, primitives);
            return !equals(this.env, context.readPixels(), [0, 0, 0, 0]);
        }, 'the central body to be rendered', 5000);

        runs(function() {
            frameState.camera = savedCamera;
        });
    });

    it('is not destroyed when first constructed', function() {
        expect(primitives.isDestroyed()).toEqual(false);
    });

    it('is destroyed after calling destroy()', function() {
        var p = new CompositePrimitive();
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

        var children = new CompositePrimitive();
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

    it('destroys primitive on setCentralBody', function() {
        var cb = new CentralBody(Ellipsoid.UNIT_SPHERE);

        primitives.setCentralBody(cb);
        expect(cb.isDestroyed()).toEqual(false);

        primitives.setCentralBody(null);
        expect(cb.isDestroyed()).toEqual(true);
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

    it('does not destroy primitive on setCentralBody', function() {
        var cb = new CentralBody(Ellipsoid.UNIT_SPHERE);

        primitives.destroyPrimitives = false;
        primitives.setCentralBody(cb);
        expect(cb.isDestroyed()).toEqual(false);

        primitives.setCentralBody(null);
        expect(cb.isDestroyed()).toEqual(false);

        cb.destroy();
        expect(cb.isDestroyed()).toEqual(true);
    });

    it('throws when add() without an primitive', function() {
        expect(function() {
            primitives.add();
        }).toThrow();
    });

    it('raise throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.raise(p);
        }).toThrow();
    });

    it('raiseToTop throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.raiseToTop(p);
        }).toThrow();
    });

    it('lower throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.lower(p);
        }).toThrow();
    });

    it('lowerToBottom throws when primitive is not in composite', function() {
        var p = createLabels();

        expect(function() {
            primitives.lowerToBottom(p);
        }).toThrow();
    });
}, 'WebGL');
