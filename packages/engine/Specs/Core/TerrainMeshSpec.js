import {
  TerrainMesh,
  Cartesian3,
  Rectangle,
  BoundingSphere,
  TerrainEncoding,
  Ray,
  SceneMode,
  GeographicProjection,
} from "../../index.js";

describe("Core/TerrainMeshSpec", function () {
  describe("picking transforms", function () {
    let ray;
    let projection;
    let mesh;

    beforeEach(function () {
      ray = new Ray(new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6));
      projection = new GeographicProjection();
      const center = new Cartesian3(0, 0, 0);

      mesh = new TerrainMesh(
        center,
        new Float32Array([0, 0, 0, 0, 0, 0]), // Vertices - one vertex: X,Y,Z,H,U,V
        new Uint16Array([0, 0, 0]), // Indices - one triangle
        0, // indexCountWithoutSkirts
        1, // vertexCountWithoutSkirts
        0, // minimumHeight
        0, // maximumHeight
        Rectangle.fromRadians(0, 0, 1, 1),
        new BoundingSphere(center, 1.0),
        new Cartesian3(0, 0, 0), // occludeePointInScaledSpace
        6, // stride
        undefined, // orientedBoundingBox
        new TerrainEncoding(center),
        [],
        [],
        [],
        [],
      );

      // Mock out the dependency on TerrainPicker
      spyOn(mesh._terrainPicker, "rayIntersect").and.returnValue(undefined);
    });

    it("uses the 3D transform when picking in 3D mode", function () {
      const expectedTransform = mesh.getTransform(
        SceneMode.SCENE3D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE3D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expectedTransform,
        false,
        SceneMode.SCENE3D,
        projection,
      );
    });

    it("uses the 2D transform when picking in 2D mode", function () {
      const expectedTransform = mesh.getTransform(
        SceneMode.SCENE2D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE2D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expectedTransform,
        false,
        SceneMode.SCENE2D,
        projection,
      );
    });

    it("recomputes the transform after scene mode changes", function () {
      const expected3DTransform = mesh.getTransform(
        SceneMode.SCENE3D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE3D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expected3DTransform,
        false,
        SceneMode.SCENE3D,
        projection,
      );

      mesh.updateSceneMode(SceneMode.SCENE2D);
      const expected2DTransform = mesh.getTransform(
        SceneMode.SCENE2D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE2D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expected2DTransform,
        false,
        SceneMode.SCENE2D,
        projection,
      );
    });

    it("recomputes the transform after exaggeration changes", function () {
      const expected3DTransform = mesh.getTransform(
        SceneMode.SCENE3D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE3D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expected3DTransform,
        false,
        SceneMode.SCENE3D,
        projection,
      );

      mesh.updateExaggeration(2.0, 1.0);
      const expected2DTransform = mesh.getTransform(
        SceneMode.SCENE2D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE2D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expected2DTransform,
        false,
        SceneMode.SCENE2D,
        projection,
      );
    });

    it("recomputes the transform after a pick in a different scene mode", function () {
      const expected3DTransform = mesh.getTransform(
        SceneMode.SCENE3D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE3D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expected3DTransform,
        false,
        SceneMode.SCENE3D,
        projection,
      );

      const expected2DTransform = mesh.getTransform(
        SceneMode.SCENE2D,
        projection,
      );
      mesh.pick(ray, false, SceneMode.SCENE2D, projection);

      expect(mesh._terrainPicker.rayIntersect).toHaveBeenCalledWith(
        ray,
        expected2DTransform,
        false,
        SceneMode.SCENE2D,
        projection,
      );
    });
  });
});
