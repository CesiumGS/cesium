/*global defineSuite*/
defineSuite([
        'Scene/PointPrimitiveCollection',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Math',
        'Core/NearFarScalar',
        'Scene/OrthographicFrustum',
        'Specs/createScene'
    ], function(
        PointPrimitiveCollection,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        CesiumMath,
        NearFarScalar,
        OrthographicFrustum,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    var camera;
    var pointPrimitives;

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
        pointPrimitives = new PointPrimitiveCollection();
        scene.primitives.add(pointPrimitives);
    });

    afterEach(function() {
        // pointPrimitives are destroyed by removeAll().
        scene.primitives.removeAll();
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

    it('can add and remove before first render.', function() {
        var p = pointPrimitives.add();
        pointPrimitives.remove(p);
        expect(scene.renderForSpecs()).toBeDefined();
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
            scaleByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0),
            color : Color.LIME
        });

        camera.position = new Cartesian3(2.0, 0.0, 0.0);
        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        camera.position = new Cartesian3(4.0, 0.0, 0.0);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('render pointPrimitive with translucencyByDistance', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            translucencyByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0),
            color : Color.LIME
        });

        camera.position = new Cartesian3(2.0, 0.0, 0.0);
        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        camera.position = new Cartesian3(4.0, 0.0, 0.0);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
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

    it('modifies and removes a pointPrimitive, then renders', function() {
        var p1 = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });
        pointPrimitives.add({
            position : new Cartesian3(-1.0, 0.0, 0.0),
            color : Color.BLUE
        });

        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        p1.pixelSize = 2.0;
        pointPrimitives.remove(p1);
        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
    });

    it('renders a green pointPrimitive', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);
    });

    it('adds and renders a pointPrimitive', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        pointPrimitives.add({
            position : new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
            color : Color.BLUE
        });

        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
    });

    it('removes and renders a pointPrimitive', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });
        var bluePointPrimitive = pointPrimitives.add({
            position : new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
            color : Color.BLUE
        });

        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);

        pointPrimitives.remove(bluePointPrimitive);
        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);
    });

    it('removes all pointPrimitives and renders', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        pointPrimitives.removeAll();
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    });

    it('removes all pointPrimitives, adds a pointPrimitive, and renders', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        pointPrimitives.removeAll();
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.BLUE
        });

        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
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

        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        greenPointPrimitive.show = false;
        bluePointPrimitive.show = true;

        expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
    });

    it('renders using pointPrimitive position property', function() {
        var p = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME
        });

        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        p.position = new Cartesian3(20.0, 0.0, 0.0); // Behind camera
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        p.position = new Cartesian3(1.0, 0.0, 0.0);  // Back in front of camera
        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);
    });

    it('renders using pointPrimitive color property', function() {
        var p = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE
        });

        expect(scene.renderForSpecs()).toEqual([255, 255, 255, 255]);

        p.color = new Color(1.0, 0.0, 1.0, 1.0);
        expect(scene.renderForSpecs()).toEqual([255, 0, 255, 255]);

        // Update a second time since it goes through a different vertex array update path
        p.color = new Color(0.0, 1.0, 0.0, 1.0);
        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.LIME,
            pixelSize : 0.5 // bring bounding volume in view
        });
        pointPrimitives.debugShowBoundingVolume = true;

        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
    });

    it('updates 10% of pointPrimitives', function() {
        for ( var i = 0; i < 10; ++i) {
            pointPrimitives.add({
                position : Cartesian3.ZERO,
                color : Color.WHITE,
                show : (i === 3)
            });
        }

        // First render - default pointPrimitive color is white.
        expect(scene.renderForSpecs()).toEqual([255, 255, 255, 255]);

        pointPrimitives.get(3).color = new Color(0.0, 1.0, 0.0, 1.0);

        // Second render - pointPrimitive is green
        expect(scene.renderForSpecs()).toEqual([0, 255, 0, 255]);

        pointPrimitives.get(3).color = new Color(1.0, 0.0, 0.0, 1.0);

        // Third render - update goes through a different vertex array update path
        expect(scene.renderForSpecs()).toEqual([255, 0, 0, 255]);
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

        expect(scene.renderForSpecs()).toEqual([255, 255, 255, 255]);
    });

    it('is picked', function() {
        var p = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE,
            id : 'id'
        });

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(p);
        expect(pick.id).toEqual('id');
    });

    it('can change pick id', function() {
        var p = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE,
            id : 'id'
        });

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(p);
        expect(pick.id).toEqual('id');

        p.id = 'id2';

        pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(p);
        expect(pick.id).toEqual('id2');
    });

    it('is not picked', function() {
        pointPrimitives.add({
            show : false,
            position : Cartesian3.ZERO,
            color : Color.WHITE
        });

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

    it('pick a pointPrimitive using translucencyByDistance', function() {
        var p = pointPrimitives.add({
            position : Cartesian3.ZERO,
            color : Color.WHITE
        });

        var translucency = new NearFarScalar(1.0, 0.9, 3.0e9, 0.8);
        p.translucencyByDistance = translucency;

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(p);

        translucency.nearValue = 0.0;
        translucency.farValue = 0.0;
        p.translucencyByDistance = translucency;

        pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

    it('computes screen space position', function() {
        var p = pointPrimitives.add({
            position : Cartesian3.ZERO
        });
        scene.renderForSpecs();
        expect(p.computeScreenSpacePosition(scene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
    });

    it('throws when computing screen space position when not in a collection', function() {
        var p = pointPrimitives.add({
            position : Cartesian3.ZERO
        });
        pointPrimitives.remove(p);
        expect(function() {
            p.computeScreenSpacePosition(scene);
        }).toThrowDeveloperError();
    });

    it('throws when computing screen space position without scene', function() {
        var p = pointPrimitives.add();

        expect(function() {
            p.computeScreenSpacePosition();
        }).toThrowDeveloperError();
    });

    it('equals another pointPrimitive', function() {
        var p = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0),
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });
        var p2 = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0),
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        expect(p.equals(p2)).toEqual(true);
    });

    it('does not equal another pointPrimitive', function() {
        var p = pointPrimitives.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var p2 = pointPrimitives.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });

        expect(p.equals(p2)).toEqual(false);
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
        var one = pointPrimitives.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = pointPrimitives.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0)
        });

        scene.renderForSpecs();
        var actual = scene._commandList[0].boundingVolume;

        var positions = [one.position, two.position];
        var expected = BoundingSphere.fromPoints(positions);
        expect(actual.center).toEqual(expected.center);
        expect(actual.radius).toEqual(expected.radius);
    });

    it('computes bounding sphere in Columbus view', function() {
        var projection = scene.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = pointPrimitives.add({
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = pointPrimitives.add({
            position : Cartesian3.fromDegrees(-50.0, 50.0)
        });

        // Update scene state
        scene.morphToColumbusView(0);
        scene.renderForSpecs();
        var actual = scene._commandList[0].boundingVolume;

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

        // Update scene state
        scene.morphTo2D(0);
        scene.renderForSpecs();

        var camera = scene.camera;
        camera.frustum = orthoFrustum;

        scene.renderForSpecs();
        var actual = scene._commandList[0].boundingVolume;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.position)),
            projection.project(ellipsoid.cartesianToCartographic(two.position))
        ];
        var expected = BoundingSphere.fromPoints(projectedPositions);
        expected.center = new Cartesian3(0.0, expected.center.x, expected.center.y);
        expect(actual.center).toEqualEpsilon(expected.center, CesiumMath.EPSILON8);
        expect(actual.radius).toBeGreaterThan(expected.radius);
    });
}, 'WebGL');
