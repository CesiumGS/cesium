import {
  CanvasTarget,
  createBox,
  eastNorthUpToFixedFrame,
  Ellipsoid,
  Engine,
  fromDegrees,
  GlobeController,
  mat4,
  vec3,
  type ImageryProvider,
} from "../../src/index.ts";
import world from "./natural-earth-world.jpg?inline";

/**
 * A public-domain map from inside the file, with no network: Natural Earth II
 * as one image of the whole world, stitched from the engine's level 2 tiles.
 * One tile, because the engine addresses a geographic provider's level as a
 * square grid, which isn't how those tiles are laid out.
 */
const naturalEarth: ImageryProvider = {
  name: "Natural Earth II",
  tilingScheme: "geographic",
  minimumLevel: 0,
  maximumLevel: 0,
  tileSize: 2048,
  attributions: [],
  tileUrl: () => world,
};

const SITE = { longitude: 7.45, latitude: 46.9 };
const deg = Math.PI / 180;

export interface LiveGlobe {
  /** Hours from local midnight at the site. */
  setHour(hour: number): void;
  /** Points the camera at the whole Earth, or at the block of towers. */
  look(where: "earth" | "towers"): void;
  /** Stops rendering while out of view, and starts again. */
  setActive(active: boolean): void;
  dispose(): void;
}

export async function startLiveGlobe(
  canvas: HTMLCanvasElement,
  onLost: (message: string) => void,
): Promise<LiveGlobe> {
  // A lost device is reported, not retried.
  const engine = await Engine.create({ recoverFromLoss: false });
  engine.gpu.events.on("lost", (info) => {
    engine.stop();
    onLost(info.message);
  });
  const world = engine.createWorld();
  const view = engine.addView({
    target: new CanvasTarget(canvas),
    world,
    shadows: true,
  });
  const controller = new GlobeController(view, canvas, engine);
  engine.addEllipsoid(world, { imagery: naturalEarth });

  // A block of towers, large enough to read from a distance.
  const ellipsoid = Ellipsoid.WGS84;
  const centre = ellipsoid.cartographicToCartesian(
    fromDegrees(SITE.longitude, SITE.latitude, 0),
    vec3.vec3(),
  );
  const box = world.addMesh(createBox());
  const enu = mat4.mat4();
  const local = mat4.mat4();
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 5; i++) {
      const position = ellipsoid.cartographicToCartesian(
        fromDegrees(
          SITE.longitude + (i - 2) * 0.006,
          SITE.latitude + (j - 2) * 0.004,
          0,
        ),
        vec3.vec3(),
      );
      const height = 80 + ((i * 7 + j * 13) % 9) * 45;
      eastNorthUpToFixedFrame(position, ellipsoid, enu);
      mat4.setTranslation(enu, vec3.vec3());
      mat4.fromScale(local, 160, 160, height);
      local[14] = height / 2;
      world.addDraw({
        mesh: box,
        origin: position,
        model: mat4.multiply(mat4.mat4(), enu, local),
        radius: Math.hypot(80, 80, height / 2) + height / 2,
        color: [0.82, 0.8, 0.76, 1],
        name: `tower ${j * 5 + i + 1}`,
      });
    }
  }

  const look = (where: "earth" | "towers") => {
    if (where === "earth") {
      // Short of straight down, where a heading has no meaning.
      view.camera.lookAt(centre, 0, -80 * deg, 2e7);
    } else {
      view.camera.lookAt(centre, 35 * deg, -22 * deg, 4200);
    }
    engine.requestRender();
  };

  const setHour = (hour: number) => {
    // A simple day at the site: the sun's azimuth and elevation by the hour,
    // at the equinox. Enough to show light and shadow, not an ephemeris.
    const angle = ((hour - 12) / 24) * 2 * Math.PI;
    const lat = SITE.latitude * deg;
    const east = -Math.sin(angle);
    const north = -Math.sin(lat) * Math.cos(angle);
    const up = Math.cos(lat) * Math.cos(angle);
    const axes = eastNorthUpToFixedFrame(centre, ellipsoid, mat4.mat4());
    vec3.normalize(
      engine.sunDirection,
      vec3.vec3(
        axes[0]! * east + axes[4]! * north + axes[8]! * up,
        axes[1]! * east + axes[5]! * north + axes[9]! * up,
        axes[2]! * east + axes[6]! * north + axes[10]! * up,
      ),
    );
    engine.requestRender();
  };

  engine.renderMode = "onDemand";
  const offTick = engine.onTick(() => {
    controller.update();
    return false;
  });
  look("earth");
  setHour(10.5);
  engine.start();

  let disposed = false;
  return {
    setHour,
    look,
    setActive(active) {
      if (disposed) {
        return;
      }
      if (active) {
        engine.start();
        engine.requestRender();
      } else {
        engine.stop();
      }
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      offTick();
      controller.dispose();
      engine.stop();
      engine.destroy();
    },
  };
}
