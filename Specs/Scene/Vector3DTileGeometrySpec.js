defineSuite([
        'Scene/Vector3DTileGeometry',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/combine',
        'Core/destroyObject',
        'Core/Ellipsoid',
        'Core/GeometryInstance',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/Transforms',
        'Renderer/Pass',
        'Scene/Cesium3DTileBatchTable',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Vector3DTileGeometry,
        BoundingSphere,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        combine,
        destroyObject,
        Ellipsoid,
        GeometryInstance,
        Matrix4,
        Rectangle,
        RectangleGeometry,
        Transforms,
        Pass,
        Cesium3DTileBatchTable,
        PerInstanceColorAppearance,
        Primitive,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    var rectangle;
    var depthPrimitive;

    var ellipsoid = Ellipsoid.WGS84;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    var mockTileset = {
        _statistics : {
            texturesByteLength : 0
        }
    };

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
        this.pass = Pass.CESIUM_3D_TILE;
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
        scene.morphTo3D(0.0);

        rectangle = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);

        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 1.0, 1.0));
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    ellipsoid : ellipsoid,
                    rectangle : rectangle
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        depthPrimitive = new MockGlobePrimitive(primitive);
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function loadGeometries(geometries) {
        var ready = false;
        geometries.readyPromise.then(function() {
            ready = true;
        });
        return pollToPromise(function() {
            geometries.update(scene.frameState);
            scene.frameState.commandList.length = 0;
            return ready;
        });
    }

    function packBoxes(boxes) {
        var length = boxes.length;
        var packedBoxes = new Float32Array(length * Vector3DTileGeometry.packedBoxLength);
        var offset = 0;
        for (var i = 0; i < length; ++i) {
            var box = boxes[i];
            Cartesian3.pack(box.dimensions, packedBoxes, offset);
            offset += Cartesian3.packedLength;
            Matrix4.pack(box.modelMatrix, packedBoxes, offset);
            offset += Matrix4.packedLength;
        }
        return packedBoxes;
    }

    function packCylinders(cylinders) {
        var length = cylinders.length;
        var packedCylinders = new Float32Array(length * Vector3DTileGeometry.packedCylinderLength);
        var offset = 0;
        for (var i = 0; i < length; ++i) {
            var cylinder = cylinders[i];
            packedCylinders[offset++] = cylinder.radius;
            packedCylinders[offset++] = cylinder.length;
            Matrix4.pack(cylinder.modelMatrix, packedCylinders, offset);
            offset += Matrix4.packedLength;
        }
        return packedCylinders;
    }

    function packEllipsoids(ellipsoids) {
        var length = ellipsoids.length;
        var packedEllipsoids = new Float32Array(length * Vector3DTileGeometry.packedEllipsoidLength);
        var offset = 0;
        for (var i = 0; i < length; ++i) {
            var ellipsoid = ellipsoids[i];
            Cartesian3.pack(ellipsoid.radii, packedEllipsoids, offset);
            offset += Cartesian3.packedLength;
            Matrix4.pack(ellipsoid.modelMatrix, packedEllipsoids, offset);
            offset += Matrix4.packedLength;
        }
        return packedEllipsoids;
    }

    function packSpheres(spheres) {
        var length = spheres.length;
        var packedSpheres = new Float32Array(length * Vector3DTileGeometry.packedSphereLength);
        var offset = 0;
        for (var i = 0; i < length; ++i) {
            var sphere = spheres[i];
            packedSpheres[offset++] = sphere.radius;
            Matrix4.pack(sphere.modelMatrix, packedSpheres, offset);
            offset += Matrix4.packedLength;
        }
        return packedSpheres;
    }

    function verifySingleRender(geometryOptions) {
        var origin = Rectangle.center(rectangle);
        var center = ellipsoid.cartographicToCartesian(origin);
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        Cartesian3.clone(center, geometryOptions.boundingVolume.center);

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(depthPrimitive);

        var geometry = scene.primitives.add(new Vector3DTileGeometry(combine(geometryOptions, {
            center : center,
            modelMatrix : modelMatrix,
            batchTable : batchTable
        })));
        return loadGeometries(geometry).then(function() {
            scene.camera.setView({
                destination : rectangle
            });
            scene.camera.zoomIn(scene.camera.positionCartographic.height * 0.9);
            expect(scene).toRender([255, 255, 255, 255]);

            batchTable.setColor(0, Color.BLUE);
            geometry.updateCommands(0, Color.BLUE);
            batchTable.update(mockTileset, scene.frameState);
            expect(scene).toRender([0, 0, 255, 255]);
        });
    }

    it('renders a single box', function() {
        var dimensions = new Cartesian3(1000000.0, 1000000.0, 1000000.0);
        var boxes = packBoxes([{
            modelMatrix : Matrix4.IDENTITY,
            dimensions : dimensions
        }]);
        var boxBatchIds = new Uint16Array([0]);
        var bv = new BoundingSphere(undefined, Math.sqrt(3 * dimensions.x * dimensions.x));
        verifySingleRender({
            boxes : boxes,
            boxBatchIds : boxBatchIds,
            boundingVolume : bv
        });
    });

    it('renders a single cylinder', function() {
        var radius = 1000000.0;
        var length = 1000000.0;
        var cylinders = packCylinders([{
            modelMatrix : Matrix4.IDENTITY,
            radius : radius,
            length : length
        }]);
        var cylinderBatchIds = new Uint16Array([0]);
        var bv = new BoundingSphere(undefined, Math.sqrt(radius * radius + length * length));
        verifySingleRender({
            cylinders : cylinders,
            cylinderBatchIds : cylinderBatchIds,
            boundingVolume : bv
        });
    });

    it('renders a single ellipsoid', function() {
        var radii = new Cartesian3(1000000.0, 1000000.0, 1000000.0);
        var ellipsoid = packEllipsoids([{
            modelMatrix : Matrix4.IDENTITY,
            radii : radii
        }]);
        var ellipsoidBatchIds = new Uint16Array([0]);
        var bv = new BoundingSphere(undefined, Cartesian3.maximumComponent(radii));
        verifySingleRender({
            ellipsoids : ellipsoid,
            ellipsoidBatchIds : ellipsoidBatchIds,
            boundingVolume : bv
        });
    });

    it('renders a single sphere', function() {
        var radius = 1000000.0;
        var sphere = packSpheres([{
            radius : radius,
            modelMatrix : Matrix4.IDENTITY
        }]);
        var sphereBatchIds = new Uint16Array([0]);
        var bv = new BoundingSphere(undefined, radius);
        verifySingleRender({
            spheres : sphere,
            sphereBatchIds : sphereBatchIds,
            boundingVolume : bv
        });
    });
});
