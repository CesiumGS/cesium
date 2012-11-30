/*global defineSuite*/
defineSuite([
         'Scene/EllipsoidPrimitive',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Matrix4',
         'Core/Math',
         'Core/JulianDate',
         'Scene/Material'
     ], function(
         EllipsoidPrimitive,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         frameState,
         pick,
         render,
         Cartesian3,
         Cartographic,
         Matrix4,
         CesiumMath,
         JulianDate,
         Material) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var ellipsoid;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        ellipsoid = new EllipsoidPrimitive();

        us = context.getUniformState();
        us.update(createFrameState(createCamera(context, new Cartesian3(1.02, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z)));
    });

    afterEach(function() {
        ellipsoid = ellipsoid && ellipsoid.destroy();
        us = undefined;
    });

    function createEllipsoid() {
        var e = new EllipsoidPrimitive();
        e.radii = new Cartesian3(1.0, 1.0, 1.0);

        return e;
    }

    it('gets the default properties', function() {
        expect(ellipsoid.show).toEqual(true);
        expect(ellipsoid.center).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radii).not.toBeDefined();
        expect(ellipsoid.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(ellipsoid.material.type).toEqual(Material.ColorType);
    });

    it('renders with the default material', function() {
        ellipsoid = createEllipsoid();

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders with a custom modelMatrix', function() {
        ellipsoid = createEllipsoid();
        ellipsoid.radii = new Cartesian3(0.1, 0.1, 0.1);
        ellipsoid.modelMatrix = Matrix4.fromScale(new Cartesian3(10.0, 10.0, 10.0));

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders two with a vertex array cache hit', function() {
        var e0 = createEllipsoid();
        var e1 = createEllipsoid();

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, e0);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, e1);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        e0 = e0 && e0.destroy();
        e1 = e1 && e1.destroy();
    });

    it('does not render when show is false', function() {
        ellipsoid = createEllipsoid();
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.show = false;

        expect(render(context, frameState, ellipsoid)).toEqual(0);
    });

    it('does not render without radii', function() {
        ellipsoid = new EllipsoidPrimitive();
        expect(render(context, frameState, ellipsoid)).toEqual(0);
    });

    it('does not render when not in view due to center', function() {
        ellipsoid = createEllipsoid();
        ellipsoid.center = new Cartesian3(10.0, 0.0, 0.0);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, ellipsoid);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('is picked', function() {
        ellipsoid = createEllipsoid();

        var pickedObject = pick(context, frameState, ellipsoid, 0, 0);
        expect(pickedObject).toEqual(ellipsoid);
    });

    it('is not picked', function() {
        ellipsoid = createEllipsoid();
        ellipsoid.show = false;

        expect(render(context, frameState, ellipsoid)).toEqual(0);
    });

    it('isDestroyed', function() {
        var p = new EllipsoidPrimitive();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });

    it('throws when rendered without a material', function() {
        ellipsoid = createEllipsoid();
        ellipsoid.material = undefined;

        expect(function() {
            render(context, frameState, ellipsoid);
        }).toThrow();
    });
});
