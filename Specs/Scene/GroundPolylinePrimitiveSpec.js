import { ApproximateTerrainHeights } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { ColorGeometryInstanceAttribute } from '../../Source/Cesium.js';
import { destroyObject } from '../../Source/Cesium.js';
import { DistanceDisplayConditionGeometryInstanceAttribute } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { GeometryInstance } from '../../Source/Cesium.js';
import { GroundPolylineGeometry } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { RectangleGeometry } from '../../Source/Cesium.js';
import { ShowGeometryInstanceAttribute } from '../../Source/Cesium.js';
import { Pass } from '../../Source/Cesium.js';
import { GroundPolylinePrimitive } from '../../Source/Cesium.js';
import { PerInstanceColorAppearance } from '../../Source/Cesium.js';
import { PolylineColorAppearance } from '../../Source/Cesium.js';
import { PolylineMaterialAppearance } from '../../Source/Cesium.js';
import { Primitive } from '../../Source/Cesium.js';
import createScene from '../createScene.js';
import pollToPromise from '../pollToPromise.js';

describe('Scene/GroundPolylinePrimitive', function() {

    var scene;
    var context;

    var ellipsoid;

    var depthColor;
    var polylineColor;
    var polylineColorAttribute;

    var groundPolylineInstance;
    var groundPolylinePrimitive;
    var depthRectanglePrimitive;

    var positions = Cartesian3.fromDegreesArray([
        0.01, 0.0,
        0.03, 0.0
    ]);

    var lookPosition = Cartesian3.fromDegrees(0.02, 0.0);
    var lookPositionOffset = Cartesian3.fromDegrees(0.02, 0.0001);

    beforeAll(function() {
        scene = createScene();
        scene.postProcessStages.fxaa.enabled = false;

        context = scene.context;

        ellipsoid = Ellipsoid.WGS84;
        return GroundPolylinePrimitive.initializeTerrainHeights();
    });

    afterAll(function() {
        scene.destroyForSpecs();

        // Leave ground primitive uninitialized
        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
        this.pass = Pass.GLOBE;
    }

    MockGlobePrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = this.pass;
        }
    };

    MockGlobePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockGlobePrimitive.prototype.destroy = function() {
        this._primitive.destroy();
        return destroyObject(this);
    };

    beforeEach(function() {
        scene.morphTo3D(0);
        scene.render(); // clear any afterRender commands

        var depthpolylineColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 1.0, 1.0));
        depthColor = depthpolylineColorAttribute.value;
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    ellipsoid : ellipsoid,
                    rectangle : Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0)
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthpolylineColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        depthRectanglePrimitive = new MockGlobePrimitive(primitive);

        polylineColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));
        polylineColor = polylineColorAttribute.value;
        groundPolylineInstance = new GeometryInstance({
            geometry : new GroundPolylineGeometry({
                positions : positions,
                granularity : 0.0,
                width : 1.0,
                loop : false,
                ellipsoid : ellipsoid
            }),
            id : 'polyline on terrain',
            attributes : {
                color : polylineColorAttribute
            }
        });
    });

    afterEach(function() {
        scene.groundPrimitives.removeAll();
        groundPolylinePrimitive = groundPolylinePrimitive && !groundPolylinePrimitive.isDestroyed() && groundPolylinePrimitive.destroy();
        depthRectanglePrimitive = depthRectanglePrimitive && !depthRectanglePrimitive.isDestroyed() && depthRectanglePrimitive.destroy();
    });

    it('default constructs', function() {
        groundPolylinePrimitive = new GroundPolylinePrimitive();
        expect(groundPolylinePrimitive.geometryInstances).not.toBeDefined();
        expect(groundPolylinePrimitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);
        expect(groundPolylinePrimitive.show).toEqual(true);
        expect(groundPolylinePrimitive.interleave).toEqual(false);
        expect(groundPolylinePrimitive.releaseGeometryInstances).toEqual(true);
        expect(groundPolylinePrimitive.allowPicking).toEqual(true);
        expect(groundPolylinePrimitive.asynchronous).toEqual(true);
        expect(groundPolylinePrimitive.debugShowBoundingVolume).toEqual(false);
        expect(groundPolylinePrimitive.debugShowShadowVolume).toEqual(false);
    });

    it('constructs with options', function() {
        var geometryInstances = [];

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : geometryInstances,
            show : false,
            interleave : true,
            releaseGeometryInstances : false,
            allowPicking : false,
            asynchronous : false,
            debugShowBoundingVolume : true,
            debugShowShadowVolume : true
        });

        expect(groundPolylinePrimitive.geometryInstances).toEqual(geometryInstances);
        expect(groundPolylinePrimitive.show).toEqual(false);
        expect(groundPolylinePrimitive.interleave).toEqual(true);
        expect(groundPolylinePrimitive.releaseGeometryInstances).toEqual(false);
        expect(groundPolylinePrimitive.allowPicking).toEqual(false);
        expect(groundPolylinePrimitive.asynchronous).toEqual(false);
        expect(groundPolylinePrimitive.debugShowBoundingVolume).toEqual(true);
        expect(groundPolylinePrimitive.debugShowShadowVolume).toEqual(true);
    });

    it('releases geometry instances when releaseGeometryInstances is true', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            releaseGeometryInstances : true,
            asynchronous : false
        });

        expect(groundPolylinePrimitive.geometryInstances).toBeDefined();
        scene.groundPrimitives.add(groundPolylinePrimitive);
        scene.renderForSpecs();
        expect(groundPolylinePrimitive.geometryInstances).not.toBeDefined();
    });

    it('does not release geometry instances when releaseGeometryInstances is false', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        expect(groundPolylinePrimitive.geometryInstances).toBeDefined();
        scene.groundPrimitives.add(groundPolylinePrimitive);
        scene.renderForSpecs();
        expect(groundPolylinePrimitive.geometryInstances).toBeDefined();
    });

    it('adds afterRender promise to frame state', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        scene.groundPrimitives.add(groundPolylinePrimitive);
        scene.renderForSpecs();

        return groundPolylinePrimitive.readyPromise.then(function(param) {
            expect(param.ready).toBe(true);
        });
    });

    it('does not render when geometryInstances is undefined', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : undefined,
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.commandList.length = 0;

        groundPolylinePrimitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('does not render when show is false', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false
        });

        var frameState = scene.frameState;

        frameState.commandList.length = 0;
        groundPolylinePrimitive.update(frameState);
        expect(frameState.afterRender.length).toEqual(1);

        frameState.afterRender[0]();
        frameState.commandList.length = 0;
        groundPolylinePrimitive.update(frameState);
        expect(frameState.commandList.length).toBeGreaterThan(0);

        frameState.commandList.length = 0;
        groundPolylinePrimitive.show = false;
        groundPolylinePrimitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('becomes ready when show is false', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = scene.groundPrimitives.add(new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance
        }));
        groundPolylinePrimitive.show = false;

        var ready = false;
        groundPolylinePrimitive.readyPromise.then(function() {
            ready = true;
        });

        return pollToPromise(function() {
            scene.render();
            return ready;
        }).then(function() {
            expect(ready).toEqual(true);
        });
    });

    it('does not render other than for the color or pick pass', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.passes.render = false;
        frameState.passes.pick = false;

        groundPolylinePrimitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    function verifyGroundPolylinePrimitiveRender(lookPosition, primitive, color) {
        scene.camera.lookAt(lookPosition, Cartesian3.UNIT_Z);

        scene.groundPrimitives.add(depthRectanglePrimitive);
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
            expect(rgba[0]).toEqual(0);
        });

        scene.groundPrimitives.add(primitive);
        expect(scene).toRender(color);
    }

    it('renders in 3D', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);
    });

    it('renders in Columbus view when scene3DOnly is false', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        scene.morphToColumbusView(0);
        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);
    });

    it('renders in 2D when scene3DOnly is false', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        scene.morphTo2D(0);
        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);
    });

    it('renders during morph when scene3DOnly is false', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : new GeometryInstance({
                geometry : new GroundPolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        -30, 0.0,
                        30, 0.0
                    ]),
                    granularity : 0.0,
                    width : 1000.0,
                    loop : false,
                    ellipsoid : ellipsoid
                }),
                attributes : {
                    color : polylineColorAttribute
                }
            }),
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        // Morph to 2D first because 3D -> 2D/CV morph is difficult in single-pixel
        scene.morphTo2D(0);
        scene.render();

        scene.morphToColumbusView(1);
        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);
        scene.completeMorph();
    });

    it('renders batched instances', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        var instance1 = new GeometryInstance({
            geometry : new GroundPolylineGeometry({
                positions : positions,
                granularity : 0.0,
                width : 1.0,
                loop : false,
                ellipsoid : ellipsoid
            }),
            id : 'polyline on terrain',
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 1.0, 1.0, 0.5))
            }
        });

        var instance2 = new GeometryInstance({
            geometry : new GroundPolylineGeometry({
                positions : positions,
                granularity : 0.0,
                width : 1.0,
                loop : false,
                ellipsoid : ellipsoid
            }),
            id : 'polyline on terrain',
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 1.0, 1.0, 0.5))
            }
        });

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : [instance1, instance2],
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, [192, 192, 255, 255]);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance(),
            debugShowBoundingVolume : true
        });

        scene.groundPrimitives.add(groundPolylinePrimitive);

        scene.camera.lookAt(lookPosition, Cartesian3.UNIT_Z);
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[2]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[3]).toEqual(255);
        });
    });

    it('renders shadow volume with debugShowShadowVolume', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance(),
            debugShowShadowVolume : true
        });

        scene.groundPrimitives.add(groundPolylinePrimitive);

        scene.camera.lookAt(lookPosition, Cartesian3.UNIT_Z);
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[2]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[3]).toEqual(255);
        });
    });

    it('get per instance attributes', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');
        expect(attributes.color).toBeDefined();
    });

    it('modify color instance attribute', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        // Remove so it can be re-added, but don't destroy.
        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        var newColor = [255, 255, 255, 255];
        var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');
        expect(attributes.color).toBeDefined();
        attributes.color = newColor;

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, newColor);
    });

    it('adds width instance attribute', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPositionOffset, groundPolylinePrimitive, polylineColor);

        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');
        expect(attributes.width).toBeDefined();
        attributes.width = [0];

        verifyGroundPolylinePrimitiveRender(lookPositionOffset, groundPolylinePrimitive, depthColor);
    });

    it('modify show instance attribute', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylineInstance.attributes.show = new ShowGeometryInstanceAttribute(true);

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');
        expect(attributes.show).toBeDefined();
        attributes.show = [0];

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, depthColor);
    });

    it('renders with distance display condition per instance attribute', function() {
        if (!context.floatingPointTexture) {
            return;
        }

        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        var near = 10000.0;
        var far = 1000000.0;

        var geometryInstance = new GeometryInstance({
            geometry : new GroundPolylineGeometry({
                positions : positions,
                granularity : 0.0,
                width : 1.0,
                loop : false,
                ellipsoid : ellipsoid
            }),
            id : 'polyline on terrain',
            attributes : {
                distanceDisplayCondition : new DistanceDisplayConditionGeometryInstanceAttribute(near, far)
            }
        });

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : geometryInstance,
            asynchronous : false
        });

        scene.groundPrimitives.add(depthRectanglePrimitive);
        scene.groundPrimitives.add(groundPolylinePrimitive);
        scene.camera.lookAt(lookPosition, Cartesian3.UNIT_Z);
        scene.renderForSpecs();

        var boundingSphere = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain').boundingSphere;
        var center = boundingSphere.center;
        var radius = boundingSphere.radius;

        scene.camera.lookAt(center, new Cartesian3(0.0, 0.0, radius));
        expect(scene).toRender(depthColor);

        scene.camera.lookAt(center, new Cartesian3(0.0, 0.0, radius + near + 1.0));
        expect(scene).not.toRender(depthColor);

        scene.camera.lookAt(center, new Cartesian3(0.0, 0.0, radius + far + 1.0));
        expect(scene).toRender(depthColor);
    });

    it('getGeometryInstanceAttributes returns same object each time', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylineInstance.attributes.show = new ShowGeometryInstanceAttribute(true);

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');
        var attributes2 = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');
        expect(attributes).toBe(attributes2);
    });

    it('picking in 3D', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(groundPolylinePrimitive);
            expect(result.id).toEqual('polyline on terrain');
        });
    });

    it('picking in 2D', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        scene.morphTo2D(0);
        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(groundPolylinePrimitive);
            expect(result.id).toEqual('polyline on terrain');
        });
    });

    it('picking in Columbus View', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        scene.morphToColumbusView(0);
        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(groundPolylinePrimitive);
            expect(result.id).toEqual('polyline on terrain');
        });
    });

    it('picking in Morph', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : new GeometryInstance({
                geometry : new GroundPolylineGeometry({
                    positions : Cartesian3.fromDegreesArray([
                        -30, 0.0,
                        30, 0.0
                    ]),
                    granularity : 0.0,
                    width : 1000.0,
                    loop : false,
                    ellipsoid : ellipsoid
                }),
                attributes : {
                    color : polylineColorAttribute
                },
                id : 'big polyline on terrain'
            }),
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        // Morph to 2D first because 3D -> 2D/CV morph is difficult in single-pixel
        scene.morphTo2D(0);
        scene.render();

        scene.morphToColumbusView(1);
        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(groundPolylinePrimitive);
            expect(result.id).toEqual('big polyline on terrain');
        });
        scene.completeMorph();
    });

    it('does not pick when allowPicking is false', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            allowPicking : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        expect(scene).toPickAndCall(function(result) {
            expect(result.id).toEqual('depth rectangle');
        });
    });

    it('update throws when batched instance colors are missing', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }
        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : new GeometryInstance({
                geometry : new GroundPolylineGeometry({
                    positions : positions
                })
            }),
            appearance : new PolylineColorAppearance(),
            asynchronous : false
        });

        expect(function() {
            verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);
        }).toThrowDeveloperError();
    });

    it('setting per instance attribute throws when value is undefined', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();
    });

    it('can disable picking when asynchronous', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : true,
            allowPicking : false,
            appearance : new PolylineColorAppearance()
        });

        var frameState = scene.frameState;

        return pollToPromise(function() {
            groundPolylinePrimitive.update(frameState);
            for (var i = 0; i < frameState.afterRender.length; ++i) {
                frameState.afterRender[i]();
            }
            return groundPolylinePrimitive.ready;
        }).then(function() {
            var attributes = groundPolylinePrimitive.getGeometryInstanceAttributes('polyline on terrain');
            expect(function() {
                attributes.color = undefined;
            }).toThrowDeveloperError();
        });
    });

    it('getGeometryInstanceAttributes throws without id', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);

        expect(function() {
            groundPolylinePrimitive.getGeometryInstanceAttributes();
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes returns undefined if id does not exist', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false,
            appearance : new PolylineColorAppearance()
        });

        expect(function() {
            groundPolylinePrimitive.getGeometryInstanceAttributes('unknown');
        }).toThrowDeveloperError();
    });

    it('isDestroyed', function() {
        groundPolylinePrimitive = new GroundPolylinePrimitive();
        expect(groundPolylinePrimitive.isDestroyed()).toEqual(false);
        groundPolylinePrimitive.destroy();
        expect(groundPolylinePrimitive.isDestroyed()).toEqual(true);
    });

    it('renders when using asynchronous pipeline', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            return;
        }

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : true,
            appearance : new PolylineColorAppearance()
        });

        var frameState = scene.frameState;

        return pollToPromise(function() {
            groundPolylinePrimitive.update(frameState);
            for (var i = 0; i < frameState.afterRender.length; ++i) {
                frameState.afterRender[i]();
            }
            return groundPolylinePrimitive.ready;
        }).then(function() {
            verifyGroundPolylinePrimitiveRender(lookPosition, groundPolylinePrimitive, polylineColor);
        });
    });

    it('destroy before asynchronous pipeline is complete', function() {
        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : true,
            appearance : new PolylineColorAppearance()
        });

        var frameState = scene.frameState;
        groundPolylinePrimitive.update(frameState);

        groundPolylinePrimitive.destroy();
        expect(groundPolylinePrimitive.isDestroyed()).toEqual(true);
    });

    it('creating a synchronous primitive throws if initializeTerrainHeights wasn\'t called', function() {
        // Make it seem like initializeTerrainHeights was never called
        var initPromise = ApproximateTerrainHeights._initPromise;
        var terrainHeights = ApproximateTerrainHeights._terrainHeights;
        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;

        groundPolylinePrimitive = new GroundPolylinePrimitive({
            geometryInstances : groundPolylineInstance,
            asynchronous : false
        });

        if (GroundPolylinePrimitive.isSupported(scene)) {
            expect(function() {
                groundPolylinePrimitive.update(scene.frameState);
            }).toThrowDeveloperError();
        }

        // Set back to initialized state
        ApproximateTerrainHeights._initPromise = initPromise;
        ApproximateTerrainHeights._terrainHeights = terrainHeights;
    });
}, 'WebGL');
