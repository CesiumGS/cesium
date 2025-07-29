import {
  BoundingSphere,
  Cartesian3,
  Ellipsoid,
  JulianDate,
  ConstantPositionProperty,
  Entity,
  EntityView,
  TrackingReferenceFrame,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

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
        Cartesian3.fromDegrees(0.0, 0.0),
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
        Cartesian3.fromDegrees(0.0, 0.0),
      );
      entity.viewFrom = sampleOffset;
      const view = new EntityView(entity, scene);
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.INERTIAL;
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.VELOCITY;
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.ENU;
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);
    });

    it("uses provided bounding sphere", function () {
      const bs = new BoundingSphere(new Cartesian3(3, 4, 5), 6);
      scene.camera.viewBoundingSphere(bs);
      const positionWC = scene.camera.positionWC.clone();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0),
      );
      const view = new EntityView(entity, scene, undefined);
      view.update(JulianDate.now(), bs);
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.INERTIAL;
      view.update(JulianDate.now(), bs);
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.VELOCITY;
      view.update(JulianDate.now(), bs);
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.ENU;
      view.update(JulianDate.now(), bs);
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC, 1e-10);
    });

    it("jumps to updated bounding sphere", function () {
      const bs1 = new BoundingSphere(new Cartesian3(1, 2, 3), 4);
      scene.camera.viewBoundingSphere(bs1);
      const positionWC1 = scene.camera.positionWC.clone();

      const bs2 = new BoundingSphere(new Cartesian3(3, 4, 5), 4);
      scene.camera.viewBoundingSphere(bs2);
      const positionWC2 = scene.camera.positionWC.clone();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0),
      );
      const view = new EntityView(entity, scene, undefined);
      view.update(JulianDate.now(), bs1);
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC1, 1e-10);

      view.boundingSphere.center = bs2.center;
      view.update(JulianDate.now());
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC2, 1e-10);
    });

    it("jumps to new bounding sphere", function () {
      const bs1 = new BoundingSphere(new Cartesian3(1, 2, 3), 4);
      scene.camera.viewBoundingSphere(bs1);
      const positionWC1 = scene.camera.positionWC.clone();

      const bs2 = new BoundingSphere(new Cartesian3(3, 4, 5), 4);
      scene.camera.viewBoundingSphere(bs2);
      const positionWC2 = scene.camera.positionWC.clone();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0),
      );
      const view = new EntityView(entity, scene, undefined);
      view.update(JulianDate.now(), bs1);
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC1, 1e-10);

      view.boundingSphere = bs2;
      view.update(JulianDate.now());
      expect(scene.camera.positionWC).toEqualEpsilon(positionWC2, 1e-10);
    });

    it("uses entity viewFrom if available and boundingsphere is supplied", function () {
      const sampleOffset = new Cartesian3(1, 2, 3);
      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0.0, 0.0),
      );
      entity.viewFrom = sampleOffset;
      const view = new EntityView(
        entity,
        scene,
        undefined,
        new BoundingSphere(new Cartesian3(3, 4, 5), 6),
      );
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.INERTIAL;
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.VELOCITY;
      view.update(JulianDate.now());
      expect(view.scene.camera.position).toEqualEpsilon(sampleOffset, 1e-10);

      entity.trackingReferenceFrame = TrackingReferenceFrame.ENU;
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
  "WebGL",
);
