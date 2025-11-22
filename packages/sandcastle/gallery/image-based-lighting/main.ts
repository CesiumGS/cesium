import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

if (!viewer.scene.specularEnvironmentMapsSupported) {
  window.alert("This browser does not support specular environment maps.");
}

const modelURL = "../../SampleData/models/Pawns/Pawns.glb";

// This environment map was processed using Khronos's glTF IBL Sampler. To process your own:
// 1 - Download and build the Khronos glTF IBL Sampler (https://github.com/KhronosGroup/glTF-IBL-Sampler).
// 2 - Run `cli -inputPath /path/to/image.hdr -outCubeMap /path/to/output.ktx2`. Run `cli -h` for all options.
const environmentMapURL =
  "https://cesium.com/public/SandcastleSampleData/kiara_6_afternoon_2k_ibl.ktx2";

// To generate the spherical harmonic coefficients below, use Google's Filament project:
// 1 - Download the Filament release (https://github.com/google/filament/releases).
// 2 - Run `cmgen --no-mirror --type=ktx --deploy=/path/to/output /path/to/image.hdr`.
//     Other formats are also supported. Run `cmgen --help` for all options.
// 3 - Take the generated coefficients and load them in CesiumJS as shown below.
const L00 = new Cesium.Cartesian3(
  1.234897375106812,
  1.221635103225708,
  1.273374080657959,
);
const L1_1 = new Cesium.Cartesian3(
  1.136140108108521,
  1.171419978141785,
  1.287894368171692,
);
const L10 = new Cesium.Cartesian3(
  1.245410919189453,
  1.245791077613831,
  1.283067107200623,
);
const L11 = new Cesium.Cartesian3(
  1.107124328613281,
  1.112697005271912,
  1.153419137001038,
);
const L2_2 = new Cesium.Cartesian3(
  1.08641505241394,
  1.079904079437256,
  1.10212504863739,
);
const L2_1 = new Cesium.Cartesian3(
  1.190043210983276,
  1.186099290847778,
  1.214627981185913,
);
const L20 = new Cesium.Cartesian3(
  0.017783647403121,
  0.020140396431088,
  0.025317270308733,
);
const L21 = new Cesium.Cartesian3(
  1.087014317512512,
  1.084779262542725,
  1.111417651176453,
);
const L22 = new Cesium.Cartesian3(
  -0.052426788955927,
  -0.048315055668354,
  -0.041973855346441,
);
const coefficients = [L00, L1_1, L10, L11, L2_2, L2_1, L20, L21, L22];

const height = 0.0;
const hpr = new Cesium.HeadingPitchRoll(0.0, 0.0, 0.0);
const origin = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, height);
const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(origin, hpr);

try {
  const model = viewer.scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: modelURL,
      modelMatrix: modelMatrix,
      minimumPixelSize: 128,
    }),
  );

  model.readyEvent.addEventListener(() => {
    const camera = viewer.camera;

    // Zoom to model
    const controller = viewer.scene.screenSpaceCameraController;
    const r = 2.0 * Math.max(model.boundingSphere.radius, camera.frustum.near);
    controller.minimumZoomDistance = r * 0.5;

    const center = model.boundingSphere.center;
    const heading = Cesium.Math.toRadians(230.0);
    const pitch = Cesium.Math.toRadians(-20.0);
    camera.lookAt(
      center,
      new Cesium.HeadingPitchRange(heading, pitch, r * 2.0),
    );
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    const ibl = model.imageBasedLighting;
    ibl.sphericalHarmonicCoefficients = coefficients;
    ibl.specularEnvironmentMaps = environmentMapURL;

    model.environmentMapManager.groundColor =
      Cesium.Color.fromCssColorString("#292817");

    Sandcastle.addToggleButton(
      "Use procedural environment lighting",
      false,
      function (checked) {
        if (!checked) {
          ibl.sphericalHarmonicCoefficients = coefficients;
          ibl.specularEnvironmentMaps = environmentMapURL;
        } else {
          ibl.sphericalHarmonicCoefficients = undefined;
          ibl.specularEnvironmentMaps = undefined;
        }
      },
    );
  });
} catch (error) {
  window.alert(`Error loading model: ${error}`);
}
