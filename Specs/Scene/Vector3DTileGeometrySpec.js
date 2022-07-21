import {
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
  RenderState,
  Cesium3DTileBatchTable,
  ClassificationType,
  ColorBlendMode,
  PerInstanceColorAppearance,
  Primitive,
  StencilConstants,
  Vector3DTileGeometry,
} from "../../../Source/Cesium.js";

import createContext from "../createContext.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/Vector3DTileGeometry",
  function () {
    createGeometrySpecs({});
    const c = createContext({ requestWebgl2: true });
    // Don't repeat WebGL 1 tests when WebGL 2 is not supported
    if (c.webgl2) {
      createGeometrySpecs({ requestWebgl2: true });
    }
    c.destroyForSpecs();

    function createGeometrySpecs(contextOptions) {
      const webglMessage = contextOptions.requestWebgl2 ? ": WebGL 2" : "";

      let scene;
      let rectangle;
      let geometry;
      let globePrimitive;
      let tilesetPrimitive;
      let reusableGlobePrimitive;
      let reusableTilesetPrimitive;

      const ellipsoid = Ellipsoid.WGS84;

      const mockTileset = {
        _statistics: {
          texturesByteLength: 0,
        },
        tileset: {
          _statistics: {
            batchTableByteLength: 0,
          },
          colorBlendMode: ColorBlendMode.HIGHLIGHT,
        },
        getFeature: function (id) {
          return { batchId: id };
        },
      };

      function createPrimitive(rectangle, pass) {
        let renderState;
        if (pass === Pass.CESIUM_3D_TILE) {
          renderState = RenderState.fromCache({
            stencilTest: StencilConstants.setCesium3DTileBit(),
            stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
            depthTest: {
              enabled: true,
            },
          });
        }
        const depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(
          new Color(1.0, 0.0, 0.0, 1.0)
        );
        return new Primitive({
          geometryInstances: new GeometryInstance({
            geometry: new RectangleGeometry({
              ellipsoid: Ellipsoid.WGS84,
              rectangle: rectangle,
            }),
            id: "depth rectangle",
            attributes: {
              color: depthColorAttribute,
            },
          }),
          appearance: new PerInstanceColorAppearance({
            translucent: false,
            flat: true,
            renderState: renderState,
          }),
          asynchronous: false,
        });
      }

      function MockPrimitive(primitive, pass) {
        this._primitive = primitive;
        this._pass = pass;
        this.show = true;
      }

      MockPrimitive.prototype.update = function (frameState) {
        if (!this.show) {
          return;
        }

        const commandList = frameState.commandList;
        const startLength = commandList.length;
        this._primitive.update(frameState);

        for (let i = startLength; i < commandList.length; ++i) {
          const command = commandList[i];
          command.pass = this._pass;
        }
      };

      MockPrimitive.prototype.isDestroyed = function () {
        return false;
      };

      MockPrimitive.prototype.destroy = function () {
        return destroyObject(this);
      };

      beforeAll(function () {
        scene = createScene({ contextOptions: contextOptions });

        rectangle = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);
        reusableGlobePrimitive = createPrimitive(rectangle, Pass.GLOBE);
        reusableTilesetPrimitive = createPrimitive(
          rectangle,
          Pass.CESIUM_3D_TILE
        );
      });

      afterAll(function () {
        reusableGlobePrimitive.destroy();
        reusableTilesetPrimitive.destroy();
        scene.destroyForSpecs();
      });

      beforeEach(function () {
        // wrap rectangle primitive so it gets executed during the globe pass and 3D Tiles pass to lay down depth
        globePrimitive = new MockPrimitive(reusableGlobePrimitive, Pass.GLOBE);
        tilesetPrimitive = new MockPrimitive(
          reusableTilesetPrimitive,
          Pass.CESIUM_3D_TILE
        );
      });

      afterEach(function () {
        scene.primitives.removeAll();
        globePrimitive =
          globePrimitive &&
          !globePrimitive.isDestroyed() &&
          globePrimitive.destroy();
        tilesetPrimitive =
          tilesetPrimitive &&
          !tilesetPrimitive.isDestroyed() &&
          tilesetPrimitive.destroy();
        geometry = geometry && !geometry.isDestroyed() && geometry.destroy();
      });

      function loadGeometries(geometries) {
        let ready = false;
        geometries.readyPromise.then(function () {
          ready = true;
        });
        return pollToPromise(function () {
          geometries.update(scene.frameState);
          scene.frameState.commandList.length = 0;
          return ready;
        });
      }

      function packBoxes(boxes) {
        const length = boxes.length;
        const packedBoxes = new Float32Array(
          length * Vector3DTileGeometry.packedBoxLength
        );
        let offset = 0;
        for (let i = 0; i < length; ++i) {
          const box = boxes[i];
          Cartesian3.pack(box.dimensions, packedBoxes, offset);
          offset += Cartesian3.packedLength;
          Matrix4.pack(box.modelMatrix, packedBoxes, offset);
          offset += Matrix4.packedLength;
        }
        return packedBoxes;
      }

      function packCylinders(cylinders) {
        const length = cylinders.length;
        const packedCylinders = new Float32Array(
          length * Vector3DTileGeometry.packedCylinderLength
        );
        let offset = 0;
        for (let i = 0; i < length; ++i) {
          const cylinder = cylinders[i];
          packedCylinders[offset++] = cylinder.radius;
          packedCylinders[offset++] = cylinder.length;
          Matrix4.pack(cylinder.modelMatrix, packedCylinders, offset);
          offset += Matrix4.packedLength;
        }
        return packedCylinders;
      }

      function packEllipsoids(ellipsoids) {
        const length = ellipsoids.length;
        const packedEllipsoids = new Float32Array(
          length * Vector3DTileGeometry.packedEllipsoidLength
        );
        let offset = 0;
        for (let i = 0; i < length; ++i) {
          const ellipsoid = ellipsoids[i];
          Cartesian3.pack(ellipsoid.radii, packedEllipsoids, offset);
          offset += Cartesian3.packedLength;
          Matrix4.pack(ellipsoid.modelMatrix, packedEllipsoids, offset);
          offset += Matrix4.packedLength;
        }
        return packedEllipsoids;
      }

      function packSpheres(spheres) {
        const length = spheres.length;
        const packedSpheres = new Float32Array(
          length * Vector3DTileGeometry.packedSphereLength
        );
        let offset = 0;
        for (let i = 0; i < length; ++i) {
          const sphere = spheres[i];
          packedSpheres[offset++] = sphere.radius;
          Cartesian3.pack(
            Matrix4.getTranslation(sphere.modelMatrix, new Cartesian3()),
            packedSpheres,
            offset
          );
          offset += Cartesian3.packedLength;
        }
        return packedSpheres;
      }

      function verifySingleRender(geometryOptions) {
        const origin = Rectangle.center(rectangle);
        const center = ellipsoid.cartographicToCartesian(origin);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        Cartesian3.clone(center, geometryOptions.boundingVolume.center);

        const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(globePrimitive);

        geometry = scene.primitives.add(
          new Vector3DTileGeometry(
            combine(geometryOptions, {
              center: center,
              modelMatrix: modelMatrix,
              batchTable: batchTable,
            })
          )
        );
        return loadGeometries(geometry).then(function () {
          scene.camera.setView({
            destination: rectangle,
          });
          scene.camera.zoomIn(scene.camera.positionCartographic.height * 0.9);
          expect(scene).toRender([255, 255, 255, 255]);

          batchTable.setColor(0, Color.BLUE);
          geometry.updateCommands(0, Color.BLUE);
          batchTable.update(mockTileset, scene.frameState);
          expect(scene).toRender([0, 0, 255, 255]);
        });
      }

      function verifyMultipleRender(modelMatrices, geometryOptions) {
        const origin = Rectangle.center(rectangle);
        const center = ellipsoid.cartographicToCartesian(origin);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        Cartesian3.clone(center, geometryOptions.boundingVolume.center);

        const length = modelMatrices.length;
        const batchTable = new Cesium3DTileBatchTable(mockTileset, length);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(globePrimitive);

        geometry = scene.primitives.add(
          new Vector3DTileGeometry(
            combine(geometryOptions, {
              center: center,
              modelMatrix: modelMatrix,
              batchTable: batchTable,
            })
          )
        );
        return loadGeometries(geometry).then(function () {
          let i;
          for (i = 0; i < length; ++i) {
            batchTable.setShow(i, false);
          }

          for (i = 0; i < length; ++i) {
            const transform = Matrix4.multiply(
              modelMatrix,
              modelMatrices[i],
              new Matrix4()
            );
            scene.camera.lookAtTransform(
              transform,
              new Cartesian3(0.0, 0.0, 10.0)
            );

            batchTable.setShow(i, true);
            batchTable.update(mockTileset, scene.frameState);
            expect(scene).toRender([255, 255, 255, 255]);

            batchTable.setColor(i, Color.BLUE);
            geometry.updateCommands(i, Color.BLUE);
            batchTable.update(mockTileset, scene.frameState);
            expect(scene).toRender([0, 0, 255, 255]);

            batchTable.setShow(i, false);
          }
        });
      }

      it(`renders a single box${webglMessage}`, function () {
        const dimensions = new Cartesian3(1000000.0, 1000000.0, 1000000.0);
        const boxes = packBoxes([
          {
            modelMatrix: Matrix4.IDENTITY,
            dimensions: dimensions,
          },
        ]);
        const boxBatchIds = new Uint16Array([0]);
        const bv = new BoundingSphere(
          undefined,
          Math.sqrt(3.0 * dimensions.x * dimensions.x)
        );
        return verifySingleRender({
          boxes: boxes,
          boxBatchIds: boxBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders multiple boxes${webglMessage}`, function () {
        const dimensions = new Cartesian3(500000.0, 500000.0, 500000.0);
        const modelMatrices = [
          Matrix4.fromTranslation(new Cartesian3(dimensions.x, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-dimensions.x, 0.0, 0.0)),
        ];
        const boxes = packBoxes([
          {
            modelMatrix: modelMatrices[0],
            dimensions: dimensions,
          },
          {
            modelMatrix: modelMatrices[1],
            dimensions: dimensions,
          },
        ]);
        const boxBatchIds = new Uint16Array([0, 1]);
        const bv = new BoundingSphere(
          undefined,
          Math.sqrt(3.0 * 2.0 * dimensions.x * dimensions.x)
        );
        return verifyMultipleRender(modelMatrices, {
          boxes: boxes,
          boxBatchIds: boxBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders a single cylinder${webglMessage}`, function () {
        const radius = 1000000.0;
        const length = 1000000.0;
        const cylinders = packCylinders([
          {
            modelMatrix: Matrix4.IDENTITY,
            radius: radius,
            length: length,
          },
        ]);
        const cylinderBatchIds = new Uint16Array([0]);
        const bv = new BoundingSphere(
          undefined,
          Math.sqrt(radius * radius + length * length)
        );
        return verifySingleRender({
          cylinders: cylinders,
          cylinderBatchIds: cylinderBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders multiple cylinders${webglMessage}`, function () {
        const radius = 500000.0;
        const length = 500000.0;
        const modelMatrices = [
          Matrix4.fromTranslation(new Cartesian3(radius, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-radius, 0.0, 0.0)),
        ];
        const cylinders = packCylinders([
          {
            modelMatrix: modelMatrices[0],
            radius: radius,
            length: length,
          },
          {
            modelMatrix: modelMatrices[1],
            radius: radius,
            length: length,
          },
        ]);
        const cylinderBatchIds = new Uint16Array([0, 1]);
        const bv = new BoundingSphere(
          undefined,
          Math.sqrt(2.0 * (radius * radius + length * length))
        );
        return verifyMultipleRender(modelMatrices, {
          cylinders: cylinders,
          cylinderBatchIds: cylinderBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders a single ellipsoid${webglMessage}`, function () {
        const radii = new Cartesian3(500000.0, 500000.0, 500000.0);
        const ellipsoid = packEllipsoids([
          {
            modelMatrix: Matrix4.IDENTITY,
            radii: radii,
          },
        ]);
        const ellipsoidBatchIds = new Uint16Array([0]);
        const bv = new BoundingSphere(
          undefined,
          Cartesian3.maximumComponent(radii)
        );
        return verifySingleRender({
          ellipsoids: ellipsoid,
          ellipsoidBatchIds: ellipsoidBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders multiple ellipsoids${webglMessage}`, function () {
        const radii = new Cartesian3(500000.0, 500000.0, 500000.0);
        const modelMatrices = [
          Matrix4.fromTranslation(new Cartesian3(radii.x, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-radii.x, 0.0, 0.0)),
        ];
        const ellipsoids = packEllipsoids([
          {
            modelMatrix: modelMatrices[0],
            radii: radii,
          },
          {
            modelMatrix: modelMatrices[1],
            radii: radii,
          },
        ]);
        const ellipsoidBatchIds = new Uint16Array([0, 1]);
        const bv = new BoundingSphere(
          undefined,
          2.0 * Cartesian3.maximumComponent(radii)
        );
        return verifyMultipleRender(modelMatrices, {
          ellipsoids: ellipsoids,
          ellipsoidBatchIds: ellipsoidBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders a single sphere${webglMessage}`, function () {
        const radius = 500000.0;
        const sphere = packSpheres([
          {
            radius: radius,
            modelMatrix: Matrix4.IDENTITY,
          },
        ]);
        const sphereBatchIds = new Uint16Array([0]);
        const bv = new BoundingSphere(undefined, radius);
        return verifySingleRender({
          spheres: sphere,
          sphereBatchIds: sphereBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders multiple spheres${webglMessage}`, function () {
        const radius = 500000.0;
        const modelMatrices = [
          Matrix4.fromTranslation(new Cartesian3(radius, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-radius, 0.0, 0.0)),
        ];
        const spheres = packSpheres([
          {
            modelMatrix: modelMatrices[0],
            radius: radius,
          },
          {
            modelMatrix: modelMatrices[1],
            radius: radius,
          },
        ]);
        const sphereBatchIds = new Uint16Array([0, 1]);
        const bv = new BoundingSphere(undefined, 2.0 * radius);
        return verifyMultipleRender(modelMatrices, {
          spheres: spheres,
          sphereBatchIds: sphereBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders with multiple types of each geometry${webglMessage}`, function () {
        const dimensions = new Cartesian3(125000.0, 125000.0, 125000.0);
        const modelMatrices = [
          Matrix4.fromTranslation(new Cartesian3(dimensions.x, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-dimensions.x, 0.0, 0.0)),
        ];
        const boxes = packBoxes([
          {
            modelMatrix: modelMatrices[0],
            dimensions: dimensions,
          },
          {
            modelMatrix: modelMatrices[1],
            dimensions: dimensions,
          },
        ]);
        const boxBatchIds = new Uint16Array([0, 1]);

        const radius = 125000.0;
        const length = 125000.0;
        modelMatrices.push(
          Matrix4.fromTranslation(new Cartesian3(radius, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-radius, 0.0, 0.0))
        );
        const cylinders = packCylinders([
          {
            modelMatrix: modelMatrices[2],
            radius: radius,
            length: length,
          },
          {
            modelMatrix: modelMatrices[3],
            radius: radius,
            length: length,
          },
        ]);
        const cylinderBatchIds = new Uint16Array([2, 3]);

        const radii = new Cartesian3(125000.0, 125000.0, 125000.0);
        modelMatrices.push(
          Matrix4.fromTranslation(new Cartesian3(radii.x, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-radii.x, 0.0, 0.0))
        );
        const ellipsoids = packEllipsoids([
          {
            modelMatrix: modelMatrices[4],
            radii: radii,
          },
          {
            modelMatrix: modelMatrices[5],
            radii: radii,
          },
        ]);
        const ellipsoidBatchIds = new Uint16Array([4, 5]);

        modelMatrices.push(
          Matrix4.fromTranslation(new Cartesian3(radius, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-radius, 0.0, 0.0))
        );
        const spheres = packSpheres([
          {
            modelMatrix: modelMatrices[6],
            radius: radius,
          },
          {
            modelMatrix: modelMatrices[7],
            radius: radius,
          },
        ]);
        const sphereBatchIds = new Uint16Array([6, 7]);

        const bv = new BoundingSphere(undefined, 50000000.0);

        return verifyMultipleRender(modelMatrices, {
          boxes: boxes,
          boxBatchIds: boxBatchIds,
          cylinders: cylinders,
          cylinderBatchIds: cylinderBatchIds,
          ellipsoids: ellipsoids,
          ellipsoidBatchIds: ellipsoidBatchIds,
          spheres: spheres,
          sphereBatchIds: sphereBatchIds,
          boundingVolume: bv,
        });
      });

      it(`renders multiple geometries after a re-batch${webglMessage}`, function () {
        const dimensions = new Cartesian3(125000.0, 125000.0, 125000.0);
        const modelMatrices = [
          Matrix4.fromTranslation(new Cartesian3(dimensions.x, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-dimensions.x, 0.0, 0.0)),
        ];
        const boxes = packBoxes([
          {
            modelMatrix: modelMatrices[0],
            dimensions: dimensions,
          },
          {
            modelMatrix: modelMatrices[1],
            dimensions: dimensions,
          },
        ]);
        const boxBatchIds = new Uint16Array([0, 1]);

        const radius = 125000.0;
        let length = 125000.0;
        modelMatrices.push(
          Matrix4.fromTranslation(new Cartesian3(radius, 0.0, 0.0)),
          Matrix4.fromTranslation(new Cartesian3(-radius, 0.0, 0.0))
        );
        const cylinders = packCylinders([
          {
            modelMatrix: modelMatrices[2],
            radius: radius,
            length: length,
          },
          {
            modelMatrix: modelMatrices[3],
            radius: radius,
            length: length,
          },
        ]);
        const cylinderBatchIds = new Uint16Array([2, 3]);

        const origin = Rectangle.center(rectangle);
        const center = ellipsoid.cartographicToCartesian(origin);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        const bv = new BoundingSphere(center, 50000000.0);

        length = modelMatrices.length;
        const batchTable = new Cesium3DTileBatchTable(mockTileset, length);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(globePrimitive);

        geometry = scene.primitives.add(
          new Vector3DTileGeometry({
            boxes: boxes,
            boxBatchIds: boxBatchIds,
            cylinders: cylinders,
            cylinderBatchIds: cylinderBatchIds,
            center: center,
            modelMatrix: modelMatrix,
            batchTable: batchTable,
            boundingVolume: bv,
          })
        );
        geometry.forceRebatch = true;
        return loadGeometries(geometry).then(function () {
          let i;
          for (i = 0; i < length; ++i) {
            batchTable.setShow(i, false);
          }

          for (i = 0; i < length; ++i) {
            const transform = Matrix4.multiply(
              modelMatrix,
              modelMatrices[i],
              new Matrix4()
            );
            scene.camera.lookAtTransform(
              transform,
              new Cartesian3(0.0, 0.0, 10.0)
            );

            batchTable.setShow(i, true);
            batchTable.update(mockTileset, scene.frameState);
            expect(scene).toRender([255, 255, 255, 255]);

            batchTable.setColor(i, Color.BLUE);
            geometry.updateCommands(i, Color.BLUE);
            batchTable.update(mockTileset, scene.frameState);
            expect(scene).toRender([0, 0, 255, 255]);

            batchTable.setShow(i, false);
          }
        });
      });

      it(`renders with inverted classification${webglMessage}`, function () {
        const radii = new Cartesian3(100.0, 100.0, 1000.0);
        const ellipsoids = packEllipsoids([
          {
            modelMatrix: Matrix4.IDENTITY,
            radii: radii,
          },
        ]);
        const ellipsoidBatchIds = new Uint16Array([0]);

        const origin = Rectangle.center(rectangle);
        const center = ellipsoid.cartographicToCartesian(origin);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        const bv = new BoundingSphere(
          center,
          Cartesian3.maximumComponent(radii)
        );

        const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(tilesetPrimitive);

        geometry = scene.primitives.add(
          new Vector3DTileGeometry({
            ellipsoids: ellipsoids,
            ellipsoidBatchIds: ellipsoidBatchIds,
            boundingVolume: bv,
            center: center,
            modelMatrix: modelMatrix,
            batchTable: batchTable,
          })
        );
        return loadGeometries(geometry).then(function () {
          scene.camera.lookAtTransform(
            modelMatrix,
            new Cartesian3(0.0, 0.0, 1.0)
          );
          expect(scene).toRender([255, 255, 255, 255]);

          scene.camera.lookAtTransform(
            modelMatrix,
            new Cartesian3(radii.x, 0.0, 1.0)
          );
          expect(scene).toRender([255, 0, 0, 255]);

          scene.invertClassification = true;
          scene.invertClassificationColor = new Color(0.25, 0.25, 0.25, 1.0);
          expect(scene).toRender([64, 0, 0, 255]);

          scene.invertClassification = false;
        });
      });

      it(`renders wireframe${webglMessage}`, function () {
        const origin = Rectangle.center(rectangle);
        const center = ellipsoid.cartographicToCartesian(origin);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(globePrimitive);

        geometry = scene.primitives.add(
          new Vector3DTileGeometry({
            ellipsoids: packEllipsoids([
              {
                modelMatrix: Matrix4.IDENTITY,
                radii: new Cartesian3(1000000.0, 1000000.0, 1000000.0),
              },
            ]),
            ellipsoidBatchIds: new Uint16Array([0]),
            center: center,
            modelMatrix: modelMatrix,
            batchTable: batchTable,
            boundingVolume: new BoundingSphere(center, 1000000.0),
          })
        );
        geometry.debugWireframe = true;
        return loadGeometries(geometry).then(function () {
          scene.camera.setView({
            destination: rectangle,
          });
          scene.camera.zoomIn(scene.camera.positionCartographic.height * 0.9);
          expect(scene).toRender([255, 255, 255, 255]);

          batchTable.setColor(0, Color.BLUE);
          geometry.updateCommands(0, Color.BLUE);
          batchTable.update(mockTileset, scene.frameState);
          expect(scene).toRender([0, 0, 255, 255]);
        });
      });

      it(`renders based on classificationType${webglMessage}`, function () {
        const radii = new Cartesian3(100.0, 100.0, 1000.0);
        const ellipsoids = packEllipsoids([
          {
            modelMatrix: Matrix4.IDENTITY,
            radii: radii,
          },
        ]);
        const ellipsoidBatchIds = new Uint16Array([0]);

        const origin = Rectangle.center(rectangle);
        const center = ellipsoid.cartographicToCartesian(origin);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        const bv = new BoundingSphere(
          center,
          Cartesian3.maximumComponent(radii)
        );

        const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        scene.primitives.add(globePrimitive);
        scene.primitives.add(tilesetPrimitive);

        geometry = scene.primitives.add(
          new Vector3DTileGeometry({
            ellipsoids: ellipsoids,
            ellipsoidBatchIds: ellipsoidBatchIds,
            boundingVolume: bv,
            center: center,
            modelMatrix: modelMatrix,
            batchTable: batchTable,
          })
        );
        return loadGeometries(geometry).then(function () {
          scene.camera.lookAtTransform(
            modelMatrix,
            new Cartesian3(0.0, 0.0, 1.0)
          );

          geometry.classificationType = ClassificationType.CESIUM_3D_TILE;
          globePrimitive.show = false;
          tilesetPrimitive.show = true;
          expect(scene).toRender([255, 255, 255, 255]);
          globePrimitive.show = true;
          tilesetPrimitive.show = false;
          expect(scene).toRender([255, 0, 0, 255]);

          geometry.classificationType = ClassificationType.TERRAIN;
          globePrimitive.show = false;
          tilesetPrimitive.show = true;
          expect(scene).toRender([255, 0, 0, 255]);
          globePrimitive.show = true;
          tilesetPrimitive.show = false;
          expect(scene).toRender([255, 255, 255, 255]);

          geometry.classificationType = ClassificationType.BOTH;
          globePrimitive.show = false;
          tilesetPrimitive.show = true;
          expect(scene).toRender([255, 255, 255, 255]);
          globePrimitive.show = true;
          tilesetPrimitive.show = false;
          expect(scene).toRender([255, 255, 255, 255]);

          globePrimitive.show = true;
          tilesetPrimitive.show = true;
        });
      });

      it(`picks geometry${webglMessage}`, function () {
        const origin = Rectangle.center(rectangle);
        const center = ellipsoid.cartographicToCartesian(origin);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(center);

        const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);

        scene.primitives.add(globePrimitive);

        geometry = scene.primitives.add(
          new Vector3DTileGeometry({
            ellipsoids: packEllipsoids([
              {
                modelMatrix: Matrix4.IDENTITY,
                radii: new Cartesian3(500000.0, 500000.0, 500000.0),
              },
            ]),
            ellipsoidBatchIds: new Uint16Array([0]),
            center: center,
            modelMatrix: modelMatrix,
            batchTable: batchTable,
            boundingVolume: new BoundingSphere(center, 500000.0),
          })
        );
        return loadGeometries(geometry).then(function () {
          scene.camera.setView({
            destination: rectangle,
          });
          scene.camera.zoomIn(scene.camera.positionCartographic.height * 0.9);

          const features = [];
          geometry.createFeatures(mockTileset, features);

          const getFeature = mockTileset.getFeature;
          mockTileset.getFeature = function (index) {
            return features[index];
          };

          scene.frameState.passes.pick = true;
          batchTable.update(mockTileset, scene.frameState);
          expect(scene).toPickAndCall(function (result) {
            expect(result).toBe(features[0]);
          });

          mockTileset.getFeature = getFeature;
        });
      });

      it(`isDestroyed${webglMessage}`, function () {
        geometry = new Vector3DTileGeometry({});
        expect(geometry.isDestroyed()).toEqual(false);
        geometry.destroy();
        expect(geometry.isDestroyed()).toEqual(true);
      });
    }
  },
  "WebGL"
);
