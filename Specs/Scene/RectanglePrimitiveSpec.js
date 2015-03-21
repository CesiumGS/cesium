/*global defineSuite*/
defineSuite([
        'Scene/RectanglePrimitive',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/defaultValue',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/Math',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Renderer/ClearCommand',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/pick',
        'Specs/render'
    ], function(
        RectanglePrimitive,
        BoundingSphere,
        Cartesian3,
        defaultValue,
        Ellipsoid,
        GeographicProjection,
        CesiumMath,
        Rectangle,
        RectangleGeometry,
        ClearCommand,
        SceneMode,
        createCamera,
        createContext,
        createFrameState,
        createScene,
        pick,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;
    var frameState;
    var rectangle;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        rectangle = new RectanglePrimitive();

        frameState = createFrameState(createCamera({
            offset : new Cartesian3(1.02, 0.0, 0.0)
        }));

        us = context.uniformState;
        us.update(context, frameState);
    });

    afterEach(function() {
        rectangle = rectangle && rectangle.destroy();
        us = undefined;
    });

    function createRectangle(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.UNIT_SPHERE);

        var e = new RectanglePrimitive({
            ellipsoid : ellipsoid,
            granularity : CesiumMath.toRadians(20.0),
            rectangle : Rectangle.fromDegrees(-20.0, -20.0, 20.0, 20.0),
            id : options.id,
            asynchronous : false,
            debugShowBoundingVolume : options.debugShowBoundingVolume
        });
        e.material.uniforms.color.alpha = 1.0;

        return e;
    }

    it('gets defaults', function() {
        expect(rectangle.show).toEqual(true);
        expect(rectangle.ellipsoid).toEqual(Ellipsoid.WGS84);
        expect(rectangle.granularity).toEqual(CesiumMath.RADIANS_PER_DEGREE);
        expect(rectangle.height).toEqual(0.0);
        expect(rectangle.rotation).toEqual(0.0);
        expect(rectangle.textureRotationAngle).toEqual(0.0);
        expect(rectangle.material.uniforms.color).toEqual({
            red : 1.0,
            green : 1.0,
            blue : 0.0,
            alpha : 0.5
        });
        expect(rectangle.asynchronous).toEqual(true);
        expect(rectangle.debugShowBoundingVolume).toEqual(false);
    });

    it('renders', function() {
        rectangle = createRectangle();
        rectangle.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, rectangle);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('does not render when show is false', function() {
        rectangle = createRectangle();
        rectangle.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };
        rectangle.show = false;

        expect(render(context, frameState, rectangle)).toEqual(0);
    });

    it('does not render without rectangle', function() {
        rectangle = new RectanglePrimitive();
        rectangle.ellipsoid = Ellipsoid.UNIT_SPHERE;
        rectangle.granularity = CesiumMath.toRadians(20.0);
        expect(render(context, frameState, rectangle)).toEqual(0);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var rectangle = createRectangle({
            ellipsoid : Ellipsoid.WGS84,
            debugShowBoundingVolume : true
        });

        var commands = [];
        rectangle.update(context, frameState, commands);

        expect(commands.length).toBeGreaterThan(0);
        for (var i = 0; i < commands.length; ++i) {
            expect(commands[i].debugShowBoundingVolume).toBe(true);
        }
    });

    it('is picked', function() {
        rectangle = createRectangle({
            id : 'id'
        });

        var pickedObject = pick(context, frameState, rectangle, 0, 0);
        expect(pickedObject.primitive).toEqual(rectangle);
        expect(pickedObject.id).toEqual('id');
    });

    it('is not picked (show === false)', function() {
        rectangle = createRectangle();
        rectangle.show = false;

        var pickedObject = pick(context, frameState, rectangle, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        rectangle = createRectangle();
        rectangle.material.uniforms.color.alpha = 0.0;

        var pickedObject = pick(context, frameState, rectangle, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('test 3D bounding sphere', function() {
        var ellipsoid = Ellipsoid.WGS84;
        rectangle = createRectangle({
            ellipsoid : ellipsoid
        });
        var commandList = [];
        rectangle.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        expect(boundingVolume).toEqual(BoundingSphere.fromRectangle3D(rectangle.rectangle, ellipsoid));
    });

    it('test Columbus view bounding sphere', function() {
        var ellipsoid = Ellipsoid.WGS84;
        rectangle = createRectangle({
            ellipsoid : ellipsoid
        });

        var mode = frameState.mode;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var commandList = [];
        rectangle.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        frameState.mode = mode;

        var rectangleGeometry = RectangleGeometry.createGeometry(new RectangleGeometry({
            rectangle : rectangle.rectangle,
            ellipsoid : ellipsoid
        }));
        var projectedPoints = [];
        var projection = new GeographicProjection(ellipsoid);
        for (var i = 0; i < rectangleGeometry.attributes.position.values.length; i += 3) {
            var p = Cartesian3.fromArray(rectangleGeometry.attributes.position.values, i);
            projectedPoints.push(projection.project(ellipsoid.cartesianToCartographic(p)));
        }

        var expected = BoundingSphere.fromPoints(projectedPoints);
        expected.center = Cartesian3.fromElements(expected.center.z, expected.center.x, expected.center.y);
        expect(boundingVolume.center).toEqualEpsilon(expected.center, CesiumMath.EPSILON9);
        expect(boundingVolume.radius).toEqualEpsilon(expected.radius, CesiumMath.EPSILON9);
    });

    it('test 2D bounding sphere', function() {
        var ellipsoid = Ellipsoid.WGS84;
        rectangle = createRectangle({
            ellipsoid : ellipsoid
        });

        var mode = frameState.mode;
        frameState.mode = SceneMode.SCENE2D;
        var commandList = [];
        rectangle.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        frameState.mode = mode;

        var rectangleGeometry = RectangleGeometry.createGeometry(new RectangleGeometry({
            rectangle : rectangle.rectangle,
            ellipsoid : ellipsoid
        }));
        var projectedPoints = [];
        var projection = new GeographicProjection(ellipsoid);
        for (var i = 0; i < rectangleGeometry.attributes.position.values.length; i += 3) {
            var p = Cartesian3.fromArray(rectangleGeometry.attributes.position.values, i);
            projectedPoints.push(projection.project(ellipsoid.cartesianToCartographic(p)));
        }

        var expected = BoundingSphere.fromPoints(projectedPoints);
        expected.center = Cartesian3.fromElements(0.0, expected.center.x, expected.center.y);
        expect(boundingVolume.center).toEqualEpsilon(expected.center, CesiumMath.EPSILON9);
        expect(boundingVolume.radius).toEqualEpsilon(expected.radius, CesiumMath.EPSILON9);
    });

    it('isDestroyed', function() {
        var e = new RectanglePrimitive();
        expect(e.isDestroyed()).toEqual(false);
        e.destroy();
        expect(e.isDestroyed()).toEqual(true);
    });

    it('throws when updated/rendered without a ellipsoid', function() {
        rectangle = createRectangle();
        rectangle.ellipsoid = undefined;

        expect(function() {
            rectangle.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when updated/rendered without an invalid granularity', function() {
        rectangle = createRectangle();
        rectangle.granularity = -1.0;

        expect(function() {
            rectangle.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when rendered without a material', function() {
        rectangle = createRectangle();
        rectangle.material = undefined;

        expect(function() {
            render(context, frameState, rectangle);
        }).toThrowDeveloperError();
    });
}, 'WebGL');