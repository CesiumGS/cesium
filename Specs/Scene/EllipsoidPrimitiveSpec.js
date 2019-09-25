import { Cartesian3 } from '../../Source/Cesium.js';
import { defined } from '../../Source/Cesium.js';
import { Matrix4 } from '../../Source/Cesium.js';
import { EllipsoidPrimitive } from '../../Source/Cesium.js';
import { Material } from '../../Source/Cesium.js';
import createScene from '../createScene.js';

describe('Scene/EllipsoidPrimitive', function() {

    var scene;
    var ellipsoid;

    beforeAll(function() {
        scene = createScene();
        scene.primitives.destroyPrimitives = false;
        scene.frameState.scene3DOnly = false;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        ellipsoid = new EllipsoidPrimitive();
        var offset = new Cartesian3(1.02, 0.0, 0.0);
        scene.camera.lookAtTransform(Matrix4.IDENTITY, offset);
    });

    afterEach(function() {
        scene.primitives.removeAll();
        if (defined(ellipsoid) && !ellipsoid.isDestroyed()) {
            ellipsoid = ellipsoid.destroy();
        }
    });

    it('gets the default properties', function() {
        expect(ellipsoid.show).toEqual(true);
        expect(ellipsoid.center).toEqual(Cartesian3.ZERO);
        expect(ellipsoid.radii).toBeUndefined();
        expect(ellipsoid.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(ellipsoid.material.type).toEqual(Material.ColorType);
        expect(ellipsoid.debugShowBoundingVolume).toEqual(false);
    });

    it('Constructs with options', function() {
        var material = Material.fromType(Material.StripeType);
        var e = new EllipsoidPrimitive({
            center : new Cartesian3(1.0, 2.0, 3.0),
            radii : new Cartesian3(4.0, 5.0, 6.0),
            modelMatrix : Matrix4.fromUniformScale(2.0),
            show : false,
            material : material,
            id : 'id',
            debugShowBoundingVolume : true
        });

        expect(e.center).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(e.radii).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(e.modelMatrix).toEqual(Matrix4.fromUniformScale(2.0));
        expect(e.show).toEqual(false);
        expect(e.material).toBe(material);
        expect(e.id).toEqual('id');
        expect(e.debugShowBoundingVolume).toEqual(true);

        e.destroy();
    });

    it('renders with the default material', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(ellipsoid);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders with a custom modelMatrix', function() {
        ellipsoid.radii = new Cartesian3(0.1, 0.1, 0.1);
        ellipsoid.modelMatrix = Matrix4.fromScale(new Cartesian3(10.0, 10.0, 10.0));

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(ellipsoid);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders two with a vertex array cache hit', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        var ellipsoid2 = new EllipsoidPrimitive();
        ellipsoid2.radii = new Cartesian3(1.0, 1.0, 1.0);

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(ellipsoid);
        var result;
        expect(scene).toRenderAndCall(function(rgba) {
            result = rgba;
            expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        expect(scene).toRender(result);

        scene.primitives.add(ellipsoid2);
        expect(scene).notToRender([0, 0, 0, 255]);
        expect(scene).notToRender(result);

        ellipsoid2.destroy();
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
        scene.primitives.add(new EllipsoidPrimitive({
            radii : new Cartesian3(1.0, 1.0, 1.0),
            debugShowBoundingVolume : true
        }));

        var camera = scene.camera;
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

        expect(scene).notToRender([0, 0, 0, 255]);
        scene.destroyForSpecs();
    });

    it('does not render when show is false', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.show = false;

        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('does not render without radii', function() {
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('does not render when not in view due to center', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.center = new Cartesian3(10.0, 0.0, 0.0);

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(ellipsoid);
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('is picked', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.id = 'id';

        scene.primitives.add(ellipsoid);

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(ellipsoid);
            expect(result.id).toEqual('id');
        });
    });

    it('is not picked (show === false)', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.show = false;

        scene.primitives.add(ellipsoid);

        expect(scene).notToPick();
    });

    it('is not picked (alpha === 0.0)', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.material.uniforms.color.alpha = 0.0;

        scene.primitives.add(ellipsoid);

        expect(scene).notToPick();
    });

    it('isDestroyed', function() {
        expect(ellipsoid.isDestroyed()).toEqual(false);
        ellipsoid.destroy();
        expect(ellipsoid.isDestroyed()).toEqual(true);
    });

    it('throws when rendered without a material', function() {
        ellipsoid.radii = new Cartesian3(1.0, 1.0, 1.0);
        ellipsoid.material = undefined;

        scene.primitives.add(ellipsoid);

        expect(function() {
            scene.renderForSpecs();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
