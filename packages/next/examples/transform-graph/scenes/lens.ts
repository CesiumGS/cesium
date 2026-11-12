import {
  Ellipsoid,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
} from "@cesium/next";
import { Frame, smoothFrame } from "@cesium/next/frames";
import { radialDistortion } from "../../../src/transforms/index.ts";
import { addMeshDraw, anchorIn, stage } from "../content.ts";
import { hex, MeshBuilder, polylines } from "../geometry.ts";
import { liveEdge } from "../liveEdge.ts";
import { createMarker } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { button, el, slider, trueDrawnTable } from "../ui.ts";

const deg = Math.PI / 180;
/**
 * DJI Phantom 4 Pro (FC6310) distortion, approximate: the radial values quoted
 * by users of the camera's DewarpData (k1 about −0.264, k2 0.108, k3 −0.031;
 * the tangential terms are under 4e-4 and left out), not read from a primary
 * source, for a half-width of the image of 0.743 in normalized coordinates
 * (5472 px at fx 3680 px).
 */
const LENS = { k1: -0.264, k2: 0.108, k3: -0.031 };
const HALF_WIDTH = 0.743;
const SITE = { longitude: -122.3995, latitude: 37.7946 };

/** A synthetic city in local metres (east, north, up): blocks and towers on a street grid, so every edge is straight. */
function cityMeshes() {
  const city = new MeshBuilder();
  const streets: Array<{ points: number[][]; color: ReturnType<typeof hex> }> =
    [];
  const pitch = 80;
  const n = 6;
  const half = (n * pitch) / 2;
  city.box(
    [-half - 40, -half - 40, -1],
    [half + 40, half + 40, 0],
    hex("#6d7076"),
  );
  const tones = ["#c9c3b6", "#b7c2cc", "#d1b8a4", "#a9b8a8", "#cfcfcf"];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = -half + i * pitch + 10;
      const y = -half + j * pitch + 10;
      const h = 14 + ((i * 7 + j * 13 + i * j * 5) % 9) * 14;
      city.box(
        [x, y, 0],
        [x + 60, y + 60, h],
        hex(tones[(i + 2 * j) % tones.length]!),
      );
    }
  }
  const yellow = hex("#ffd21a");
  for (let k = 0; k <= n; k++) {
    const t = -half + k * pitch + 5;
    streets.push({
      points: [
        [t, -half - 40, 0.3],
        [t, half + 40, 0.3],
      ],
      color: yellow,
    });
    streets.push({
      points: [
        [-half - 40, t, 0.3],
        [half + 40, t, 0.3],
      ],
      color: yellow,
    });
  }
  return { city: city.build(), streets: polylines(streets) };
}

export const lens: Scene = {
  id: "lens",
  number: 7,
  title: "Lens on the camera",
  caption:
    "A lens node on the camera's branch bends the world the way a drone's wide lens does. A synthetic city (every edge straight) sits in a frame below it, so edges curve toward the corners of the view; the strength slider moves one float.",
  point:
    "Where the lens sits decides what it distorts: the camera pose, the lens and the world-in-camera node are three nodes on one route. A long edge of a large triangle is bent only at its vertices, so it may show a chord: tessellation is a spike. Streaming tilesets did not draw through this lens (see the report).",
  sources: [
    {
      what: "The city",
      who: "Synthetic blocks and towers generated for this page, at the foot of Market Street, San Francisco",
      terms:
        "No data. The planned ion photogrammetry (asset 1415196) answers 404 for the gallery's token, and Cesium OSM Buildings load only their root tile through a camera-space lens: see the report.",
    },
    {
      what: "Lens coefficients",
      who: "DJI Phantom 4 Pro (FC6310), k1 −0.264, k2 0.108, k3 −0.031: approximate, as quoted for its DewarpData; not from a primary source",
      terms:
        "Facts about a camera; check against an image's own DewarpData before relying on them.",
    },
  ],
  globe: false,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, world, view } = viewer;
    viewer.setSun(120, 40);
    stage(host);

    // The viewing camera has the drone camera's field of view, so its normalized coordinates are the lens's.
    const savedFov = view.camera.fov;
    view.camera.fov = 2 * Math.atan(HALF_WIDTH);
    host.scope.defer(() => {
      view.camera.fov = savedFov;
    });

    // --------------------------------------------------- the camera branch
    const camera = view.camera;
    /** The camera's pose, camera space (x right, y down, z forward) to ITRF, column-major. */
    const pose = (out: Float64Array) => {
      for (let i = 0; i < 3; i++) {
        out[i] = camera.right[i]!;
        out[4 + i] = -camera.up[i]!;
        out[8 + i] = camera.direction[i]!;
        out[12 + i] = camera.position[i]!;
      }
      out[3] = out[7] = out[11] = 0;
      out[15] = 1;
      return out;
    };
    const exact = {
      byDefinition: true as const,
      note: "the camera's own pose: the node is defined by it",
    };
    const cameraNode = new Frame(
      "Drone camera (pose)",
      host.itrf,
      (_instant, out) => void pose(out),
      { cache: false, accuracy: exact },
    );
    host.catalog.add(cameraNode);
    const scale = world.createPlacementParameter(1, { range: [0, 3] });
    const lensEdge = liveEdge(radialDistortion(LENS), {
      description: "Brown–Conrady radial distortion of camera space",
      scale,
      identity: { k1: 0, k2: 0, k3: 0, p1: 0, p2: 0 },
      // Camera space is defined in front of the camera only.
      domain: { center: [0, 0, 3000], radius: 3000 },
    });
    const lensNode = smoothFrame(
      "Lens (radial distortion)",
      cameraNode,
      lensEdge,
    );
    host.catalog.add(lensNode);
    const rigid = new Float64Array(16);
    const worldInCamera = new Frame(
      "World in camera space",
      lensNode,
      (_instant, out) => {
        pose(rigid);
        // The inverse of a rotation and a translation.
        for (let c = 0; c < 3; c++) {
          for (let r = 0; r < 3; r++) {
            out[c * 4 + r] = rigid[r * 4 + c]!;
          }
        }
        for (let r = 0; r < 3; r++) {
          out[12 + r] = -(
            out[r]! * rigid[12]! +
            out[4 + r]! * rigid[13]! +
            out[8 + r]! * rigid[14]!
          );
        }
        out[3] = out[7] = out[11] = 0;
        out[15] = 1;
      },
      { cache: false, accuracy: exact },
    );
    host.catalog.add(worldInCamera);
    const anchor = anchorIn(host, "City", worldInCamera);
    const ground = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(SITE.longitude, SITE.latitude, 0),
      vec3.vec3(),
    );
    const enu = eastNorthUpToFixedFrame(ground, Ellipsoid.WGS84, mat4.mat4());
    enu[12] = enu[13] = enu[14] = 0;
    const meshes = cityMeshes();
    addMeshDraw(host, anchor, meshes.city, {
      origin: ground,
      model: enu,
      name: "City blocks",
      doubleSided: true,
    });
    addMeshDraw(host, anchor, meshes.streets, {
      origin: ground,
      model: enu,
      name: "Street lines",
      unlit: true,
      ground: false,
    });

    // The lens is fixed to the camera's pose as it is when the pose is set (`aim`): the controller is off, so the pose changes only there.
    const refreshPose = () => {
      cameraNode.invalidate();
      worldInCamera.invalidate();
    };
    const controllerWas = viewer.controller.enabled;
    viewer.controller.enabled = false;
    host.scope.defer(() => {
      viewer.controller.enabled = controllerWas;
    });

    host.describe({
      placements: [
        {
          label: "City blocks (every edge straight)",
          frame: worldInCamera,
          kind: "content",
        },
        {
          label: "Camera (the viewer's rig)",
          frame: host.itrf,
          kind: "camera",
        },
      ],
      detail: (f) =>
        f === lensNode
          ? `k1 ${LENS.k1}, k2 ${LENS.k2}, k3 ${LENS.k3}, at ${(scale.value * 100).toFixed(0)} % (approximate)`
          : f === worldInCamera
            ? "the Earth's coordinates in the camera's axes, an affine map of the camera's pose"
            : f === cameraNode
              ? "follows the viewing camera"
              : undefined,
    });

    // ------------------------------------------------------------ shots
    const target = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(SITE.longitude, SITE.latitude, 40),
      vec3.vec3(),
    );
    const shot = (heading: number, pitch: number, range: number) => () => {
      camera.lookAt(target, heading * deg, pitch * deg, range);
      refreshPose();
      engine.requestRender();
    };
    const wide = shot(150, -14, 560);
    wide();

    // ------------------------------------------------------- readouts
    const table = trueDrawnTable(
      ["Image x", "Image y", "Off the ideal pinhole"],
      ["Ideal pinhole", "Drawn"],
    );
    const note = el(
      "p",
      { className: "tgx-small" },
      "Click a building edge near a corner: where the ideal pinhole puts it, and where the lens draws it.",
    );
    const marker = createMarker(host);
    const toCamera = (p: ArrayLike<number>) => {
      const m = pose(new Float64Array(16));
      const d = [p[0]! - m[12]!, p[1]! - m[13]!, p[2]! - m[14]!];
      return [
        d[0]! * m[0]! + d[1]! * m[1]! + d[2]! * m[2]!,
        d[0]! * m[4]! + d[1]! * m[5]! + d[2]! * m[6]!,
        d[0]! * m[8]! + d[1]! * m[9]! + d[2]! * m[10]!,
      ] as const;
    };
    const stopPicks = host.onPick(({ pick, view: v, frame }: ScenePick) => {
      const truth = host.queries.pickIn(pick, "true");
      const drawn = host.queries.pickIn(pick, "drawn");
      const a = toCamera(truth.position);
      const b = toCamera(drawn.position);
      // Pixels from the centre: the larger viewport dimension spans fov.
      const rect = v.pixelRect();
      const f =
        Math.max(rect.width, rect.height) / 2 / Math.tan(camera.fov / 2);
      const px = (c: readonly [number, number, number]) =>
        [(c[0] / c[2]) * f, (c[1] / c[2]) * f] as const;
      const [ax, ay] = px(a);
      const [bx, by] = px(b);
      table.set("Image x", `${ax.toFixed(0)} px`, `${bx.toFixed(0)} px`);
      table.set("Image y", `${ay.toFixed(0)} px`, `${by.toFixed(0)} px`);
      table.set(
        "Off the ideal pinhole",
        "0 px",
        `${Math.hypot(bx - ax, by - ay).toFixed(1)} px`,
      );
      note.textContent = `On “${frame?.name ?? "no node"}”; ${truth.note}`;
      marker.set({ position: truth.position, anchor, view: v });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const strength = slider(
      "Lens strength",
      {
        min: 0,
        max: 3,
        step: 0.05,
        value: 1,
        format: (v) => (v === 0 ? "off" : `${(v * 100).toFixed(0)} %`),
      },
      (v) => {
        scale.value = v;
        host.graph.refresh();
        engine.requestRender();
      },
    );
    host.controls.append(
      strength.root,
      el(
        "div",
        { className: "buttons" },
        button("Wide", wide),
        button("Street", shot(60, -4, 300)),
        button("Rooftops", shot(200, -22, 700)),
      ),
      el(
        "p",
        { className: "tgx-small" },
        "100 % is the Phantom 4 Pro's lens (approximate); more than that exaggerates it. The camera is fixed to the lens's pose: choose a shot.",
      ),
    );
    host.readouts.append(table.root, note);
    host.loading(undefined);
  },
};
