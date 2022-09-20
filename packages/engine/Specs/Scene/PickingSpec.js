import {
  Cartesian3,
  Cartographic,
  Color,
  Ellipsoid,
  FeatureDetection,
  GeometryInstance,
  Matrix4,
  OrthographicFrustum,
  PerspectiveFrustum,
  Ray,
  Rectangle,
  RectangleGeometry,
  ShowGeometryInstanceAttribute,
  Transforms,
  Cesium3DTileStyle,
  EllipsoidSurfaceAppearance,
  Globe,
  PointPrimitiveCollection,
  Primitive,
  SceneMode,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createCanvas from "../createCanvas.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/Pick",
  function () {
    // It's not easily possible to mock the most detailed pick functions
    // so don't run those tests when using the WebGL stub
    const webglStub = !!window.webglStub;

    let scene;
    let primitives;
    let camera;
    const largeRectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
    const smallRectangle = Rectangle.fromDegrees(
      -0.0001,
      -0.0001,
      0.0001,
      0.0001
    );
    const offscreenRectangle = Rectangle.fromDegrees(
      -45.0002,
      -1.0002,
      -45.0001,
      -1.0001
    );
    let primitiveRay;
    let offscreenRay;

    const batchedTilesetUrl =
      "Data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json";
    const pointCloudTilesetUrl =
      "Data/Cesium3DTiles/PointCloud/PointCloudWithTransform/tileset.json";

    beforeAll(function () {
      scene = createScene({
        canvas: createCanvas(10, 10),
      });
      primitives = scene.primitives;
      camera = scene.camera;

      camera.setView({
        destination: largeRectangle,
      });
      primitiveRay = new Ray(camera.positionWC, camera.directionWC);

      camera.setView({
        destination: offscreenRectangle,
      });
      offscreenRay = new Ray(camera.positionWC, camera.directionWC);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.mode = SceneMode.SCENE3D;
      scene.morphTime = SceneMode.getMorphTime(scene.mode);

      camera.setView({
        destination: largeRectangle,
      });

      camera.frustum = new PerspectiveFrustum();
      camera.frustum.fov = CesiumMath.toRadians(60.0);
      camera.frustum.aspectRatio = 1.0;
    });

    afterEach(function () {
      primitives.removeAll();
      scene.globe = undefined;
    });

    function createRectangle(height, rectangle) {
      const e = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            rectangle: rectangle,
            vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            granularity: CesiumMath.toRadians(20.0),
            height: height,
          }),
        }),
        appearance: new EllipsoidSurfaceAppearance({
          aboveGround: false,
        }),
        asynchronous: false,
      });

      primitives.add(e);

      return e;
    }

    function createLargeRectangle(height) {
      return createRectangle(height, largeRectangle);
    }

    function createSmallRectangle(height) {
      return createRectangle(height, smallRectangle);
    }

    function createTileset(url) {
      const options = {
        maximumScreenSpaceError: 0,
      };
      return Cesium3DTilesTester.loadTileset(scene, url, options).then(
        function (tileset) {
          const cartographic = Rectangle.center(largeRectangle);
          const cartesian = Cartographic.toCartesian(cartographic);
          tileset.root.transform = Matrix4.IDENTITY;
          tileset.modelMatrix = Transforms.eastNorthUpToFixedFrame(cartesian);
          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        }
      );
    }

    function createGlobe() {
      const globe = new Globe();
      scene.globe = globe;
      globe.depthTestAgainstTerrain = true;
      return pollToPromise(function () {
        scene.render();
        return globe.tilesLoaded;
      });
    }

    describe("pick", function () {
      it("does not pick undefined window positions", function () {
        expect(function () {
          scene.pick(undefined);
        }).toThrowDeveloperError();
      });

      it("picks a primitive", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        const rectangle = createLargeRectangle(0.0);
        expect(scene).toPickPrimitive(rectangle);
      });

      it("picks a primitive with a modified pick search area", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        camera.setView({
          destination: Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0),
        });

        const rectangle = createLargeRectangle(0.0);

        expect(scene).toPickPrimitive(rectangle, 7, 7, 5);
        expect(scene).notToPick(7, 7, 3);
      });

      it("does not pick primitives when show is false", function () {
        const rectangle = createLargeRectangle(0.0);
        rectangle.show = false;

        expect(scene).notToPick();
      });

      it("does not pick primitives when alpha is zero", function () {
        const rectangle = createLargeRectangle(0.0);
        rectangle.appearance.material.uniforms.color.alpha = 0.0;

        expect(scene).notToPick();
      });

      it("picks the top primitive", function () {
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);

        expect(scene).toPickPrimitive(rectangle2);
      });

      it("picks in 2D", function () {
        scene.morphTo2D(0.0);
        camera.setView({ destination: largeRectangle });
        const rectangle = createLargeRectangle(0.0);
        scene.renderForSpecs();
        expect(scene).toPickPrimitive(rectangle);
      });

      it("picks in 3D with orthographic projection", function () {
        const frustum = new OrthographicFrustum();
        frustum.aspectRatio = 1.0;
        frustum.width = 20.0;
        camera.frustum = frustum;

        // force off center update
        expect(frustum.projectionMatrix).toBeDefined();

        camera.setView({ destination: largeRectangle });
        const rectangle = createLargeRectangle(0.0);
        scene.renderForSpecs();
        expect(scene).toPickPrimitive(rectangle);
      });
    });

    describe("drillPick", function () {
      it("drill picks a primitive with a modified pick search area", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        camera.setView({
          destination: Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0),
        });

        const rectangle = createLargeRectangle(0.0);

        expect(scene).toDrillPickPrimitive(rectangle, 7, 7, 5);
        expect(scene).notToDrillPick(7, 7, 3);
      });

      it("does not drill pick undefined window positions", function () {
        expect(function () {
          scene.pick(undefined);
        }).toThrowDeveloperError();
      });

      it("drill picks multiple objects", function () {
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          expect(pickedObjects.length).toEqual(2);
          expect(pickedObjects[0].primitive).toEqual(rectangle2);
          expect(pickedObjects[1].primitive).toEqual(rectangle1);
        });
      });

      it("does not drill pick when show is false", function () {
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        rectangle2.show = false;

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          expect(pickedObjects.length).toEqual(1);
          expect(pickedObjects[0].primitive).toEqual(rectangle1);
        });
      });

      it("does not drill pick when alpha is zero", function () {
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        rectangle2.appearance.material.uniforms.color.alpha = 0.0;

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          expect(pickedObjects.length).toEqual(1);
          expect(pickedObjects[0].primitive).toEqual(rectangle1);
        });
      });

      it("can drill pick batched Primitives with show attribute", function () {
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 0.0,
        });

        const geometryWithHeight = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 20.0,
        });

        const instance1 = new GeometryInstance({
          id: 1,
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const instance2 = new GeometryInstance({
          id: 2,
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(false),
          },
        });

        const instance3 = new GeometryInstance({
          id: 3,
          geometry: geometryWithHeight,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2, instance3],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          expect(pickedObjects.length).toEqual(2);
          expect(pickedObjects[0].primitive).toEqual(primitive);
          expect(pickedObjects[0].id).toEqual(3);
          expect(pickedObjects[1].primitive).toEqual(primitive);
          expect(pickedObjects[1].id).toEqual(1);
        });
      });

      it("can drill pick without ID", function () {
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        });

        const instance1 = new GeometryInstance({
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const instance2 = new GeometryInstance({
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          expect(pickedObjects.length).toEqual(1);
          expect(pickedObjects[0].primitive).toEqual(primitive);
        });
      });

      it("can drill pick batched Primitives without show attribute", function () {
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 0.0,
        });

        const geometryWithHeight = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 20.0,
        });

        const instance1 = new GeometryInstance({
          id: 1,
          geometry: geometry,
        });

        const instance2 = new GeometryInstance({
          id: 2,
          geometry: geometry,
        });

        const instance3 = new GeometryInstance({
          id: 3,
          geometry: geometryWithHeight,
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2, instance3],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          expect(pickedObjects.length).toEqual(1);
          expect(pickedObjects[0].primitive).toEqual(primitive);
          expect(pickedObjects[0].id).toEqual(3);
        });
      });

      it("stops drill picking when the limit is reached.", function () {
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        const rectangle3 = createLargeRectangle(2.0);
        const rectangle4 = createLargeRectangle(3.0);

        expect(scene).toDrillPickAndCall(function (pickedObjects) {
          expect(pickedObjects.length).toEqual(3);
          expect(pickedObjects[0].primitive).toEqual(rectangle4);
          expect(pickedObjects[1].primitive).toEqual(rectangle3);
          expect(pickedObjects[2].primitive).toEqual(rectangle2);
        }, 3);
      });
    });

    function picksFromRayTileset(style) {
      return createTileset(batchedTilesetUrl).then(function (tileset) {
        tileset.style = style;
        expect(scene).toPickFromRayAndCall(function (result) {
          const primitive = result.object.primitive;
          const position = result.position;

          expect(primitive).toBe(tileset);

          if (scene.context.depthTexture) {
            const minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
            const maximumHeight = minimumHeight + 20.0; // Rough height of tile
            expect(position.x).toBeGreaterThan(minimumHeight);
            expect(position.x).toBeLessThan(maximumHeight);
            expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
          }
        }, primitiveRay);
      });
    }

    describe("pickFromRay", function () {
      it("picks a tileset", function () {
        return picksFromRayTileset();
      });

      it("picks a translucent tileset", function () {
        const style = new Cesium3DTileStyle({
          color: 'color("white", 0.5)',
        });
        return picksFromRayTileset(style);
      });

      it("picks the globe", function () {
        if (!scene.context.depthTexture) {
          return;
        }
        return createGlobe().then(function () {
          expect(scene).toPickFromRayAndCall(function (result) {
            expect(result.object).toBeUndefined();
            expect(result.position).toBeDefined();
            expect(result.position.x).toBeGreaterThan(
              Ellipsoid.WGS84.minimumRadius
            );
            expect(result.position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            expect(result.position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
          }, primitiveRay);
        });
      });

      it("picks a primitive", function () {
        const rectangle = createSmallRectangle(0.0);
        expect(scene).toPickFromRayAndCall(function (result) {
          const primitive = result.object.primitive;
          const position = result.position;

          expect(primitive).toBe(rectangle);

          if (scene.context.depthTexture) {
            const expectedPosition = Cartesian3.fromRadians(0.0, 0.0);
            expect(position).toEqualEpsilon(
              expectedPosition,
              CesiumMath.EPSILON5
            );
          }
        }, primitiveRay);
      });

      it("returns undefined if no primitives are picked", function () {
        createLargeRectangle(0.0);
        expect(scene).toPickFromRayAndCall(function (result) {
          expect(result).toBeUndefined();
        }, offscreenRay);
      });

      it("does not pick primitives when show is false", function () {
        const rectangle = createLargeRectangle(0.0);
        rectangle.show = false;
        expect(scene).toPickFromRayAndCall(function (result) {
          expect(result).toBeUndefined();
        }, primitiveRay);
      });

      it("does not pick primitives when alpha is zero", function () {
        const rectangle = createLargeRectangle(0.0);
        rectangle.appearance.material.uniforms.color.alpha = 0.0;
        expect(scene).toPickFromRayAndCall(function (result) {
          expect(result).toBeUndefined();
        }, primitiveRay);
      });

      it("picks the top primitive", function () {
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        expect(scene).toPickFromRayAndCall(function (result) {
          expect(result.object.primitive).toBe(rectangle2);
        }, primitiveRay);
      });

      it("excludes objects", function () {
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        const rectangle3 = createLargeRectangle(2.0);
        const rectangle4 = createLargeRectangle(3.0);
        rectangle4.show = false;

        expect(scene).toPickFromRayAndCall(
          function (result) {
            expect(result.object.primitive).toBe(rectangle1);
          },
          primitiveRay,
          [rectangle2, rectangle3, rectangle4]
        );

        // Tests that rectangle4 does not get un-hidden
        expect(scene).toPickFromRayAndCall(function (result) {
          expect(result.object.primitive).toBe(rectangle3);
        }, primitiveRay);
      });

      it("picks primitive that doesn't write depth", function () {
        const collection = scene.primitives.add(new PointPrimitiveCollection());
        const point = collection.add({
          position: Cartographic.fromRadians(0.0, 0.0, 100.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
        expect(scene).toPickFromRayAndCall(
          function (result) {
            expect(result.object.primitive).toBe(point);
            expect(result.position).toBeUndefined();
          },
          primitiveRay,
          [],
          0.01
        );
      });

      it("changes width", function () {
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          expect(scene).toPickFromRayAndCall(
            function (result) {
              expect(result).toBeUndefined();
            },
            primitiveRay,
            [],
            0.1
          );
          expect(scene).toPickFromRayAndCall(
            function (result) {
              expect(result).toBeDefined();
            },
            primitiveRay,
            [],
            1.0
          );
        });
      });

      it("throws if ray is undefined", function () {
        expect(function () {
          scene.pickFromRay(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        scene.morphTo2D(0.0);
        expect(function () {
          scene.pickFromRay(primitiveRay);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        scene.morphToColumbusView(0.0);
        expect(function () {
          scene.pickFromRay(primitiveRay);
        }).toThrowDeveloperError();
      });
    });

    describe("drillPickFromRay", function () {
      it("drill picks a primitive", function () {
        const rectangle = createSmallRectangle(0.0);
        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toBe(1);

          const primitive = results[0].object.primitive;
          const position = results[0].position;

          expect(primitive).toBe(rectangle);

          if (scene.context.depthTexture) {
            const expectedPosition = Cartesian3.fromRadians(0.0, 0.0);
            expect(position).toEqualEpsilon(
              expectedPosition,
              CesiumMath.EPSILON5
            );
          } else {
            expect(position).toBeUndefined();
          }
        }, primitiveRay);
      });

      it("drill picks multiple primitives", function () {
        const rectangle1 = createSmallRectangle(0.0);
        const rectangle2 = createSmallRectangle(1.0);
        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toBe(2);

          // rectangle2 is picked before rectangle1
          expect(results[0].object.primitive).toBe(rectangle2);
          expect(results[1].object.primitive).toBe(rectangle1);

          if (scene.context.depthTexture) {
            const rectangleCenter1 = Cartesian3.fromRadians(0.0, 0.0, 0.0);
            const rectangleCenter2 = Cartesian3.fromRadians(0.0, 0.0, 1.0);
            expect(results[0].position).toEqualEpsilon(
              rectangleCenter2,
              CesiumMath.EPSILON5
            );
            expect(results[1].position).toEqualEpsilon(
              rectangleCenter1,
              CesiumMath.EPSILON5
            );
          } else {
            expect(results[0].position).toBeUndefined();
            expect(results[1].position).toBeUndefined();
          }
        }, primitiveRay);
      });

      it("does not drill pick when show is false", function () {
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        rectangle2.show = false;
        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(rectangle1);
        }, primitiveRay);
      });

      it("does not drill pick when alpha is zero", function () {
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        rectangle2.appearance.material.uniforms.color.alpha = 0.0;
        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(rectangle1);
        }, primitiveRay);
      });

      it("returns empty array if no primitives are picked", function () {
        createLargeRectangle(0.0);
        createLargeRectangle(1.0);
        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toEqual(0);
        }, offscreenRay);
      });

      it("can drill pick batched Primitives with show attribute", function () {
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 0.0,
        });

        const geometryWithHeight = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 1.0,
        });

        const instance1 = new GeometryInstance({
          id: 1,
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const instance2 = new GeometryInstance({
          id: 2,
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(false),
          },
        });

        const instance3 = new GeometryInstance({
          id: 3,
          geometry: geometryWithHeight,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2, instance3],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toEqual(2);
          expect(results[0].object.primitive).toEqual(primitive);
          expect(results[0].object.id).toEqual(3);
          expect(results[1].object.primitive).toEqual(primitive);
          expect(results[1].object.id).toEqual(1);
        }, primitiveRay);
      });

      it("can drill pick without ID", function () {
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        });

        const instance1 = new GeometryInstance({
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const instance2 = new GeometryInstance({
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(primitive);
        }, primitiveRay);
      });

      it("can drill pick batched Primitives without show attribute", function () {
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 0.0,
        });

        const geometryWithHeight = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 1.0,
        });

        const instance1 = new GeometryInstance({
          id: 1,
          geometry: geometry,
        });

        const instance2 = new GeometryInstance({
          id: 2,
          geometry: geometry,
        });

        const instance3 = new GeometryInstance({
          id: 3,
          geometry: geometryWithHeight,
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2, instance3],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        expect(scene).toDrillPickFromRayAndCall(function (results) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(primitive);
          expect(results[0].object.id).toEqual(3);
        }, primitiveRay);
      });

      it("stops drill picking when the limit is reached.", function () {
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        const rectangle3 = createLargeRectangle(2.0);
        const rectangle4 = createLargeRectangle(3.0);

        expect(scene).toDrillPickFromRayAndCall(
          function (results) {
            expect(results.length).toEqual(3);
            expect(results[0].object.primitive).toEqual(rectangle4);
            expect(results[1].object.primitive).toEqual(rectangle3);
            expect(results[2].object.primitive).toEqual(rectangle2);
          },
          primitiveRay,
          3
        );
      });

      it("excludes objects", function () {
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        const rectangle3 = createLargeRectangle(2.0);
        const rectangle4 = createLargeRectangle(3.0);
        const rectangle5 = createLargeRectangle(4.0);
        expect(scene).toDrillPickFromRayAndCall(
          function (results) {
            expect(results.length).toBe(2);
            expect(results[0].object.primitive).toBe(rectangle4);
            expect(results[1].object.primitive).toBe(rectangle2);
          },
          primitiveRay,
          2,
          [rectangle5, rectangle3]
        );
      });

      it("changes width", function () {
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          expect(scene).toDrillPickFromRayAndCall(
            function (result) {
              expect(result.length).toBe(0);
            },
            primitiveRay,
            [],
            0.1
          );
          expect(scene).toDrillPickFromRayAndCall(
            function (result) {
              expect(result.length).toBe(1);
            },
            primitiveRay,
            Number.POSITIVE_INFINITY,
            [],
            1.0
          );
        });
      });

      it("throws if ray is undefined", function () {
        expect(function () {
          scene.drillPickFromRay(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        scene.morphTo2D(0.0);
        expect(function () {
          scene.drillPickFromRay(primitiveRay);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        scene.morphToColumbusView(0.0);
        expect(function () {
          scene.drillPickFromRay(primitiveRay);
        }).toThrowDeveloperError();
      });
    });

    describe("sampleHeight", function () {
      it("samples height from tileset", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographic = new Cartographic(0.0, 0.0);
        return createTileset(batchedTilesetUrl).then(function (tileset) {
          expect(scene).toSampleHeightAndCall(function (height) {
            expect(height).toBeGreaterThan(0.0);
            expect(height).toBeLessThan(20.0); // Rough height of tile
          }, cartographic);
        });
      });

      it("samples height from the globe", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographic = new Cartographic(0.0, 0.0);
        return createGlobe().then(function () {
          expect(scene).toSampleHeightAndCall(function (height) {
            expect(height).toBeDefined();
          }, cartographic);
        });
      });

      it("samples height from primitive", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const cartographic = new Cartographic(0.0, 0.0);
        expect(scene).toSampleHeightAndCall(function (height) {
          expect(height).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        }, cartographic);
      });

      it("samples height from the top primitive", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        createSmallRectangle(1.0);
        const cartographic = new Cartographic(0.0, 0.0);
        expect(scene).toSampleHeightAndCall(function (height) {
          expect(height).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
        }, cartographic);
      });

      it("returns undefined if no height is sampled", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const cartographic = new Cartographic(1.0, 0.0);
        expect(scene).toSampleHeightAndCall(function (height) {
          expect(height).toBeUndefined();
        }, cartographic);
      });

      it("excludes objects", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const rectangle2 = createSmallRectangle(1.0);
        const rectangle3 = createSmallRectangle(2.0);
        const cartographic = new Cartographic(0.0, 0.0);
        expect(scene).toSampleHeightAndCall(
          function (height) {
            expect(height).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
          },
          cartographic,
          [rectangle2, rectangle3]
        );
      });

      it("excludes primitive that doesn't write depth", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const rectangle = createSmallRectangle(0.0);
        const height = 100.0;
        const cartographic = new Cartographic(0.0, 0.0, height);
        const collection = scene.primitives.add(new PointPrimitiveCollection());
        const point = collection.add({
          position: Cartographic.toCartesian(cartographic),
        });

        expect(scene).toSampleHeightAndCall(function (height) {
          expect(height).toEqualEpsilon(height, CesiumMath.EPSILON3);
        }, cartographic);

        point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        expect(scene).toSampleHeightAndCall(function (height) {
          expect(height).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        }, cartographic);

        rectangle.show = false;
        expect(scene).toSampleHeightAndCall(function (height) {
          expect(height).toBeUndefined();
        }, cartographic);
      });

      it("changes width", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographic = new Cartographic(0.0, 0.0);
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          expect(scene).toSampleHeightAndCall(
            function (height) {
              expect(height).toBeUndefined();
            },
            cartographic,
            [],
            0.1
          );
          expect(scene).toSampleHeightAndCall(
            function (height) {
              expect(height).toBeDefined();
            },
            cartographic,
            [],
            1.0
          );
        });
      });

      it("throws if position is undefined", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        expect(function () {
          scene.sampleHeight(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        scene.morphTo2D(0.0);
        const cartographic = new Cartographic(0.0, 0.0);
        expect(function () {
          scene.sampleHeight(cartographic);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        scene.morphToColumbusView(0.0);
        const cartographic = new Cartographic(0.0, 0.0);
        expect(function () {
          scene.sampleHeight(cartographic);
        }).toThrowDeveloperError();
      });

      it("throws if sampleHeight is not supported", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }
        // Disable extension
        const depthTexture = scene.context._depthTexture;
        scene.context._depthTexture = false;

        const cartographic = new Cartographic(0.0, 0.0);
        expect(function () {
          scene.sampleHeight(cartographic);
        }).toThrowDeveloperError();

        // Re-enable extension
        scene.context._depthTexture = depthTexture;
      });
    });

    describe("clampToHeight", function () {
      it("clamps to tileset", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        return createTileset(batchedTilesetUrl).then(function (tileset) {
          expect(scene).toClampToHeightAndCall(function (position) {
            const minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
            const maximumHeight = minimumHeight + 20.0; // Rough height of tile
            expect(position.x).toBeGreaterThan(minimumHeight);
            expect(position.x).toBeLessThan(maximumHeight);
            expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
          }, cartesian);
        });
      });

      it("clamps to the globe", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        return createGlobe().then(function () {
          expect(scene).toClampToHeightAndCall(function (position) {
            expect(position).toBeDefined();
          }, cartesian);
        });
      });

      it("clamps to primitive", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        expect(scene).toClampToHeightAndCall(function (cartesian) {
          const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
          expect(cartesian).toEqualEpsilon(
            expectedCartesian,
            CesiumMath.EPSILON5
          );
        }, cartesian);
      });

      it("clamps to top primitive", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        createSmallRectangle(1.0);
        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        expect(scene).toClampToHeightAndCall(function (cartesian) {
          const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0, 1.0);
          expect(cartesian).toEqualEpsilon(
            expectedCartesian,
            CesiumMath.EPSILON5
          );
        }, cartesian);
      });

      it("returns undefined if there was nothing to clamp to", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const cartesian = Cartesian3.fromRadians(1.0, 0.0, 100000.0);
        expect(scene).toClampToHeightAndCall(function (cartesian) {
          expect(cartesian).toBeUndefined();
        }, cartesian);
      });

      it("excludes objects", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const rectangle2 = createSmallRectangle(1.0);
        const rectangle3 = createSmallRectangle(2.0);
        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        expect(scene).toClampToHeightAndCall(
          function (cartesian) {
            const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
            expect(cartesian).toEqualEpsilon(
              expectedCartesian,
              CesiumMath.EPSILON5
            );
          },
          cartesian,
          [rectangle2, rectangle3]
        );
      });

      it("excludes primitive that doesn't write depth", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const rectangle = createSmallRectangle(0.0);
        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100.0);
        const collection = scene.primitives.add(new PointPrimitiveCollection());
        const point = collection.add({
          position: cartesian,
        });

        expect(scene).toClampToHeightAndCall(function (clampedCartesian) {
          expect(clampedCartesian).toEqualEpsilon(
            cartesian,
            CesiumMath.EPSILON3
          );
        }, cartesian);

        point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        expect(scene).toClampToHeightAndCall(function (clampedCartesian) {
          expect(clampedCartesian).toEqualEpsilon(
            cartesian,
            CesiumMath.EPSILON3
          );
        }, cartesian);

        rectangle.show = false;
        expect(scene).toClampToHeightAndCall(function (clampedCartesian) {
          expect(clampedCartesian).toBeUndefined();
        }, cartesian);
      });

      it("changes width", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100.0);
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          expect(scene).toClampToHeightAndCall(
            function (clampedCartesian) {
              expect(clampedCartesian).toBeUndefined();
            },
            cartesian,
            [],
            0.1
          );
          expect(scene).toClampToHeightAndCall(
            function (clampedCartesian) {
              expect(clampedCartesian).toBeDefined();
            },
            cartesian,
            [],
            1.0
          );
        });
      });

      it("throws if cartesian is undefined", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        expect(function () {
          scene.clampToHeight(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        scene.morphTo2D(0.0);
        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        expect(function () {
          scene.clampToHeight(cartesian);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        scene.morphToColumbusView(0.0);
        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        expect(function () {
          scene.clampToHeight(cartesian);
        }).toThrowDeveloperError();
      });

      it("throws if clampToHeight is not supported", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }
        // Disable extension
        const depthTexture = scene.context._depthTexture;
        scene.context._depthTexture = false;

        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
        expect(function () {
          scene.clampToHeight(cartesian);
        }).toThrowDeveloperError();

        // Re-enable extension
        scene.context._depthTexture = depthTexture;
      });
    });

    function pickFromRayMostDetailed(ray, objectsToExclude, width) {
      let result;
      let completed = false;
      scene
        .pickFromRayMostDetailed(ray, objectsToExclude, width)
        .then(function (pickResult) {
          result = pickResult;
          completed = true;
        });
      return pollToPromise(function () {
        // Scene requires manual updates in the tests to move along the promise
        scene.render();
        return completed;
      }).then(function () {
        return result;
      });
    }

    function drillPickFromRayMostDetailed(ray, limit, objectsToExclude, width) {
      let result;
      let completed = false;
      scene
        .drillPickFromRayMostDetailed(ray, limit, objectsToExclude, width)
        .then(function (pickResult) {
          result = pickResult;
          completed = true;
        });
      return pollToPromise(function () {
        // Scene requires manual updates in the tests to move along the promise
        scene.render();
        return completed;
      }).then(function () {
        return result;
      });
    }

    function sampleHeightMostDetailed(cartographics, objectsToExclude, width) {
      let result;
      let completed = false;
      scene
        .sampleHeightMostDetailed(cartographics, objectsToExclude, width)
        .then(function (pickResult) {
          result = pickResult;
          completed = true;
        });
      return pollToPromise(function () {
        // Scene requires manual updates in the tests to move along the promise
        scene.render();
        return completed;
      }).then(function () {
        return result;
      });
    }

    function clampToHeightMostDetailed(cartesians, objectsToExclude, width) {
      let result;
      let completed = false;
      scene
        .clampToHeightMostDetailed(cartesians, objectsToExclude, width)
        .then(function (pickResult) {
          result = pickResult;
          completed = true;
        });
      return pollToPromise(function () {
        // Scene requires manual updates in the tests to move along the promise
        scene.render();
        return completed;
      }).then(function () {
        return result;
      });
    }

    describe("pickFromRayMostDetailed", function () {
      it("picks a tileset", function () {
        if (webglStub) {
          return;
        }
        scene.camera.setView({ destination: offscreenRectangle });
        return createTileset(batchedTilesetUrl).then(function (tileset) {
          return pickFromRayMostDetailed(primitiveRay).then(function (result) {
            const primitive = result.object.primitive;
            const position = result.position;

            expect(primitive).toBe(tileset);

            if (scene.context.depthTexture) {
              const minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
              const maximumHeight = minimumHeight + 20.0; // Rough height of tile
              expect(position.x).toBeGreaterThan(minimumHeight);
              expect(position.x).toBeLessThan(maximumHeight);
              expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
              expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            }
          });
        });
      });

      it("excludes tileset in objectsToExclude list", function () {
        if (webglStub) {
          return;
        }
        scene.camera.setView({ destination: offscreenRectangle });
        return createTileset(batchedTilesetUrl).then(function (tileset) {
          const objectsToExclude = [tileset];
          return pickFromRayMostDetailed(primitiveRay, objectsToExclude).then(
            function (result) {
              expect(result).toBeUndefined();
            }
          );
        });
      });

      it("excludes tileset whose show is false", function () {
        if (webglStub) {
          return;
        }
        scene.camera.setView({ destination: offscreenRectangle });
        return createTileset(batchedTilesetUrl).then(function (tileset) {
          tileset.show = false;
          return pickFromRayMostDetailed(primitiveRay).then(function (result) {
            expect(result).toBeUndefined();
          });
        });
      });

      it("picks a primitive", function () {
        if (webglStub) {
          return;
        }
        const rectangle = createSmallRectangle(0.0);
        scene.camera.setView({ destination: offscreenRectangle });
        return pickFromRayMostDetailed(primitiveRay).then(function (result) {
          const primitive = result.object.primitive;
          const position = result.position;

          expect(primitive).toBe(rectangle);

          if (scene.context.depthTexture) {
            const expectedPosition = Cartesian3.fromRadians(0.0, 0.0);
            expect(position).toEqualEpsilon(
              expectedPosition,
              CesiumMath.EPSILON5
            );
          }
        });
      });

      it("returns undefined if no primitives are picked", function () {
        if (webglStub) {
          return;
        }
        createLargeRectangle(0.0);
        scene.camera.setView({ destination: offscreenRectangle });
        return pickFromRayMostDetailed(offscreenRay).then(function (result) {
          expect(result).toBeUndefined();
        });
      });

      it("picks the top primitive", function () {
        if (webglStub) {
          return;
        }
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        scene.camera.setView({ destination: offscreenRectangle });
        return pickFromRayMostDetailed(primitiveRay).then(function (result) {
          expect(result.object.primitive).toBe(rectangle2);
        });
      });

      it("excludes objects", function () {
        if (webglStub) {
          return;
        }
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        const rectangle3 = createLargeRectangle(2.0);
        const rectangle4 = createLargeRectangle(3.0);
        rectangle4.show = false;

        scene.camera.setView({ destination: offscreenRectangle });
        return pickFromRayMostDetailed(primitiveRay, [
          rectangle2,
          rectangle3,
          rectangle4,
        ])
          .then(function (result) {
            expect(result.object.primitive).toBe(rectangle1);
          })
          .then(function () {
            return pickFromRayMostDetailed(primitiveRay).then(function (
              result
            ) {
              expect(result.object.primitive).toBe(rectangle3);
            });
          });
      });

      it("picks primitive that doesn't write depth", function () {
        if (webglStub) {
          return;
        }
        const collection = scene.primitives.add(new PointPrimitiveCollection());
        const point = collection.add({
          position: Cartographic.fromRadians(0.0, 0.0, 100.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });

        scene.camera.setView({ destination: offscreenRectangle });
        return pickFromRayMostDetailed(primitiveRay, [], 0.01).then(function (
          result
        ) {
          expect(result.object.primitive).toBe(point);
          expect(result.position).toBeUndefined();
        });
      });

      it("changes width", function () {
        if (webglStub) {
          return;
        }
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          const promise1 = pickFromRayMostDetailed(primitiveRay, [], 0.1).then(
            function (result) {
              expect(result).toBeUndefined();
            }
          );
          const promise2 = pickFromRayMostDetailed(primitiveRay, [], 1.0).then(
            function (result) {
              expect(result).toBeDefined();
            }
          );
          return Promise.all([promise1, promise2]);
        });
      });

      it("throws if ray is undefined", function () {
        expect(function () {
          scene.pickFromRayMostDetailed(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        scene.morphTo2D(0.0);
        expect(function () {
          scene.pickFromRayMostDetailed(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        scene.morphToColumbusView(0.0);
        expect(function () {
          scene.pickFromRayMostDetailed(undefined);
        }).toThrowDeveloperError();
      });
    });

    describe("drillPickFromRayMostDetailed", function () {
      it("drill picks a primitive", function () {
        if (webglStub) {
          return;
        }
        const rectangle = createSmallRectangle(0.0);
        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay).then(function (
          results
        ) {
          expect(results.length).toBe(1);

          const primitive = results[0].object.primitive;
          const position = results[0].position;

          expect(primitive).toBe(rectangle);

          if (scene.context.depthTexture) {
            const expectedPosition = Cartesian3.fromRadians(0.0, 0.0);
            expect(position).toEqualEpsilon(
              expectedPosition,
              CesiumMath.EPSILON5
            );
          } else {
            expect(position).toBeUndefined();
          }
        });
      });

      it("drill picks multiple primitives", function () {
        if (webglStub) {
          return;
        }
        const rectangle1 = createSmallRectangle(0.0);
        const rectangle2 = createSmallRectangle(1.0);
        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay).then(function (
          results
        ) {
          expect(results.length).toBe(2);

          // rectangle2 is picked before rectangle1
          expect(results[0].object.primitive).toBe(rectangle2);
          expect(results[1].object.primitive).toBe(rectangle1);

          if (scene.context.depthTexture) {
            const rectangleCenter1 = Cartesian3.fromRadians(0.0, 0.0, 0.0);
            const rectangleCenter2 = Cartesian3.fromRadians(0.0, 0.0, 1.0);
            expect(results[0].position).toEqualEpsilon(
              rectangleCenter2,
              CesiumMath.EPSILON5
            );
            expect(results[1].position).toEqualEpsilon(
              rectangleCenter1,
              CesiumMath.EPSILON5
            );
          } else {
            expect(results[0].position).toBeUndefined();
            expect(results[1].position).toBeUndefined();
          }
        });
      });

      it("does not drill pick when show is false", function () {
        if (webglStub) {
          return;
        }
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        rectangle2.show = false;
        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay).then(function (
          results
        ) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(rectangle1);
        });
      });

      it("does not drill pick when alpha is zero", function () {
        if (webglStub) {
          return;
        }
        const rectangle1 = createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        rectangle2.appearance.material.uniforms.color.alpha = 0.0;
        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay).then(function (
          results
        ) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(rectangle1);
        });
      });

      it("returns empty array if no primitives are picked", function () {
        if (webglStub) {
          return;
        }
        createLargeRectangle(0.0);
        createLargeRectangle(1.0);
        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(offscreenRay).then(function (
          results
        ) {
          expect(results.length).toEqual(0);
        });
      });

      it("can drill pick batched Primitives with show attribute", function () {
        if (webglStub) {
          return;
        }
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 0.0,
        });

        const geometryWithHeight = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 1.0,
        });

        const instance1 = new GeometryInstance({
          id: 1,
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const instance2 = new GeometryInstance({
          id: 2,
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(false),
          },
        });

        const instance3 = new GeometryInstance({
          id: 3,
          geometry: geometryWithHeight,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2, instance3],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay).then(function (
          results
        ) {
          expect(results.length).toEqual(2);
          expect(results[0].object.primitive).toEqual(primitive);
          expect(results[0].object.id).toEqual(3);
          expect(results[1].object.primitive).toEqual(primitive);
          expect(results[1].object.id).toEqual(1);
        });
      });

      it("can drill pick without ID", function () {
        if (webglStub) {
          return;
        }
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        });

        const instance1 = new GeometryInstance({
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const instance2 = new GeometryInstance({
          geometry: geometry,
          attributes: {
            show: new ShowGeometryInstanceAttribute(true),
          },
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay).then(function (
          results
        ) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(primitive);
        });
      });

      it("can drill pick batched Primitives without show attribute", function () {
        if (webglStub) {
          return;
        }
        const geometry = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 0.0,
        });

        const geometryWithHeight = new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
          granularity: CesiumMath.toRadians(20.0),
          vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          height: 1.0,
        });

        const instance1 = new GeometryInstance({
          id: 1,
          geometry: geometry,
        });

        const instance2 = new GeometryInstance({
          id: 2,
          geometry: geometry,
        });

        const instance3 = new GeometryInstance({
          id: 3,
          geometry: geometryWithHeight,
        });

        const primitive = primitives.add(
          new Primitive({
            geometryInstances: [instance1, instance2, instance3],
            asynchronous: false,
            appearance: new EllipsoidSurfaceAppearance(),
          })
        );

        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay).then(function (
          results
        ) {
          expect(results.length).toEqual(1);
          expect(results[0].object.primitive).toEqual(primitive);
          expect(results[0].object.id).toEqual(3);
        });
      });

      it("stops drill picking when the limit is reached.", function () {
        if (webglStub) {
          return;
        }
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        const rectangle3 = createLargeRectangle(2.0);
        const rectangle4 = createLargeRectangle(3.0);

        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay, 3).then(function (
          results
        ) {
          expect(results.length).toEqual(3);
          expect(results[0].object.primitive).toEqual(rectangle4);
          expect(results[1].object.primitive).toEqual(rectangle3);
          expect(results[2].object.primitive).toEqual(rectangle2);
        });
      });

      it("excludes objects", function () {
        if (webglStub) {
          return;
        }
        createLargeRectangle(0.0);
        const rectangle2 = createLargeRectangle(1.0);
        const rectangle3 = createLargeRectangle(2.0);
        const rectangle4 = createLargeRectangle(3.0);
        const rectangle5 = createLargeRectangle(4.0);
        scene.camera.setView({ destination: offscreenRectangle });
        return drillPickFromRayMostDetailed(primitiveRay, 2, [
          rectangle5,
          rectangle3,
        ]).then(function (results) {
          expect(results.length).toBe(2);
          expect(results[0].object.primitive).toBe(rectangle4);
          expect(results[1].object.primitive).toBe(rectangle2);
        });
      });

      it("changes width", function () {
        if (webglStub) {
          return;
        }
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          const promise1 = drillPickFromRayMostDetailed(
            primitiveRay,
            1,
            [],
            0.1
          ).then(function (result) {
            expect(result.length).toBe(0);
          });
          const promise2 = drillPickFromRayMostDetailed(
            primitiveRay,
            1,
            [],
            1.0
          ).then(function (result) {
            expect(result.length).toBe(1);
          });
          return Promise.all([promise1, promise2]);
        });
      });

      it("throws if ray is undefined", function () {
        expect(function () {
          scene.drillPickFromRayMostDetailed(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        scene.morphTo2D(0.0);
        expect(function () {
          scene.drillPickFromRayMostDetailed(primitiveRay);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        scene.morphToColumbusView(0.0);
        expect(function () {
          scene.drillPickFromRayMostDetailed(primitiveRay);
        }).toThrowDeveloperError();
      });
    });

    describe("sampleHeightMostDetailed", function () {
      it("samples height from tileset", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographics = [new Cartographic(0.0, 0.0)];
        return createTileset(batchedTilesetUrl).then(function () {
          return sampleHeightMostDetailed(cartographics).then(function (
            updatedCartographics
          ) {
            const height = updatedCartographics[0].height;
            expect(height).toBeGreaterThan(0.0);
            expect(height).toBeLessThan(20.0); // Rough height of tile
          });
        });
      });

      it("samples height from the globe", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographics = [
          new Cartographic(0.0, 0.0),
          new Cartographic(0.0001, 0.0001),
          new Cartographic(0.0002, 0.0002),
        ];
        const clonedCartographics = [
          new Cartographic(0.0, 0.0),
          new Cartographic(0.0001, 0.0001),
          new Cartographic(0.0002, 0.0002),
        ];
        return createGlobe().then(function () {
          return sampleHeightMostDetailed(cartographics).then(function (
            updatedCartographics
          ) {
            expect(updatedCartographics).toBe(cartographics);
            expect(updatedCartographics.length).toBe(3);
            let previousHeight;
            for (let i = 0; i < 3; ++i) {
              const longitude = updatedCartographics[i].longitude;
              const latitude = updatedCartographics[i].latitude;
              const height = updatedCartographics[i].height;
              expect(longitude).toBe(clonedCartographics[i].longitude);
              expect(latitude).toBe(clonedCartographics[i].latitude);
              expect(height).toBeDefined();
              expect(height).not.toBe(previousHeight);
              previousHeight = height;
            }
          });
        });
      });

      it("does not sample offscreen globe tiles", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographics = [new Cartographic(0.0, 0.0)];
        scene.camera.setView({ destination: offscreenRectangle });
        return createGlobe().then(function () {
          return sampleHeightMostDetailed(cartographics).then(function (
            updatedCartographics
          ) {
            expect(updatedCartographics[0].height).toBeUndefined();
          });
        });
      });

      it("samples height from multiple primitives", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        createRectangle(0.0, smallRectangle);
        createRectangle(0.0, offscreenRectangle);

        const cartographics = [
          Rectangle.center(smallRectangle),
          Rectangle.center(offscreenRectangle),
          new Cartographic(-2.0, -2.0),
        ];
        scene.camera.setView({ destination: offscreenRectangle });
        return sampleHeightMostDetailed(cartographics).then(function (
          updatedCartographics
        ) {
          expect(updatedCartographics[0].height).toBeDefined();
          expect(updatedCartographics[1].height).toBeDefined();
          expect(updatedCartographics[2].height).toBeUndefined(); // No primitive occupies this space
        });
      });

      it("samples multiple heights from primitive", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const cartographics = [
          new Cartographic(0.0, 0.0),
          new Cartographic(-0.000001, -0.000001),
          new Cartographic(0.0000005, 0.0000005),
        ];
        scene.camera.setView({ destination: offscreenRectangle });
        return sampleHeightMostDetailed(cartographics).then(function (
          updatedCartographics
        ) {
          let previousHeight;
          for (let i = 0; i < 3; ++i) {
            const height = updatedCartographics[i].height;
            expect(height).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
            expect(height).not.toBe(previousHeight);
            previousHeight = height;
          }
        });
      });

      it("samples height from the top primitive", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }
        createSmallRectangle(0.0);
        createSmallRectangle(1.0);
        const cartographics = [new Cartographic(0.0, 0.0)];
        scene.camera.setView({ destination: offscreenRectangle });
        return sampleHeightMostDetailed(cartographics).then(function (
          updatedCartographics
        ) {
          expect(updatedCartographics[0].height).toEqualEpsilon(
            1.0,
            CesiumMath.EPSILON3
          );
        });
      });

      it("excludes objects", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const rectangle1 = createRectangle(0.0, smallRectangle);
        createRectangle(0.0, offscreenRectangle);
        const rectangle3 = createRectangle(1.0, offscreenRectangle);

        const cartographics = [
          Rectangle.center(smallRectangle),
          Rectangle.center(offscreenRectangle),
          new Cartographic(-2.0, -2.0),
        ];
        scene.camera.setView({ destination: offscreenRectangle });
        return sampleHeightMostDetailed(cartographics, [
          rectangle1,
          rectangle3,
        ]).then(function (updatedCartographics) {
          expect(updatedCartographics[0].height).toBeUndefined(); // This rectangle was excluded
          expect(updatedCartographics[1].height).toEqualEpsilon(
            0.0,
            CesiumMath.EPSILON2
          );
          expect(updatedCartographics[2].height).toBeUndefined(); // No primitive occupies this space
        });
      });

      it("excludes primitive that doesn't write depth", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const rectangle = createSmallRectangle(0.0);

        const height = 100.0;
        const cartographics = [new Cartographic(0.0, 0.0, height)];
        const collection = scene.primitives.add(new PointPrimitiveCollection());
        const point = collection.add({
          position: Cartographic.toCartesian(cartographics[0]),
        });

        scene.camera.setView({ destination: offscreenRectangle });
        return sampleHeightMostDetailed(cartographics)
          .then(function (updatedCartographics) {
            expect(updatedCartographics[0].height).toEqualEpsilon(
              height,
              CesiumMath.EPSILON3
            );
          })
          .then(function () {
            point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
            return sampleHeightMostDetailed(cartographics).then(function (
              updatedCartographics
            ) {
              expect(updatedCartographics[0].height).toEqualEpsilon(
                0.0,
                CesiumMath.EPSILON3
              );
            });
          })
          .then(function () {
            rectangle.show = false;
            return sampleHeightMostDetailed(cartographics).then(function (
              updatedCartographics
            ) {
              expect(updatedCartographics[0].height).toBeUndefined();
            });
          });
      });

      it("changes width", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographics1 = [new Cartographic(0.0, 0.0)];
        const cartographics2 = [new Cartographic(0.0, 0.0)];
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          const promise1 = sampleHeightMostDetailed(
            cartographics1,
            [],
            0.1
          ).then(function (updatedCartographics1) {
            expect(updatedCartographics1[0].height).toBeUndefined();
          });
          const promise2 = sampleHeightMostDetailed(
            cartographics2,
            [],
            1.0
          ).then(function (updatedCartographics2) {
            expect(updatedCartographics2[0].height).toBeDefined();
          });
          return Promise.all([promise1, promise2]);
        });
      });

      it("handles empty array", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        const cartographics = [];
        return sampleHeightMostDetailed(cartographics).then(function (
          updatedCartographics
        ) {
          expect(updatedCartographics.length).toBe(0);
        });
      });

      it("throws if positions is undefined", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        expect(function () {
          scene.sampleHeightMostDetailed(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        scene.morphTo2D(0.0);
        const cartographics = [new Cartographic(0.0, 0.0)];
        expect(function () {
          scene.sampleHeightMostDetailed(cartographics);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }

        scene.morphToColumbusView(0.0);
        const cartographics = [new Cartographic(0.0, 0.0)];
        expect(function () {
          scene.sampleHeightMostDetailed(cartographics);
        }).toThrowDeveloperError();
      });

      it("throws if sampleHeight is not supported", function () {
        if (!scene.sampleHeightSupported) {
          return;
        }
        // Disable extension
        const depthTexture = scene.context._depthTexture;
        scene.context._depthTexture = false;

        const cartographics = [new Cartographic(0.0, 0.0)];
        expect(function () {
          scene.sampleHeightMostDetailed(cartographics);
        }).toThrowDeveloperError();

        // Re-enable extension
        scene.context._depthTexture = depthTexture;
      });
    });

    describe("clampToHeightMostDetailed", function () {
      it("clamps to tileset", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesians = [Cartesian3.fromRadians(0.0, 0.0, 100000.0)];
        return createTileset(batchedTilesetUrl).then(function () {
          return clampToHeightMostDetailed(cartesians).then(function (
            updatedCartesians
          ) {
            const minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
            const maximumHeight = minimumHeight + 20.0; // Rough height of tile
            const position = updatedCartesians[0];
            expect(position.x).toBeGreaterThan(minimumHeight);
            expect(position.x).toBeLessThan(maximumHeight);
            expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
            expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
          });
        });
      });

      it("clamps to the globe", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesians = [
          Cartesian3.fromRadians(0.0, 0.0, 100000.0),
          Cartesian3.fromRadians(0.0001, 0.0001, 100000.0),
          Cartesian3.fromRadians(0.0002, 0.0002, 100000.0),
        ];
        const clonedCartesians = [
          Cartesian3.fromRadians(0.0, 0.0, 100000.0),
          Cartesian3.fromRadians(0.0001, 0.0001, 100000.0),
          Cartesian3.fromRadians(0.0002, 0.0002, 100000.0),
        ];
        return createGlobe().then(function () {
          return clampToHeightMostDetailed(cartesians).then(function (
            updatedCartesians
          ) {
            expect(updatedCartesians).toBe(cartesians);
            expect(updatedCartesians.length).toBe(3);
            let previousCartesian;
            for (let i = 0; i < 3; ++i) {
              expect(updatedCartesians[i]).not.toEqual(clonedCartesians[i]);
              expect(updatedCartesians[i]).not.toEqual(previousCartesian);
              previousCartesian = updatedCartesians[i];
            }
          });
        });
      });

      it("does not clamp to offscreen globe tiles", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesians = [Cartesian3.fromRadians(0.0, 0.0, 100000.0)];
        scene.camera.setView({ destination: offscreenRectangle });
        return createGlobe().then(function () {
          return clampToHeightMostDetailed(cartesians).then(function (
            updatedCartesians
          ) {
            expect(updatedCartesians[0]).toBeUndefined();
          });
        });
      });

      it("clamps to multiple primitives", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        createRectangle(0.0, smallRectangle);
        createRectangle(0.0, offscreenRectangle);

        const cartesians = [
          Cartographic.toCartesian(Rectangle.center(smallRectangle)),
          Cartographic.toCartesian(Rectangle.center(offscreenRectangle)),
          Cartesian3.fromRadians(-2.0, -2.0),
        ];
        scene.camera.setView({ destination: offscreenRectangle });
        return clampToHeightMostDetailed(cartesians).then(function (
          updatedCartesians
        ) {
          expect(updatedCartesians[0]).toBeDefined();
          expect(updatedCartesians[1]).toBeDefined();
          expect(updatedCartesians[2]).toBeUndefined(); // No primitive occupies this space
        });
      });

      it("clamps to primitive", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        createSmallRectangle(0.0);
        const cartesians = [
          Cartesian3.fromRadians(0.0, 0.0, 100000.0),
          Cartesian3.fromRadians(-0.000001, -0.000001, 100000.0),
          Cartesian3.fromRadians(0.0000005, 0.0000005, 100000.0),
        ];
        const expectedCartesians = [
          Cartesian3.fromRadians(0.0, 0.0, 0.0),
          Cartesian3.fromRadians(-0.000001, -0.000001, 0.0),
          Cartesian3.fromRadians(0.0000005, 0.0000005, 0.0),
        ];
        scene.camera.setView({ destination: offscreenRectangle });
        return clampToHeightMostDetailed(cartesians).then(function (
          updatedCartesians
        ) {
          let previousCartesian;
          for (let i = 0; i < 3; ++i) {
            expect(updatedCartesians[i]).toEqualEpsilon(
              expectedCartesians[i],
              CesiumMath.EPSILON5
            );
            expect(updatedCartesians[i]).not.toEqual(previousCartesian);
            previousCartesian = updatedCartesians[i];
          }
        });
      });

      it("clamps to top primitive", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }
        createSmallRectangle(0.0);
        createSmallRectangle(1.0);
        const cartesians = [Cartesian3.fromRadians(0.0, 0.0)];
        scene.camera.setView({ destination: offscreenRectangle });
        return clampToHeightMostDetailed(cartesians).then(function (
          updatedCartesians
        ) {
          const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0, 1.0);
          expect(updatedCartesians[0]).toEqualEpsilon(
            expectedCartesian,
            CesiumMath.EPSILON5
          );
        });
      });

      it("excludes objects", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const rectangle1 = createRectangle(0.0, smallRectangle);
        createRectangle(0.0, offscreenRectangle);
        const rectangle3 = createRectangle(1.0, offscreenRectangle);

        const cartesians = [
          Cartographic.toCartesian(Rectangle.center(smallRectangle)),
          Cartographic.toCartesian(Rectangle.center(offscreenRectangle)),
          Cartesian3.fromRadians(-2.0, -2.0),
        ];
        scene.camera.setView({ destination: offscreenRectangle });
        return clampToHeightMostDetailed(cartesians, [
          rectangle1,
          rectangle3,
        ]).then(function (updatedCartesians) {
          const expectedCartesian = Cartographic.toCartesian(
            Rectangle.center(offscreenRectangle)
          );
          expect(updatedCartesians[0]).toBeUndefined(); // This rectangle was excluded
          expect(updatedCartesians[1]).toEqualEpsilon(
            expectedCartesian,
            CesiumMath.EPSILON2
          );
          expect(updatedCartesians[2]).toBeUndefined(); // No primitive occupies this space
        });
      });

      it("excludes primitive that doesn't write depth", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const rectangle = createSmallRectangle(0.0);

        const height = 100.0;
        const cartesian = Cartesian3.fromRadians(0.0, 0.0, height);
        const cartesians1 = [Cartesian3.clone(cartesian)];
        const cartesians2 = [Cartesian3.clone(cartesian)];
        const cartesians3 = [Cartesian3.clone(cartesian)];
        const collection = scene.primitives.add(new PointPrimitiveCollection());
        const point = collection.add({
          position: cartesian,
        });

        scene.camera.setView({ destination: offscreenRectangle });
        return clampToHeightMostDetailed(cartesians1)
          .then(function (updatedCartesians) {
            expect(updatedCartesians[0]).toEqualEpsilon(
              cartesian,
              CesiumMath.EPSILON3
            );
          })
          .then(function () {
            point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
            return clampToHeightMostDetailed(cartesians2).then(function (
              updatedCartesians
            ) {
              expect(updatedCartesians[0]).toEqualEpsilon(
                cartesian,
                CesiumMath.EPSILON3
              );
            });
          })
          .then(function () {
            rectangle.show = false;
            return clampToHeightMostDetailed(cartesians3).then(function (
              updatedCartesians
            ) {
              expect(updatedCartesians[0]).toBeUndefined();
            });
          });
      });

      it("changes width", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesian = Cartesian3.fromRadians(0.0, 0.0, 100.0);
        const cartesians1 = [Cartesian3.clone(cartesian)];
        const cartesians2 = [Cartesian3.clone(cartesian)];
        return createTileset(pointCloudTilesetUrl).then(function (tileset) {
          const promise1 = clampToHeightMostDetailed(cartesians1, [], 0.1).then(
            function (clampedCartesians1) {
              expect(clampedCartesians1[0]).toBeUndefined();
            }
          );
          const promise2 = clampToHeightMostDetailed(cartesians2, [], 1.0).then(
            function (clampedCartesians2) {
              expect(clampedCartesians2[0]).toBeDefined();
            }
          );
          return Promise.all([promise1, promise2]);
        });
      });

      it("handles empty array", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        const cartesians = [];
        return sampleHeightMostDetailed(cartesians).then(function (
          updatedCartesians
        ) {
          expect(updatedCartesians.length).toBe(0);
        });
      });

      it("throws if cartesians is undefined", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        expect(function () {
          scene.clampToHeightMostDetailed(undefined);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in 2D", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        scene.morphTo2D(0.0);
        const cartesians = [Cartesian3.fromRadians(0.0, 0.0)];
        expect(function () {
          scene.clampToHeightMostDetailed(cartesians);
        }).toThrowDeveloperError();
      });

      it("throws if scene camera is in CV", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }

        scene.morphToColumbusView(0.0);
        const cartesians = [Cartesian3.fromRadians(0.0, 0.0)];
        expect(function () {
          scene.clampToHeightMostDetailed(cartesians);
        }).toThrowDeveloperError();
      });

      it("throws if clampToHeight is not supported", function () {
        if (!scene.clampToHeightSupported) {
          return;
        }
        // Disable extension
        const depthTexture = scene.context._depthTexture;
        scene.context._depthTexture = false;

        const cartesians = [Cartesian3.fromRadians(0.0, 0.0)];
        expect(function () {
          scene.clampToHeightMostDetailed(cartesians);
        }).toThrowDeveloperError();

        // Re-enable extension
        scene.context._depthTexture = depthTexture;
      });
    });

    it("calls multiple picking functions within the same frame", function () {
      if (!scene.clampToHeightSupported || !scene.pickPositionSupported) {
        return;
      }

      createSmallRectangle(0.0);
      const offscreenRectanglePrimitive = createRectangle(
        0.0,
        offscreenRectangle
      );
      offscreenRectanglePrimitive.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        1.0
      );

      scene.camera.setView({ destination: offscreenRectangle });

      // Call render. Lays down depth for the pickPosition call
      scene.renderForSpecs();

      const cartographic = Cartographic.fromRadians(0.0, 0.0, 100000.0);
      const cartesian = Cartographic.toCartesian(cartographic);
      const cartesians = [Cartesian3.clone(cartesian)];
      const cartographics = [cartographic];

      // Call clampToHeight
      expect(scene).toClampToHeightAndCall(function (cartesian) {
        const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
        expect(cartesian).toEqualEpsilon(
          expectedCartesian,
          CesiumMath.EPSILON5
        );
      }, cartesian);

      // Call pickPosition
      expect(scene).toPickPositionAndCall(function (cartesian) {
        const expectedCartesian = Cartographic.toCartesian(
          Rectangle.center(offscreenRectangle)
        );
        expect(cartesian).toEqualEpsilon(
          expectedCartesian,
          CesiumMath.EPSILON5
        );
      });

      // Call clampToHeight again
      expect(scene).toClampToHeightAndCall(function (cartesian) {
        const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
        expect(cartesian).toEqualEpsilon(
          expectedCartesian,
          CesiumMath.EPSILON5
        );
      }, cartesian);

      // Call pick
      expect(scene).toPickPrimitive(offscreenRectanglePrimitive);

      // Call clampToHeight again
      expect(scene).toClampToHeightAndCall(function (cartesian) {
        const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
        expect(cartesian).toEqualEpsilon(
          expectedCartesian,
          CesiumMath.EPSILON5
        );
      }, cartesian);

      // Call pickPosition on translucent primitive and returns undefined
      offscreenRectanglePrimitive.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        0.5
      );
      scene.renderForSpecs();
      expect(scene).toPickPositionAndCall(function (cartesian) {
        expect(cartesian).toBeUndefined();
      });

      // Call clampToHeight again
      expect(scene).toClampToHeightAndCall(function (cartesian) {
        const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
        expect(cartesian).toEqualEpsilon(
          expectedCartesian,
          CesiumMath.EPSILON5
        );
      }, cartesian);

      // Call pickPosition on translucent primitive with pickTranslucentDepth
      scene.pickTranslucentDepth = true;
      scene.renderForSpecs();
      expect(scene).toPickPositionAndCall(function (cartesian) {
        const expectedCartesian = Cartographic.toCartesian(
          Rectangle.center(offscreenRectangle)
        );
        expect(cartesian).toEqualEpsilon(
          expectedCartesian,
          CesiumMath.EPSILON5
        );
      });

      // Mix async and sync requests
      const results = [];
      let completed = 0;
      scene
        .clampToHeightMostDetailed(cartesians)
        .then(function (updatedCartesians) {
          results.push(updatedCartesians);
          completed++;
        });
      scene
        .sampleHeightMostDetailed(cartographics)
        .then(function (updatedCartographics) {
          results.push(updatedCartographics);
          completed++;
        });

      // Call clampToHeight again
      expect(scene).toClampToHeightAndCall(function (cartesian) {
        const expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
        expect(cartesian).toEqualEpsilon(
          expectedCartesian,
          CesiumMath.EPSILON5
        );
      }, cartesian);

      return pollToPromise(function () {
        // Scene requires manual updates in the tests to move along the promise
        scene.render();
        return completed === 2;
      }).then(function () {
        expect(results[0][0]).toBeDefined();
        expect(results[1][0].height).toBeDefined();
      });
    });
  },
  "WebGL"
);
