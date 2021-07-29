import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../Source/Cesium.js";
import { CloudCollection } from "../../Source/Cesium.js";

describe(
  "Scene/CloudCollection",
  function () {
    var scene;
    var camera;
    var clouds;

    beforeAll(function () {
      scene = createScene();
      camera = scene.camera;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.morphTo3D(0);

      camera.position = new Cartesian3(10.0, 0.0, 0.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);

      clouds = new CloudCollection();
      scene.primitives.add(clouds);
    });

    afterEach(function () {
      // clouds are destroyed by removeAll().
      scene.primitives.removeAll();
    });

    it("constructs a default cloud", function () {
      var c = clouds.add();
      expect(c.show).toEqual(true);
      expect(c.position).toEqual(Cartesian3.ZERO);
      expect(c.scale).toEqual(new Cartesian2(1.0, 1.0));
      expect(c.flat).toEqual(false);
    });

    it("explicitly constructs a cloud", function () {
      var c = clouds.add({
        show: false,
        position: new Cartesian3(1.0, 2.0, 3.0),
        scale: new Cartesian2(2.0, 3.0),
        flat: true,
      });
      expect(c.show).toEqual(false);
      expect(c.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
      expect(c.scale).toEqual(new Cartesian2(2.0, 3.0));
      expect(c.flat).toEqual(true);
    });

    it("sets cloud properties", function () {
      var c = clouds.add();
      c.show = false;
      c.position = new Cartesian3(1.0, 2.0, 3.0);
      c.scale = new Cartesian2(2.0, 3.0);
      c.flat = true;

      expect(c.show).toEqual(false);
      expect(c.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
      expect(c.scale).toEqual(new Cartesian2(2.0, 3.0));
      expect(c.flat).toEqual(true);
    });

    it("is not destroyed", function () {
      expect(clouds.isDestroyed()).toEqual(false);
    });

    it("sets a removed cloud property", function () {
      var c = clouds.add();
      clouds.remove(c);
      c.show = false;
      expect(c.show).toEqual(false);
    });

    it("has zero clouds when constructed", function () {
      expect(clouds.length).toEqual(0);
    });

    it("adds a cloud", function () {
      var c = clouds.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });

      expect(clouds.length).toEqual(1);
      expect(clouds.get(0)).toBe(c);
    });

    it("removes the first cloud", function () {
      var one = clouds.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      var two = clouds.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });

      expect(clouds.length).toEqual(2);

      expect(clouds.remove(one)).toEqual(true);

      expect(clouds.length).toEqual(1);
      expect(clouds.get(0)).toBe(two);
    });

    it("removes the last cloud", function () {
      var one = clouds.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      var two = clouds.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });

      expect(clouds.length).toEqual(2);

      expect(clouds.remove(two)).toEqual(true);

      expect(clouds.length).toEqual(1);
      expect(clouds.get(0)).toBe(one);
    });

    it("removes the same cloud twice", function () {
      var b = clouds.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      expect(clouds.length).toEqual(1);

      expect(clouds.remove(b)).toEqual(true);
      expect(clouds.length).toEqual(0);

      expect(clouds.remove(b)).toEqual(false);
      expect(clouds.length).toEqual(0);
    });

    it("returns false when removing undefined", function () {
      clouds.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      expect(clouds.length).toEqual(1);

      expect(clouds.remove(undefined)).toEqual(false);
      expect(clouds.length).toEqual(1);
    });

    it("adds and removes clouds", function () {
      var one = clouds.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      var two = clouds.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });
      expect(clouds.length).toEqual(2);
      expect(clouds.get(0)).toBe(one);
      expect(clouds.get(1)).toBe(two);

      expect(clouds.remove(two)).toEqual(true);
      expect(clouds.length).toEqual(1);

      var three = clouds.add({
        position: new Cartesian3(7.0, 8.0, 9.0),
      });
      expect(clouds.length).toEqual(2);
      expect(clouds.get(0)).toBe(one);
      expect(clouds.get(1)).toBe(three);
    });

    it("removes all clouds", function () {
      clouds.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      clouds.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });
      expect(clouds.length).toEqual(2);

      clouds.removeAll();
      expect(clouds.length).toEqual(0);
    });

    it("can check if it contains a cloud", function () {
      var cloud = clouds.add();

      expect(clouds.contains(cloud)).toEqual(true);
    });

    it("returns false when checking if it contains a cloud it does not contain", function () {
      var cloud = clouds.add();
      clouds.remove(cloud);

      expect(clouds.contains(cloud)).toEqual(false);
    });

    it("does not contain undefined", function () {
      expect(clouds.contains(undefined)).toEqual(false);
    });

    it("does not contain random other objects", function () {
      expect(clouds.contains({})).toEqual(false);
      expect(clouds.contains(new Cartesian2())).toEqual(false);
    });

    it("does not render when constructed", function () {
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders a cloud", function () {
      clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);
    });

    it("adds and renders a cloud", function () {
      clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);

      clouds.add({
        position: new Cartesian3(1.0, 0.0, 0.0),
        scale: new Cartesian2(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);
    });

    it("modifies and removes a cloud, then renders", function () {
      var c = clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });
      expect(scene).not.toRender([0, 0, 0, 255]);

      c.scale = 2.0;
      clouds.remove(c);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("removes and renders a cloud", function () {
      clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });
      var cloud = clouds.add({
        position: new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
        scale: new Cartesian2(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);

      clouds.remove(cloud);
      expect(scene).not.toRender([0, 0, 0, 255]);
    });

    it("removes all clouds and renders", function () {
      clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });
      clouds.add({
        position: new Cartesian3(1.0, 0.0, 0.0),
        scale: new Cartesian2(1.0, 1.0),
      });
      expect(scene).not.toRender([0, 0, 0, 255]);

      clouds.removeAll();
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("removes all clouds, adds a cloud, and renders", function () {
      clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });

      clouds.add({
        position: new Cartesian3(1.0, 0.0, 0.0),
        scale: new Cartesian2(1.0, 1.0),
      });
      expect(scene).not.toRender([0, 0, 0, 255]);

      clouds.removeAll();
      clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);
    });

    it("renders using cloud show property", function () {
      var c = clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian3(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);
      c.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders using cloud position property", function () {
      var c = clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian3(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);

      c.position = new Cartesian3(20.0, 0.0, 0.0); // Behind camera
      expect(scene).toRender([0, 0, 0, 255]);

      c.position = new Cartesian3(1.0, 0.0, 0.0); // Back in front of camera
      expect(scene).not.toRender([0, 0, 0, 255]);
    });

    it("renders using cloud scale property", function () {
      var c = clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian3(1.0, 1.0),
      });

      expect(scene).not.toRender([0, 0, 0, 255]);

      c.scale = Cartesian2.ZERO;
      expect(scene).toRender([0, 0, 0, 255]);

      c.scale = new Cartesian2(2.0, 2.0);
      expect(scene).not.toRender([0, 0, 0, 255]);
    });

    it("updates 10% of clouds", function () {
      for (var i = 0; i < 10; ++i) {
        clouds.add({
          position: Cartesian3.ZERO,
          scale: new Cartesian2(1.0, 1.0),
          show: i === 3,
        });
      }

      expect(scene).not.toRender([0, 0, 0, 255]);

      clouds.get(3).scale = Cartesian2.ZERO;
      expect(scene).toRender([0, 0, 0, 255]);

      clouds.get(3).scale = new Cartesian3(2.0, 2.0);
      expect(scene).not.toRender([0, 0, 0, 255]);
    });

    it("does not render if show is false", function () {
      clouds.add({
        position: Cartesian3.ZERO,
        scale: new Cartesian2(1.0, 1.0),
      });
      expect(scene).not.toRender([0, 0, 0, 255]);
      clouds.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("throws when accessing without an index", function () {
      expect(function () {
        clouds.get();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
