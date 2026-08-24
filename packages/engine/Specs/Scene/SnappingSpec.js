import {
  Cartesian2,
  Cartesian3,
  EdgeDisplayMode,
  Ray,
  Snapping,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import createCanvas from "../../../../Specs/createCanvas.js";
import loadAndZoomToModelAsync from "./Model/loadAndZoomToModelAsync.js";

describe("Scene/Snapping", function () {
  const selectBestHit = Snapping._selectBestHit;
  const snapHitToWorld = Snapping._snapHitToWorld;

  function surfaceHit(x, y, depth, object) {
    return { object: object ?? {}, isEdge: false, depth: depth, x: x, y: y };
  }

  function edgeHit(x, y, depth, object) {
    return { object: object ?? {}, isEdge: true, depth: depth, x: x, y: y };
  }

  describe("selectBestHit", function () {
    it("returns a lone surface hit", function () {
      const hit = surfaceHit(1.0, 2.0, 10.0);
      expect(selectBestHit([hit])).toBe(hit);
    });

    it("prefers an edge over a closer surface at the same depth", function () {
      const surface = surfaceHit(0.0, 0.0, 10.0);
      const edge = edgeHit(4.0, 0.0, 10.0);
      expect(selectBestHit([surface, edge])).toBe(edge);
    });

    it("selects the edge closest to the cursor", function () {
      const nearEdge = edgeHit(1.0, 1.0, 10.0);
      const farEdge = edgeHit(5.0, 0.0, 10.0);
      expect(selectBestHit([farEdge, nearEdge])).toBe(nearEdge);
    });

    it("selects the surface closest to the cursor when there are no edges", function () {
      const nearSurface = surfaceHit(0.0, 1.0, 10.0);
      const farSurface = surfaceHit(3.0, 3.0, 5.0);
      expect(selectBestHit([farSurface, nearSurface])).toBe(nearSurface);
    });

    it("does not snap through a surface under the cursor to a much deeper edge", function () {
      // Regression test: a far edge poking through a gap in a nearer
      // silhouette sits at the crosshair; the nearer surface must win.
      const nearSurface = surfaceHit(0.0, 0.0, 13.7);
      const farEdge = edgeHit(0.0, 0.0, 655.0);
      expect(selectBestHit([nearSurface, farEdge])).toBe(nearSurface);
    });

    it("keeps an edge that lies on the occluding surface", function () {
      const surface = surfaceHit(0.0, 0.0, 10.0);
      const edge = edgeHit(2.0, 0.0, 10.5);
      expect(selectBestHit([surface, edge])).toBe(edge);
    });

    it("keeps an edge at exactly the occluder depth", function () {
      const surface = surfaceHit(0.0, 0.0, 10.0);
      const edge = edgeHit(3.0, 0.0, 10.0);
      expect(selectBestHit([surface, edge])).toBe(edge);
    });

    it("allows snapping to a deep edge when the nearer surface is outside the occluder radius", function () {
      // A nearer object off to the side of the aperture must not gate out
      // the behind edge the user is aiming at.
      const offToTheSideSurface = surfaceHit(10.0, 0.0, 5.0);
      const behindEdge = edgeHit(0.0, 0.0, 100.0);
      expect(selectBestHit([offToTheSideSurface, behindEdge])).toBe(behindEdge);
    });

    it("falls back to the closest surface when all edges are occluded", function () {
      const nearSurface = surfaceHit(1.0, 0.0, 10.0);
      const otherSurface = surfaceHit(2.0, 2.0, 12.0);
      const occludedEdge = edgeHit(0.0, 0.0, 500.0);
      expect(selectBestHit([occludedEdge, otherSurface, nearSurface])).toBe(
        nearSurface,
      );
    });

    it("selects the closest edge when there are no surfaces", function () {
      // EDGES_ONLY display mode: no surface occluder, gate is a no-op.
      const nearEdge = edgeHit(1.0, 0.0, 400.0);
      const deepEdge = edgeHit(0.0, 2.0, 800.0);
      expect(selectBestHit([deepEdge, nearEdge])).toBe(nearEdge);
    });
  });

  describe("snapHitToWorld", function () {
    function createFakeScene(rayOrigin, rayDirection, cameraDirection) {
      return {
        camera: {
          directionWC: cameraDirection,
          getPickRay: function (coords, result) {
            if (!rayDirection) {
              return undefined;
            }
            result = result ?? new Ray();
            Cartesian3.clone(rayOrigin, result.origin);
            Cartesian3.clone(rayDirection, result.direction);
            return result;
          },
        },
      };
    }

    it("unprojects eye-space depth along an axis-aligned ray", function () {
      const scene = createFakeScene(
        Cartesian3.ZERO,
        new Cartesian3(0.0, 0.0, -1.0),
        new Cartesian3(0.0, 0.0, -1.0),
      );
      const hit = edgeHit(0.0, 0.0, 100.0);
      const position = snapHitToWorld(scene, new Cartesian2(0.0, 0.0), hit);
      expect(position).toEqualEpsilon(new Cartesian3(0.0, 0.0, -100.0), 1e-10);
    });

    it("converts perpendicular depth to distance along an off-axis ray", function () {
      // Ray at 60 degrees from the view direction: cos = 0.5, so the
      // along-ray distance is depth / 0.5 = 2 * depth.
      const cos = 0.5;
      const sin = Math.sqrt(1.0 - cos * cos);
      const rayDirection = new Cartesian3(sin, 0.0, -cos);
      const scene = createFakeScene(
        Cartesian3.ZERO,
        rayDirection,
        new Cartesian3(0.0, 0.0, -1.0),
      );
      const hit = edgeHit(0.0, 0.0, 100.0);
      const position = snapHitToWorld(scene, new Cartesian2(0.0, 0.0), hit);
      const expected = Cartesian3.multiplyByScalar(
        rayDirection,
        200.0,
        new Cartesian3(),
      );
      expect(position).toEqualEpsilon(expected, 1e-10);
    });

    it("offsets the pick ray by the hit's pixel offset", function () {
      const scene = createFakeScene(
        Cartesian3.ZERO,
        new Cartesian3(0.0, 0.0, -1.0),
        new Cartesian3(0.0, 0.0, -1.0),
      );
      spyOn(scene.camera, "getPickRay").and.callThrough();
      const hit = edgeHit(3.0, -2.0, 50.0);
      snapHitToWorld(scene, new Cartesian2(100.0, 200.0), hit);
      const coords = scene.camera.getPickRay.calls.argsFor(0)[0];
      expect(coords.x).toEqual(103.0);
      expect(coords.y).toEqual(198.0);
    });

    it("returns undefined when the pick ray is undefined", function () {
      const scene = createFakeScene(
        Cartesian3.ZERO,
        undefined,
        new Cartesian3(0.0, 0.0, -1.0),
      );
      const hit = edgeHit(0.0, 0.0, 100.0);
      expect(
        snapHitToWorld(scene, new Cartesian2(0.0, 0.0), hit),
      ).toBeUndefined();
    });

    it("returns undefined when the ray points away from the view direction", function () {
      const scene = createFakeScene(
        Cartesian3.ZERO,
        new Cartesian3(0.0, 0.0, 1.0),
        new Cartesian3(0.0, 0.0, -1.0),
      );
      const hit = edgeHit(0.0, 0.0, 100.0);
      expect(
        snapHitToWorld(scene, new Cartesian2(0.0, 0.0), hit),
      ).toBeUndefined();
    });
  });

  describe("snap", function () {
    it("throws without windowPosition", function () {
      const fakeScene = {
        context: { colorBufferFloat: true },
        defaultView: {},
      };
      expect(function () {
        Snapping.snap(fakeScene, undefined);
      }).toThrowDeveloperError();
    });

    it("returns undefined when float color attachments are unsupported", function () {
      const fakeScene = {
        context: { colorBufferFloat: false },
        defaultView: {},
      };
      expect(
        Snapping.snap(fakeScene, new Cartesian2(0.0, 0.0)),
      ).toBeUndefined();
      // The snap framebuffer must not be created when snapping is unsupported.
      expect(fakeScene.defaultView.snapFramebuffer).toBeUndefined();
    });

    it("returns undefined for an empty scene", function () {
      const scene = createScene();
      try {
        scene.renderForSpecs();
        const windowPosition = new Cartesian2(
          scene.drawingBufferWidth / 2,
          scene.drawingBufferHeight / 2,
        );
        expect(scene.snap(windowPosition)).toBeUndefined();
      } finally {
        scene.destroyForSpecs();
      }
    });

    it("snaps to a model surface", async function () {
      // A canvas larger than the default snap window, so off-center window
      // coordinates produce sensible pick rays.
      const scene = createScene({ canvas: createCanvas(64, 64) });
      try {
        if (!scene.frameState.context.colorBufferFloat) {
          return;
        }
        const model = await loadAndZoomToModelAsync(
          { url: "./Data/Models/glTF-2.0/BoxTextured/glTF/BoxTextured.gltf" },
          scene,
        );
        const windowPosition = new Cartesian2(
          scene.drawingBufferWidth / 2,
          scene.drawingBufferHeight / 2,
        );
        expect(scene).toSnapAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.object.primitive).toBe(model);
          expect(result.isEdge).toBe(false);
          expect(result.screenPosition).toBeInstanceOf(Cartesian2);
          // The snapped world position must lie on the model.
          const distance = Cartesian3.distance(
            result.position,
            model.boundingSphere.center,
          );
          expect(distance).toBeLessThanOrEqual(
            model.boundingSphere.radius * 1.01,
          );
        }, windowPosition);
      } finally {
        scene.destroyForSpecs();
      }
    });

    it("snaps to a model edge when edges are displayed", async function () {
      const scene = createScene({ canvas: createCanvas(64, 64) });
      try {
        if (!scene.frameState.context.colorBufferFloat) {
          return;
        }
        const model = await loadAndZoomToModelAsync(
          {
            url: "./Data/Models/glTF-2.0/EdgeVisibility/glTF-Binary/EdgeVisibility.glb",
          },
          scene,
        );
        model.edgeDisplayMode = EdgeDisplayMode.SURFACES_AND_EDGES;
        scene.renderForSpecs();
        const windowPosition = new Cartesian2(
          scene.drawingBufferWidth / 2,
          scene.drawingBufferHeight / 2,
        );
        expect(scene).toSnapAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.object.primitive).toBe(model);
          expect(result.isEdge).toBe(true);
        }, windowPosition);
      } finally {
        scene.destroyForSpecs();
      }
    });
    it("snaps to a model with planar fill materials", async function () {
      const scene = createScene({ canvas: createCanvas(64, 64) });
      try {
        if (!scene.frameState.context.colorBufferFloat) {
          return;
        }
        const model = await loadAndZoomToModelAsync(
          {
            url: "./Data/Models/glTF-2.0/PlanarFill/glTF/planar-fill-polygons.gltf",
          },
          scene,
        );
        // Render a color frame first so the planar fill ID pre-pass runs
        // before the snap render.
        scene.renderForSpecs();
        const windowPosition = new Cartesian2(
          scene.drawingBufferWidth / 2,
          scene.drawingBufferHeight / 2,
        );
        expect(scene).toSnapAndCall(function (result) {
          expect(result).toBeDefined();
          expect(result.object.primitive).toBe(model);
          // The asset also uses EXT_mesh_primitive_edge_visibility, so snap
          // prefers an edge.
          expect(result.isEdge).toBe(true);
          expect(result.position).toBeInstanceOf(Cartesian3);
        }, windowPosition);
      } finally {
        scene.destroyForSpecs();
      }
    });
  });
});
