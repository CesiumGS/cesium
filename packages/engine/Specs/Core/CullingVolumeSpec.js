import {
  AxisAlignedBoundingBox,
  BoundingSphere,
  Cartesian3,
  CullingVolume,
  Intersect,
  PerspectiveFrustum,
} from "../../index.js";

describe("Core/CullingVolume", function () {
  let cullingVolume;

  beforeEach(function () {
    const frustum = new PerspectiveFrustum();
    frustum.near = 1.0;
    frustum.far = 2.0;
    frustum.fov = Math.PI / 3;
    frustum.aspectRatio = 1.0;
    cullingVolume = frustum.computeCullingVolume(
      new Cartesian3(),
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      Cartesian3.UNIT_Y
    );
  });

  it("computeVisibility throws without a bounding volume", function () {
    expect(function () {
      return new CullingVolume().computeVisibility();
    }).toThrowDeveloperError();
  });

  it("computeVisibilityWithPlaneMask throws without a bounding volume", function () {
    expect(function () {
      return new CullingVolume().computeVisibilityWithPlaneMask(
        undefined,
        CullingVolume.MASK_INDETERMINATE
      );
    }).toThrowDeveloperError();
  });

  it("computeVisibilityWithPlaneMask throws without a parent plane mask", function () {
    expect(function () {
      return new CullingVolume().computeVisibilityWithPlaneMask(
        new BoundingSphere(),
        undefined
      );
    }).toThrowDeveloperError();
  });

  function testWithAndWithoutPlaneMask(culling, bound, intersect) {
    expect(culling.computeVisibility(bound)).toEqual(intersect);

    const mask = culling.computeVisibilityWithPlaneMask(
      bound,
      CullingVolume.MASK_INDETERMINATE
    );
    if (intersect === Intersect.INSIDE) {
      expect(mask).toEqual(CullingVolume.MASK_INSIDE);
    } else if (intersect === Intersect.OUTSIDE) {
      expect(mask).toEqual(CullingVolume.MASK_OUTSIDE);
    } else {
      expect(mask).not.toEqual(CullingVolume.MASK_INSIDE);
      expect(mask).not.toEqual(CullingVolume.MASK_OUTSIDE);
    }
    expect(culling.computeVisibilityWithPlaneMask(bound, mask)).toEqual(mask);
  }

  describe("box intersections", function () {
    it("can contain an axis aligned bounding box", function () {
      const box1 = AxisAlignedBoundingBox.fromPoints([
        new Cartesian3(-0.5, 0, -1.25),
        new Cartesian3(0.5, 0, -1.25),
        new Cartesian3(-0.5, 0, -1.75),
        new Cartesian3(0.5, 0, -1.75),
      ]);
      testWithAndWithoutPlaneMask(cullingVolume, box1, Intersect.INSIDE);
    });

    describe("can partially contain an axis aligned bounding box", function () {
      it("on the far plane", function () {
        const box2 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, 0, -1.5),
          new Cartesian3(0.5, 0, -1.5),
          new Cartesian3(-0.5, 0, -2.5),
          new Cartesian3(0.5, 0, -2.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          box2,
          Intersect.INTERSECTING
        );
      });

      it("on the near plane", function () {
        const box3 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, 0, -0.5),
          new Cartesian3(0.5, 0, -0.5),
          new Cartesian3(-0.5, 0, -1.5),
          new Cartesian3(0.5, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          box3,
          Intersect.INTERSECTING
        );
      });

      it("on the left plane", function () {
        const box4 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-1.5, 0, -1.25),
          new Cartesian3(0, 0, -1.25),
          new Cartesian3(-1.5, 0, -1.5),
          new Cartesian3(0, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          box4,
          Intersect.INTERSECTING
        );
      });

      it("on the right plane", function () {
        const box5 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(0, 0, -1.25),
          new Cartesian3(1.5, 0, -1.25),
          new Cartesian3(0, 0, -1.5),
          new Cartesian3(1.5, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          box5,
          Intersect.INTERSECTING
        );
      });

      it("on the top plane", function () {
        const box6 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, 0, -1.25),
          new Cartesian3(0.5, 0, -1.25),
          new Cartesian3(-0.5, 2.0, -1.75),
          new Cartesian3(0.5, 2.0, -1.75),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          box6,
          Intersect.INTERSECTING
        );
      });

      it("on the bottom plane", function () {
        const box7 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, -2.0, -1.25),
          new Cartesian3(0.5, 0, -1.25),
          new Cartesian3(-0.5, -2.0, -1.5),
          new Cartesian3(0.5, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          box7,
          Intersect.INTERSECTING
        );
      });
    });

    describe("can not contain an axis aligned bounding box", function () {
      it("past the far plane", function () {
        const box8 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, 0, -2.25),
          new Cartesian3(0.5, 0, -2.25),
          new Cartesian3(-0.5, 0, -2.75),
          new Cartesian3(0.5, 0, -2.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, box8, Intersect.OUTSIDE);
      });

      it("before the near plane", function () {
        const box9 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, 0, -0.25),
          new Cartesian3(0.5, 0, -0.25),
          new Cartesian3(-0.5, 0, -0.75),
          new Cartesian3(0.5, 0, -0.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, box9, Intersect.OUTSIDE);
      });

      it("past the left plane", function () {
        const box10 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-5, 0, -1.25),
          new Cartesian3(-3, 0, -1.25),
          new Cartesian3(-5, 0, -1.75),
          new Cartesian3(-3, 0, -1.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, box10, Intersect.OUTSIDE);
      });

      it("past the right plane", function () {
        const box11 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(3, 0, -1.25),
          new Cartesian3(5, 0, -1.25),
          new Cartesian3(3, 0, -1.75),
          new Cartesian3(5, 0, -1.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, box11, Intersect.OUTSIDE);
      });

      it("past the top plane", function () {
        const box12 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, 3, -1.25),
          new Cartesian3(0.5, 3, -1.25),
          new Cartesian3(-0.5, 5, -1.75),
          new Cartesian3(0.5, 5, -1.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, box12, Intersect.OUTSIDE);
      });

      it("past the bottom plane", function () {
        const box13 = AxisAlignedBoundingBox.fromPoints([
          new Cartesian3(-0.5, -3, -1.25),
          new Cartesian3(0.5, -3, -1.25),
          new Cartesian3(-0.5, -5, -1.75),
          new Cartesian3(0.5, -5, -1.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, box13, Intersect.OUTSIDE);
      });
    });
  });

  describe("sphere intersection", function () {
    it("can contain a sphere", function () {
      const sphere1 = BoundingSphere.fromPoints([
        new Cartesian3(0, 0, -1.25),
        new Cartesian3(0, 0, -1.75),
      ]);
      testWithAndWithoutPlaneMask(cullingVolume, sphere1, Intersect.INSIDE);
    });

    describe("can partially contain a sphere", function () {
      it("on the far plane", function () {
        const sphere2 = BoundingSphere.fromPoints([
          new Cartesian3(0, 0, -1.5),
          new Cartesian3(0, 0, -2.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere2,
          Intersect.INTERSECTING
        );
      });

      it("on the near plane", function () {
        const sphere3 = BoundingSphere.fromPoints([
          new Cartesian3(0, 0, -0.5),
          new Cartesian3(0, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere3,
          Intersect.INTERSECTING
        );
      });

      it("on the left plane", function () {
        const sphere4 = BoundingSphere.fromPoints([
          new Cartesian3(-1.0, 0, -1.5),
          new Cartesian3(0, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere4,
          Intersect.INTERSECTING
        );
      });

      it("on the right plane", function () {
        const sphere5 = BoundingSphere.fromPoints([
          new Cartesian3(0, 0, -1.5),
          new Cartesian3(1.0, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere5,
          Intersect.INTERSECTING
        );
      });

      it("on the top plane", function () {
        const sphere6 = BoundingSphere.fromPoints([
          new Cartesian3(0, 0, -1.5),
          new Cartesian3(0, 2.0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere6,
          Intersect.INTERSECTING
        );
      });

      it("on the bottom plane", function () {
        const sphere7 = BoundingSphere.fromPoints([
          new Cartesian3(0, -2.0, -1.5),
          new Cartesian3(0, 0, -1.5),
        ]);
        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere7,
          Intersect.INTERSECTING
        );
      });
    });

    describe("can not contain a sphere", function () {
      it("past the far plane", function () {
        const sphere8 = BoundingSphere.fromPoints([
          new Cartesian3(0, 0, -2.25),
          new Cartesian3(0, 0, -2.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, sphere8, Intersect.OUTSIDE);
      });

      it("before the near plane", function () {
        const sphere9 = BoundingSphere.fromPoints([
          new Cartesian3(0, 0, -0.25),
          new Cartesian3(0, 0, -0.5),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, sphere9, Intersect.OUTSIDE);
      });

      it("past the left plane", function () {
        const sphere10 = BoundingSphere.fromPoints([
          new Cartesian3(-5, 0, -1.25),
          new Cartesian3(-4.5, 0, -1.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, sphere10, Intersect.OUTSIDE);
      });

      it("past the right plane", function () {
        const sphere11 = BoundingSphere.fromPoints([
          new Cartesian3(4.5, 0, -1.25),
          new Cartesian3(5, 0, -1.75),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, sphere11, Intersect.OUTSIDE);
      });

      it("past the top plane", function () {
        const sphere12 = BoundingSphere.fromPoints([
          new Cartesian3(-0.5, 4.5, -1.25),
          new Cartesian3(-0.5, 5, -1.25),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, sphere12, Intersect.OUTSIDE);
      });

      it("past the bottom plane", function () {
        const sphere13 = BoundingSphere.fromPoints([
          new Cartesian3(-0.5, -4.5, -1.25),
          new Cartesian3(-0.5, -5, -1.25),
        ]);
        testWithAndWithoutPlaneMask(cullingVolume, sphere13, Intersect.OUTSIDE);
      });
    });
  });

  describe("construct from bounding sphere", function () {
    const boundingSphereCullingVolume = new BoundingSphere(
      new Cartesian3(1000.0, 2000.0, 3000.0),
      100.0
    );
    const cullingVolume = CullingVolume.fromBoundingSphere(
      boundingSphereCullingVolume
    );

    it("throws without a boundingSphere", function () {
      expect(function () {
        CullingVolume.fromBoundingSphere(undefined);
      }).toThrowDeveloperError();
    });

    it("can contain a volume", function () {
      const sphere1 = BoundingSphere.clone(boundingSphereCullingVolume);
      sphere1.radius *= 0.5;
      testWithAndWithoutPlaneMask(cullingVolume, sphere1, Intersect.INSIDE);
    });

    describe("can partially contain a volume", function () {
      it("on the far plane", function () {
        const offset = new Cartesian3(
          0.0,
          0.0,
          boundingSphereCullingVolume.radius * 1.5
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere2 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere2,
          Intersect.INTERSECTING
        );
      });

      it("on the near plane", function () {
        const offset = new Cartesian3(
          0.0,
          0.0,
          -boundingSphereCullingVolume.radius * 1.5
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere3 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere3,
          Intersect.INTERSECTING
        );
      });

      it("on the left plane", function () {
        const offset = new Cartesian3(
          -boundingSphereCullingVolume.radius * 1.5,
          0.0,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere4 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere4,
          Intersect.INTERSECTING
        );
      });

      it("on the right plane", function () {
        const offset = new Cartesian3(
          boundingSphereCullingVolume.radius * 1.5,
          0.0,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere5 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere5,
          Intersect.INTERSECTING
        );
      });

      it("on the top plane", function () {
        const offset = new Cartesian3(
          0.0,
          boundingSphereCullingVolume.radius * 1.5,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere6 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere6,
          Intersect.INTERSECTING
        );
      });

      it("on the bottom plane", function () {
        const offset = new Cartesian3(
          0.0,
          -boundingSphereCullingVolume.radius * 1.5,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere7 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(
          cullingVolume,
          sphere7,
          Intersect.INTERSECTING
        );
      });
    });

    describe("can not contain a volume", function () {
      it("past the far plane", function () {
        const offset = new Cartesian3(
          0.0,
          0.0,
          boundingSphereCullingVolume.radius * 2.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere8 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(cullingVolume, sphere8, Intersect.OUTSIDE);
      });

      it("before the near plane", function () {
        const offset = new Cartesian3(
          0.0,
          0.0,
          -boundingSphereCullingVolume.radius * 2.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere9 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(cullingVolume, sphere9, Intersect.OUTSIDE);
      });

      it("past the left plane", function () {
        const offset = new Cartesian3(
          -boundingSphereCullingVolume.radius * 2.0,
          0.0,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere10 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(cullingVolume, sphere10, Intersect.OUTSIDE);
      });

      it("past the right plane", function () {
        const offset = new Cartesian3(
          boundingSphereCullingVolume.radius * 2.0,
          0.0,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere11 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(cullingVolume, sphere11, Intersect.OUTSIDE);
      });

      it("past the top plane", function () {
        const offset = new Cartesian3(
          0.0,
          boundingSphereCullingVolume.radius * 2.0,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere12 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(cullingVolume, sphere12, Intersect.OUTSIDE);
      });

      it("past the bottom plane", function () {
        const offset = new Cartesian3(
          0.0,
          -boundingSphereCullingVolume.radius * 2.0,
          0.0
        );
        const center = Cartesian3.add(
          boundingSphereCullingVolume.center,
          offset,
          new Cartesian3()
        );
        const radius = boundingSphereCullingVolume.radius * 0.5;
        const sphere13 = new BoundingSphere(center, radius);

        testWithAndWithoutPlaneMask(cullingVolume, sphere13, Intersect.OUTSIDE);
      });
    });
  });
});
