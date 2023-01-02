import {
  AttributeCompression,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Color,
  Intersect,
  Matrix4,
  PixelFormat,
  Plane,
  PixelDatatype,
  TextureMinificationFilter,
  TextureWrap,
  ClippingPlane,
  ClippingPlaneCollection,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe("Scene/ClippingPlaneCollection", function () {
  let clippingPlanes;
  const planes = [
    new ClippingPlane(Cartesian3.UNIT_X, 1.0),
    new ClippingPlane(Cartesian3.UNIT_Y, 2.0),
  ];

  const transform = new Matrix4.fromTranslation(new Cartesian3(1.0, 3.0, 2.0));
  const boundingVolume = new BoundingSphere(Cartesian3.ZERO, 1.0);

  function decodeUint8Plane(pixel1, pixel2) {
    // expect pixel1 to be the normal
    const normal = AttributeCompression.octDecodeFromCartesian4(
      pixel1,
      new Cartesian3()
    );

    // expect pixel2 to be the distance
    const distance = Cartesian4.unpackFloat(pixel2);
    return new Plane(normal, distance);
  }

  it("default constructor", function () {
    clippingPlanes = new ClippingPlaneCollection();
    expect(clippingPlanes._planes).toEqual([]);
    expect(clippingPlanes.enabled).toEqual(true);
    expect(clippingPlanes.modelMatrix).toEqual(Matrix4.IDENTITY);
    expect(clippingPlanes.edgeColor).toEqual(Color.WHITE);
    expect(clippingPlanes.edgeWidth).toEqual(0.0);
    expect(clippingPlanes.unionClippingRegions).toEqual(false);
    expect(clippingPlanes._testIntersection).not.toBeUndefined();
  });

  it("gets the length of the list of planes in the collection", function () {
    clippingPlanes = new ClippingPlaneCollection();

    expect(clippingPlanes.length).toBe(0);

    clippingPlanes._planes = planes.slice();

    expect(clippingPlanes.length).toBe(2);

    clippingPlanes._planes.push(new ClippingPlane(Cartesian3.UNIT_Z, -1.0));

    expect(clippingPlanes.length).toBe(3);

    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
    });

    expect(clippingPlanes.length).toBe(2);
  });

  it("add adds a plane to the collection", function () {
    clippingPlanes = new ClippingPlaneCollection();
    clippingPlanes.add(planes[0]);

    expect(clippingPlanes.length).toBe(1);
    expect(clippingPlanes._planes[0]).toBe(planes[0]);
  });

  it("fires the planeAdded event when a plane is added", function () {
    clippingPlanes = new ClippingPlaneCollection();
    const spy = jasmine.createSpy();
    clippingPlanes.planeAdded.addEventListener(spy);
    clippingPlanes.add(planes[0]);
    expect(spy).toHaveBeenCalled();
  });

  it("gets the plane at an index", function () {
    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
    });

    let plane = clippingPlanes.get(0);
    expect(plane).toBe(planes[0]);

    plane = clippingPlanes.get(1);
    expect(plane).toBe(planes[1]);

    plane = clippingPlanes.get(2);
    expect(plane).toBeUndefined();
  });

  it("contain checks if the collection contains a plane", function () {
    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
    });

    expect(clippingPlanes.contains(planes[0])).toBe(true);
    expect(
      clippingPlanes.contains(new ClippingPlane(Cartesian3.UNIT_Y, 2.0))
    ).toBe(true);
    expect(
      clippingPlanes.contains(new ClippingPlane(Cartesian3.UNIT_Z, 3.0))
    ).toBe(false);
  });

  it("remove removes and the first occurrence of a plane", function () {
    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
    });

    expect(clippingPlanes.contains(planes[0])).toBe(true);

    let result = clippingPlanes.remove(planes[0]);

    expect(clippingPlanes.contains(planes[0])).toBe(false);
    expect(clippingPlanes.length).toBe(1);
    expect(clippingPlanes.get(0)).toEqual(planes[1]);
    expect(result).toBe(true);

    result = clippingPlanes.remove(planes[0]);
    expect(result).toBe(false);
  });

  it("remove fires planeRemoved event", function () {
    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
    });

    const spy = jasmine.createSpy();
    clippingPlanes.planeRemoved.addEventListener(spy);

    clippingPlanes.remove(planes[0]);
    expect(spy).toHaveBeenCalled();
  });

  it("removeAll removes all of the planes in the collection", function () {
    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
    });

    expect(clippingPlanes.length).toEqual(planes.length);

    clippingPlanes.removeAll();

    expect(clippingPlanes.length).toBe(0);
  });

  it("removeAll fires planeRemoved event", function () {
    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
    });

    const spy = jasmine.createSpy();
    clippingPlanes.planeRemoved.addEventListener(spy);

    clippingPlanes.removeAll();

    expect(spy).toHaveBeenCalled();
  });

  describe("uint8 texture mode", function () {
    beforeEach(function () {
      spyOn(ClippingPlaneCollection, "useFloatTexture").and.returnValue(false);
    });

    it("update creates a RGBA ubyte texture with no filtering or wrapping to house packed clipping planes", function () {
      const scene = createScene();
      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      clippingPlanes.update(scene.frameState);

      const packedTexture = clippingPlanes.texture;
      expect(packedTexture).toBeDefined();

      // Two RGBA uint8 clipping planes consume 4 pixels of texture, allocation to be double that
      expect(packedTexture.width).toEqual(4);
      expect(packedTexture.height).toEqual(2);

      expect(packedTexture.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(packedTexture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);

      const sampler = packedTexture.sampler;
      expect(sampler.wrapS).toEqual(TextureWrap.CLAMP_TO_EDGE);
      expect(sampler.wrapT).toEqual(TextureWrap.CLAMP_TO_EDGE);
      expect(sampler.minificationFilter).toEqual(
        TextureMinificationFilter.NEAREST
      );
      expect(sampler.magnificationFilter).toEqual(
        TextureMinificationFilter.NEAREST
      );

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });

    it("only creates texture when planes are added", function () {
      const scene = createScene();

      clippingPlanes = new ClippingPlaneCollection();
      clippingPlanes.update(scene.frameState);
      expect(clippingPlanes.texture).toBeUndefined();

      clippingPlanes.add(planes[0]);
      clippingPlanes.update(scene.frameState);

      expect(clippingPlanes.texture).toBeDefined();
      expect(isNaN(clippingPlanes.texture.width)).toBe(false);
      expect(isNaN(clippingPlanes.texture.height)).toBe(false);

      scene.destroyForSpecs();
    });

    it("update fills the clipping plane texture with packed planes", function () {
      const scene = createScene();

      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      let rgba;
      const gl = scene.frameState.context._gl;
      spyOn(gl, "texImage2D").and.callFake(function (
        target,
        level,
        xoffset,
        yoffset,
        width,
        height,
        format,
        type,
        arrayBufferView
      ) {
        rgba = arrayBufferView;
      });

      clippingPlanes.update(scene.frameState);
      expect(rgba).toBeDefined();
      expect(rgba.length).toEqual(32);

      // Expect two clipping planes to use 4 pixels in the texture, so the first 16 bytes
      for (let i = 16; i < rgba.length; i++) {
        expect(rgba[i]).toEqual(0);
      }
      const pixel1 = Cartesian4.fromArray(rgba, 0);
      const pixel2 = Cartesian4.fromArray(rgba, 4);
      const pixel3 = Cartesian4.fromArray(rgba, 8);
      const pixel4 = Cartesian4.fromArray(rgba, 12);

      const plane1 = decodeUint8Plane(pixel1, pixel2);
      const plane2 = decodeUint8Plane(pixel3, pixel4);

      expect(
        Cartesian3.equalsEpsilon(
          plane1.normal,
          planes[0].normal,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);
      expect(
        Cartesian3.equalsEpsilon(
          plane2.normal,
          planes[1].normal,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);
      expect(
        CesiumMath.equalsEpsilon(
          plane1.distance,
          planes[0].distance,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);
      expect(
        CesiumMath.equalsEpsilon(
          plane2.distance,
          planes[1].distance,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });

    it("reallocates textures when above capacity or below 1/4 capacity", function () {
      const scene = createScene();

      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      clippingPlanes.update(scene.frameState);

      let packedTexture = clippingPlanes.texture;

      // Two RGBA uint8 clipping planes consume 4 pixels of texture, allocation to be double that
      expect(packedTexture.width).toEqual(4);
      expect(packedTexture.height).toEqual(2);

      // Reach capacity
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(false);

      // Exceed capacity
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(true);
      packedTexture = clippingPlanes.texture;

      // Five RGBA uint8 clipping planes consume 10 pixels of texture, allocation to be double that
      expect(packedTexture.width).toEqual(10);
      expect(packedTexture.height).toEqual(2);

      clippingPlanes.removeAll();
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));

      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(true);
      packedTexture = clippingPlanes.texture;

      // One RGBA uint8 clipping plane consume 2 pixels of texture, allocation to be double that
      expect(packedTexture.width).toEqual(2);
      expect(packedTexture.height).toEqual(2);

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });

    it("performs partial updates when only a single plane has changed and full texture updates otherwise", function () {
      const scene = createScene();
      const gl = scene.frameState.context._gl;
      let copyWidth;
      let copyHeight;
      spyOn(gl, "texSubImage2D").and.callFake(function (
        target,
        level,
        xoffset,
        yoffset,
        width,
        height,
        format,
        type,
        arrayBufferView
      ) {
        copyWidth = width;
        copyHeight = height;
      });

      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      clippingPlanes.update(scene.frameState);

      // Two RGBA uint8 clipping planes consume 4 pixels of texture, allocation to be double that
      const packedTexture = clippingPlanes.texture;
      expect(packedTexture.width).toEqual(4);
      expect(packedTexture.height).toEqual(2);

      const targetPlane = new ClippingPlane(Cartesian3.UNIT_X, 1.0);
      clippingPlanes.add(targetPlane);
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.update(scene.frameState);

      // Haven't hit limit yet
      expect(packedTexture.isDestroyed()).toBe(false);

      // Addition of two planes, expect a full texture update
      expect(gl.texSubImage2D.calls.count()).toEqual(1);
      expect(copyWidth).toEqual(packedTexture.width);
      expect(copyHeight).toEqual(packedTexture.height);

      // Move target plane for partial update
      targetPlane.distance += 1.0;
      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(false);
      expect(gl.texSubImage2D.calls.count()).toEqual(2);
      expect(copyWidth).toEqual(2);
      expect(copyHeight).toEqual(1);

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });
  });

  describe("float texture mode", function () {
    it("update creates a float texture with no filtering or wrapping to house packed clipping planes", function () {
      const scene = createScene();

      if (!ClippingPlaneCollection.useFloatTexture(scene.context)) {
        // Don't fail just because float textures aren't supported
        scene.destroyForSpecs();
        return;
      }

      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      clippingPlanes.update(scene.frameState);

      const packedTexture = clippingPlanes.texture;
      expect(packedTexture).toBeDefined();
      expect(packedTexture.width).toEqual(2);
      expect(packedTexture.height).toEqual(2);
      expect(packedTexture.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(packedTexture.pixelDatatype).toEqual(PixelDatatype.FLOAT);

      const sampler = packedTexture.sampler;
      expect(sampler.wrapS).toEqual(TextureWrap.CLAMP_TO_EDGE);
      expect(sampler.wrapT).toEqual(TextureWrap.CLAMP_TO_EDGE);
      expect(sampler.minificationFilter).toEqual(
        TextureMinificationFilter.NEAREST
      );
      expect(sampler.magnificationFilter).toEqual(
        TextureMinificationFilter.NEAREST
      );

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });

    it("only creates texture when planes are added", function () {
      const scene = createScene();

      if (!ClippingPlaneCollection.useFloatTexture(scene.context)) {
        // Don't fail just because float textures aren't supported
        scene.destroyForSpecs();
        return;
      }

      clippingPlanes = new ClippingPlaneCollection();
      clippingPlanes.update(scene.frameState);
      expect(clippingPlanes.texture).toBeUndefined();

      clippingPlanes.add(planes[0]);
      clippingPlanes.update(scene.frameState);

      expect(clippingPlanes.texture).toBeDefined();
      expect(isNaN(clippingPlanes.texture.width)).toBe(false);
      expect(isNaN(clippingPlanes.texture.height)).toBe(false);

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });

    it("update fills the clipping plane texture with packed planes", function () {
      const scene = createScene();

      if (!ClippingPlaneCollection.useFloatTexture(scene.context)) {
        // Don't fail just because float textures aren't supported
        scene.destroyForSpecs();
        return;
      }

      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      let rgba;
      const gl = scene.frameState.context._gl;
      spyOn(gl, "texImage2D").and.callFake(function (
        target,
        level,
        xoffset,
        yoffset,
        width,
        height,
        format,
        type,
        arrayBufferView
      ) {
        rgba = arrayBufferView;
      });

      clippingPlanes.update(scene.frameState);
      expect(rgba).toBeDefined();
      expect(rgba.length).toEqual(16);

      // Expect two clipping planes to use 2 pixels in the texture, so the first 8 floats.
      for (let i = 8; i < rgba.length; i++) {
        expect(rgba[i]).toEqual(0);
      }
      const plane1 = Plane.fromCartesian4(Cartesian4.fromArray(rgba, 0));
      const plane2 = Plane.fromCartesian4(Cartesian4.fromArray(rgba, 4));

      expect(
        Cartesian3.equalsEpsilon(
          plane1.normal,
          planes[0].normal,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);
      expect(
        Cartesian3.equalsEpsilon(
          plane2.normal,
          planes[1].normal,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);
      expect(
        CesiumMath.equalsEpsilon(
          plane1.distance,
          planes[0].distance,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);
      expect(
        CesiumMath.equalsEpsilon(
          plane2.distance,
          planes[1].distance,
          CesiumMath.EPSILON3
        )
      ).toEqual(true);

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });

    it("reallocates textures when above capacity or below 1/4 capacity", function () {
      const scene = createScene();

      if (!ClippingPlaneCollection.useFloatTexture(scene.context)) {
        // Don't fail just because float textures aren't supported
        scene.destroyForSpecs();
        return;
      }

      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      clippingPlanes.update(scene.frameState);

      let packedTexture = clippingPlanes.texture;

      // Two RGBA float clipping planes consume 2 pixels of texture, allocation to be double that
      expect(packedTexture.width).toEqual(2);
      expect(packedTexture.height).toEqual(2);

      // Reach capacity
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(false);

      // Exceed capacity
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(true);
      packedTexture = clippingPlanes.texture;

      // Five RGBA float clipping planes consume 5 pixels of texture, allocation to be double that
      expect(packedTexture.width).toEqual(5);
      expect(packedTexture.height).toEqual(2);

      clippingPlanes.removeAll();
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));

      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(true);
      packedTexture = clippingPlanes.texture;

      // One RGBA float clipping plane consume 1 pixels of texture, allocation to be double that
      expect(packedTexture.width).toEqual(1);
      expect(packedTexture.height).toEqual(2);

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });

    it("performs partial updates when only a single plane has changed and full texture updates otherwise", function () {
      const scene = createScene();

      if (!ClippingPlaneCollection.useFloatTexture(scene.context)) {
        // Don't fail just because float textures aren't supported
        scene.destroyForSpecs();
        return;
      }

      const gl = scene.frameState.context._gl;
      let copyWidth;
      let copyHeight;
      spyOn(gl, "texSubImage2D").and.callFake(function (
        target,
        level,
        xoffset,
        yoffset,
        width,
        height,
        format,
        type,
        arrayBufferView
      ) {
        copyWidth = width;
        copyHeight = height;
      });

      clippingPlanes = new ClippingPlaneCollection({
        planes: planes,
        enabled: false,
        edgeColor: Color.RED,
        modelMatrix: transform,
      });

      clippingPlanes.update(scene.frameState);

      // Two RGBA Float clipping planes consume 2 pixels of texture, allocation to be double that
      const packedTexture = clippingPlanes.texture;
      expect(packedTexture.width).toEqual(2);
      expect(packedTexture.height).toEqual(2);

      const targetPlane = new ClippingPlane(Cartesian3.UNIT_X, 1.0);
      clippingPlanes.add(targetPlane);
      clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 1.0));
      clippingPlanes.update(scene.frameState);

      // Haven't hit limit yet
      expect(packedTexture.isDestroyed()).toBe(false);

      // Addition of two planes, expect a full texture update
      expect(gl.texSubImage2D.calls.count()).toEqual(1);
      expect(copyWidth).toEqual(packedTexture.width);
      expect(copyHeight).toEqual(packedTexture.height);

      // Move target plane for partial update
      targetPlane.distance += 1.0;
      clippingPlanes.update(scene.frameState);

      expect(packedTexture.isDestroyed()).toBe(false);
      expect(gl.texSubImage2D.calls.count()).toEqual(2);
      expect(copyWidth).toEqual(1);
      expect(copyHeight).toEqual(1);

      clippingPlanes.destroy();
      scene.destroyForSpecs();
    });
  });

  it("does not perform texture updates if the planes are unchanged", function () {
    const scene = createScene();

    const gl = scene.frameState.context._gl;
    spyOn(gl, "texImage2D").and.callThrough();

    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
      enabled: false,
      edgeColor: Color.RED,
      modelMatrix: transform,
    });
    expect(gl.texImage2D.calls.count()).toEqual(0);

    clippingPlanes.update(scene.frameState);
    expect(gl.texImage2D.calls.count()).toEqual(2);

    clippingPlanes.update(scene.frameState);
    expect(gl.texImage2D.calls.count()).toEqual(2);

    clippingPlanes.destroy();
    scene.destroyForSpecs();
  });

  it("provides a function for attaching the ClippingPlaneCollection to objects", function () {
    const clippedObject1 = {
      clippingPlanes: undefined,
    };
    const clippedObject2 = {
      clippingPlanes: undefined,
    };

    const clippingPlanes1 = new ClippingPlaneCollection({
      planes: planes,
      enabled: false,
      edgeColor: Color.RED,
      modelMatrix: transform,
    });

    ClippingPlaneCollection.setOwner(
      clippingPlanes1,
      clippedObject1,
      "clippingPlanes"
    );
    expect(clippedObject1.clippingPlanes).toBe(clippingPlanes1);
    expect(clippingPlanes1._owner).toBe(clippedObject1);

    const clippingPlanes2 = new ClippingPlaneCollection({
      planes: planes,
      enabled: false,
      edgeColor: Color.RED,
      modelMatrix: transform,
    });

    // Expect detached clipping planes to be destroyed
    ClippingPlaneCollection.setOwner(
      clippingPlanes2,
      clippedObject1,
      "clippingPlanes"
    );
    expect(clippingPlanes1.isDestroyed()).toBe(true);

    // Expect setting the same ClippingPlaneCollection again to not destroy the ClippingPlaneCollection
    ClippingPlaneCollection.setOwner(
      clippingPlanes2,
      clippedObject1,
      "clippingPlanes"
    );
    expect(clippingPlanes2.isDestroyed()).toBe(false);

    // Expect failure when attaching one ClippingPlaneCollection to two objects
    expect(function () {
      ClippingPlaneCollection.setOwner(
        clippingPlanes2,
        clippedObject2,
        "clippingPlanes"
      );
    }).toThrowDeveloperError();
  });

  it("setting unionClippingRegions updates testIntersection function", function () {
    clippingPlanes = new ClippingPlaneCollection();
    const originalIntersectFunction = clippingPlanes._testIntersection;

    expect(clippingPlanes._testIntersection).not.toBeUndefined();

    clippingPlanes.unionClippingRegions = true;

    expect(clippingPlanes._testIntersection).not.toBe(
      originalIntersectFunction
    );
  });

  it("computes intersections with bounding volumes when clipping regions are combined with an intersect operation", function () {
    clippingPlanes = new ClippingPlaneCollection();

    let intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INSIDE);

    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, -2.0));
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.OUTSIDE);

    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_Y, 0.0));
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INTERSECTING);

    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_Z, 1.0));
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INSIDE);

    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_Z, 0.0));
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INSIDE);
  });

  it("computes intersections with bounding volumes when clipping planes are combined with a union operation", function () {
    clippingPlanes = new ClippingPlaneCollection({
      unionClippingRegions: true,
    });

    let intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INSIDE);

    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_Z, 1.0));
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INSIDE);

    const temp = new ClippingPlane(Cartesian3.UNIT_Y, -2.0);
    clippingPlanes.add(temp);
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.OUTSIDE);

    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, 0.0));
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.OUTSIDE);

    clippingPlanes.remove(temp);
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INTERSECTING);
  });

  it("compute intersections applies optional transform to planes", function () {
    clippingPlanes = new ClippingPlaneCollection();

    let intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume,
      transform
    );
    expect(intersect).toEqual(Intersect.INSIDE);

    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, -1.0));
    intersect = clippingPlanes.computeIntersectionWithBoundingVolume(
      boundingVolume,
      transform
    );
    expect(intersect).not.toEqual(Intersect.INSIDE);
  });

  it("computes a description of the current shader for comparison", function () {
    clippingPlanes = new ClippingPlaneCollection();
    clippingPlanes.add(new ClippingPlane(Cartesian3.UNIT_X, -1.0));

    expect(clippingPlanes.clippingPlanesState).toEqual(-1);

    const holdThisPlane = new ClippingPlane(Cartesian3.UNIT_X, -1.0);
    clippingPlanes.add(holdThisPlane);
    expect(clippingPlanes.clippingPlanesState).toEqual(-2);

    clippingPlanes.unionClippingRegions = true;
    expect(clippingPlanes.clippingPlanesState).toEqual(2);

    clippingPlanes.remove(holdThisPlane);
    expect(clippingPlanes.clippingPlanesState).toEqual(1);
  });

  it("provides a function for checking the texture resolution", function () {
    spyOn(ClippingPlaneCollection, "useFloatTexture").and.returnValue(false);

    const scene = createScene();
    clippingPlanes = new ClippingPlaneCollection({
      planes: planes,
      enabled: false,
      edgeColor: Color.RED,
      modelMatrix: transform,
    });

    // Predicted resolution before texture has been allocated
    const predictedResolution = ClippingPlaneCollection.getTextureResolution(
      clippingPlanes,
      scene.frameState.context,
      new Cartesian2()
    );

    expect(predictedResolution.x).toEqual(4);
    expect(predictedResolution.y).toEqual(2);

    clippingPlanes.update(scene.frameState);
    const actualResolution = ClippingPlaneCollection.getTextureResolution(
      clippingPlanes,
      scene.frameState.context,
      new Cartesian2()
    );

    expect(predictedResolution.x).toEqual(actualResolution.x);
    expect(predictedResolution.y).toEqual(actualResolution.y);

    clippingPlanes.destroy();
    scene.destroyForSpecs();
  });
});
