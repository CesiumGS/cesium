import {
  BoundingSphere,
  Cartesian3,
  Ellipsoid,
  JulianDate,
  ConstantPositionProperty,
  Entity,
  EntityView,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;

describe(
  "DataSources/EntityView",
  function () {
    let scene;
    const defaultOffset = EntityView.defaultOffset3D;

    beforeAll(function () {
      scene = createScene();
    });

    beforeEach(function () {
      EntityView.defaultOffset3D = defaultOffset.clone();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("throws when constructed without required values", function () {
      const entity = new Entity();
      let view;
      expect(function () {
        view = new EntityView(undefined, scene);
      }).toThrowDeveloperError();
      expect(function () {
        view = new EntityView(entity, undefined);
      }).toThrowDeveloperError();

      view = new EntityView(entity, scene);
      expect(view.ellipsoid).toBe(Ellipsoid.WGS84);
    });

    it("constructor sets expected values", function () {
      const entity = new Entity();
      const ellipsoid = Ellipsoid.UNIT_SPHERE;
      const view = new EntityView(entity, scene, ellipsoid);
      expect(view.entity).toBe(entity);
      expect(view.scene).toBe(scene);
      expect(view.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
    });

    it("can set and get defaultOffset3D", function () {
      const sampleOffset = new Cartesian3(1, 2, 3);
      EntityView.defaultOffset3D = sampleOffset;
      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0)
      );
      const view = new EntityView(entity, scene);
      view.update(JulianDate.now());
      expect(EntityView.defaultOffset3D).toEqualEpsilon(sampleOffset, 1e-10);
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);
    });

    it("uses entity viewFrom", function () {
      const sampleOffset = new Cartesian3(1, 2, 3);
      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0)
      );
      entity.viewFrom = sampleOffset;
      const view = new EntityView(entity, scene);
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);
    });

    it("uses entity bounding sphere", function () {
      const sampleOffset = new Cartesian3(
        -1.3322676295501878e-15,
        -7.348469228349534,
        7.3484692283495345
      );
      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0)
      );
      const view = new EntityView(entity, scene, undefined);
      view.update(
        JulianDate.now(),
        new BoundingSphere(new Cartesian3(3, 4, 5), 6)
      );
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);
    });

    it("uses entity viewFrom if available and boundingsphere is supplied", function () {
      const sampleOffset = new Cartesian3(1, 2, 3);
      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0)
      );
      entity.viewFrom = sampleOffset;
      const view = new EntityView(
        entity,
        scene,
        undefined,
        new BoundingSphere(new Cartesian3(3, 4, 5), 6)
      );
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);
    });

    it("update throws without time parameter", function () {
      const entity = new Entity();
      entity.position = new ConstantPositionProperty(Cartesian3.ZERO);
      const view = new EntityView(entity, scene);
      expect(function () {
        view.update(undefined);
      }).toThrowDeveloperError();
    });

    it("update returns without entity.position property.", function () {
      const entity = new Entity();
      const view = new EntityView(entity, scene);
      view.update(JulianDate.now());
    });
  },
  "WebGL"
);
